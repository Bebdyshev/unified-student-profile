'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import { Upload, Download, FileText, AlertCircle, CheckCircle, Info, X, ChevronDown } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import type { Grade, Subject, Subgroup, SubjectGroup, ExcelUploadResponse } from '@/types';

interface UploadScoresProps {
  onUploadComplete?: () => void;
  trigger?: React.ReactNode;
  /** When set with onOpenChange, dialog is controlled (e.g. open from parent without trigger) */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialGradeId?: number;
  initialSubjectId?: number;
  initialSemester?: number;
  initialSubjectGroupId?: number;
}

interface UploadFormData {
  grade_id: number;
  subject_id: number;
  teacher_name: string;
  semester: number;
  subgroup_id?: number;
  subject_group_id?: number;
  file: File | null;
}

const DANGER_LEVEL_COLORS = {
  0: 'bg-green-500',
  1: 'bg-yellow-500', 
  2: 'bg-orange-500',
  3: 'bg-red-500'
};

const DANGER_LEVEL_NAMES = {
  0: 'Низкий',
  1: 'Умеренный',
  2: 'Высокий', 
  3: 'Критический'
};

export function UploadScores({
  onUploadComplete,
  trigger,
  open: openControlled,
  onOpenChange,
  initialGradeId,
  initialSubjectId,
  initialSemester,
  initialSubjectGroupId,
}: UploadScoresProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openControlled !== undefined;
  const dialogOpen = isControlled ? openControlled : internalOpen;
  const handleDialogOpenChange = (next: boolean) => {
    if (isControlled) {
      onOpenChange?.(next);
    } else {
      setInternalOpen(next);
    }
  };
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userType, setUserType] = useState<string>('admin');
  const [uploadMode, setUploadMode] = useState<'class' | 'group'>('class');
  
  // Form data
  const [formData, setFormData] = useState<UploadFormData>({
    grade_id: 0,
    subject_id: 0,
    teacher_name: '',
    semester: 1,
    subgroup_id: undefined,
    subject_group_id: undefined,
    file: null
  });

  // Options data
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [subjectGroups, setSubjectGroups] = useState<SubjectGroup[]>([]);
  const [teacherNames, setTeacherNames] = useState<string[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [teacherAssignments, setTeacherAssignments] = useState<any[]>([]);
  
  // Upload result
  const [uploadResult, setUploadResult] = useState<ExcelUploadResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Load user info on component mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await api.getCurrentUser();
        setCurrentUser(user);
        setUserType(user.type || 'admin');
        
        // If teacher, auto-fill teacher name and load their assignments
        if (user.type === 'teacher') {
          setFormData(prev => ({ ...prev, teacher_name: user.name }));
          
          // Load teacher's assignments
          const assignments = await api.getMyTeacherAssignments();
          setTeacherAssignments(assignments);
          
          // Get unique subjects from assignments
          const uniqueSubjects = Array.from(
            new Map(assignments.map((a: any) => [a.subject_id, { id: a.subject_id, name: a.subject_name }])).values()
          );
          setSubjects(uniqueSubjects as Subject[]);
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    };
    loadUser();
  }, []);

  // Load initial data
  useEffect(() => {
    if (dialogOpen) {
      loadInitialData();
    }
  }, [dialogOpen]);

  /** Подставляем класс/предмет с родителя после загрузки справочников — иначе селекты пустые */
  useEffect(() => {
    if (!dialogOpen || loading) return

    if (initialSubjectGroupId != null) {
      // Pre-select group mode
      setUploadMode('group')
      setFormData((prev) => ({
        ...prev,
        subject_group_id: initialSubjectGroupId,
        grade_id: 0,
        ...(initialSubjectId != null && initialSubjectId > 0 ? { subject_id: initialSubjectId } : {}),
        ...(initialSemester != null ? { semester: initialSemester } : {}),
      }))
    } else {
      setUploadMode('class')
      setFormData((prev) => ({
        ...prev,
        ...(initialGradeId != null && initialGradeId > 0 ? { grade_id: initialGradeId } : {}),
        ...(initialSubjectId != null && initialSubjectId > 0 ? { subject_id: initialSubjectId } : {}),
        ...(initialSemester != null ? { semester: initialSemester } : {}),
      }))
    }
  }, [dialogOpen, loading, initialGradeId, initialSubjectId, initialSemester, initialSubjectGroupId])

  // Load subgroups when grade changes
  useEffect(() => {
    if (formData.grade_id > 0) {
      loadSubgroups(formData.grade_id);
      if (userType !== 'teacher') {
        loadSubjectGroups(formData.grade_id);
      }
    } else {
      setSubgroups([]);
      if (userType !== 'teacher') {
        // Admin: reset loaded groups since they're per-grade
        setSubjectGroups([]);
      }
      // Don't wipe subject_group_id when a classless group was just selected
      // (selecting such a group legitimately sets grade_id to 0).
      setFormData(prev => {
        const picked = prev.subject_group_id
        const pickedGroup = picked ? subjectGroups.find((g) => g.id === picked) : undefined
        const isClasslessGroupSelected = Boolean(pickedGroup && pickedGroup.grade_id == null)
        return {
          ...prev,
          subgroup_id: undefined,
          subject_group_id: isClasslessGroupSelected ? prev.subject_group_id : undefined,
        }
      });
    }
  }, [formData.grade_id, userType]);

  // Clear subject_group_id when subject changes (group might not match new subject)
  useEffect(() => {
    if (formData.subject_group_id && formData.subject_id) {
      const group = subjectGroups.find((g) => g.id === formData.subject_group_id)
      if (group && group.subject_id !== formData.subject_id) {
        setFormData((prev) => ({ ...prev, subject_group_id: undefined }))
      }
    }
  }, [formData.subject_id, formData.subject_group_id, subjectGroups])

  // Load teachers when subject (or grade) changes
  useEffect(() => {
    const loadTeachers = async () => {
      if (!formData.subject_id) {
        setTeacherNames([]);
        setFormData(prev => ({ ...prev, teacher_name: '' }));
        return;
      }
      setLoadingTeachers(true);
      try {
        const params: any = { subject_id: formData.subject_id };
        if (formData.grade_id) params.grade_id = formData.grade_id;
        let assignments = await api.getTeacherAssignments(params);
        // Fallback: if no grade-specific assignment, use subject-wide
        if (!Array.isArray(assignments) || assignments.length === 0) {
          assignments = await api.getTeacherAssignments({ subject_id: formData.subject_id });
        }
        const names = Array.from(
          new Set((assignments as any[])
            .filter(a => a.is_active === 1 && a.teacher_name)
            .map(a => a.teacher_name as string))
        );
        setTeacherNames(names);
        // Clear selection if current teacher not in list
        setFormData(prev => ({ ...prev, teacher_name: names.includes(prev.teacher_name) ? prev.teacher_name : '' }));
      } catch (e) {
        setTeacherNames([]);
      } finally {
        setLoadingTeachers(false);
      }
    };
    loadTeachers();
  }, [formData.subject_id, formData.grade_id]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // For teachers, grades come from their assignments
      if (userType === 'teacher') {
        const [gradesData, teacherGroups] = await Promise.all([
          api.getAllGrades(),
          api.getMySubjectGroups().catch(() => [])
        ]);
        console.log('Loaded teacher subject groups:', teacherGroups);
        // Filter grades based on teacher's assignments
        const assignedGradeIds = new Set(
          teacherAssignments
            .filter((a: any) => a.grade_id)
            .map((a: any) => a.grade_id)
        );
        const filteredGrades = gradesData.filter((g: any) => assignedGradeIds.has(g.id));
        setGrades(filteredGrades);
        setSubjectGroups(teacherGroups as SubjectGroup[]);
        // Don't overwrite subjects for teachers - they're loaded from assignments already
      } else {
        // For admins, load all
        const [gradesData, subjectsData] = await Promise.all([
          api.getAllGrades(),
          api.getAllSubjects()
        ]);
        
        setGrades(gradesData);
        setSubjects(subjectsData);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
      toast.error('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const loadSubgroups = async (gradeId: number) => {
    try {
      const subgroupsData = await api.getSubgroupsByGrade(gradeId);
      setSubgroups(subgroupsData);
    } catch (error) {
      console.error('Failed to load subgroups:', error);
      setSubgroups([]);
    }
  };

  const loadSubjectGroups = async (gradeId: number) => {
    try {
      const groups = await api.getSubjectGroupsByGrade(gradeId);
      setSubjectGroups(groups);
      setFormData(prev => ({ ...prev, subject_group_id: undefined }));
    } catch {
      setSubjectGroups([]);
    }
  };

  const handleInputChange = (field: keyof UploadFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, file }));
  };

  const validateForm = (): string[] => {
    const errors: string[] = []

    if (!formData.subject_id) errors.push('Выберите предмет')
    if (userType === 'admin' && !formData.teacher_name.trim()) errors.push('Введите имя учителя')

    if (uploadMode === 'class') {
      if (!formData.grade_id) errors.push('Выберите класс')
    } else {
      if (!formData.subject_group_id) errors.push('Выберите предметную группу')
    }

    if (!formData.file) errors.push('Выберите файл Excel')
    if (formData.file && !formData.file.name.match(/\.(xlsx|xls)$/i)) {
      errors.push('Файл должен быть в формате Excel (.xlsx или .xls)')
    }

    return errors
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    const errors = validateForm();
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    const selectedGroup = subjectGroups.find((g) => g.id === formData.subject_group_id)
    const effectiveGradeId = formData.grade_id || selectedGroup?.grade_id || 0

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const result = await api.uploadScores({
        grade_id: effectiveGradeId,
        subject_id: formData.subject_id,
        teacher_name: formData.teacher_name,
        semester: formData.semester,
        subgroup_id: formData.subgroup_id,
        subject_group_id: formData.subject_group_id,
        file: formData.file!
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadResult(result);

      if (result.success) {
        toast.success(`Успешно импортировано ${result.imported_count} записей`);
        if (onUploadComplete) {
          onUploadComplete();
        }
      } else {
        toast.error(result.message);
      }

    } catch (error: any) {
      console.error('Upload failed:', error);
      toast.error(error.message || 'Ошибка при загрузке файла');
      setUploadResult({
        success: false,
        message: error.message || 'Ошибка при загрузке файла',
        imported_count: 0,
        warnings: [],
        errors: [error.message || 'Неизвестная ошибка'],
        danger_distribution: {}
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDownloadTemplate = async () => {
    const hasClass = uploadMode === 'class' && formData.grade_id > 0
    const hasGroup = uploadMode === 'group' && !!formData.subject_group_id

    try {
      const blob = await api.downloadExcelTemplate(
        hasGroup
          ? { subject_group_id: formData.subject_group_id }
          : hasClass
          ? { grade_id: formData.grade_id }
          : undefined
      )

      const selectedGroup = subjectGroups.find(g => g.id === formData.subject_group_id)
      const selectedGradeObj = grades.find(g => g.id === formData.grade_id)
      const filename = hasGroup
        ? `template_${selectedGroup?.name ?? 'group'}.xlsx`
        : hasClass
        ? `template_${selectedGradeObj?.grade ?? 'class'}.xlsx`
        : 'grades_template.xlsx'

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      if (hasClass || hasGroup) {
        toast.success('Шаблон с учениками загружен')
      } else {
        toast.success('Шаблон загружен')
      }
    } catch (error) {
      console.error('Failed to download template:', error)
      toast.error('Не удалось скачать шаблон')
    }
  }

  const resetForm = () => {
    const teacherName =
      userType === 'teacher' && currentUser?.name ? String(currentUser.name) : '';
    setFormData({
      grade_id: 0,
      subject_id: 0,
      teacher_name: teacherName,
      semester: 1,
      subgroup_id: undefined,
      subject_group_id: undefined,
      file: null
    });
    setUploadMode('class');
    setUploadResult(null);
    setUploadProgress(0);

    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      resetForm();
      handleDialogOpenChange(false);
    }
  };

  const onDialogOpenChange = (next: boolean) => {
    if (!next && !isUploading) {
      resetForm();
    }
    handleDialogOpenChange(next);
  };

  const selectedGrade = grades.find(g => g.id === formData.grade_id);
  const selectedSubject = subjects.find(s => s.id === formData.subject_id);

  const showTrigger = !isControlled || trigger !== undefined;

  return (
    <Dialog open={dialogOpen} onOpenChange={onDialogOpenChange}>
      {showTrigger ? (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Загрузить оценки
            </Button>
          )}
        </DialogTrigger>
      ) : null}

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Загрузка оценок из Excel
          </DialogTitle>
          <DialogDescription>
            Загрузите Excel файл с оценками студентов. Система рассчитает прогноз и уровень риска по успеваемости.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <Collapsible className="rounded-lg border bg-muted/40 px-3 py-2">
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 text-left text-sm font-medium [&[data-state=open]_svg]:rotate-180">
                <span>Подробная инструкция (нажмите, чтобы развернуть)</span>
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 text-sm text-muted-foreground space-y-3 data-[state=closed]:animate-out">
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Скачайте шаблон Excel кнопкой ниже — в нём нужные названия колонок.</li>
                  <li>
                    Заполните строки: ФИО ученика, класс (как в системе), оценки по четвертям (Q1–Q4) и
                    при необходимости колонку учителя — без лишних пробелов в числах.
                  </li>
                  <li>В форме выберите тот же класс, предмет и четверть, что и в файле.</li>
                  <li>
                    Для 11–12 классов при необходимости укажите подгруппу или предметную группу — как в вашем
                    назначении.
                  </li>
                  <li>Прикрепите сохранённый .xlsx или .xls и нажмите «Загрузить».</li>
                </ol>
                <p className="text-xs border-t pt-2">
                  Типичные ошибки: другой формат класса, неверный предмет, пустые обязательные ячейки, файл не Excel.
                </p>
              </CollapsibleContent>
            </Collapsible>

            {/* Template Download */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Шаблон Excel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground">
                    {uploadMode === 'class' && formData.grade_id > 0
                      ? `Шаблон будет заполнен учениками класса ${grades.find(g => g.id === formData.grade_id)?.grade ?? ''}`
                      : uploadMode === 'group' && formData.subject_group_id
                      ? `Шаблон будет заполнен учениками группы «${subjectGroups.find(g => g.id === formData.subject_group_id)?.name ?? ''}»`
                      : 'Сначала выберите класс или группу — шаблон заполнится именами учеников'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTemplate}
                    disabled={
                      (uploadMode === 'class' && !formData.grade_id) ||
                      (uploadMode === 'group' && !formData.subject_group_id)
                    }
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Скачать шаблон
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Upload Form */}
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* ── Mode toggle ─────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-2 rounded-lg border p-1 bg-muted/40">
                <button
                  type="button"
                  onClick={() => {
                    setUploadMode('class')
                    setFormData(prev => ({ ...prev, subject_group_id: undefined }))
                  }}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    uploadMode === 'class'
                      ? 'bg-background shadow text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  По классу
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUploadMode('group')
                    setFormData(prev => ({ ...prev, grade_id: 0, subgroup_id: undefined }))
                  }}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    uploadMode === 'group'
                      ? 'bg-background shadow text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  По предметной группе
                </button>
              </div>

              {/* ── Shared: subject + quarter + teacher ─────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subject-select">Предмет *</Label>
                  <Select
                    value={formData.subject_id > 0 ? formData.subject_id.toString() : ''}
                    onValueChange={(value) => handleInputChange('subject_id', parseInt(value))}
                  >
                    <SelectTrigger id="subject-select">
                      <SelectValue placeholder="Выберите предмет" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id.toString()}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="semester-select">Четверть *</Label>
                  <Select
                    value={formData.semester.toString()}
                    onValueChange={(value) => handleInputChange('semester', parseInt(value))}
                  >
                    <SelectTrigger id="semester-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">I четверть</SelectItem>
                      <SelectItem value="2">II четверть</SelectItem>
                      <SelectItem value="3">III четверть</SelectItem>
                      <SelectItem value="4">IV четверть</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {userType === 'admin' && (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="teacher-select">Имя учителя *</Label>
                    <Select
                      value={formData.teacher_name || ''}
                      onValueChange={(value) => handleInputChange('teacher_name', value)}
                      disabled={!formData.subject_id || loadingTeachers}
                    >
                      <SelectTrigger id="teacher-select">
                        <SelectValue placeholder={loadingTeachers ? 'Загрузка...' : (teacherNames.length ? 'Выберите учителя' : 'Нет учителей для предмета')} />
                      </SelectTrigger>
                      <SelectContent>
                        {teacherNames.map((name) => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* ── Mode: По классу ──────────────────────────────────── */}
              {uploadMode === 'class' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="grade-select">Класс *</Label>
                    <Select
                      value={formData.grade_id > 0 ? formData.grade_id.toString() : ''}
                      onValueChange={(value) => handleInputChange('grade_id', parseInt(value))}
                    >
                      <SelectTrigger id="grade-select">
                        <SelectValue placeholder="Выберите класс" />
                      </SelectTrigger>
                      <SelectContent>
                        {grades.map((grade) => {
                          const gradeLabel = grade.parallel && !grade.grade.includes(grade.parallel)
                            ? `${grade.grade}${grade.parallel}`
                            : grade.grade
                          return (
                            <SelectItem key={grade.id} value={grade.id.toString()}>
                              {gradeLabel}{grade.curator_name ? ` — ${grade.curator_name}` : ''}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {subgroups.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="subgroup-select">Подгруппа <span className="text-muted-foreground">(если класс делится)</span></Label>
                      <Select
                        value={formData.subgroup_id?.toString() || '__none__'}
                        onValueChange={(v) => handleInputChange('subgroup_id', v !== '__none__' ? parseInt(v) : undefined)}
                      >
                        <SelectTrigger id="subgroup-select">
                          <SelectValue placeholder="Вся параллель" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Весь класс</SelectItem>
                          {subgroups.map((sg) => (
                            <SelectItem key={sg.id} value={sg.id.toString()}>{sg.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* ── Mode: По группе ──────────────────────────────────── */}
              {uploadMode === 'group' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Предметная группа *</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={async () => {
                        try {
                          const groups = await api.getMySubjectGroups()
                          setSubjectGroups(groups as SubjectGroup[])
                          toast.success(`Обновлено: ${(groups as any[]).length} групп`)
                        } catch {
                          toast.error('Не удалось обновить группы')
                        }
                      }}
                    >
                      Обновить список
                    </Button>
                  </div>

                  {subjectGroups.length === 0 ? (
                    <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 space-y-1">
                      <p className="font-medium">Нет предметных групп</p>
                      <p className="text-xs">Создайте группу на вкладке <strong>«Предметные группы»</strong> панели учителя, затем нажмите «Обновить список».</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Select
                        value={formData.subject_group_id?.toString() || ''}
                        onValueChange={(value) => {
                          const nextGroupId = parseInt(value)
                          const nextGroup = subjectGroups.find((g) => g.id === nextGroupId)
                          setFormData((prev) => ({
                            ...prev,
                            subject_group_id: nextGroupId,
                            grade_id: nextGroup?.grade_id ?? 0,
                          }))
                        }}
                      >
                        <SelectTrigger id="subject-group-select">
                          <SelectValue placeholder="Выберите группу" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjectGroups.map((g) => (
                            <SelectItem key={g.id} value={g.id.toString()}>
                              <span className="font-medium">{g.name}</span>
                              <span className="ml-2 text-muted-foreground text-xs">
                                {g.subject_name}{g.grade_name ? ` · ${g.grade_name}` : ' · несколько классов'}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                    </div>
                  )}
                </div>
              )}

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="file-upload">Excel файл *</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="flex-1"
                  />
                  {formData.file && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      {formData.file.name}
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Загрузка...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isUploading}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  disabled={isUploading || !formData.file}
                  className="flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Загрузка...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Загрузить
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Upload Results */}
            {uploadResult && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {uploadResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    Результат загрузки
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Summary */}
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="font-medium">{uploadResult.message}</p>
                    {uploadResult.success && (
                      <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Класс: {selectedGrade?.grade} {selectedGrade?.parallel}</span>
                        <span>Предмет: {selectedSubject?.name}</span>
                        <span>Учитель: {formData.teacher_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Danger Level Distribution */}
                  {uploadResult.success && Object.keys(uploadResult.danger_distribution).length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Распределение по уровням опасности:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {Object.entries(uploadResult.danger_distribution).map(([level, count]) => (
                          <div key={level} className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${DANGER_LEVEL_COLORS[Number(level) as 0 | 1 | 2 | 3]}`}></div>
                            <span className="text-sm">
                              {DANGER_LEVEL_NAMES[Number(level) as 0 | 1 | 2 | 3]}: {count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {uploadResult.warnings.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <Info className="h-4 w-4 text-yellow-500" />
                        Предупреждения ({uploadResult.warnings.length})
                      </h4>
                      <div className="max-h-32 overflow-y-auto">
                        {uploadResult.warnings.map((warning, index) => (
                          <Alert key={index} className="mb-2">
                            <AlertDescription className="text-sm">{warning}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Errors */}
                  {uploadResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <X className="h-4 w-4 text-red-500" />
                        Ошибки ({uploadResult.errors.length})
                      </h4>
                      <div className="max-h-32 overflow-y-auto">
                        {uploadResult.errors.map((error, index) => (
                          <Alert key={index} variant="destructive" className="mb-2">
                            <AlertDescription className="text-sm">{error}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}



