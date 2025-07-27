from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.community import CommunityPost, CommunityAnswer, CommunityPostVote, CommunityAnswerVote, CommunityPostView
from app.models.user import User
from app.models.course import Course
from datetime import datetime
import uuid

community_bp = Blueprint('community', __name__)


@community_bp.route('/courses/<course_id>/community/posts', methods=['GET'])
@jwt_required()
def get_community_posts(course_id):
    """Get all community posts for a course"""
    try:
        current_user_id = get_jwt_identity()
        
        # Verify user has access to this course
        course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
        if not course:
            course = Course.query.filter_by(combo_id=course_id, user_id=current_user_id).first()
            if not course:
                return jsonify({'error': 'Course not found'}), 404

        # Use combo_id for community posts lookup
        combo_id = course.combo_id

        # Get posts with pagination
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        sort_by = request.args.get('sort', 'recent')  # recent, popular, answered
        post_type = request.args.get('type', None)  # filter by type
        include_deleted = request.args.get('include_deleted', 'false').lower() == 'true'  # include deleted posts
        search_query = request.args.get('search', '').strip()  # search query
        
        query = CommunityPost.query.filter_by(course_id=combo_id)
        
        # Filter out deleted posts by default (unless specifically requested)
        if not include_deleted:
            query = query.filter(CommunityPost.type != 'deleted')
        
        # Filter by type if specified
        if post_type:
            query = query.filter_by(type=post_type)
        
        # Enhanced search functionality - search across multiple fields
        search_conditions = []
        if search_query:
            # Simple search conditions without complex JOINs to avoid conflicts
            search_conditions = [
                CommunityPost.title.ilike(f'%{search_query}%'),
                CommunityPost.content.ilike(f'%{search_query}%'),
                CommunityPost.type.cast(db.Text).ilike(f'%{search_query}%'),  # Cast enum to text
                CommunityPost.tags.cast(db.Text).ilike(f'%{search_query}%')
            ]
            
            # Search in user names using subquery
            user_search_subquery = db.session.query(User.id).filter(
                User.name.ilike(f'%{search_query}%')
            ).subquery()
            search_conditions.append(CommunityPost.user_id.in_(user_search_subquery))
            
            # Search in answer content using subquery
            answer_search_subquery = db.session.query(CommunityAnswer.post_id).filter(
                CommunityAnswer.content.ilike(f'%{search_query}%')
            ).subquery()
            search_conditions.append(CommunityPost.id.in_(answer_search_subquery))
            
            # Search in answer author names using subquery
            answer_author_subquery = db.session.query(CommunityAnswer.post_id)\
                .join(User, CommunityAnswer.user_id == User.id)\
                .filter(User.name.ilike(f'%{search_query}%'))\
                .subquery()
            search_conditions.append(CommunityPost.id.in_(answer_author_subquery))
            
        # Apply search filter if there's a search query
        if search_conditions:
            query = query.filter(db.or_(*search_conditions))
        
        # Sort posts
        if sort_by == 'popular':
            query = query.order_by((CommunityPost.upvotes - CommunityPost.downvotes).desc())
        elif sort_by == 'answered':
            query = query.filter_by(has_accepted_answer=True).order_by(CommunityPost.last_activity.desc())
        else:  # recent
            query = query.order_by(CommunityPost.last_activity.desc())
        
        # Add pinned posts to the top (but not deleted ones unless specifically requested)
        pinned_query = CommunityPost.query.filter_by(course_id=combo_id, is_pinned=True)
        if not include_deleted:
            pinned_query = pinned_query.filter(CommunityPost.type != 'deleted')
        pinned_posts = pinned_query.order_by(CommunityPost.last_activity.desc()).all()
        
        regular_posts = query.filter_by(is_pinned=False).paginate(page=page, per_page=per_page, error_out=False)
        
        posts_data = []
        
        # Add pinned posts first (only on first page)
        if page == 1:
            for post in pinned_posts:
                posts_data.append(post.to_dict())
        
        # Add regular posts
        for post in regular_posts.items:
            posts_data.append(post.to_dict())
        
        return jsonify({
            'posts': posts_data,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': regular_posts.total + (len(pinned_posts) if page == 1 else 0),
                'pages': regular_posts.pages
            }
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error getting community posts: {str(e)}")
        return jsonify({'error': 'Failed to get community posts'}), 500


@community_bp.route('/courses/<course_id>/community/posts', methods=['POST'])
@jwt_required()
def create_community_post(course_id):
    """Create a new community post"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Verify user has access to this course
        course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
        if not course:
            course = Course.query.filter_by(combo_id=course_id, user_id=current_user_id).first()
            if not course:
                return jsonify({'error': 'Course not found'}), 404

        # Use combo_id for community posts
        combo_id = course.combo_id

        # Validate required fields
        required_fields = ['title', 'content', 'type']
        for field in required_fields:
            if field not in data or not data[field].strip():
                return jsonify({'error': f'{field} is required'}), 400

        # Validate post type
        valid_types = ['question', 'discussion', 'study-group', 'resource-sharing', 'help-wanted']
        if data['type'] not in valid_types:
            return jsonify({'error': 'Invalid post type'}), 400

        # Create new post
        post = CommunityPost(
            course_id=combo_id,
            user_id=current_user_id,
            title=data['title'].strip(),
            content=data['content'].strip(),
            type=data['type'],
            tags=data.get('tags', []),
            is_pinned=data.get('isPinned', False),
        )

        db.session.add(post)
        db.session.commit()

        return jsonify({
            'message': 'Post created successfully',
            'post': post.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating community post: {str(e)}")
        return jsonify({'error': 'Failed to create post'}), 500


@community_bp.route('/courses/<course_id>/community/posts/<post_id>', methods=['GET'])
@jwt_required()
def get_community_post(course_id, post_id):
    """Get a specific community post with answers"""
    try:
        current_user_id = get_jwt_identity()
        
        # Verify user has access to this course
        course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
        if not course:
            course = Course.query.filter_by(combo_id=course_id, user_id=current_user_id).first()
            if not course:
                return jsonify({'error': 'Course not found'}), 404

        # Use combo_id for post lookup
        combo_id = course.combo_id
        
        # Get post
        post = CommunityPost.query.filter_by(id=post_id, course_id=combo_id).first()
        if not post:
            return jsonify({'error': 'Post not found'}), 404

        # Note: View tracking is now handled by dedicated /view endpoint
        # This prevents double-counting views when fetching post details

        # Get answers
        answers = CommunityAnswer.query.filter_by(post_id=post_id).order_by(
            CommunityAnswer.is_accepted.desc(),
            (CommunityAnswer.upvotes - CommunityAnswer.downvotes).desc(),
            CommunityAnswer.created_at.asc()
        ).all()

        answers_data = [answer.to_dict() for answer in answers]

        return jsonify({
            'post': post.to_dict(),
            'answers': answers_data
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error getting community post: {str(e)}")
        return jsonify({'error': 'Failed to get post'}), 500


@community_bp.route('/courses/<course_id>/community/posts/<post_id>/answers', methods=['POST'])
@jwt_required()
def create_community_answer(course_id, post_id):
    """Create a new answer for a community post"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Verify user has access to this course
        course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
        if not course:
            course = Course.query.filter_by(combo_id=course_id, user_id=current_user_id).first()
            if not course:
                return jsonify({'error': 'Course not found'}), 404

        # Use combo_id for post lookup
        combo_id = course.combo_id
        
        # Verify post exists
        post = CommunityPost.query.filter_by(id=post_id, course_id=combo_id).first()
        if not post:
            return jsonify({'error': 'Post not found'}), 404

        # Validate required fields
        if 'content' not in data or not data['content'].strip():
            return jsonify({'error': 'Content is required'}), 400

        # Create new answer
        answer = CommunityAnswer(
            post_id=post_id,
            user_id=current_user_id,
            content=data['content'].strip(),
            latex_blocks=data.get('latexBlocks', [])
        )

        db.session.add(answer)
        
        # Update post's last activity
        post.last_activity = datetime.utcnow()
        
        db.session.commit()

        return jsonify({
            'message': 'Answer created successfully',
            'answer': answer.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating community answer: {str(e)}")
        return jsonify({'error': 'Failed to create answer'}), 500


@community_bp.route('/courses/<course_id>/community/posts/<post_id>/vote', methods=['POST'])
@jwt_required()
def vote_community_post(course_id, post_id):
    """Vote on a community post"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Verify user has access to this course
        course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
        if not course:
            course = Course.query.filter_by(combo_id=course_id, user_id=current_user_id).first()
            if not course:
                return jsonify({'error': 'Course not found'}), 404

        # Use combo_id for post lookup
        combo_id = course.combo_id
        
        # Verify post exists
        post = CommunityPost.query.filter_by(id=post_id, course_id=combo_id).first()
        if not post:
            return jsonify({'error': 'Post not found'}), 404

        # Validate vote type
        vote_type = data.get('voteType')
        if vote_type not in ['upvote', 'downvote']:
            return jsonify({'error': 'Invalid vote type'}), 400

        # Check if user already voted
        existing_vote = CommunityPostVote.query.filter_by(
            post_id=post_id, 
            user_id=current_user_id
        ).first()

        if existing_vote:
            if existing_vote.vote_type == vote_type:
                # Remove vote if same type
                db.session.delete(existing_vote)
                if vote_type == 'upvote':
                    post.upvotes -= 1
                else:
                    post.downvotes -= 1
            else:
                # Change vote type
                existing_vote.vote_type = vote_type
                if vote_type == 'upvote':
                    post.upvotes += 1
                    post.downvotes -= 1
                else:
                    post.downvotes += 1
                    post.upvotes -= 1
        else:
            # Create new vote
            new_vote = CommunityPostVote(
                post_id=post_id,
                user_id=current_user_id,
                vote_type=vote_type
            )
            db.session.add(new_vote)
            
            if vote_type == 'upvote':
                post.upvotes += 1
            else:
                post.downvotes += 1

        db.session.commit()

        return jsonify({
            'message': 'Vote recorded successfully',
            'upvotes': post.upvotes,
            'downvotes': post.downvotes
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error voting on post: {str(e)}")
        return jsonify({'error': 'Failed to record vote'}), 500


@community_bp.route('/courses/<course_id>/community/answers/<answer_id>/vote', methods=['POST'])
@jwt_required()
def vote_community_answer(course_id, answer_id):
    """Vote on a community answer"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Verify user has access to this course
        course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
        if not course:
            course = Course.query.filter_by(combo_id=course_id, user_id=current_user_id).first()
            if not course:
                return jsonify({'error': 'Course not found'}), 404

        # Use combo_id for answer lookup
        combo_id = course.combo_id
        
        # Verify answer exists and belongs to course
        answer = CommunityAnswer.query.join(CommunityPost).filter(
            CommunityAnswer.id == answer_id,
            CommunityPost.course_id == combo_id
        ).first()
        if not answer:
            return jsonify({'error': 'Answer not found'}), 404

        # Validate vote type
        vote_type = data.get('voteType')
        if vote_type not in ['upvote', 'downvote']:
            return jsonify({'error': 'Invalid vote type'}), 400

        # Check if user already voted
        existing_vote = CommunityAnswerVote.query.filter_by(
            answer_id=answer_id, 
            user_id=current_user_id
        ).first()

        if existing_vote:
            if existing_vote.vote_type == vote_type:
                # Remove vote if same type
                db.session.delete(existing_vote)
                if vote_type == 'upvote':
                    answer.upvotes -= 1
                else:
                    answer.downvotes -= 1
            else:
                # Change vote type
                existing_vote.vote_type = vote_type
                if vote_type == 'upvote':
                    answer.upvotes += 1
                    answer.downvotes -= 1
                else:
                    answer.downvotes += 1
                    answer.upvotes -= 1
        else:
            # Create new vote
            new_vote = CommunityAnswerVote(
                answer_id=answer_id,
                user_id=current_user_id,
                vote_type=vote_type
            )
            db.session.add(new_vote)
            
            if vote_type == 'upvote':
                answer.upvotes += 1
            else:
                answer.downvotes += 1

        db.session.commit()

        return jsonify({
            'message': 'Vote recorded successfully',
            'upvotes': answer.upvotes,
            'downvotes': answer.downvotes
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error voting on answer: {str(e)}")
        return jsonify({'error': 'Failed to record vote'}), 500


@community_bp.route('/courses/<course_id>/community/posts/<post_id>/view', methods=['POST'])
@jwt_required()
def track_post_view(course_id, post_id):
    """Track a view for a community post - increments on every visit"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Verify user has access to this course
        course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
        if not course:
            course = Course.query.filter_by(combo_id=course_id, user_id=current_user_id).first()
            if not course:
                return jsonify({'error': 'Course not found'}), 404

        # Use combo_id for post lookup
        combo_id = course.combo_id
        
        # Verify post exists
        post = CommunityPost.query.filter_by(id=post_id, course_id=combo_id).first()
        if not post:
            return jsonify({'error': 'Post not found'}), 404

        # Get visit ID from request body
        visit_id = data.get('sessionId')  # Keep same parameter name for API compatibility
        if not visit_id:
            return jsonify({'error': 'Visit ID is required'}), 400

        current_app.logger.info(f"Tracking view for post {post_id}, user {current_user_id}, visit {visit_id}")

        # Check if this exact visit was already tracked (prevent double-clicks, rapid requests)
        existing_view = CommunityPostView.query.filter_by(
            post_id=post_id,
            user_id=current_user_id,
            session_id=visit_id
        ).first()

        if not existing_view:
            # Create new view record
            new_view = CommunityPostView(
                post_id=post_id,
                user_id=current_user_id,
                session_id=visit_id
            )
            db.session.add(new_view)
            
            # Always increment view count for each new visit
            post.view_count += 1
            db.session.commit()
            
            current_app.logger.info(f"View tracked successfully. New view count: {post.view_count}")
            
            return jsonify({
                'message': 'View tracked successfully',
                'viewCount': post.view_count
            }), 200
        else:
            # This exact visit was already tracked (likely a duplicate request)
            current_app.logger.info(f"Duplicate view request ignored. Current view count: {post.view_count}")
            return jsonify({
                'message': 'View already tracked for this visit',
                'viewCount': post.view_count
            }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error tracking view: {str(e)}")
        return jsonify({'error': 'Failed to track view'}), 500


@community_bp.route('/courses/<course_id>/community/posts/<post_id>/user-vote', methods=['GET'])
@jwt_required()
def get_user_post_vote(course_id, post_id):
    """Get current user's vote for a post"""
    try:
        current_user_id = get_jwt_identity()
        
        # Verify user has access to this course
        course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
        if not course:
            course = Course.query.filter_by(combo_id=course_id, user_id=current_user_id).first()
            if not course:
                return jsonify({'error': 'Course not found'}), 404

        # Check for existing vote
        existing_vote = CommunityPostVote.query.filter_by(
            post_id=post_id, 
            user_id=current_user_id
        ).first()

        return jsonify({
            'vote': existing_vote.vote_type if existing_vote else None
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error getting user vote: {str(e)}")
        return jsonify({'error': 'Failed to get user vote'}), 500


@community_bp.route('/courses/<course_id>/community/answers/<answer_id>/user-vote', methods=['GET'])
@jwt_required()
def get_user_answer_vote(course_id, answer_id):
    """Get current user's vote for an answer"""
    try:
        current_user_id = get_jwt_identity()
        
        # Verify user has access to this course
        course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
        if not course:
            course = Course.query.filter_by(combo_id=course_id, user_id=current_user_id).first()
            if not course:
                return jsonify({'error': 'Course not found'}), 404

        # Check for existing vote
        existing_vote = CommunityAnswerVote.query.filter_by(
            answer_id=answer_id, 
            user_id=current_user_id
        ).first()

        return jsonify({
            'vote': existing_vote.vote_type if existing_vote else None
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error getting user vote: {str(e)}")
        return jsonify({'error': 'Failed to get user vote'}), 500


@community_bp.route('/courses/<course_id>/community/posts/<post_id>', methods=['PUT'])
@jwt_required()
def edit_community_post(course_id, post_id):
    """Edit a community post"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Verify user has access to this course
        course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
        if not course:
            course = Course.query.filter_by(combo_id=course_id, user_id=current_user_id).first()
            if not course:
                return jsonify({'error': 'Course not found'}), 404

        # Use combo_id for post lookup
        combo_id = course.combo_id
        
        # Verify post exists and user owns it
        post = CommunityPost.query.filter_by(id=post_id, course_id=combo_id, user_id=current_user_id).first()
        if not post:
            return jsonify({'error': 'Post not found or you do not have permission to edit it'}), 404

        # Don't allow editing already deleted posts
        if post.type == 'deleted':
            return jsonify({'error': 'Cannot edit a deleted post'}), 400

        # Update post fields
        if 'title' in data and data['title'].strip():
            post.title = data['title'].strip()
        if 'content' in data and data['content'].strip():
            post.content = data['content'].strip()
        if 'tags' in data:
            post.tags = data['tags']

        post.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'message': 'Post updated successfully',
            'post': post.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error editing post: {str(e)}")
        return jsonify({'error': 'Failed to edit post'}), 500


@community_bp.route('/courses/<course_id>/community/posts/<post_id>', methods=['DELETE'])
@jwt_required()  
def delete_community_post(course_id, post_id):
    """Delete a community post (soft delete if has answers)"""
    try:
        current_user_id = get_jwt_identity()
        
        # Verify user has access to this course
        course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
        if not course:
            course = Course.query.filter_by(combo_id=course_id, user_id=current_user_id).first()
            if not course:
                return jsonify({'error': 'Course not found'}), 404

        # Use combo_id for post lookup
        combo_id = course.combo_id
        
        # Verify post exists and user owns it
        post = CommunityPost.query.filter_by(id=post_id, course_id=combo_id, user_id=current_user_id).first()
        if not post:
            return jsonify({'error': 'Post not found or you do not have permission to delete it'}), 404

        # Don't allow deleting already deleted posts
        if post.type == 'deleted':
            return jsonify({'error': 'Post is already deleted'}), 400

        # Check if post has answers
        has_answers = len(post.answers) > 0
        
        if has_answers:
            # Soft delete - replace content but keep post for answers
            post.title = "[Deleted]"
            post.content = "<p>This post has been deleted by the author.</p>"
            post.type = 'deleted'  # Change type to deleted
            post.updated_at = datetime.utcnow()
            db.session.commit()
            
            return jsonify({
                'message': 'Post content deleted successfully',
                'deleted': True,
                'soft_delete': True
            }), 200
        else:
            # Hard delete - no answers, safe to remove completely
            db.session.delete(post)
            db.session.commit()
            
            return jsonify({
                'message': 'Post deleted successfully',
                'deleted': True,
                'soft_delete': False
            }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting post: {str(e)}")
        return jsonify({'error': 'Failed to delete post'}), 500


@community_bp.route('/courses/<course_id>/community/answers/<answer_id>', methods=['DELETE'])
@jwt_required()
def delete_community_answer(course_id, answer_id):
    """Delete a community answer"""
    try:
        current_user_id = get_jwt_identity()
        
        # Verify user has access to this course
        course = Course.query.filter_by(id=course_id, user_id=current_user_id).first()
        if not course:
            course = Course.query.filter_by(combo_id=course_id, user_id=current_user_id).first()
            if not course:
                return jsonify({'error': 'Course not found'}), 404

        # Use combo_id for answer lookup
        combo_id = course.combo_id
        
        # Verify answer exists and user owns it
        answer = CommunityAnswer.query.join(CommunityPost).filter(
            CommunityAnswer.id == answer_id,
            CommunityAnswer.user_id == current_user_id,
            CommunityPost.course_id == combo_id
        ).first()
        
        if not answer:
            return jsonify({'error': 'Answer not found or you do not have permission to delete it'}), 404

        # Get the post to check if it should be deleted after removing this answer
        post = answer.post
        
        # Hard delete the answer
        db.session.delete(answer)
        
        # Check if this was the last answer and the post is deleted
        remaining_answers = CommunityAnswer.query.filter_by(post_id=post.id).filter(CommunityAnswer.id != answer_id).count()
        
        if remaining_answers == 0 and post.type == 'deleted':
            # If no more answers remain and post is deleted, fully delete the post
            db.session.delete(post)
            db.session.commit()
            
            return jsonify({
                'message': 'Answer deleted successfully and post fully deleted (no remaining answers)',
                'deleted': True,
                'post_deleted': True
            }), 200
        else:
            db.session.commit()
            
            return jsonify({
                'message': 'Answer deleted successfully',
                'deleted': True,
                'post_deleted': False
            }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting answer: {str(e)}")
        return jsonify({'error': 'Failed to delete answer'}), 500
