interface CourseData {
  id?: string;
  title: string;
  subject: string;
  courseCode?: string;
  semester: string;
  professor?: string;
  units?: number;
  variableUnits?: boolean;
  description: string;
  visibility?: 'Public' | 'Private' | 'Only Me' | 'Friends Only';
  tags?: string[];
  collaborators?: string[];
  dailyProgress?: number;
  isPinned?: boolean;
  isArchived?: boolean;
  badge?: 'Creator' | 'Enrolled';
  courseImage?: string;
  materials?: string[];
  createdAt?: string;
  updatedAt?: string;
  lastAccessed?: string;
}

interface CreateCourseRequest {
  subject: string;
  courseName?: string;
  customCourseName?: string;
  title?: string;
  courseCode?: string;
  semester: string;
  professor?: string;
  units?: number;
  variableUnits?: boolean;
  description: string;
  visibility?: string;
  tags?: string[];
  collaborators?: string[];
}

interface CourseFilters {
  showArchived?: boolean;
  search?: string;
  semester?: string;
  sortBy?: 'title' | 'progress' | 'last_accessed';
}

class CourseService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5173';
  }

  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async handleResponse(response: Response) {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  async getCourses(filters: CourseFilters = {}): Promise<CourseData[]> {
    const params = new URLSearchParams();
    
    if (filters.showArchived) params.append('show_archived', 'true');
    if (filters.search) params.append('search', filters.search);
    if (filters.semester && filters.semester !== 'all') params.append('semester', filters.semester);
    if (filters.sortBy) params.append('sort_by', filters.sortBy);

    const url = `${this.baseUrl}/api/courses${params.toString() ? `?${params.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  async getCourse(courseId: string): Promise<CourseData> {
    const response = await fetch(`${this.baseUrl}/api/courses/${courseId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  async createCourse(courseData: CreateCourseRequest): Promise<{ message: string; course: CourseData }> {
    const response = await fetch(`${this.baseUrl}/api/courses`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(courseData),
    });

    return this.handleResponse(response);
  }

  async updateCourse(courseId: string, courseData: Partial<CourseData>): Promise<{ message: string; course: CourseData }> {
    const response = await fetch(`${this.baseUrl}/api/courses/${courseId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(courseData),
    });

    return this.handleResponse(response);
  }

  async deleteCourse(courseId: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/api/courses/${courseId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  async togglePin(courseId: string): Promise<{ message: string; is_pinned: boolean }> {
    const response = await fetch(`${this.baseUrl}/api/courses/${courseId}/toggle-pin`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  async toggleArchive(courseId: string): Promise<{ message: string; is_archived: boolean }> {
    const response = await fetch(`${this.baseUrl}/api/courses/${courseId}/toggle-archive`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    return this.handleResponse(response);
  }

  async updateProgress(courseId: string, progress: number): Promise<{ message: string; daily_progress: number }> {
    const response = await fetch(`${this.baseUrl}/api/courses/${courseId}/progress`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ progress }),
    });

    return this.handleResponse(response);
  }

  /**
   * Fetch public courses for the Discover page
   * @param page - Page number for pagination
   * @param perPage - Number of courses per page
   * @param search - Optional search term to filter courses
   * @param subject - Optional subject to filter courses
   */
  async getPublicCourses(
    page: number = 1,
    perPage: number = 10,
    search: string = '',
    subject: string = ''
  ): Promise<{ courses: CourseData[]; total: number; page: number; per_page: number; total_pages: number }> {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        search,
        subject
      });
      const response = await fetch(`${this.baseUrl}/api/courses/public?${queryParams.toString()}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching public courses:', error);
      throw error;
    }
  }
}

export const courseService = new CourseService();
export type { CourseData, CreateCourseRequest, CourseFilters }; 