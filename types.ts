export interface NavItem {
  title: string;
  url: string;
  icon?: string;
  isActive?: boolean;
  items?: NavSubItem[];
  teacherOnly?: boolean;
  adminOnly?: boolean;
}

export interface NavSubItem {
  title: string;
  url: string;
}

// ==================== ENHANCED SCHOOL MANAGEMENT TYPES ====================

export interface Subgroup {
  id: number;
  name: string;
  grade_id: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSubgroup {
  name: string;
  grade_id: number;
}

export interface UpdateSubgroup {
  name?: string;
  is_active?: number;
}

export interface CuratorAssignment {
  id: number;
  curator_id: number;
  grade_id: number;
  created_at: string;
  curator_name?: string;
  grade_name?: string;
}

export interface CreateCuratorAssignment {
  curator_id: number;
  grade_id: number;
}

export interface TeacherAssignment {
  id: number;
  teacher_id: number;
  subject_id: number;
  grade_id?: number;
  subgroup_id?: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  teacher_name?: string;
  subject_name?: string;
  grade_name?: string;
  subgroup_name?: string;
}

export interface CreateTeacherAssignment {
  teacher_id: number;
  subject_id: number;
  grade_id?: number;
  subgroup_id?: number;
}

export interface UpdateTeacherAssignment {
  is_active?: number;
}

export interface DisciplinaryAction {
  id: number;
  student_id: number;
  action_type: string;
  description: string;
  severity_level: number;
  issued_by: number;
  action_date: string;
  is_resolved: number;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
  student_name?: string;
  issuer_name?: string;
}

export interface CreateDisciplinaryAction {
  student_id: number;
  action_type: string;
  description: string;
  severity_level?: number;
  action_date?: string;
}

export interface UpdateDisciplinaryAction {
  action_type?: string;
  description?: string;
  severity_level?: number;
  is_resolved?: number;
  resolution_notes?: string;
}

export interface Achievement {
  id: number;
  student_id: number;
  title: string;
  description?: string;
  category: string;
  achievement_date: string;
  awarded_by: number;
  points: number;
  certificate_url?: string;
  created_at: string;
  updated_at: string;
  student_name?: string;
  awarder_name?: string;
}

export interface CreateAchievement {
  student_id: number;
  title: string;
  description?: string;
  category: string;
  achievement_date?: string;
  points?: number;
  certificate_url?: string;
}

export interface UpdateAchievement {
  title?: string;
  description?: string;
  category?: string;
  achievement_date?: string;
  points?: number;
  certificate_url?: string;
}

export interface ExcelUploadRequest {
  grade_id: number;
  subject_id: number;
  teacher_name: string;
  semester?: number;
  subgroup_id?: number;
}

export interface ExcelUploadResponse {
  success: boolean;
  message: string;
  imported_count: number;
  warnings: string[];
  errors: string[];
  danger_distribution: Record<string, number>;
}

export interface User {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  type: string;
  company_name?: string;
  shanyrak?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  assigned_grades_count?: number;  // For curators
  assignment_count?: number;       // For teachers
}

export interface Subject {
  id: number;
  name: string;
  description?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Grade {
  id: number;
  grade: string;
  parallel: string;
  curator_id?: number;
  curator_name?: string;
  student_count: number;
  actual_student_count?: number;
  created_at: string;
  updated_at: string;
  user_id: number;
  curator_info?: {
    id: number;
    name: string;
    first_name?: string;
    last_name?: string;
    email: string;
    shanyrak?: string;
  };
}

export interface Student {
  id: number;
  name: string;
  email?: string;
  student_id_number?: string;
  phone?: string;
  parent_contact?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  grade_id: number;
  subgroup_id?: number;
  user_id?: number;
}

export interface StudentProfile extends Student {
  scores: StudentScore[];
  disciplinary_actions: DisciplinaryAction[];
  achievements: Achievement[];
  grade_info?: Grade;
  subgroup_info?: Subgroup;
}

export interface StudentScore {
  id: number;
  teacher_name: string;
  subject_name: string;
  subject_id?: number;
  actual_scores: number[];
  predicted_scores: number[];
  danger_level: number;
  delta_percentage?: number;
  semester: number;
  academic_year: string;
  created_at: string;
  updated_at: string;
  student_id: number;
  grade_id: number;
  subgroup_id?: number;
  previous_class_score?: number | null;
}

export interface DisciplineStatistics {
  total_actions: number;
  resolved_actions: number;
  unresolved_actions: number;
  resolution_rate: number;
  severity_distribution: Record<number, number>;
  action_type_distribution: Record<string, number>;
}

export interface AchievementStatistics {
  total_achievements: number;
  total_points: number;
  average_points_per_achievement: number;
  category_distribution: Record<string, number>;
  category_points: Record<string, number>;
  top_achievers: Array<{
    student_id: number;
    student_name: string;
    total_points: number;
  }>;
} 