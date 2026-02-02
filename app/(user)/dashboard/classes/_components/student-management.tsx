'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-toastify';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Plus, Users, Upload, Download, Filter, FileEdit } from 'lucide-react';
import { handleApiError } from '@/utils/errorHandler';
import api from '@/lib/api';

interface Student {
  id: number;
  name: string;
  email?: string;
  grade_id: number;
  avg_percentage?: number | null;
  predicted_avg?: number | null;
  danger_level?: number | null;
  delta_percentage?: number | null;
  last_subject?: string | null;
  last_semester?: number | null;
  score_id?: number | null;
  actual_scores?: Record<string, number> | null;
}

interface Score {
  id: number;
  teacher_name: string;
  subject_name: string;
  actual_scores: Record<string, number> | null;
  predicted_scores: Record<string, number> | null;
  danger_level: number;
  delta_percentage: number | null;
  semester: number;
  student_id: number;
}

interface Grade {
  id: number;
  grade: string;
  parallel: string;
  curatorName: string;
  shanyrak: string;
  studentCount?: number;
  actualStudentCount?: number;
}

interface StudentManagementProps {
  grades: Grade[];
  onRefreshGrades: () => void;
  initialFilters?: {
    parallel?: string;
    gradeId?: number;
    dangerLevel?: number;
  };
}

export default function StudentManagement({ grades, onRefreshGrades, initialFilters }: StudentManagementProps) {
  const [selectedGradeId, setSelectedGradeId] = useState<number | null>(initialFilters?.gradeId || null);
  const [selectedParallel, setSelectedParallel] = useState<string>(initialFilters?.parallel || 'all');
  const [dangerFilter, setDangerFilter] = useState<number | null>(initialFilters?.dangerLevel ?? null);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentDetails, setStudentDetails] = useState<Student[]>([]);
  const [isAllSubjects, setIsAllSubjects] = useState(false);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  
  const uniqueStudentCount = isAllSubjects 
    ? students.length 
    : new Set(students.map(s => s.id)).size;
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isScoreDialogOpen, setIsScoreDialogOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [studentScores, setStudentScores] = useState<Score[]>([]);
  const [editingScore, setEditingScore] = useState<Score | null>(null);
  const [scoreFormData, setScoreFormData] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    parent_contact: ''
  });

  const selectedGrade = grades.find(g => g.id === selectedGradeId);

  // Apply initial filters when they change (e.g., from analytics navigation)
  useEffect(() => {
    if (initialFilters) {
      if (initialFilters.parallel !== undefined) {
        setSelectedParallel(initialFilters.parallel || 'all');
      }
      if (initialFilters.gradeId !== undefined) {
        setSelectedGradeId(initialFilters.gradeId || null);
      }
      if (initialFilters.dangerLevel !== undefined) {
        setDangerFilter(initialFilters.dangerLevel);
      }
    }
  }, [initialFilters]);

  useEffect(() => {
    // Fetch subjects whenever the list of available grades might change or a grade is selected
    // For now, if we have any grades, we can fetch subjects for the first one to get the list
    if (grades.length > 0) {
      const gId = selectedGradeId || grades[0].id;
      fetchSubjects(gId);
    }
  }, [selectedGradeId, grades]);

  useEffect(() => {
    fetchStudents();
  }, [selectedParallel, selectedGradeId, selectedSubject]);

  // Compute available parallels from grades (e.g. "7", "8")
  const parallels = Array.from(new Set(grades.map(g => {
    const match = g.grade.match(/^(\d+)/);
    return match ? match[1] : null;
  }))).filter(Boolean).sort((a, b) => parseInt(a!) - parseInt(b!));

  // Filter grades based on selected parallel
  const filteredGrades = grades.filter(g => {
    if (selectedParallel === 'all') return true;
    return g.grade.startsWith(selectedParallel);
  });

  const fetchSubjects = async (gradeId: number) => {
    try {
      const data = await api.getGradeSubjects(gradeId);
      setSubjects(data);
    } catch (err) {
      console.error('Failed to fetch subjects', err);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params: any = { subject: selectedSubject };
      if (selectedGradeId) {
        params.grade_id = selectedGradeId;
      } else if (selectedParallel !== 'all') {
        params.parallel = selectedParallel;
      }
      
      const data = await api.getStudentsUnified(params);
      if (selectedSubject === 'all' && data.summary && data.details) {
        setStudents(data.summary);
        setStudentDetails(data.details);
        setIsAllSubjects(true);
      } else {
        setStudents(Array.isArray(data) ? data : []);
        setStudentDetails([]);
        setIsAllSubjects(false);
      }
    } catch (err) {
      const apiError = handleApiError(err);
      toast.error(`Ошибка загрузки студентов: ${apiError.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', parent_contact: '' });
    setCurrentStudent(null);
  };

  const handleEditClick = (student: Student) => {
    setCurrentStudent(student);
    setFormData({
      name: student.name || '',
      email: student.email || '',
      phone: '',
      parent_contact: ''
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateStudent = async () => {
    if (!currentStudent) return;

    if (!formData.name.trim()) {
      toast.error('Введите имя студента');
      return;
    }

    try {
      await api.updateStudent(currentStudent.id, {
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        parent_contact: formData.parent_contact || undefined
      });
      toast.success('Студент успешно обновлён');
      setIsEditDialogOpen(false);
      resetForm();
      fetchStudents();
    } catch (err) {
      const apiError = handleApiError(err);
      toast.error(`Ошибка обновления студента: ${apiError.message}`);
    }
  };

  const handleCreateStudent = async () => {
    if (!selectedGradeId) return;

    // Проверяем обязательные поля
    if (!formData.name.trim()) {
      toast.error('Введите имя студента');
      return;
    }

    try {
      await api.createStudent({
        name: formData.name,
        email: formData.email || undefined,
        grade_id: selectedGradeId
      });
      toast.success('Студент успешно добавлен');
      setIsCreateDialogOpen(false);
      resetForm();
      fetchStudents();
      onRefreshGrades(); // Refresh grades to update student count
    } catch (err) {
      const apiError = handleApiError(err);
      toast.error(`Ошибка создания студента: ${apiError.message}`);
    }
  };

  const handleDeleteClick = (student: Student) => {
    setCurrentStudent(student);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteStudent = async () => {
    if (!currentStudent) return;

    try {
      await api.deleteStudent(currentStudent.id);
      toast.success('Студент успешно удален');
      setIsDeleteDialogOpen(false);
      resetForm();
      fetchStudents();
      onRefreshGrades(); // Refresh grades to update student count
    } catch (err) {
      const apiError = handleApiError(err);
      toast.error(`Ошибка удаления студента: ${apiError.message}`);
    }
  };

  // Score editing handlers
  const handleScoreClick = async (student: Student) => {
    setCurrentStudent(student);
    try {
      const scores = await api.getStudentScores(student.id);
      setStudentScores(scores);
      setIsScoreDialogOpen(true);
    } catch (err) {
      const apiError = handleApiError(err);
      toast.error(`Ошибка загрузки оценок: ${apiError.message}`);
    }
  };

  const handleEditScoreClick = async (student: Student) => {
    if (!student.score_id) {
      toast.error('Оценка не найдена');
      return;
    }
    setCurrentStudent(student);
    // Use actual_scores from the student object if available
    const scores = student.actual_scores || {};
    // Convert array to object with q1, q2, q3, q4 keys if it's an array
    if (Array.isArray(scores)) {
      const scoreObj: Record<string, number> = {};
      scores.forEach((val, idx) => {
        scoreObj[`q${idx + 1}`] = val ?? 0;
      });
      setScoreFormData(scoreObj);
    } else {
      setScoreFormData(scores);
    }
    setEditingScore({
      id: student.score_id,
      student_id: student.id,
      teacher_name: '',
      subject_name: student.last_subject || '',
      actual_scores: student.actual_scores || null,
      predicted_scores: null,
      danger_level: student.danger_level ?? 0,
      delta_percentage: student.delta_percentage ?? null,
      semester: student.last_semester ?? 1
    });
    setIsScoreDialogOpen(true);
  };

  const handleScoreInputChange = (key: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    setScoreFormData(prev => ({
      ...prev,
      [key]: isNaN(numValue) ? 0 : numValue
    }));
  };

  const handleSaveScore = async () => {
    if (!editingScore) return;

    try {
      await api.updateScore(editingScore.id, {
        actual_scores: scoreFormData
      });
      toast.success('Оценки успешно обновлены');
      
      // Refresh scores
      if (currentStudent) {
        const scores = await api.getStudentScores(currentStudent.id);
        setStudentScores(scores);
      }
      setEditingScore(null);
      setScoreFormData({});
      fetchStudents(); // Refresh student list to update danger levels
    } catch (err) {
      const apiError = handleApiError(err);
      toast.error(`Ошибка обновления оценок: ${apiError.message}`);
    }
  };

  const handleUpdateStudentCount = async () => {
    if (!selectedGradeId || !selectedGrade) return;

    try {
      // Нужно добавить этот метод в API, пока используем прямой вызов
      await api.updateGrade(selectedGradeId, {
        studentCount: uniqueStudentCount
      });
      toast.success('Количество студентов обновлено');
      onRefreshGrades();
    } catch (err) {
      const apiError = handleApiError(err);
      toast.error(`Ошибка обновления: ${apiError.message}`);
    }
  };

  const openCreateDialog = () => {
     if (!selectedGradeId) {
       toast.error('Сначала выберите класс');
       return;
     }
     resetForm();
     setIsCreateDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Grade Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users size={20} />
            Управление студентами
          </CardTitle>
          <CardDescription>
            Выберите класс и предмет для просмотра успеваемости
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="parallel-select">Параллель</Label>
              <Select value={selectedParallel} onValueChange={(val) => {setSelectedParallel(val); setSelectedGradeId(null);}}>
                <SelectTrigger>
                  <SelectValue placeholder="Все параллели" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все параллели</SelectItem>
                  {parallels.map(p => (
                    <SelectItem key={p!} value={p!}>{p} классы</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 space-y-2">
              <Label htmlFor="grade-select">Класс</Label>
              <Select value={selectedGradeId?.toString() || 'none'} onValueChange={(value) => setSelectedGradeId(value === 'none' ? null : parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите класс..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не выбран</SelectItem>
                  {filteredGrades.map((grade) => (
                    <SelectItem key={grade.id} value={grade.id.toString()}>
                      {grade.grade} - {grade.curatorName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 space-y-2">
              <Label htmlFor="subject-select">Выберите предмет</Label>
              <Select 
                value={selectedSubject} 
                onValueChange={setSelectedSubject}
                disabled={!selectedGradeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Все предметы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все предметы</SelectItem>
                  {subjects.map((subj) => (
                    <SelectItem key={subj} value={subj}>
                      {subj}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 space-y-2">
              <Label htmlFor="danger-filter">Уровень риска</Label>
              <Select 
                value={dangerFilter?.toString() || 'all'}
                onValueChange={(val) => setDangerFilter(val === 'all' ? null : parseInt(val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Все уровни" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все уровни</SelectItem>
                  <SelectItem value="0">Низкий</SelectItem>
                  <SelectItem value="1">Умеренный</SelectItem>
                  <SelectItem value="2">Высокий</SelectItem>
                  <SelectItem value="3">Критический</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={openCreateDialog} 
              disabled={!selectedGradeId}
              className="flex items-center gap-2"
            >
              <Plus size={16} /> Добавить студента
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Selected Grade Info */}
      {selectedGrade && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Класс {selectedGrade.grade}</span>
              <div className="flex gap-2">
                <Badge variant="secondary">
                  Куратор: {selectedGrade.curatorName}
                </Badge>
                <Badge variant="outline">
                  {selectedGrade.shanyrak}
                </Badge>
              </div>
            </CardTitle>
            <CardDescription>
              Фактическое количество студентов: {uniqueStudentCount} | 
              Записанное количество: {selectedGrade.studentCount || 0}
              {uniqueStudentCount !== (selectedGrade.studentCount || 0) && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-2"
                  onClick={handleUpdateStudentCount}
                >
                  Синхронизировать
                </Button>
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Students List */}
      {selectedGradeId && (
        <Card>
          <CardHeader>
            <CardTitle>Студенты</CardTitle>
            <CardDescription className="flex items-center gap-2">
              {loading ? 'Загрузка...' : (
                <>
                  <span>Студентов: {uniqueStudentCount}</span>
                  {isAllSubjects && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span>Записей по предметам: {studentDetails.length}</span>
                    </>
                  )}
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Загрузка студентов...</div>
            ) : students.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                В этом классе пока нет студентов.
                <br />
                <Button 
                  variant="outline" 
                  className="mt-2"
                  onClick={openCreateDialog}
                >
                  Добавить первого студента
                </Button>
              </div>
            ) : isAllSubjects && studentDetails.length > 0 ? (
              /* Детализированная таблица по предметам - показывается когда выбраны "Все предметы" */
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-100 text-left">
                      <th className="p-3 border-b border-gray-200 font-semibold text-sm">Имя</th>
                      <th className="p-3 border-b border-gray-200 font-semibold text-sm">Предмет</th>
                      <th className="p-3 border-b border-gray-200 font-semibold text-sm text-center">Средний %</th>
                      <th className="p-3 border-b border-gray-200 font-semibold text-sm text-center">Предикт %</th>
                      <th className="p-3 border-b border-gray-200 font-semibold text-sm text-center">Δ%</th>
                      <th className="p-3 border-b border-gray-200 font-semibold text-sm text-center">Риск</th>
                      <th className="p-3 border-b border-gray-200 font-semibold text-right text-sm">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Group details by student ID
                      const groupedDetails: Record<number, Student[]> = {};
                      const filteredDetails = studentDetails.filter(
                        detail => dangerFilter === null || detail.danger_level === dangerFilter
                      );
                      filteredDetails.forEach(detail => {
                        if (!groupedDetails[detail.id]) {
                          groupedDetails[detail.id] = [];
                        }
                        groupedDetails[detail.id].push(detail);
                      });

                      const studentIds = Object.keys(groupedDetails).map(Number);
                      
                      return studentIds.flatMap(studentId => {
                        const details = groupedDetails[studentId];
                        const student = students.find(s => s.id === studentId);
                        return details.map((detail, idx) => (
                          <tr key={`${detail.id}-${detail.last_subject}-${idx}`} className="hover:bg-gray-50 text-sm">
                            {idx === 0 && (
                              <td 
                                className="p-3 border border-gray-200 font-medium bg-white" 
                                rowSpan={details.length}
                              >
                                {detail.name}
                              </td>
                            )}
                            <td className="p-3 border border-gray-200 text-gray-600">{detail.last_subject}</td>
                            <td className="p-3 border border-gray-200 text-center">{detail.avg_percentage ?? '-'}</td>
                            <td className="p-3 border border-gray-200 text-center">{detail.predicted_avg ?? '-'}</td>
                            <td className="p-3 border border-gray-200 text-center">{detail.delta_percentage ?? '-'}</td>
                            <td className="p-3 border border-gray-200 text-center">
                              {typeof detail.danger_level === 'number' ? (
                                <Badge
                                  variant="outline"
                                  className={
                                    detail.danger_level === 0 ? 'border-green-200 text-green-700' :
                                    detail.danger_level === 1 ? 'border-yellow-200 text-yellow-700' :
                                    detail.danger_level === 2 ? 'border-orange-200 text-orange-700' :
                                    'border-red-200 text-red-700'
                                  }
                                >
                                  {detail.danger_level === 0 ? 'Низкий' : detail.danger_level === 1 ? 'Умеренный' : detail.danger_level === 2 ? 'Высокий' : 'Критический'}
                                </Badge>
                              ) : '-'}
                            </td>
                            <td className="p-3 border border-gray-200 text-right space-x-1">
                              {detail.score_id && (
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  onClick={() => handleEditScoreClick(detail)}
                                  className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  title="Редактировать оценки"
                                >
                                  <FileEdit size={16} />
                                </Button>
                              )}
                              {idx === 0 && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                                    onClick={() => student && handleEditClick(student)}
                                    className="h-8 w-8"
                                    title="Редактировать студента"
                                  >
                                    <Pencil size={16} />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                                    onClick={() => student && handleDeleteClick(student)}
                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    title="Удалить студента"
                                  >
                                    <Trash2 size={16} />
                                  </Button>
                                </>
                              )}
                            </td>
                          </tr>
                        ));
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Простая таблица - показывается когда выбран конкретный предмет */
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="p-3 border-b border-gray-200 font-semibold text-sm">ID</th>
                        <th className="p-3 border-b border-gray-200 font-semibold text-sm">Имя</th>
                        <th className="p-3 border-b border-gray-200 font-semibold text-sm">Email</th>
                        {!isAllSubjects && (
                          <>
                            <th className="p-3 border-b border-gray-200 font-semibold text-sm">Предмет</th>
                            <th className="p-3 border-b border-gray-200 font-semibold text-sm">Четверть</th>
                          </>
                        )}
                        <th className="p-3 border-b border-gray-200 font-semibold text-sm text-center">Средний %</th>
                        <th className="p-3 border-b border-gray-200 font-semibold text-sm text-center">Предикт %</th>
                        <th className="p-3 border-b border-gray-200 font-semibold text-sm text-center">Δ%</th>
                        <th className="p-3 border-b border-gray-200 font-semibold text-sm">Риск</th>
                        <th className="p-3 border-b border-gray-200 font-semibold text-right text-sm">Действия</th>
                      </tr>
                  </thead>
                  <tbody>
                    {students
                      .filter(student => dangerFilter === null || student.danger_level === dangerFilter)
                      .map(student => (
                      <tr key={student.id} className="hover:bg-gray-50">
                          <td className="p-3 border-b border-gray-200 font-mono text-sm">{student.id}</td>
                          <td className="p-3 border-b border-gray-200 font-medium">{student.name}</td>
                          <td className="p-3 border-b border-gray-200 text-gray-600">
                            {student.email || 'Не указан'}
                          </td>
                          {!isAllSubjects && (
                            <>
                              <td className="p-3 border-b border-gray-200 text-gray-600">{student.last_subject || '-'}</td>
                              <td className="p-3 border-b border-gray-200 text-gray-600">{student.last_semester ? `${student.last_semester}` : '-'}</td>
                            </>
                          )}
                          <td className="p-3 border-b border-gray-200 text-center">{student.avg_percentage ?? '-'}</td>
                          <td className="p-3 border-b border-gray-200 text-center">{student.predicted_avg ?? '-'}</td>
                          <td className="p-3 border-b border-gray-200 text-center">{student.delta_percentage ?? '-'}</td>
                          <td className="p-3 border-b border-gray-200">
                            {typeof student.danger_level === 'number' ? (
                              <Badge
                                className={
                                  student.danger_level === 0 ? 'bg-green-100 text-green-800' :
                                  student.danger_level === 1 ? 'bg-yellow-100 text-yellow-800' :
                                  student.danger_level === 2 ? 'bg-orange-100 text-orange-800' :
                                  'bg-red-100 text-red-800'
                                }
                              >
                                {student.danger_level === 0 ? 'Низкий' : student.danger_level === 1 ? 'Умеренный' : student.danger_level === 2 ? 'Высокий' : 'Критический'}
                              </Badge>
                            ) : '-'}
                          </td>
                        <td className="p-3 border-b border-gray-200 text-right space-x-1">
                          {student.score_id && (
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={() => handleEditScoreClick(student)}
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Редактировать оценки"
                            >
                              <FileEdit size={16} />
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => handleEditClick(student)}
                            className="h-8 w-8"
                            title="Редактировать студента"
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => handleDeleteClick(student)}
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Удалить студента"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Student Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить студента</DialogTitle>
            <DialogDescription>
              Добавление нового студента в класс {selectedGrade?.grade}. 
              Предметы и оценки добавляются отдельно через загрузку Excel файлов.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="student-name">Имя студента *</Label>
              <Input
                id="student-name"
                name="name"
                placeholder="Введите полное имя"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="student-email">Email (необязательно)</Label>
              <Input
                id="student-email"
                name="email"
                type="email"
                placeholder="student@example.com"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
            {/* Предмет убран — добавляется через Excel */}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Отмена
            </Button>
            <Button 
              onClick={handleCreateStudent}
              disabled={!formData.name.trim()}
            >
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать студента</DialogTitle>
            <DialogDescription>
              Редактирование данных студента "{currentStudent?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-student-name">Имя студента *</Label>
              <Input
                id="edit-student-name"
                name="name"
                placeholder="Введите полное имя"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-student-email">Email (необязательно)</Label>
              <Input
                id="edit-student-email"
                name="email"
                type="email"
                placeholder="student@example.com"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-student-phone">Телефон (необязательно)</Label>
              <Input
                id="edit-student-phone"
                name="phone"
                type="tel"
                placeholder="+7 (XXX) XXX-XX-XX"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-student-parent">Контакт родителя (необязательно)</Label>
              <Input
                id="edit-student-parent"
                name="parent_contact"
                placeholder="Телефон или email родителя"
                value={formData.parent_contact}
                onChange={handleInputChange}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)}
            >
              Отмена
            </Button>
            <Button 
              onClick={handleUpdateStudent}
              disabled={!formData.name.trim()}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Student Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить студента</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить студента "{currentStudent?.name}"? 
              Это также удалит все связанные с ним оценки. Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Отмена
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteStudent}
            >
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Score Editing Dialog */}
      <Dialog open={isScoreDialogOpen} onOpenChange={(open) => {
        setIsScoreDialogOpen(open);
        if (!open) {
          setEditingScore(null);
          setScoreFormData({});
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Редактировать оценки</DialogTitle>
            <DialogDescription>
              Студент: {currentStudent?.name}
              {editingScore?.subject_name && ` • ${editingScore.subject_name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 gap-3">
              {['q1', 'q2', 'q3', 'q4'].map((quarter, index) => (
                <div key={quarter} className="flex flex-col gap-1">
                  <Label htmlFor={`score-${quarter}`} className="text-center text-sm">
                    {index + 1} чет.
                  </Label>
                  <Input
                    id={`score-${quarter}`}
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="0"
                    value={scoreFormData[quarter] || ''}
                    onChange={(e) => handleScoreInputChange(quarter, e.target.value)}
                    className="text-center"
                  />
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 text-center">
              Введите проценты от 0 до 100 для каждой четверти
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsScoreDialogOpen(false);
                setEditingScore(null);
                setScoreFormData({});
              }}
            >
              Отмена
            </Button>
            <Button 
              onClick={handleSaveScore}
              disabled={!editingScore}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 