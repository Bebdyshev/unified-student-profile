'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-toastify';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, ArrowLeft, Upload, Users, BookOpen, CheckCircle2, AlertTriangle, Keyboard } from 'lucide-react';
import { handleApiError } from '@/utils/errorHandler';
import api from '@/lib/api';
import Link from 'next/link';
import { UploadScores } from '@/app/(user)/dashboard/classes/_components/upload-scores';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

const QUARTERS = [
  { key: 'q1', label: '1 чт', full: '1 четверть' },
  { key: 'q2', label: '2 чт', full: '2 четверть' },
  { key: 'q3', label: '3 чт', full: '3 четверть' },
  { key: 'q4', label: '4 чт', full: '4 четверть' },
];

function getScoreColor(value: number): string {
  if (!value || value === 0) return '';
  if (value >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (value >= 60) return 'text-amber-700 bg-amber-50 border-amber-200';
  if (value >= 40) return 'text-orange-700 bg-orange-50 border-orange-200';
  return 'text-red-700 bg-red-50 border-red-200';
}

function getDangerInfo(level: number | null | undefined) {
  if (level === null || level === undefined) return null;
  const map: Record<number, { bg: string; text: string; label: string; dot: string }> = {
    0: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Низкий', dot: 'bg-emerald-500' },
    1: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Умеренный', dot: 'bg-amber-500' },
    2: { bg: 'bg-orange-50', text: 'text-orange-700', label: 'Высокий', dot: 'bg-orange-500' },
    3: { bg: 'bg-red-50', text: 'text-red-700', label: 'Критический', dot: 'bg-red-500' },
  };
  return map[level] || map[0];
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
  // Track focused cell for keyboard navigation (setter used in handlers)
  const [, setFocusedCell] = useState<{ row: number; col: number } | null>(null);

  const tableRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const subjects = Array.from(
    new Map(assignments.map(a => [a.subject_id, { id: a.subject_id, name: a.subject_name }])).values()
  );

  const availableGrades = assignments
    .filter(a => !selectedSubjectId || a.subject_id === Number(selectedSubjectId))
    .filter(a => a.grade_id !== null)
    .map(a => ({ id: a.grade_id!, name: a.grade_name! }))
    .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const data = await api.getMyTeacherAssignments();
      setAssignments(data);
      const subFromUrl = searchParams.get('subject');
      const gradeFromUrl = searchParams.get('grade');
      if (subFromUrl) {
        setSelectedSubjectId(subFromUrl);
      } else if (data.length === 1) {
        setSelectedSubjectId(String(data[0].subject_id));
      }
      if (gradeFromUrl) {
        setSelectedGradeId(gradeFromUrl);
      } else if (data.length === 1 && data[0].grade_id) {
        setSelectedGradeId(String(data[0].grade_id));
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
      const subject = subjects.find(s => s.id === Number(selectedSubjectId));
      const data = await api.getStudentsByGrade(Number(selectedGradeId), subject?.name);
      setStudents(data);

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

  useEffect(() => {
    fetchAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- синхронизируем выбор с query при смене URL
  }, [searchParams]);

  useEffect(() => {
    if (selectedSubjectId && selectedGradeId) {
      fetchStudents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubjectId, selectedGradeId]);

  const handleScoreChange = (studentId: number, quarter: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    const clamped = Math.min(100, Math.max(0, isNaN(numValue) ? 0 : numValue));
    setScoreEdits(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        scores: {
          ...prev[studentId].scores,
          [quarter]: clamped
        },
        isDirty: true
      }
    }));
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
    let nextRow = rowIndex;
    let nextCol = colIndex;

    if (e.key === 'ArrowDown' || (e.key === 'Enter' && !e.shiftKey)) {
      e.preventDefault();
      nextRow = Math.min(students.length - 1, rowIndex + 1);
    } else if (e.key === 'ArrowUp' || (e.key === 'Enter' && e.shiftKey)) {
      e.preventDefault();
      nextRow = Math.max(0, rowIndex - 1);
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      if (colIndex < 3) {
        nextCol = colIndex + 1;
      } else {
        nextCol = 0;
        nextRow = Math.min(students.length - 1, rowIndex + 1);
      }
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      if (colIndex > 0) {
        nextCol = colIndex - 1;
      } else {
        nextCol = 3;
        nextRow = Math.max(0, rowIndex - 1);
      }
    } else {
      return;
    }

    const key = `${nextRow}-${nextCol}`;
    const input = inputRefs.current.get(key);
    if (input) {
      input.focus();
      input.select();
      setFocusedCell({ row: nextRow, col: nextCol });
    }
  }, [students.length]);

  const handleSaveAll = async () => {
    const dirtyEdits = Object.values(scoreEdits).filter(e => e.isDirty);
    if (dirtyEdits.length === 0) {
      toast.info('Нет изменений для сохранения');
      return;
    }

    setSaving(true);
    let savedCount = 0;
    let errorCount = 0;

    for (const edit of dirtyEdits) {
      try {
        if (edit.scoreId) {
          await api.updateScore(edit.scoreId, { actual_scores: edit.scores });
        } else {
          const subject = subjects.find(s => s.id === Number(selectedSubjectId));
          if (subject) {
            const result = await api.createScore(edit.studentId, subject.id, edit.scores);
            setScoreEdits(prev => ({
              ...prev,
              [edit.studentId]: { ...prev[edit.studentId], scoreId: result.score.id }
            }));
          }
        }
        savedCount++;
      } catch (err) {
        errorCount++;
        console.error(`Error saving score for student ${edit.studentId}:`, err);
      }
    }

    setSaving(false);

    if (errorCount > 0) {
      toast.warning(`Сохранено ${savedCount} из ${dirtyEdits.length}. Ошибок: ${errorCount}`);
    } else {
      toast.success(`Сохранено ${savedCount} записей`);
    }

    setScoreEdits(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        updated[Number(key)] = { ...updated[Number(key)], isDirty: false };
      });
      return updated;
    });

    fetchStudents();
  };

  const getStudentAverage = (studentId: number): number => {
    const edit = scoreEdits[studentId];
    if (!edit) return 0;
    const values = QUARTERS.map(q => edit.scores[q.key] || 0).filter(v => v > 0);
    if (values.length === 0) return 0;
    return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  };

  const dirtyCount = Object.values(scoreEdits).filter(e => e.isDirty).length;
  const selectedSubject = subjects.find(s => s.id === Number(selectedSubjectId));
  const selectedGrade = availableGrades.find(g => g.id === Number(selectedGradeId));

  if (loading && assignments.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm text-muted-foreground">Загрузка...</span>
        </div>
      </div>
    );
  }

  return (
    <PageContainer scrollable>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/teacher">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Ввод оценок</h1>
              <p className="text-sm text-muted-foreground">
                {selectedSubject && selectedGrade
                  ? `${selectedSubject.name} — ${selectedGrade.name}`
                  : 'Выберите предмет и класс'}
              </p>
            </div>
          </div>
          <UploadScores
            initialSubjectId={
              selectedSubjectId && !Number.isNaN(Number(selectedSubjectId))
                ? Number(selectedSubjectId)
                : undefined
            }
            initialGradeId={
              selectedGradeId && !Number.isNaN(Number(selectedGradeId))
                ? Number(selectedGradeId)
                : undefined
            }
            onUploadComplete={() => {
              fetchAssignments();
              if (selectedSubjectId && selectedGradeId) fetchStudents();
            }}
            trigger={
              <Button variant="outline" size="sm" className="gap-2">
                <Upload className="h-3.5 w-3.5" />
                Загрузка из Excel
              </Button>
            }
          />
        </div>

        {/* Inline filters */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
          <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={selectedSubjectId} onValueChange={(v) => { setSelectedSubjectId(v); setSelectedGradeId(''); }}>
            <SelectTrigger className="w-[220px] h-9 bg-background">
              <SelectValue placeholder="Предмет" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map(s => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Users className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={selectedGradeId} onValueChange={setSelectedGradeId} disabled={!selectedSubjectId}>
            <SelectTrigger className="w-[140px] h-9 bg-background">
              <SelectValue placeholder="Класс" />
            </SelectTrigger>
            <SelectContent>
              {availableGrades.map(g => (
                <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1" />

          {selectedSubjectId && selectedGradeId && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Keyboard className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Tab/Enter для навигации</span>
            </div>
          )}
        </div>

        {/* Table */}
        {selectedSubjectId && selectedGradeId && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-pulse flex flex-col items-center gap-3">
                  <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <span className="text-sm text-muted-foreground">Загрузка студентов...</span>
                </div>
              </div>
            ) : students.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Users className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">Студенты не найдены</p>
              </div>
            ) : (
              <div ref={tableRef} className="rounded-lg border bg-card overflow-hidden">
                {/* Table header info */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{students.length} учеников</span>
                    {dirtyCount > 0 && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                        {dirtyCount} не сохранено
                      </Badge>
                    )}
                    {dirtyCount === 0 && students.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" />
                        Все сохранено
                      </span>
                    )}
                  </div>
                  <Button
                    onClick={handleSaveAll}
                    disabled={saving || dirtyCount === 0}
                    size="sm"
                    className="gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        Сохранение...
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5" />
                        Сохранить
                      </>
                    )}
                  </Button>
                </div>

                {/* Spreadsheet table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/40">
                        <th className="w-10 px-3 py-2.5 text-xs font-medium text-muted-foreground text-center border-r">#</th>
                        <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground text-left min-w-[200px]">Ученик</th>
                        {QUARTERS.map(q => (
                          <TooltipProvider key={q.key}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <th className="w-[90px] px-2 py-2.5 text-xs font-medium text-muted-foreground text-center">{q.label}</th>
                              </TooltipTrigger>
                              <TooltipContent><p>{q.full}</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                        <th className="w-[70px] px-2 py-2.5 text-xs font-medium text-muted-foreground text-center">Средн.</th>
                        <th className="w-[100px] px-2 py-2.5 text-xs font-medium text-muted-foreground text-center">Риск</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, rowIndex) => {
                        const edit = scoreEdits[student.id];
                        const avg = getStudentAverage(student.id);
                        const danger = getDangerInfo(student.danger_level);

                        return (
                          <tr
                            key={student.id}
                            className={`
                              group transition-colors border-t
                              ${edit?.isDirty ? 'bg-amber-50/50' : 'hover:bg-muted/30'}
                              ${rowIndex % 2 === 0 ? '' : 'bg-muted/10'}
                            `}
                          >
                            {/* Row number */}
                            <td className="px-3 py-1.5 text-xs text-muted-foreground text-center border-r tabular-nums">
                              {rowIndex + 1}
                            </td>

                            {/* Student name */}
                            <td className="px-4 py-1.5">
                              <span className="text-sm font-medium">{student.name}</span>
                            </td>

                            {/* Quarter scores */}
                            {QUARTERS.map((q, colIndex) => {
                              const val = edit?.scores[q.key] || 0;
                              const colorClass = getScoreColor(val);
                              return (
                                <td key={q.key} className="px-1.5 py-1">
                                  <input
                                    ref={(el) => {
                                      if (el) inputRefs.current.set(`${rowIndex}-${colIndex}`, el);
                                    }}
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    className={`
                                      w-full h-8 text-center text-sm font-medium rounded-md border outline-none
                                      transition-all duration-150
                                      focus:ring-2 focus:ring-primary/30 focus:border-primary
                                      ${val > 0 ? colorClass : 'bg-background border-input text-foreground'}
                                    `}
                                    value={val || ''}
                                    onChange={(e) => handleScoreChange(student.id, q.key, e.target.value)}
                                    onFocus={(e) => {
                                      e.target.select();
                                      setFocusedCell({ row: rowIndex, col: colIndex });
                                    }}
                                    onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                                    placeholder="-"
                                  />
                                </td>
                              );
                            })}

                            {/* Average */}
                            <td className="px-2 py-1.5 text-center">
                              {avg > 0 ? (
                                <span className={`text-sm font-semibold tabular-nums ${
                                  avg >= 80 ? 'text-emerald-600' :
                                  avg >= 60 ? 'text-amber-600' :
                                  avg >= 40 ? 'text-orange-600' :
                                  'text-red-600'
                                }`}>
                                  {avg}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </td>

                            {/* Danger level */}
                            <td className="px-2 py-1.5 text-center">
                              {danger ? (
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${danger.bg} ${danger.text}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${danger.dot}`} />
                                  {danger.label}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Bottom save bar (visible when there are unsaved changes) */}
                {dirtyCount > 0 && (
                  <div className="sticky bottom-0 flex items-center justify-between px-4 py-3 bg-amber-50 border-t border-amber-200">
                    <div className="flex items-center gap-2 text-sm text-amber-800">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{dirtyCount} {dirtyCount === 1 ? 'изменение' : dirtyCount < 5 ? 'изменения' : 'изменений'} не сохранено</span>
                    </div>
                    <Button onClick={handleSaveAll} disabled={saving} size="sm" className="gap-2">
                      <Save className="h-3.5 w-3.5" />
                      {saving ? 'Сохранение...' : 'Сохранить все'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {assignments.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <BookOpen className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-sm font-medium">Нет назначенных классов</p>
            <p className="text-xs mt-1">Обратитесь к администратору для получения назначений</p>
          </div>
        )}

        {/* No selection prompt */}
        {assignments.length > 0 && (!selectedSubjectId || !selectedGradeId) && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <BookOpen className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-sm font-medium">Выберите предмет и класс</p>
            <p className="text-xs mt-1">Используйте фильтры выше для начала работы</p>
          </div>
        )}
      </div>
    </PageContainer>
  );
}

export default function TeacherGradeEntryPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm text-muted-foreground">Загрузка...</span>
        </div>
      </div>
    }>
      <TeacherGradeEntryContent />
    </Suspense>
  );
}
