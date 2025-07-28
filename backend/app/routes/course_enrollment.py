from app.models.user import User
from app.models.course import Course
from flask import Blueprint, request, jsonify
from app.init import db
from app.models.course_enrollment import CourseEnrollment
from flask_jwt_extended import jwt_required, get_jwt_identity

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

# Approve a course enrollment
# make sure the user is the course creator
# creator can approve or reject enrollments
# creator can also set creator privileges


# Update a user's enrollment status
# make sure the user is the course creator
# creator can revoke creator privileges -- status can be set to 'revoked'
# creator can update creator privilegs -- true or false

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

# get all approved enrollments for a course
# should return all the enrollments that are approved

# future implementations at each of these changes it should send a notification to the proper user
