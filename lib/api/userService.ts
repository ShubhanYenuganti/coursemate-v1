const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5173';

export interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  college?: string;
  year?: string;
  major?: string;
  streak: {
    current: number;
    longest: number;
    last_visit: string | null;
  };
}

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_visit_date: string | null;
}

export interface WeeklyHoursData {
  weekly_hours: number;
  weekly_minutes: number;
  week_start: string;
  week_end: string;
  current_week: boolean;
  error?: string;
}

export interface WeeklyAvgTaskTimeData {
  total_tasks_this_week: number;
  total_minutes_this_week: number;
  avg_minutes_per_task: number;
  week_start: string;
  week_end: string;
  current_week: boolean;
  error?: string;
}

class UserService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async getCurrentUser(): Promise<UserData> {
    const response = await fetch(`${API_BASE_URL}/api/users/me`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }

    return response.json();
  }

  async getStreakData(): Promise<StreakData> {
    const response = await fetch(`${API_BASE_URL}/api/users/streak`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch streak data');
    }

    return response.json();
  }

  async getWeeklyHours(): Promise<WeeklyHoursData> {
    const response = await fetch(`${API_BASE_URL}/api/users/weekly-hours`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch weekly hours data');
    }

    return response.json();
  }

  async getWeeklyAvgTaskTime(): Promise<WeeklyAvgTaskTimeData> {
    const response = await fetch(`${API_BASE_URL}/api/users/weekly-avg-task-time`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch weekly average task time data');
    }

    return response.json();
  }

  async updateStreak(): Promise<StreakData> {
    const response = await fetch(`${API_BASE_URL}/api/users/streak`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to update streak');
    }

    return response.json();
  }

  async updateProfile(profileData: {
    fullName?: string;
    college?: string;
    year?: string;
    major?: string;
  }): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      throw new Error('Failed to update profile');
    }

    return response.json();
  }
}

export const userService = new UserService(); 