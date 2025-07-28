from app.models.user import User
from app.models.course import Course
from flask import Blueprint, request, jsonify
from app.init import db
from app.models.course_enrollment import CourseEnrollment
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

course_enrollment_bp = Blueprint('course_enrollment', __name__)

# Helper to generate combo_id
def generate_combo_id(course_id, user_id):
    return f"{course_id}+{user_id}"


# Enroll in a course
# should populate the database with the user_id, course_id, pending status, no creator privileges
# ensure that the user is not already enrolled in the course
# ensure that the user is not the creator of the course
@course_enrollment_bp.route('/enroll', methods=['POST'])
@jwt_required()
def enroll_in_course():
    current_user = get_jwt_identity()
    
    if not current_user:
        return jsonify({"message": "Unauthorized"}), 401
    
    data = request.json
    course_id = data.get('course_id')
    if not course_id:
        return jsonify({"message": "Course ID is required"}), 400
    
    combo_id = generate_combo_id(course_id, current_user)
    
    # make sure that there is no existing enrollment request
    existing_enrollment = db.session.query(CourseEnrollment).filter_by(combo_id = combo_id).first()
    if existing_enrollment:
        if existing_enrollment.status == 'pending':
            return jsonify({"message": "You have already requested to enroll in this course."}), 400
        elif existing_enrollment.status == 'approved':
            return jsonify({"message": "You are already enrolled in this course."}), 400
        else:
            return jsonify({"message": "You have been rejected from enrolling in this course. Contact the course administrator for more information."}), 400

    # create a new enrollment request
    new_enrollment = CourseEnrollment(
        user_id=current_user,
        course_id=course_id,
        status='pending',
    )
    db.session.add(new_enrollment)
    db.session.commit()

    return jsonify({"message": "Enrollment request submitted successfully."}), 201


@course_enrollment_bp.route('/handle_request', methods=['PUT'])
@jwt_required()
def handle_enrollment_request():
    current_user = get_jwt_identity()

    if not current_user:
        return jsonify({"message": "Unauthorized"}), 401 

    # Get the course_id and user_id from the request
    data = request.get_json()

    course_id = data.get('course_id')
    request_user_id = data.get('user_id')
    status = data.get('status')  # 'approved' or 'rejected'
    access_privileges = data.get('access_privileges', False)  # Optional for 'approved'

    if not course_id or not request_user_id:
        return jsonify({"message": "Course ID and Requested User's ID are required"}), 400


    # Check if the current user is the creator of the course 
    course = Course.query.filter_by(id=course_id, user_id=current_user).first()
    if not course:
        return jsonify({"message": "Unauthorized: Not the course creator"}), 403

    combo_id = generate_combo_id(course_id, request_user_id)
    enrollment = CourseEnrollment.query.filter_by(combo_id=combo_id).first()
    if not enrollment:
        return jsonify({"message": "No enrollment request found"}), 404

    if status not in ['approved', 'rejected']:
        return jsonify({"message": "Invalid status. Must be 'approved' or 'rejected'"}), 400

    try:
        enrollment.status = status
        enrollment.posted_at = datetime.utcnow()

        if status == 'approved':
            enrollment.access_privileges = access_privileges
            badge_value = 'Co-Creator' if access_privileges else 'Enrolled'

            # Check if course already exists for this user
            existing_copy = Course.query.filter_by(id=course.id, user_id=request_user_id).first()
            if existing_copy:
                return jsonify({"message": "Course copy already exists for this user."}), 400

            new_course = Course(
                id=course.id,
                user_id=request_user_id,
                title=course.title,
                subject=course.subject,
                course_code=course.course_code,
                semester=course.semester,
                professor=course.professor,
                units=course.units,
                variable_units=course.variable_units,
                description=course.description,
                visibility=course.visibility,
                tags=course.tags,
                collaborators=course.collaborators,
                daily_progress=0,
                is_pinned=False,
                is_archived=False,
                badge=badge_value,
                course_image=course.course_image,
                materials=[]
            )
            db.session.add(new_course)

        elif status == 'rejected':
            enrollment.access_privileges = False

        db.session.commit()
        return jsonify({"message": f"Enrollment {status} successfully."}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error processing enrollment: {str(e)}"}), 500

# Update a user's enrollment status
# make sure the user is the course creator
# creator can revoke creator privileges -- status can be set to 'revoked'
# creator can update creator privileges -- true or false
@course_enrollment_bp.route('/update', methods=['PUT'])
@jwt_required()
def update_enrollment_status():
    print("[update_enrollment_status] Called")

    current_user = get_jwt_identity()
    print(f"[update_enrollment_status] Current user: {current_user}")

    if not current_user:
        print("[update_enrollment_status] Unauthorized: No JWT identity")
        return jsonify({"message": "Unauthorized"}), 401

    data = request.get_json()
    print(f"[update_enrollment_status] Incoming data: {data}")

    course_id = data.get('course_id')
    target_user_id = data.get('user_id')
    new_status = data.get('status')  # Can be 'approved', 'rejected', 'revoked'
    new_privileges = data.get('access_privileges', False)  # Optional: True/False

    if not course_id or not target_user_id:
        print("[update_enrollment_status] Missing course_id or user_id")
        return jsonify({"message": "Course ID and User ID are required"}), 400

    if new_status not in ['approved', 'rejected', 'revoked']:
        print(f"[update_enrollment_status] Invalid status: {new_status}")
        return jsonify({"message": "Invalid status. Must be 'approved', 'rejected', or 'revoked'."}), 400

    print(f"[update_enrollment_status] Verifying course ownership: course_id={course_id}")
    course = Course.query.filter_by(id=course_id, user_id=current_user).first()
    if not course:
        print("[update_enrollment_status] Unauthorized: Not course creator")
        return jsonify({"message": "Unauthorized: Not the course creator"}), 403

    combo_id = generate_combo_id(course_id, target_user_id)
    print(f"[update_enrollment_status] Generated combo_id: {combo_id}")

    enrollment = CourseEnrollment.query.filter_by(combo_id=combo_id).first()
    if not enrollment:
        print("[update_enrollment_status] Enrollment not found")
        return jsonify({"message": "Enrollment record not found"}), 404

    print(f"[update_enrollment_status] Updating enrollment: status={new_status}, access_privileges={new_privileges}")
    enrollment.status = new_status
    if new_privileges is not None:
        enrollment.access_privileges = new_privileges

    user_course = Course.query.filter_by(id=course_id, user_id=target_user_id).first()
    if user_course:
        print(f"[update_enrollment_status] Found user course. ID={user_course.id}")
        if new_status == 'revoked':
            print(f"[update_enrollment_status] Deleting user course for revoked user")
            db.session.delete(user_course)
        else:
            if new_privileges is not None:
                badge = 'Co-Creator' if new_privileges else 'Enrolled'
                print(f"[update_enrollment_status] Setting user course badge: {badge}")
                user_course.badge = badge
    else:
        print("[update_enrollment_status] No user course found to update")

    try:
        db.session.commit()
        print("[update_enrollment_status] DB commit successful")
        return jsonify({"message": "Enrollment status updated successfully."}), 200
    except Exception as e:
        db.session.rollback()
        print(f"[update_enrollment_status] DB commit failed: {e}")
        return jsonify({"message": "Failed to update enrollment status."}), 500


# get a user's enrollment status for a specific course
# return the enrollment status for the user in the course
@course_enrollment_bp.route('/enrollment_status', methods=['POST'])
@jwt_required()
def get_enrollment_status():
    current_user = get_jwt_identity()

    if not current_user:
        return jsonify({"message": "Unauthorized"}), 401

    data = request.get_json()
    course_ids = data.get('course_ids')
    
    if not course_ids or not isinstance(course_ids, list):
        return jsonify({"message": "course_ids must be a list"}), 400

    status_map = {}

    # Fetch all enrollments in a single query for efficiency
    combo_ids = [generate_combo_id(cid, current_user) for cid in course_ids]
    enrollments = db.session.query(CourseEnrollment).filter(CourseEnrollment.combo_id.in_(combo_ids)).all()
    enrollment_lookup = {e.combo_id: e.status for e in enrollments}

    for cid in course_ids:
        combo_id = generate_combo_id(cid, current_user)
        status_map[cid] = enrollment_lookup.get(combo_id, "not_enrolled")

    return jsonify(status_map), 200

# get all pending enrollments for a course
# should return all the enrollments that are not approved or rejected
@course_enrollment_bp.route('/pending_enrollments', methods=['POST'])
@jwt_required()
def get_pending_enrollments():
    current_user = get_jwt_identity()

    if not current_user:
        return jsonify({"message": "Unauthorized"}), 401

    data = request.get_json()
    course_id = data.get('course_id')

    if not course_id:
        return jsonify({"message": "Course ID is required"}), 400

    # Ensure current user is the course creator
    course = Course.query.filter_by(id=course_id, user_id=current_user).first()
    if not course:
        return jsonify({"message": "Unauthorized: Not the course creator"}), 403

    # Get all enrollments that are pending
    # Join CourseEnrollment with User to get username
    enrollments = (
        db.session.query(CourseEnrollment, User.name)
        .join(User, CourseEnrollment.user_id == User.id)
        .filter(CourseEnrollment.course_id == course_id, CourseEnrollment.status == 'pending')
        .all()
    )

    result = [
        {
            "user_id": e.user_id,
            "username": username,
            "status": e.status,
            "requested_at": e.posted_at.isoformat() if e.posted_at else None
        }
        for e, username in enrollments
    ]

    return jsonify(result), 200

# get all approved enrollments for a course
# should return all the enrollments that are approved
@course_enrollment_bp.route('/approved_enrollments', methods=['POST'])
@jwt_required()
def get_approved_enrollments():
    current_user = get_jwt_identity()

    if not current_user:
        return jsonify({"message": "Unauthorized"}), 401

    data = request.get_json()
    course_id = data.get('course_id')

    if not course_id:
        return jsonify({"message": "Course ID is required"}), 400

    # Verify the current user is the creator of the course
    course = Course.query.filter_by(id=course_id, user_id=current_user).first()
    if not course:
        return jsonify({"message": "Unauthorized: Not the course creator"}), 403

    # Get all approved enrollments
    enrollments = (
        db.session.query(CourseEnrollment, User.name)
        .join(User, CourseEnrollment.user_id == User.id)
        .filter(CourseEnrollment.course_id == course_id, CourseEnrollment.status == 'approved')
        .all()
    )

    result = [
        {
            "user_id": e.user_id,
            "username": username,
            "status": e.status,
            "access_privileges": e.access_privileges,
            "approved_at": e.posted_at.isoformat() if e.posted_at else None
        }
        for e, username in enrollments
    ]

    return jsonify(result), 200

# get all rejected or revoked enrollments for a course
# should return all the enrollments that are rejected or revoked
@course_enrollment_bp.route('/rejected_or_revoked_enrollments', methods=['POST'])
@jwt_required()
def get_rejected_or_revoked_enrollments():
    current_user = get_jwt_identity()

    if not current_user:
        return jsonify({"message": "Unauthorized"}), 401

    data = request.get_json()
    course_id = data.get('course_id')

    if not course_id:
        return jsonify({"message": "Course ID is required"}), 400

    # Verify the current user is the creator of the course
    course = Course.query.filter_by(id=course_id, user_id=current_user).first()
    if not course:
        return jsonify({"message": "Unauthorized: Not the course creator"}), 403

    # Get enrollments with status rejected or revoked
    enrollments = (
        db.session.query(CourseEnrollment, User.name)
        .join(User, CourseEnrollment.user_id == User.id)
        .filter(
            CourseEnrollment.course_id == course_id,
            CourseEnrollment.status.in_(['rejected', 'revoked'])
        )
        .all()
    )

    result = [
        {
            "user_id": e.user_id,
            "username": username,
            "status": e.status,
            "access_privileges": e.access_privileges,
            "updated_at": e.posted_at.isoformat() if e.posted_at else None
        }
        for e, username in enrollments
    ]

    return jsonify(result), 200
