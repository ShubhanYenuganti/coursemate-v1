import { getAuthToken } from './authService';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  course: string;
  due_date: string;
  completed: boolean;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskData {
  title: string;
  course: string;
  due_date: string;
  color?: string;
  completed?: boolean;
}

export interface UpdateTaskData {
  title?: string;
  course?: string;
  due_date?: string;
  color?: string;
  completed?: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5173';

class TaskService {
  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const token = getAuthToken();
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getTasks(filter?: 'all' | 'today' | 'overdue' | 'upcoming', completed?: boolean): Promise<Task[]> {
    const params = new URLSearchParams();
    if (filter && filter !== 'all') {
      params.append('filter', filter);
    }
    if (completed !== undefined) {
      params.append('completed', completed.toString());
    }

    const endpoint = `/api/tasks/${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.makeRequest(endpoint);
    return response.tasks;
  }

  async getTask(taskId: string): Promise<Task> {
    const response = await this.makeRequest(`/api/tasks/${taskId}`);
    return response.task;
  }

  async createTask(taskData: CreateTaskData): Promise<Task> {
    const response = await this.makeRequest('/api/tasks/', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
    return response.task;
  }

  async updateTask(taskId: string, taskData: UpdateTaskData): Promise<Task> {
    const response = await this.makeRequest(`/api/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
    return response.task;
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.makeRequest(`/api/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  async toggleTask(taskId: string): Promise<Task> {
    const response = await this.makeRequest(`/api/tasks/${taskId}/toggle`, {
      method: 'PUT',
    });
    return response.task;
  }
}

export const taskService = new TaskService(); 