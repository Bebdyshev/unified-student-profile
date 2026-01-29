import axios, { AxiosResponse } from 'axios';
import { handleApiError, ApiError } from '@/utils/errorHandler';

// Base axios instance configuration
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle auth errors globally
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized errors globally
    if (error.response && error.response.status === 401) {
      // Check if we're not already on the login page
      if (typeof window !== 'undefined' &&
        !window.location.pathname.includes('/signin') &&
        !window.location.pathname.includes('/signup')) {

        // Clear token
        localStorage.removeItem('access_token');

        // Redirect to login page
        window.location.href = '/signin';
        // Preserve the original AxiosError to avoid losing non-enumerable props
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// ==================== TYPE DEFINITIONS ====================

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  company_name: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

// User types
export interface User {
  id: number;
  name: string;
  email: string;
  type: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  type: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  type?: string;
}

// Student types
export interface Student {
  id: number;
  name: string;
  parallel: string;
  class_name: string;
  average_grade?: number;
  danger_level?: number;
}

export interface CreateStudentRequest {
  name: string;
  email?: string;
  student_id_number?: string;
  phone?: string;
  parent_contact?: string;
  grade_id: number;
}

export interface UpdateStudentRequest {
  name?: string;
  parallel?: string;
  class_name?: string;
}

// Grade types
export interface Grade {
  id: number;
  student_id: number;
  subject: string;
  grade: number;
  date: string;
  semester: number;
  parallel: string;
  class_name: string;
  actualStudentCount?: number;
}

export interface CreateGradeRequest {
  student_id: number;
  subject: string;
  grade: number;
  date: string;
  semester: number;
  parallel: string;
  class_name: string;
}

export interface UpdateGradeRequest {
  subject?: string;
  grade?: number;
  date?: string;
  semester?: number;
  parallel?: string;
  class_name?: string;
  studentCount?: number;
}

// Dashboard types
export interface DangerLevelStats {
  [key: number]: {
    student_count: number;
    avg_delta_percentage: number;
  };
  total_students: number;
  avg_danger_level: number;
}

export interface DashboardResponse {
  danger_level_stats: DangerLevelStats;
  all_dangerous_classes: any[];
}

export interface PieChartResponse {
  class_danger_percentages: Array<{
    class_name: string;
    danger_percentage: number;
  }>;
}

export interface DangerStudentsResponse {
  filtered_class_data: Array<{
    class: Student[];
    class_name: string;
    parallel: string;
  }>;
}

// Analytics types
export interface AnalyticsData {
  level: number;
  count: number;
  students: any[];
}

// Actionable Insights types
export interface AtRiskStudent {
  id: number;
  name: string;
  class: string;
  avg_danger_level: number;
  avg_delta_percentage: number;
  subjects_affected: number;
  priority: 'critical' | 'high';
}

export interface ProblemClass {
  id: number;
  class: string;
  curator: string;
  student_count: number;
  avg_danger_level: number;
  at_risk_students: number;
  attention_needed: 'immediate' | 'monitor';
}

export interface SubjectAnalysis {
  subject: string;
  students_count: number;
  avg_danger_level: number;
  avg_performance_gap: number;
  problem_students: number;
  status: 'critical' | 'warning' | 'ok';
}

export interface Recommendation {
  type: 'urgent' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  action: string | null;
  link: string | null;
}

export interface InsightsData {
  at_risk_students: AtRiskStudent[];
  problem_classes: ProblemClass[];
  subject_analysis: SubjectAnalysis[];
  recommendations: Recommendation[];
  summary: {
    total_students: number;
    at_risk_count: number;
    critical_count: number;
    at_risk_percentage: number;
  };
}

// Class types
export interface ClassData {
  class_name: string;
  parallel: string;
  avg_danger_level: number;
  students: Student[];
}

// System Settings types
export interface SystemSettings {
  id: number;
  min_grade: number;
  max_grade: number;
  class_letters: string[];
  school_name?: string;
  academic_year: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSystemSettingsRequest {
  min_grade?: number;
  max_grade?: number;
  class_letters?: string[];
  school_name?: string;
  academic_year?: string;
}

export interface UpdateSystemSettingsRequest {
  min_grade?: number;
  max_grade?: number;
  class_letters?: string[];
  school_name?: string;
  academic_year?: string;
}

// Prediction Settings types
export interface PredictionWeights {
  previous_class: number;
  teacher: number;
  quarters: number;
}

export interface PredictionWeightsResponse {
  id: number;
  name: string;
  weights: PredictionWeights;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface UpdatePredictionWeightsRequest {
  weights: PredictionWeights;
  name?: string;
}

// Excel Column Mapping types
export interface ExcelColumnMapping {
  id: number;
  field_name: string;
  column_aliases: string[];
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface CreateExcelColumnMappingRequest {
  field_name: string;
  column_aliases: string[];
}

export interface UpdateExcelColumnMappingRequest {
  column_aliases?: string[];
  is_active?: number;
}

export interface AvailableClassesResponse {
  classes: string[];
  grades: number[];
}

// ==================== API SERVICE CLASS ====================

class ApiService {
  // ==================== AUTH ENDPOINTS ====================

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response: AxiosResponse<AuthResponse> = await apiClient.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async signup(userData: SignupRequest): Promise<AuthResponse> {
    try {
      const response: AxiosResponse<AuthResponse> = await apiClient.post('/auth/signup', userData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      await apiClient.post('/auth/reset-password', { email });
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response: AxiosResponse<User> = await apiClient.get('/auth/users/me');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // ==================== USER MANAGEMENT ====================

  async getUsers(): Promise<User[]> {
    try {
      const response: AxiosResponse<User[]> = await apiClient.get('/users/');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async createUser(userData: CreateUserRequest): Promise<User> {
    try {
      const response: AxiosResponse<User> = await apiClient.post('/users/', userData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updateUser(userId: number, userData: UpdateUserRequest): Promise<User> {
    try {
      const response: AxiosResponse<User> = await apiClient.put(`/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async deleteUser(userId: number): Promise<void> {
    try {
      await apiClient.delete(`/users/${userId}`);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // ==================== DASHBOARD ====================

  async getDangerLevels(): Promise<DashboardResponse> {
    try {
      const response: AxiosResponse<DashboardResponse> = await apiClient.get('/dashboard/danger-levels');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getDangerLevelsPieChart(): Promise<PieChartResponse> {
    try {
      const response: AxiosResponse<PieChartResponse> = await apiClient.get('/dashboard/danger-levels-piechart');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // ==================== GRADES & CLASSES ====================

  async getGrades(): Promise<Grade[]> {
    try {
      const response: AxiosResponse<Grade[]> = await apiClient.get('/grades/');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getAllGrades(): Promise<any[]> {
    try {
      const response: AxiosResponse<any[]> = await apiClient.get('/grades/all/');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async createGrade(gradeData: CreateGradeRequest): Promise<Grade> {
    try {
      const response: AxiosResponse<Grade> = await apiClient.post('/grades/', gradeData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updateGrade(gradeId: number, gradeData: UpdateGradeRequest): Promise<Grade> {
    try {
      const response: AxiosResponse<Grade> = await apiClient.put(`/grades/${gradeId}`, gradeData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getGradeById(gradeId: number): Promise<import('@/types').Grade> {
    try {
      const response: AxiosResponse<import('@/types').Grade> = await apiClient.get(`/grades/${gradeId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async deleteGrade(gradeId: number): Promise<void> {
    try {
      await apiClient.delete(`/grades/${gradeId}`);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getSubjects(): Promise<string[]> {
    try {
      const response: AxiosResponse<string[]> = await apiClient.get('/grades/subjects');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getParallels(): Promise<string[]> {
    try {
      const response: AxiosResponse<string[]> = await apiClient.get('/grades/parallels');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }


  async getUsersByType(userType: string): Promise<import('@/types').User[]> {
    try {
      const response = await apiClient.get(`/users/by-type/${userType}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getStudentsByDangerLevel(level: number): Promise<DangerStudentsResponse> {
    try {
      const response: AxiosResponse<DangerStudentsResponse> = await apiClient.get(`/grades/get_students_danger?level=${level}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getClassData(parallel: string, className: string): Promise<ClassData> {
    try {
      const response: AxiosResponse<ClassData> = await apiClient.get(`/grades/class`, {
        params: { parallel, class_name: className }
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getStudentGrades(studentId: number): Promise<Grade[]> {
    try {
      const response: AxiosResponse<Grade[]> = await apiClient.get(`/grades/student/${studentId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getAllClassData(): Promise<any> {
    try {
      const response: AxiosResponse<any> = await apiClient.get('/grades/get_class');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // ==================== STUDENTS ====================

  async getStudents(): Promise<Student[]> {
    try {
      const response: AxiosResponse<Student[]> = await apiClient.get('/grades/students/');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async createStudent(studentData: CreateStudentRequest): Promise<Student> {
    try {
      // Backend expects body with keys: { student_data: { ... }, grade_id: number }
      const { grade_id, ...rest } = studentData as any;
      const payload = {
        student_data: { ...rest, grade_id },
        grade_id,
      };
      const response: AxiosResponse<Student> = await apiClient.post('/grades/students/', payload);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updateStudent(studentId: number, studentData: UpdateStudentRequest): Promise<Student> {
    try {
      const response: AxiosResponse<Student> = await apiClient.put(`/grades/students/${studentId}`, studentData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async deleteStudent(studentId: number): Promise<void> {
    try {
      await apiClient.delete(`/grades/students/${studentId}`);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getStudentsByGrade(gradeId: number): Promise<any[]> {
    try {
      const response: AxiosResponse<any[]> = await apiClient.get(`/grades/students/${gradeId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // ==================== FILE UPLOAD ====================

  async uploadFile(file: File, endpoint: string): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async uploadGradeFile(grade: string, curator: string, subject: string, file: File): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('grade', grade);
      formData.append('curator', curator);
      formData.append('subject', subject);
      formData.append('file', file);

      const response = await apiClient.post('/grades/send/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // ==================== ANALYTICS ====================

  async getAnalytics(): Promise<AnalyticsData[]> {
    try {
      const dangerLevels = [1, 2, 3];
      const promises = dangerLevels.map(async (level) => {
        try {
          const response = await this.getStudentsByDangerLevel(level);
          const studentCount = response.filtered_class_data.reduce(
            (total: number, classData: any) => total + classData.class.length, 0
          );
          return {
            level,
            count: studentCount,
            students: response.filtered_class_data
          };
        } catch (error) {
          return { level, count: 0, students: [] };
        }
      });

      return await Promise.all(promises);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getInsights(): Promise<InsightsData> {
    try {
      const response: AxiosResponse<InsightsData> = await apiClient.get('/dashboard/insights');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // ==================== SYSTEM SETTINGS ====================

  async getSystemSettings(): Promise<SystemSettings> {
    try {
      const response: AxiosResponse<SystemSettings> = await apiClient.get('/settings/');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updateSystemSettings(settingsData: UpdateSystemSettingsRequest): Promise<SystemSettings> {
    try {
      const response: AxiosResponse<SystemSettings> = await apiClient.put('/settings/', settingsData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async createSystemSettings(settingsData: CreateSystemSettingsRequest): Promise<any> {
    try {
      const response = await apiClient.post('/settings/', settingsData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getAvailableClasses(): Promise<AvailableClassesResponse> {
    try {
      const response: AxiosResponse<AvailableClassesResponse> = await apiClient.get('/settings/available-classes');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Prediction Weights
  async getPredictionWeights(): Promise<PredictionWeightsResponse> {
    try {
      const response: AxiosResponse<PredictionWeightsResponse> = await apiClient.get('/settings/prediction-weights');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updatePredictionWeights(weightsData: UpdatePredictionWeightsRequest): Promise<PredictionWeightsResponse> {
    try {
      const response: AxiosResponse<PredictionWeightsResponse> = await apiClient.put('/settings/prediction-weights', weightsData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Excel Column Mappings
  async getExcelColumnMappings(): Promise<ExcelColumnMapping[]> {
    try {
      const response: AxiosResponse<ExcelColumnMapping[]> = await apiClient.get('/settings/excel-mapping');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async createExcelColumnMapping(mappingData: CreateExcelColumnMappingRequest): Promise<ExcelColumnMapping> {
    try {
      const response: AxiosResponse<ExcelColumnMapping> = await apiClient.post('/settings/excel-mapping', mappingData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updateExcelColumnMapping(fieldName: string, mappingData: UpdateExcelColumnMappingRequest): Promise<ExcelColumnMapping> {
    try {
      const response: AxiosResponse<ExcelColumnMapping> = await apiClient.put(`/settings/excel-mapping/${fieldName}`, mappingData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // ==================== ENHANCED SCHOOL MANAGEMENT ====================

  // Subgroups
  async getSubgroupsByGrade(gradeId: number): Promise<import('@/types').Subgroup[]> {
    try {
      const response = await apiClient.get(`/subgroups/${gradeId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async createSubgroup(subgroupData: import('@/types').CreateSubgroup): Promise<{ id: number; message: string }> {
    try {
      const response = await apiClient.post('/subgroups/', subgroupData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updateSubgroup(subgroupId: number, subgroupData: import('@/types').UpdateSubgroup): Promise<{ message: string }> {
    try {
      const response = await apiClient.put(`/subgroups/${subgroupId}`, subgroupData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async deleteSubgroup(subgroupId: number): Promise<{ message: string }> {
    try {
      const response = await apiClient.delete(`/subgroups/${subgroupId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getSubgroupStudents(subgroupId: number): Promise<import('@/types').Student[]> {
    try {
      const response = await apiClient.get(`/subgroups/${subgroupId}/students`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Teacher Assignments
  async getTeacherAssignments(params?: {
    grade_id?: number;
    subject_id?: number;
    teacher_id?: number;
    subgroup_id?: number;
  }): Promise<import('@/types').TeacherAssignment[]> {
    try {
      const response = await apiClient.get('/assignments/', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async createTeacherAssignment(assignmentData: import('@/types').CreateTeacherAssignment): Promise<{ id: number; message: string }> {
    try {
      const response = await apiClient.post('/assignments/', assignmentData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updateTeacherAssignment(assignmentId: number, assignmentData: import('@/types').UpdateTeacherAssignment): Promise<{ message: string }> {
    try {
      const response = await apiClient.put(`/assignments/${assignmentId}`, assignmentData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async deleteTeacherAssignment(assignmentId: number): Promise<{ message: string }> {
    try {
      const response = await apiClient.delete(`/assignments/${assignmentId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getAvailableTeachers(): Promise<import('@/types').User[]> {
    try {
      const response = await apiClient.get('/assignments/teachers');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getAssignmentsByGrade(gradeId: number): Promise<import('@/types').TeacherAssignment[]> {
    try {
      const response = await apiClient.get(`/assignments/by-grade/${gradeId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Curator Management
  async getCuratorAssignments(): Promise<import('@/types').CuratorAssignment[]> {
    try {
      const response = await apiClient.get('/curators/');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async createCuratorAssignment(assignmentData: import('@/types').CreateCuratorAssignment): Promise<{ id: number; message: string }> {
    try {
      const response = await apiClient.post('/curators/', assignmentData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async deleteCuratorAssignment(assignmentId: number): Promise<{ message: string }> {
    try {
      const response = await apiClient.delete(`/curators/${assignmentId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getAvailableCurators(): Promise<import('@/types').User[]> {
    try {
      const response = await apiClient.get('/curators/available');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getGradesByCurator(curatorId: number): Promise<any[]> {
    try {
      const response = await apiClient.get(`/curators/by-curator/${curatorId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getCuratorByGrade(gradeId: number): Promise<any> {
    try {
      const response = await apiClient.get(`/curators/by-grade/${gradeId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Disciplinary Actions
  async getDisciplinaryActions(params?: {
    student_id?: number;
    severity_level?: number;
    is_resolved?: number;
    limit?: number;
    offset?: number;
  }): Promise<import('@/types').DisciplinaryAction[]> {
    try {
      const response = await apiClient.get('/discipline/', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async createDisciplinaryAction(actionData: import('@/types').CreateDisciplinaryAction): Promise<{ id: number; message: string }> {
    try {
      const response = await apiClient.post('/discipline/', actionData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updateDisciplinaryAction(actionId: number, actionData: import('@/types').UpdateDisciplinaryAction): Promise<{ message: string }> {
    try {
      const response = await apiClient.put(`/discipline/${actionId}`, actionData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async deleteDisciplinaryAction(actionId: number): Promise<{ message: string }> {
    try {
      const response = await apiClient.delete(`/discipline/${actionId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getStudentDisciplinaryActions(studentId: number): Promise<import('@/types').DisciplinaryAction[]> {
    try {
      const response = await apiClient.get(`/discipline/student/${studentId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getDisciplineStatistics(gradeId?: number): Promise<import('@/types').DisciplineStatistics> {
    try {
      const params = gradeId ? { grade_id: gradeId } : {};
      const response = await apiClient.get('/discipline/statistics', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Achievements
  async getAchievements(params?: {
    student_id?: number;
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<import('@/types').Achievement[]> {
    try {
      const response = await apiClient.get('/achievements/', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async createAchievement(achievementData: import('@/types').CreateAchievement): Promise<{ id: number; message: string }> {
    try {
      const response = await apiClient.post('/achievements/', achievementData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updateAchievement(achievementId: number, achievementData: import('@/types').UpdateAchievement): Promise<{ message: string }> {
    try {
      const response = await apiClient.put(`/achievements/${achievementId}`, achievementData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async deleteAchievement(achievementId: number): Promise<{ message: string }> {
    try {
      const response = await apiClient.delete(`/achievements/${achievementId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getStudentAchievements(studentId: number): Promise<import('@/types').Achievement[]> {
    try {
      const response = await apiClient.get(`/achievements/student/${studentId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getAchievementCategories(): Promise<string[]> {
    try {
      const response = await apiClient.get('/achievements/categories');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getAchievementStatistics(gradeId?: number): Promise<import('@/types').AchievementStatistics> {
    try {
      const params = gradeId ? { grade_id: gradeId } : {};
      const response = await apiClient.get('/achievements/statistics', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Subjects (Enhanced)
  async getAllSubjects(): Promise<import('@/types').Subject[]> {
    try {
      const response = await apiClient.get('/subjects/');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async createSubject(subjectData: { name: string; description?: string; applicable_parallels?: number[] }): Promise<{ id: number; message: string }> {
    try {
      const response = await apiClient.post('/subjects/', subjectData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updateSubject(subjectId: number, subjectData: { name?: string; description?: string; is_active?: number; applicable_parallels?: number[] }): Promise<{ message: string }> {
    try {
      const response = await apiClient.put(`/subjects/${subjectId}`, subjectData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async deleteSubject(subjectId: number): Promise<{ message: string }> {
    try {
      const response = await apiClient.delete(`/subjects/${subjectId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Excel Upload (Enhanced)
  async uploadScores(uploadData: {
    grade_id: number;
    subject_id: number;
    teacher_name: string;
    semester?: number;
    subgroup_id?: number;
    file: File;
  }): Promise<import('@/types').ExcelUploadResponse> {
    try {
      const formData = new FormData();
      formData.append('grade_id', uploadData.grade_id.toString());
      formData.append('subject_id', uploadData.subject_id.toString());
      formData.append('teacher_name', uploadData.teacher_name);
      if (uploadData.semester) {
        formData.append('semester', uploadData.semester.toString());
      }
      if (uploadData.subgroup_id) {
        formData.append('subgroup_id', uploadData.subgroup_id.toString());
      }
      formData.append('file', uploadData.file);

      const response = await apiClient.post('/grades/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async downloadExcelTemplate(): Promise<Blob> {
    try {
      const response = await apiClient.get('/grades/template', {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Student Profile
  async getStudentProfile(studentId: number): Promise<import('@/types').StudentProfile> {
    try {
      // Get student basic info
      const studentResponse = await apiClient.get(`/grades/student/${studentId}`);
      const student = studentResponse.data;

      // Get student scores
      const scoresResponse = await apiClient.get(`/grades/student/${studentId}/scores`);
      const scores = scoresResponse.data;

      // Get disciplinary actions
      const disciplinaryActions = await this.getStudentDisciplinaryActions(studentId);

      // Get achievements
      const achievements = await this.getStudentAchievements(studentId);

      // Get grade info if available
      let gradeInfo = null;
      if (student.grade_id) {
        try {
          const gradeResponse = await apiClient.get(`/grades/${student.grade_id}`);
          gradeInfo = gradeResponse.data;
        } catch (error) {
          // Grade info is optional
        }
      }

      // Get subgroup info if available
      let subgroupInfo = null;
      if (student.subgroup_id) {
        try {
          const subgroupResponse = await apiClient.get(`/subgroups/${student.subgroup_id}`);
          subgroupInfo = subgroupResponse.data;
        } catch (error) {
          // Subgroup info is optional
        }
      }

      return {
        ...student,
        scores,
        disciplinary_actions: disciplinaryActions,
        achievements,
        grade_info: gradeInfo,
        subgroup_info: subgroupInfo,
      };
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

// Create and export a singleton instance
const api = new ApiService();
export default api;

// Also export the axios instance for direct use if needed
export { apiClient };
