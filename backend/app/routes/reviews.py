from app.models.user import User
from flask import Blueprint, request, jsonify
from app.init import db
from app.models.course_reviews import CourseReview
from flask_jwt_extended import jwt_required, get_jwt_identity


course_reviews_bp = Blueprint('course_reviews', __name__)

# Helper to generate combo_id
def generate_combo_id(course_id, user_id):
    return f"{course_id}+{user_id}"

# GET review by user_id
@course_reviews_bp.route('/reviews/user/<user_id>', methods=['GET'])
@jwt_required()
def get_review_by_user_id(user_id):
    # Logic to retrieve review by user_id
    current_user = get_jwt_identity()
    if not current_user:
        return jsonify({"msg": "User not authenticated"}), 401

    reviews = (
        db.session.query(CourseReview)
        .join(User, CourseReview.user_id == User.id)
        .filter(CourseReview.user_id == user_id)
        .all()
    )
    return jsonify([review.to_dict_with_user() for review in reviews]), 200

# Get review by course_id
@course_reviews_bp.route('/reviews/course/<course_id>', methods=['GET'])
@jwt_required()
def get_review_by_course_id(course_id):
    current_user = get_jwt_identity()
    if not current_user:
        return jsonify({"msg": "User not authenticated"}), 401
    
    reviews = (
        db.session.query(CourseReview)
        .join(User, CourseReview.user_id == User.id)
        .filter(CourseReview.course_id == course_id)
        .all()
    )
    return jsonify([review.to_dict_with_user() for review in reviews]), 200

# Post a new review
@course_reviews_bp.route('/reviews', methods=['POST'])
@jwt_required()
def post_review():
    current_user = get_jwt_identity()
    if not current_user:
        return jsonify({"msg": "User not authenticated"}), 401

    data = request.get_json()
    user_id = current_user
    course_id = data.get('course_id')
    review_text = data.get('review_text')
    rating = data.get('rating')

    if not course_id or not review_text or rating is None:
        return jsonify({"msg": "Missing required fields"}), 400

    combo_id = generate_combo_id(course_id, user_id)
    
    existing_review = CourseReview.query.filter_by(combo_id=combo_id).first()
    if existing_review:
        return jsonify({"msg": "Review already exists"}), 400

    new_review = CourseReview(user_id=user_id, course_id=course_id, review_text=review_text, rating=rating)
    
    db.session.add(new_review)
    db.session.commit()

    return jsonify(new_review.to_dict()), 201

# Put update an existing review
@course_reviews_bp.route('/reviews', methods=['PUT'])
@jwt_required()
def update_review():
    current_user = get_jwt_identity()
    if not current_user:
        return jsonify({"msg": "User not authenticated"}), 401

    data = request.get_json()
    course_id = data.get('course_id')
    user_id = current_user
    
    if not course_id:
        return jsonify({"msg": "Missing course_id"}), 400
    
    combo_id = generate_combo_id(course_id, user_id)
    review = CourseReview.query.filter_by(combo_id=combo_id).first() # this should be a single object
    if not review:
        return jsonify({"msg": "Review not found"}), 404

    review.review_text = data.get('review_text', review.review_text)
    review.rating = data.get('rating', review.rating)

    db.session.commit()

    return jsonify(review.to_dict()), 200

# Delete a review
@course_reviews_bp.route('/reviews', methods=['DELETE'])
@jwt_required()
def delete_review():
    current_user = get_jwt_identity()
    if not current_user:
        return jsonify({"msg": "User not authenticated"}), 401

    data = request.get_json()
    course_id = data.get('course_id')

    if not course_id:
        return jsonify({"msg": "Missing course_id"}), 400

    try:
        course_id = str(course_id)  # avoid casting to UUID
        combo_id = generate_combo_id(course_id, current_user)
        review = CourseReview.query.filter_by(combo_id=combo_id).first()
        if not review:
            return jsonify({"msg": "Review not found"}), 404

        db.session.delete(review)
        db.session.commit()
        return jsonify({"msg": "Review deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Internal server error", "error": str(e)}), 500
