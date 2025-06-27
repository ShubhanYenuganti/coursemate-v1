#!/usr/bin/env python3

"""
Tasks API Test Script
Tests the tasks CRUD operations to ensure everything is working
"""

import sys
import os
import requests
import json
from datetime import datetime, date

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# API Configuration
BASE_URL = "http://localhost:5173/api"
TEST_USER_EMAIL = "tasks_test@example.com"
TEST_USER_PASSWORD = "testpassword123"

def test_tasks_api():
    """Test the tasks API endpoints"""
    print("🧪 Testing Tasks API Endpoints...")
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
            "name": "Tasks Test User"
        }
        
        response = requests.post(f"{BASE_URL}/register", json=register_data)
        if response.status_code != 201:
            if "Email already exists" in response.text:
                print("   User already exists, trying login again...")
                response = requests.post(f"{BASE_URL}/login", json=login_data)
                if response.status_code != 200:
                    print(f"❌ Failed to login: {response.text}")
                    return False
            else:
                print(f"❌ Failed to create test user: {response.text}")
                return False
        else:
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
    
    # Step 2: Test creating a task
    print("\n2️⃣ Testing task creation...")
    
    today = date.today().isoformat()
    tomorrow = (date.today().replace(day=date.today().day + 1)).isoformat()
    
    task_data = {
        "title": "Test Task",
        "course": "Test Course",
        "due_date": today,
        "color": "#0ea5e9"
    }
    
    response = requests.post(f"{BASE_URL}/tasks/", json=task_data, headers=headers)
    
    if response.status_code != 201:
        print(f"❌ Failed to create task: {response.text}")
        return False
    
    created_task = response.json().get('task')
    task_id = created_task.get('id')
    print(f"✅ Task created successfully: {created_task.get('title')}")
    
    # Step 3: Test getting tasks
    print("\n3️⃣ Testing get tasks...")
    
    response = requests.get(f"{BASE_URL}/tasks/", headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Failed to get tasks: {response.text}")
        return False
    
    tasks = response.json().get('tasks', [])
    print(f"✅ Retrieved {len(tasks)} tasks")
    
    # Step 4: Test getting tasks with filter
    print("\n4️⃣ Testing get tasks with filter...")
    
    response = requests.get(f"{BASE_URL}/tasks/?filter=today", headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Failed to get today's tasks: {response.text}")
        return False
    
    today_tasks = response.json().get('tasks', [])
    print(f"✅ Retrieved {len(today_tasks)} today's tasks")
    
    # Step 5: Test updating a task
    print("\n5️⃣ Testing task update...")
    
    update_data = {
        "title": "Updated Test Task",
        "course": "Updated Test Course"
    }
    
    response = requests.put(f"{BASE_URL}/tasks/{task_id}", json=update_data, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Failed to update task: {response.text}")
        return False
    
    updated_task = response.json().get('task')
    print(f"✅ Task updated successfully: {updated_task.get('title')}")
    
    # Step 6: Test toggling task completion
    print("\n6️⃣ Testing task toggle...")
    
    response = requests.put(f"{BASE_URL}/tasks/{task_id}/toggle", headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Failed to toggle task: {response.text}")
        return False
    
    toggled_task = response.json().get('task')
    print(f"✅ Task toggled successfully: completed = {toggled_task.get('completed')}")
    
    # Step 7: Test getting a specific task
    print("\n7️⃣ Testing get specific task...")
    
    response = requests.get(f"{BASE_URL}/tasks/{task_id}", headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Failed to get specific task: {response.text}")
        return False
    
    specific_task = response.json().get('task')
    print(f"✅ Retrieved specific task: {specific_task.get('title')}")
    
    # Step 8: Test deleting a task
    print("\n8️⃣ Testing task deletion...")
    
    response = requests.delete(f"{BASE_URL}/tasks/{task_id}", headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Failed to delete task: {response.text}")
        return False
    
    print("✅ Task deleted successfully")
    
    # Step 9: Verify task is deleted
    print("\n9️⃣ Verifying task deletion...")
    
    response = requests.get(f"{BASE_URL}/tasks/{task_id}", headers=headers)
    
    if response.status_code == 404:
        print("✅ Task successfully deleted (404 as expected)")
    else:
        print(f"❌ Task still exists: {response.text}")
        return False
    
    print("\n🎉 All tasks API tests passed!")
    return True

if __name__ == "__main__":
    success = test_tasks_api()
    
    if success:
        print("\n✅ Tasks API is working correctly!")
    else:
        print("\n❌ Tasks API tests failed!")
        sys.exit(1) 