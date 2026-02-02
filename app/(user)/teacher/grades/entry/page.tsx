'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-toastify';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, ArrowLeft, Upload } from 'lucide-react';
import { handleApiError } from '@/utils/errorHandler';
import api from '@/lib/api';
import Link from 'next/link';
import { UploadScores } from '@/app/(user)/dashboard/classes/_components/upload-scores';

interface TeacherAssignment {
  id: number;
  teacher_id: number;
  subject_id: number;
  grade_id: number | null;
  subgroup_id: number | null;
  teacher_name: string;
  subject_name: string;
  grade_name: string | null;
  subgroup_name: string | null;
}

interface Student {
  id: number;
  name: string;
  email?: string;
  grade_id: number;
  score_id?: number | null;
  actual_scores?: (number | null)[] | null;
  predicted_scores?: (number | null)[] | null;
  danger_level?: number | null;
  subject_name?: string | null;
}

interface ScoreEdit {
  studentId: number;
  scoreId: number | null;
  scores: Record<string, number>;
  isDirty: boolean;
}

function TeacherGradeEntryContent() {
  const searchParams = useSearchParams();
  const initialSubjectId = searchParams.get('subject');
  const initialGradeId = searchParams.get('grade');

  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId || '');
  const [selectedGradeId, setSelectedGradeId] = useState<string>(initialGradeId || '');
  const [students, setStudents] = useState<Student[]>([]);
  const [scoreEdits, setScoreEdits] = useState<Record<number, ScoreEdit>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Get unique subjects and grades from assignments
  const subjects = Array.from(
    new Map(assignments.map(a => [a.subject_id, { id: a.subject_id, name: a.subject_name }])).values()
  );
  
  const availableGrades = assignments
    .filter(a => !selectedSubjectId || a.subject_id === Number(selectedSubjectId))
    .filter(a => a.grade_id !== null)
    .map(a => ({ id: a.grade_id!, name: a.grade_name! }))
    .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

  useEffect(() => {
    fetchAssignments();
  }, []);

  useEffect(() => {
    if (selectedSubjectId && selectedGradeId) {
      fetchStudents();
    }
  }, [selectedSubjectId, selectedGradeId]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const data = await api.getMyTeacherAssignments();
      setAssignments(data);
      
      // Auto-select if only one option
      if (data.length === 1) {
        setSelectedSubjectId(String(data[0].subject_id));
        if (data[0].grade_id) {
          setSelectedGradeId(String(data[0].grade_id));
        }
      }
    } catch (err) {
      const apiError = handleApiError(err);
      toast.error(`Ошибка загрузки назначений: ${apiError.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!selectedSubjectId || !selectedGradeId) return;
    
    try {
      setLoading(true);
      // Get students for the selected subject and grade
      const subject = subjects.find(s => s.id === Number(selectedSubjectId));
      const data = await api.getStudentsByGrade(Number(selectedGradeId), subject?.name);
      setStudents(data);
      
      // Initialize score edits
      const edits: Record<number, ScoreEdit> = {};
      data.forEach((student: Student) => {
        const actualScores = student.actual_scores || [];
        const scoreObj: Record<string, number> = {};
        if (Array.isArray(actualScores)) {
          actualScores.forEach((val, idx) => {
            scoreObj[`q${idx + 1}`] = val ?? 0;
          });
        }
        edits[student.id] = {
          studentId: student.id,
          scoreId: student.score_id || null,
          scores: scoreObj,
          isDirty: false
        };
      });
      setScoreEdits(edits);
    } catch (err) {
      const apiError = handleApiError(err);
      toast.error(`Ошибка загрузки студентов: ${apiError.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (studentId: number, quarter: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    setScoreEdits(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        scores: {
          ...prev[studentId].scores,
          [quarter]: isNaN(numValue) ? 0 : numValue
        },
        isDirty: true
      }
    }));
  };

  const handleSaveAll = async () => {
    const dirtyEdits = Object.values(scoreEdits).filter(e => e.isDirty && e.scoreId);
    
    if (dirtyEdits.length === 0) {
      toast.info('Нет изменений для сохранения');
      return;
    }

    setSaving(true);
    let savedCount = 0;
    let errorCount = 0;

    for (const edit of dirtyEdits) {
      try {
        await api.updateScore(edit.scoreId!, {
          actual_scores: edit.scores
        });
        savedCount++;
      } catch (err) {
        errorCount++;
        console.error(`Error saving score for student ${edit.studentId}:`, err);
      }
    }

    setSaving(false);
    
    if (errorCount > 0) {
      toast.warning(`Сохранено ${savedCount} из ${dirtyEdits.length} записей. Ошибок: ${errorCount}`);
    } else {
      toast.success(`Все оценки успешно сохранены (${savedCount} записей)`);
    }

    // Mark all as not dirty
    setScoreEdits(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        updated[Number(key)] = { ...updated[Number(key)], isDirty: false };
      });
      return updated;
    });

    // Refresh data
    fetchStudents();
  };

  const getDangerBadge = (level: number | null | undefined) => {
    if (level === null || level === undefined) return null;
    
    const variants: Record<number, { className: string; label: string }> = {
      0: { className: 'bg-green-100 text-green-800', label: 'Низкий' },
      1: { className: 'bg-yellow-100 text-yellow-800', label: 'Умеренный' },
      2: { className: 'bg-orange-100 text-orange-800', label: 'Высокий' },
      3: { className: 'bg-red-100 text-red-800', label: 'Критический' }
    };
    
    const variant = variants[level] || variants[0];
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const dirtyCount = Object.values(scoreEdits).filter(e => e.isDirty).length;

  if (loading && assignments.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Загрузка...</div>
      </div>
    );
  }

  return (
    <PageContainer scrollable>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/teacher/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Ввод оценок</h1>
              <p className="text-gray-500">Введите оценки для ваших студентов</p>
            </div>
          </div>
          <UploadScores
            onUploadComplete={() => {
              fetchAssignments();
              if (selectedSubjectId && selectedGradeId) {
                fetchStudents();
              }
            }}
            trigger={
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                Загрузить Excel
              </Button>
            }
          />
        </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Выберите класс и предмет</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Предмет</Label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите предмет" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(subject => (
                    <SelectItem key={subject.id} value={String(subject.id)}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Класс</Label>
              <Select 
                value={selectedGradeId} 
                onValueChange={setSelectedGradeId}
                disabled={!selectedSubjectId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите класс" />
                </SelectTrigger>
                <SelectContent>
                  {availableGrades.map(grade => (
                    <SelectItem key={grade.id} value={String(grade.id)}>
                      {grade.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      {selectedSubjectId && selectedGradeId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Оценки студентов</CardTitle>
              <CardDescription>
                {students.length} студентов • {dirtyCount > 0 ? `${dirtyCount} изменений не сохранено` : 'Все изменения сохранены'}
              </CardDescription>
            </div>
            <Button onClick={handleSaveAll} disabled={saving || dirtyCount === 0}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Сохранение...' : 'Сохранить все'}
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Загрузка студентов...</div>
            ) : students.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Студенты не найдены для выбранного класса и предмета.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-left">
                      <th className="p-3 border-b border-gray-200 font-semibold text-sm">Студент</th>
                      <th className="p-3 border-b border-gray-200 font-semibold text-sm text-center">1 четверть</th>
                      <th className="p-3 border-b border-gray-200 font-semibold text-sm text-center">2 четверть</th>
                      <th className="p-3 border-b border-gray-200 font-semibold text-sm text-center">3 четверть</th>
                      <th className="p-3 border-b border-gray-200 font-semibold text-sm text-center">4 четверть</th>
                      <th className="p-3 border-b border-gray-200 font-semibold text-sm text-center">Риск</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(student => {
                      const edit = scoreEdits[student.id];
                      return (
                        <tr 
                          key={student.id} 
                          className={`hover:bg-gray-50 ${edit?.isDirty ? 'bg-yellow-50' : ''}`}
                        >
                          <td className="p-3 border-b border-gray-200">
                            <div className="font-medium">{student.name}</div>
                            <div className="text-sm text-gray-500">{student.email || ''}</div>
                          </td>
                          {['q1', 'q2', 'q3', 'q4'].map(quarter => (
                            <td key={quarter} className="p-3 border-b border-gray-200">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                className="w-20 text-center mx-auto"
                                value={edit?.scores[quarter] || ''}
                                onChange={(e) => handleScoreChange(student.id, quarter, e.target.value)}
                                disabled={!student.score_id}
                                placeholder={!student.score_id ? '-' : '0'}
                              />
                            </td>
                          ))}
                          <td className="p-3 border-b border-gray-200 text-center">
                            {getDangerBadge(student.danger_level)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {assignments.length === 0 && !loading && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            У вас нет назначенных классов или предметов.
            <br />
            Обратитесь к администратору для получения назначений.
          </CardContent>
        </Card>
      )}
      </div>
    </PageContainer>
  );
}

export default function TeacherGradeEntryPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><div className="text-lg">Загрузка...</div></div>}>
      <TeacherGradeEntryContent />
    </Suspense>
  );
}
