#!/usr/bin/env python3

"""
Course API Test Script
Tests the course CRUD operations to ensure everything is working
"""

import sys
import os
import requests
import json

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# API Configuration
BASE_URL = "http://localhost:5000/api"
TEST_USER_EMAIL = "test@example.com"
TEST_USER_PASSWORD = "testpassword123"

def test_course_api():
    """Test the course API endpoints"""
    print("🧪 Testing Course API Endpoints...")
    print("=" * 50)
    
    # Step 1: Login or create test user
    print("1️⃣ Authenticating test user...")
    
    # Try to login first
    login_data = {
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD
    }
    
    response = requests.post(f"{BASE_URL}/login", json=login_data)
    
    if response.status_code != 200:
        # User doesn't exist, create one
        print("   Creating test user...")
        register_data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": "Test User"
        }
        
        response = requests.post(f"{BASE_URL}/register", json=register_data)
        if response.status_code != 201:
            print(f"❌ Failed to create test user: {response.text}")
            return False
        
        # Now login
        response = requests.post(f"{BASE_URL}/login", json=login_data)
        if response.status_code != 200:
            print(f"❌ Failed to login: {response.text}")
            return False
    
    # Get the JWT token
    token = response.json().get('access_token')
    if not token:
        print("❌ No access token received")
        return False
    
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Authentication successful")
    
    # Step 2: Test creating a course
    print("\n2️⃣ Testing course creation...")
    
    course_data = {
        "subject": "Computer Science",
        "courseName": "Introduction to Python",
        "courseCode": "CS101",
        "semester": "Fall 2024", 
        "professor": "Dr. Smith",
        "units": 3,
        "variableUnits": False,
        "description": "Learn the fundamentals of Python programming including data structures, algorithms, and object-oriented programming concepts.",
        "visibility": "Public",
        "tags": ["Programming", "Python", "Beginner"],
        "collaborators": []
    }
    
    response = requests.post(f"{BASE_URL}/courses", json=course_data, headers=headers)
    
    if response.status_code != 201:
        print(f"❌ Failed to create course: {response.text}")
        return False
    
    created_course = response.json()['course']
    course_id = created_course['id']
    print(f"✅ Course created successfully with ID: {course_id}")
    
    # Step 3: Test getting all courses
    print("\n3️⃣ Testing course retrieval...")
    
    response = requests.get(f"{BASE_URL}/courses", headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Failed to get courses: {response.text}")
        return False
    
    courses = response.json()
    print(f"✅ Retrieved {len(courses)} courses")
    
    # Step 4: Test getting specific course
    print("\n4️⃣ Testing specific course retrieval...")
    
    response = requests.get(f"{BASE_URL}/courses/{course_id}", headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Failed to get specific course: {response.text}")
        return False
    
    course = response.json()
    print(f"✅ Retrieved course: {course['title']}")
    
    # Step 5: Test updating course
    print("\n5️⃣ Testing course update...")
    
    update_data = {
        "daily_progress": 25,
        "is_pinned": True
    }
    
    response = requests.put(f"{BASE_URL}/courses/{course_id}", json=update_data, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Failed to update course: {response.text}")
        return False
    
    updated_course = response.json()['course']
    print(f"✅ Course updated - Progress: {updated_course['daily_progress']}%, Pinned: {updated_course['is_pinned']}")
    
    # Step 6: Test toggle pin
    print("\n6️⃣ Testing toggle pin...")
    
    response = requests.post(f"{BASE_URL}/courses/{course_id}/toggle-pin", headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Failed to toggle pin: {response.text}")
        return False
    
    result = response.json()
    print(f"✅ Pin toggled - is_pinned: {result['is_pinned']}")
    
    # Step 7: Test progress update
    print("\n7️⃣ Testing progress update...")
    
    progress_data = {"progress": 75}
    response = requests.put(f"{BASE_URL}/courses/{course_id}/progress", json=progress_data, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Failed to update progress: {response.text}")
        return False
    
    result = response.json()
    print(f"✅ Progress updated to: {result['daily_progress']}%")
    
    # Step 8: Test course deletion
    print("\n8️⃣ Testing course deletion...")
    
    response = requests.delete(f"{BASE_URL}/courses/{course_id}", headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Failed to delete course: {response.text}")
        return False
    
    print("✅ Course deleted successfully")
    
    # Verify deletion
    response = requests.get(f"{BASE_URL}/courses/{course_id}", headers=headers)
    if response.status_code == 404:
        print("✅ Course deletion verified")
    else:
        print("⚠️  Course may not have been deleted properly")
    
    return True

if __name__ == "__main__":
    try:
        if test_course_api():
            print("\n" + "=" * 50)
            print("🎉 All course API tests passed!")
            print("✅ Your course database system is working correctly")
            print("🚀 You can now use the frontend to create and manage courses")
        else:
            print("\n" + "=" * 50)
            print("❌ Some tests failed")
            print("🔧 Please check your backend configuration and database")
            sys.exit(1)
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to the API server")
        print("🔧 Please make sure your Flask backend is running on http://localhost:5000")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1) 