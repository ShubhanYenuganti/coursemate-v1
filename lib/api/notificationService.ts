import { apiService } from './apiService';

export interface Notification {
  id: string;
  user_id: string;
  sender_id?: string;
  sender_name?: string;
  type: string;
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  created_at: string;
}

export interface CourseInviteData {
  course_id: string;
  course_title: string;
  role: string;
  sender_name: string;
}

export interface FriendRequestData {
  request_id: string;
  requester_id: string;
  requester_name: string;
  requester_email: string;
}

export interface FriendRequestAcceptedData {
  accepted_by_id: string;
  accepted_by_name: string;
  accepted_by_email: string;
}

class NotificationService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5173';
  }

  private getAuthHeaders(): HeadersInit {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async handleResponse(response: Response) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async getNotifications(unreadOnly: boolean = false, limit: number = 50): Promise<Notification[]> {
    const params = new URLSearchParams({
      unread_only: unreadOnly.toString(),
      limit: limit.toString(),
    });

    const response = await fetch(`${this.baseUrl}/api/notifications/?${params}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const data = await this.handleResponse(response);
    return data.notifications || [];
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/notifications/${notificationId}/read`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    await this.handleResponse(response);
  }

  async markAllNotificationsRead(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/notifications/read-all`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    await this.handleResponse(response);
  }

  async deleteNotification(notificationId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    await this.handleResponse(response);
  }

  async sendCourseInvite(courseId: string, friendId: string, role: string = 'Enrolled'): Promise<Notification> {
    const response = await fetch(`${this.baseUrl}/api/notifications/course-invite`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        course_id: courseId,
        friend_id: friendId,
        role: role,
      }),
    });

    const data = await this.handleResponse(response);
    return data.notification;
  }

  async respondToCourseInvite(notificationId: string, action: 'accept' | 'decline'): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/notifications/course-invite/${notificationId}/respond`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        action: action,
      }),
    });

    await this.handleResponse(response);
  }
}

export const notificationService = new NotificationService(); 