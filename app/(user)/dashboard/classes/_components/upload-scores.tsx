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
import { Upload, Download, FileText, AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import type { Grade, Subject, Subgroup, ExcelUploadResponse } from '@/types';

interface UploadScoresProps {
  onUploadComplete?: () => void;
  trigger?: React.ReactNode;
}

interface UploadFormData {
  grade_id: number;
  subject_id: number;
  teacher_name: string;
  semester: number;
  subgroup_id?: number;
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

export function UploadScores({ onUploadComplete, trigger }: UploadScoresProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userType, setUserType] = useState<string>('admin');
  
  // Form data
  const [formData, setFormData] = useState<UploadFormData>({
    grade_id: 0,
    subject_id: 0,
    teacher_name: '',
    semester: 1,
    subgroup_id: undefined,
    file: null
  });

  // Options data
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
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
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  // Load subgroups when grade changes
  useEffect(() => {
    if (formData.grade_id > 0) {
      loadSubgroups(formData.grade_id);
    } else {
      setSubgroups([]);
      setFormData(prev => ({ ...prev, subgroup_id: undefined }));
    }
  }, [formData.grade_id]);

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
        const gradesData = await api.getAllGrades();
        // Filter grades based on teacher's assignments
        const assignedGradeIds = new Set(
          teacherAssignments
            .filter((a: any) => a.grade_id)
            .map((a: any) => a.grade_id)
        );
        const filteredGrades = gradesData.filter((g: any) => assignedGradeIds.has(g.id));
        setGrades(filteredGrades);
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
    const errors: string[] = [];
    
    if (!formData.grade_id) errors.push('Выберите класс');
    if (!formData.subject_id) errors.push('Выберите предмет');
    // Only check teacher name for admins (teachers have it auto-filled)
    if (userType === 'admin' && !formData.teacher_name.trim()) errors.push('Введите имя учителя');
    if (!formData.file) errors.push('Выберите файл Excel');
    if (formData.file && !formData.file.name.match(/\.(xlsx|xls)$/i)) {
      errors.push('Файл должен быть в формате Excel (.xlsx или .xls)');
    }

    return errors;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    const errors = validateForm();
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

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
        grade_id: formData.grade_id,
        subject_id: formData.subject_id,
        teacher_name: formData.teacher_name,
        semester: formData.semester,
        subgroup_id: formData.subgroup_id,
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
    try {
      const blob = await api.downloadExcelTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'grades_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Шаблон загружен');
    } catch (error) {
      console.error('Failed to download template:', error);
      toast.error('Не удалось скачать шаблон');
    }
  };

  const resetForm = () => {
    setFormData({
      grade_id: 0,
      subject_id: 0,
      teacher_name: '',
      semester: 1,
      subgroup_id: undefined,
      file: null
    });
    setUploadResult(null);
    setUploadProgress(0);
    
    // Reset file input
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setIsOpen(false);
      resetForm();
    }
  };

  const selectedGrade = grades.find(g => g.id === formData.grade_id);
  const selectedSubject = subjects.find(s => s.id === formData.subject_id);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Загрузить оценки
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Загрузка оценок из Excel
          </DialogTitle>
          <DialogDescription>
            Загрузите Excel файл с оценками студентов. Система автоматически рассчитает predicted score и уровень опасности.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Template Download */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Шаблон Excel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Скачайте шаблон с правильной структурой колонок
                  </p>
                  <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Скачать шаблон
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Upload Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Grade Selection */}
                <div className="space-y-2">
                  <Label htmlFor="grade-select">Класс *</Label>
                  <Select
                    value={formData.grade_id.toString()}
                    onValueChange={(value) => handleInputChange('grade_id', parseInt(value))}
                  >
                    <SelectTrigger id="grade-select">
                      <SelectValue placeholder="Выберите класс" />
                    </SelectTrigger>
                    <SelectContent>
                      {grades.map((grade) => (
                        <SelectItem key={grade.id} value={grade.id.toString()}>
                          {grade.grade} {grade.parallel} - {grade.curator_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Subject Selection */}
                <div className="space-y-2">
                  <Label htmlFor="subject-select">Предмет *</Label>
                  <Select
                    value={formData.subject_id.toString()}
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

                {/* Teacher Selection - Only for admins */}
                {userType === 'admin' && (
                  <div className="space-y-2">
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
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Quarter */}
                <div className="space-y-2">
                  <Label htmlFor="semester-select">Четверть</Label>
                  <Select
                    value={formData.semester.toString()}
                    onValueChange={(value) => handleInputChange('semester', parseInt(value))}
                  >
                    <SelectTrigger id="semester-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">I четверть</SelectItem>
                      <SelectItem value="2">II четверть</SelectItem>
                      <SelectItem value="3">III четверть</SelectItem>
                      <SelectItem value="4">IV четверть</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Subgroup Selection (optional) */}
              {subgroups.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="subgroup-select">Подгруппа (опционально)</Label>
                  <Select
                    value={formData.subgroup_id?.toString() || ''}
                    onValueChange={(value) => handleInputChange('subgroup_id', value ? parseInt(value) : undefined)}
                  >
                    <SelectTrigger id="subgroup-select">
                      <SelectValue placeholder="Выберите подгруппу или оставьте пустым" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Без подгруппы</SelectItem>
                      {subgroups.map((subgroup) => (
                        <SelectItem key={subgroup.id} value={subgroup.id.toString()}>
                          {subgroup.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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



