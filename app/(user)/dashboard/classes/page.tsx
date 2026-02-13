'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'react-toastify';
import { useAuth } from '@/hooks/use-auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2, Plus, Users, GraduationCap, Upload, Eye, CalendarPlus, AlertTriangle } from 'lucide-react';
import api, { Grade as ApiGrade } from '@/lib/api';
import { ApiError } from '@/utils/errorHandler';
import StudentManagement from './_components/student-management';
import { UploadScores } from './_components/upload-scores';
import { useAvailableClasses } from '@/hooks/use-system-settings';

interface LocalGrade {
  id: number;
  grade: string;
  parallel: string;
  curator_id?: number;
  curator_name?: string;
  student_count: number;
  actual_student_count?: number;
  curator_info?: {
    id: number;
    name: string;
    first_name?: string;
    last_name?: string;
    email: string;
    shanyrak?: string;
  };
}

interface CreateGradePayload {
  grade: string;
  parallel: string;
  curator_id?: number;
  curator_name?: string;
  student_count?: number;
}

export default function ClassManagementPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [authCheckLoading, setAuthCheckLoading] = useState(true);
  const [grades, setGrades] = useState<LocalGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { classes: availableClasses, grades: availableGrades, loading: classesLoading } = useAvailableClasses();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentGrade, setCurrentGrade] = useState<LocalGrade | null>(null);
  const [selectedGradeIds, setSelectedGradeIds] = useState<number[]>([]);
  const [isMultiDeleteDialogOpen, setIsMultiDeleteDialogOpen] = useState(false);
  const [isNewYearDialogOpen, setIsNewYearDialogOpen] = useState(false);
  const [newYearProcessing, setNewYearProcessing] = useState(false);
  const [formData, setFormData] = useState<CreateGradePayload>({
    grade: '',
    parallel: '',
    curator_id: undefined,
    curator_name: undefined,
    student_count: 0
  });
  const [curators, setCurators] = useState<any[]>([]);
  const [selectedParallel, setSelectedParallel] = useState<string>('');
  const [selectedLetter, setSelectedLetter] = useState<string>('');

  const availableLetters = useMemo(() => {
    if (!selectedParallel) return [] as string[];
    const lettersSet = new Set<string>();
    for (const className of availableClasses) {
      const matchesParallel = className.trim().startsWith(String(selectedParallel));
      if (!matchesParallel) continue;
      const letterMatch = className.replace(/^\d+\s*/, '').match(/[A-Za-zА-Яа-яЁё]+/);
      if (letterMatch && letterMatch[0]) {
        lettersSet.add(letterMatch[0]);
      }
    }
    return Array.from(lettersSet);
  }, [availableClasses, selectedParallel]);

  const sortedGrades = useMemo(() => {
    return [...grades].sort((a, b) => {
      const parallelA = parseInt(a.parallel) || 0;
      const parallelB = parseInt(b.parallel) || 0;
      if (parallelA !== parallelB) return parallelA - parallelB;
      return a.grade.localeCompare(b.grade);
    });
  }, [grades]);

  // Check user authentication and authorization
  useEffect(() => {
    const loadUser = async () => {
      if (isAuthenticated && !authLoading) {
        try {
          const userData = await api.getCurrentUser();
          setUser(userData);
        } catch (error) {
          router.push('/signin');
        } finally {
          setAuthCheckLoading(false);
        }
      } else if (!authLoading) {
        setAuthCheckLoading(false);
      }
    };
    
    loadUser();
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (!authCheckLoading && user && user.type !== 'admin') {
      toast.error('Доступ запрещен. Только администраторы могут управлять классами.');
      router.push('/dashboard');
    }
  }, [user, authCheckLoading, router]);

  useEffect(() => {
    if (user && user.type === 'admin') {
      fetchGrades();
      fetchCurators();
    }
  }, [user]);

  const fetchCurators = async () => {
    try {
      const curatorsData = await api.getAvailableCurators();
      setCurators(curatorsData);
    } catch (error) {
      console.error('Failed to fetch curators:', error);
    }
  };

  const fetchGrades = async () => {
    setLoading(true);
    try {
      const grades = await api.getAllGrades();
      setGrades(grades);
      setError(null);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message);
      toast.error(`Ошибка загрузки классов: ${apiError.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;

    if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? 0 : parseInt(value, 10)
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const resetForm = () => {
    setFormData({
      grade: '',
      parallel: '',
      curator_id: undefined,
      curator_name: undefined,
      student_count: 0
    });
    setCurrentGrade(null);
    setSelectedParallel('');
    setSelectedLetter('');
  };

  const handleCreateGrade = async () => {
    try {
      await api.createGrade(formData as any);
      toast.success('Класс успешно создан');
      setIsCreateDialogOpen(false);
      resetForm();
      fetchGrades();
    } catch (err) {
      const apiError = err as ApiError;
      toast.error(`Ошибка создания класса: ${apiError.message}`);
    }
  };

  const handleEditClick = (grade: LocalGrade) => {
    setCurrentGrade(grade);
    setFormData({
      grade: grade.grade || '',
      parallel: grade.parallel || '',
      curator_id: grade.curator_id,
      curator_name: grade.curator_name,
      student_count: grade.student_count || 0
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateGrade = async () => {
    if (!currentGrade) return;

    try {
      await api.updateGrade(currentGrade.id, formData as any);
      toast.success('Класс успешно обновлен');
      setIsEditDialogOpen(false);
      resetForm();
      fetchGrades();
    } catch (err) {
      const apiError = err as ApiError;
      toast.error(`Ошибка обновления класса: ${apiError.message}`);
    }
  };

  const handleDeleteClick = (grade: LocalGrade) => {
    setCurrentGrade(grade);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteGrade = async () => {
    if (!currentGrade) return;

    try {
      await api.deleteGrade(currentGrade.id);
      toast.success('Класс успешно удален');
      setIsDeleteDialogOpen(false);
      resetForm();
      fetchGrades();
    } catch (err) {
      const apiError = err as ApiError;
      toast.error(`Ошибка удаления класса: ${apiError.message}`);
    }
  };

  const handleSelectGrade = (gradeId: number, checked: boolean) => {
    if (checked) {
      setSelectedGradeIds(prev => [...prev, gradeId]);
    } else {
      setSelectedGradeIds(prev => prev.filter(id => id !== gradeId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedGradeIds(grades.map(g => g.id));
    } else {
      setSelectedGradeIds([]);
    }
  };

  const handleMultiDelete = async () => {
    try {
      for (const gradeId of selectedGradeIds) {
        await api.deleteGrade(gradeId);
      }
      toast.success(`Удалено ${selectedGradeIds.length} классов`);
      setIsMultiDeleteDialogOpen(false);
      setSelectedGradeIds([]);
      fetchGrades();
    } catch (err) {
      const apiError = err as ApiError;
      toast.error(`Ошибка удаления классов: ${apiError.message}`);
    }
  };

  const handleNewAcademicYear = async () => {
    setNewYearProcessing(true);
    try {
      // 1. Update all classes: increment parallel number (e.g., 10 -> 11)
      // 2. Delete graduating classes (e.g., 12th grade)
      // 3. Clear all scores
      
      const graduatingGrades = grades.filter(g => {
        const parallel = parseInt(g.parallel);
        return parallel >= 12; // 12 класс выпускается
      });
      
      const promotingGrades = grades.filter(g => {
        const parallel = parseInt(g.parallel);
        return parallel < 12;
      });

      // Delete graduating classes
      for (const grade of graduatingGrades) {
        await api.deleteGrade(grade.id);
      }

      // Update remaining classes to next year
      for (const grade of promotingGrades) {
        const currentParallel = parseInt(grade.parallel);
        const newParallel = (currentParallel + 1).toString();
        
        // Replace the parallel number in class name (e.g., "8 C" -> "9 C", "10 А" -> "11 А")
        // Handle both cases: "8 C" and "8C"
        let newGradeName = grade.grade;
        const numberMatch = grade.grade.match(/^(\d+)\s*(.*)$/);
        if (numberMatch) {
          const letter = numberMatch[2]; // "C" or "А" etc.
          newGradeName = `${newParallel} ${letter}`.trim();
        } else {
          // Fallback: just prepend new parallel
          newGradeName = `${newParallel} ${grade.grade.replace(/\d+/g, '')}`.trim();
        }
        
        await api.updateGrade(grade.id, {
          grade: newGradeName as any,
          parallel: newParallel,
          studentCount: grade.student_count
        });
      }

      toast.success('Учебный год успешно обновлен! Выпускные классы удалены, остальные переведены.');
      setIsNewYearDialogOpen(false);
      fetchGrades();
    } catch (err) {
      const apiError = err as ApiError;
      toast.error(`Ошибка обновления учебного года: ${apiError.message}`);
    } finally {
      setNewYearProcessing(false);
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const [currentTab, setCurrentTab] = useState("classes");
  
  // Student filters state (can be set from analytics or URL)
  const [studentFilters, setStudentFilters] = useState<{
    parallel?: string;
    gradeId?: number;
    dangerLevel?: number;
  }>({});

  // Handle URL query param for initial tab and filters
  const searchParams = useSearchParams();
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['classes', 'students'].includes(tab)) {
      setCurrentTab(tab);
    }
    
    // Parse student filters from URL
    const parallel = searchParams.get('parallel');
    const gradeId = searchParams.get('gradeId');
    const dangerLevel = searchParams.get('danger');
    
    setStudentFilters({
      parallel: parallel || undefined,
      gradeId: gradeId ? parseInt(gradeId) : undefined,
      dangerLevel: dangerLevel ? parseInt(dangerLevel) : undefined
    });
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setCurrentTab(value);
    
    // Update URL query param
    const params = new URLSearchParams();
    params.set('tab', value);
    
    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
  };

  // Show loading while checking authentication
  if (authCheckLoading || authLoading) {
    return (
      <PageContainer scrollable>
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <p className="text-gray-500">Загрузка...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  // Deny access if not admin
  if (!user || user.type !== 'admin') {
    return null;
  }

  return (
    <PageContainer scrollable>
      <div className="py-4">
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Управление школой</h1>
                <p className="text-muted-foreground">
                  Управление классами, студентами и аналитикой
                </p>
              </div>
            </div>
          </div>
        </div>

        <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="classes" className="flex items-center gap-2">
              <GraduationCap size={16} />
              Классы
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users size={16} />
              Студенты
            </TabsTrigger>
          </TabsList>

          <TabsContent value="classes" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Управление классами</h2>
              <div className="flex items-center gap-2">
                {selectedGradeIds.length > 0 && (
                  <Button 
                    variant="destructive" 
                    onClick={() => setIsMultiDeleteDialogOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Trash2 size={16} /> Удалить выбранные ({selectedGradeIds.length})
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => setIsNewYearDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <CalendarPlus size={16} /> Новый учебный год
                </Button>
                <UploadScores
                  onUploadComplete={fetchGrades}
                  trigger={
                    <Button variant="outline" className="flex items-center gap-2">
                      <Upload size={16} /> Загрузить оценки
                    </Button>
                  }
                />
                <Button onClick={openCreateDialog} className="flex items-center gap-2">
                  <Plus size={16} /> Добавить класс
                </Button>
              </div>
            </div>

            {error && (
              <Card className="mb-6 border-red-300 bg-red-50">
                <CardContent className="p-4 text-red-600">
                  {error}
                </CardContent>
              </Card>
            )}

            {loading ? (
              <Card>
                <CardContent className="p-6 text-center">
                  Загрузка классов...
                </CardContent>
              </Card>
            ) : grades.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  Классы не найдены. Нажмите "Добавить класс", чтобы создать новый.
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Классы</CardTitle>
                  <CardDescription>Управление школьными классами</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100 text-left">
                          <th className="p-3 border-b border-gray-200 font-semibold w-10">
                            <Checkbox
                              checked={selectedGradeIds.length === grades.length && grades.length > 0}
                              onCheckedChange={(checked) => handleSelectAll(!!checked)}
                            />
                          </th>
                          <th className="p-3 border-b border-gray-200 font-semibold">Класс</th>
                          <th className="p-3 border-b border-gray-200 font-semibold">Параллель</th>
                          <th className="p-3 border-b border-gray-200 font-semibold">Куратор</th>
                          <th className="p-3 border-b border-gray-200 font-semibold">Кол-во учеников</th>
                          <th className="p-3 border-b border-gray-200 font-semibold text-right">Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedGrades.map(grade => (
                          <tr key={grade.id} className="hover:bg-gray-50">
                            <td className="p-3 border-b border-gray-200">
                              <Checkbox
                                checked={selectedGradeIds.includes(grade.id)}
                                onCheckedChange={(checked) => handleSelectGrade(grade.id, !!checked)}
                              />
                            </td>
                            <td className="p-3 border-b border-gray-200 font-medium">{grade.grade}</td>
                            <td className="p-3 border-b border-gray-200">{grade.parallel}</td>
                            <td className="p-3 border-b border-gray-200">
                              {grade.curator_info ? (
                                <div>
                                  <div className="font-medium">{grade.curator_info.name}</div>
                                  <div className="text-xs text-gray-500">{grade.curator_info.email}</div>
                                  {grade.curator_info.shanyrak && (
                                    <div className="text-xs text-blue-600">{grade.curator_info.shanyrak}</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">Не назначен</span>
                              )}
                            </td>
                            <td className="p-3 border-b border-gray-200">
                              {grade.actual_student_count || 0}
                              {grade.student_count !== (grade.actual_student_count || 0) && (
                                <span className="text-xs text-gray-500 ml-1">
                                  (записано: {grade.student_count || 0})
                                </span>
                              )}
                            </td>
                            <td className="p-3 border-b border-gray-200 text-right space-x-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => router.push(`/dashboard/classes/${grade.id}`)}
                                className="h-8 w-8 inline-flex items-center justify-center"
                                title="Просмотр"
                              >
                                <Eye size={16} />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleEditClick(grade)}
                                className="h-8 w-8 inline-flex items-center justify-center"
                                title="Редактировать"
                              >
                                <Pencil size={16} />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleDeleteClick(grade)}
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 inline-flex items-center justify-center"
                                title="Удалить"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="students">
            <StudentManagement
              grades={grades.map(g => ({
                id: g.id,
                grade: g.grade,
                parallel: g.parallel,
                curatorName: g.curator_info?.name || g.curator_name || 'Не назначен',
                shanyrak: g.curator_info?.shanyrak || '',
                studentCount: g.student_count,
                actualStudentCount: g.actual_student_count
              }))}
              onRefreshGrades={fetchGrades}
              initialFilters={studentFilters}
            />
          </TabsContent>
        </Tabs>

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить новый класс</DialogTitle>
              <DialogDescription>
                Введите информацию о новом классе
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="parallel">Параллель</Label>
                  <Select
                    value={selectedParallel}
                    onValueChange={(value) => {
                      setSelectedParallel(value);
                      setSelectedLetter('');
                      // Keep `grade` as combined view: `${parallel} ${letter}` if letter selected
                      const combined = value && selectedLetter ? `${value} ${selectedLetter}` : '';
                      setFormData(prev => ({ ...prev, parallel: value, grade: combined }));
                    }}
                    disabled={classesLoading}
                  >
                    <SelectTrigger id="parallel">
                      <SelectValue placeholder="Выберите параллель" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableGrades.map((g) => (
                        <SelectItem key={g.toString()} value={g.toString()}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="grade">Буква</Label>
                  <Select
                    value={selectedLetter}
                    onValueChange={(letter) => {
                      setSelectedLetter(letter);
                      const combined = selectedParallel ? `${selectedParallel} ${letter}` : '';
                      setFormData(prev => ({ ...prev, grade: combined }));
                    }}
                    disabled={!selectedParallel || classesLoading}
                  >
                    <SelectTrigger id="grade">
                      <SelectValue placeholder={selectedParallel ? 'Выберите букву' : 'Сначала выберите параллель'} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLetters.map((letter) => (
                        <SelectItem key={letter} value={letter}>
                          {letter}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="curator">Куратор</Label>
                <Select
                  value={formData.curator_id?.toString() || ''}
                  onValueChange={(value) => {
                    const curatorId = value && value !== 'none' ? parseInt(value) : undefined;
                    const curator = curators.find(c => c.id === curatorId);
                    setFormData(prev => ({
                      ...prev,
                      curator_id: curatorId,
                      curator_name: curator?.name
                    }));
                  }}
                >
                  <SelectTrigger id="curator">
                    <SelectValue placeholder="Выберите куратора" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    <SelectItem value="none">Без куратора</SelectItem>
                    {curators.map((curator) => (
                      <SelectItem key={curator.id} value={curator.id.toString()}>
                        {curator.name} ({curator.email})
                        {curator.shanyrak && ` - ${curator.shanyrak}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="studentCount">Количество учеников</Label>
                <Input
                  id="studentCount"
                  name="student_count"
                  type="number"
                  placeholder="0"
                  value={formData.student_count?.toString() || "0"}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Отмена
              </Button>
              <Button onClick={handleCreateGrade}>Создать</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Редактировать класс</DialogTitle>
              <DialogDescription>
                Обновите информацию о классе
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-grade">Класс</Label>
                  <Input
                    id="edit-grade"
                    name="grade"
                    value={formData.grade}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-parallel">Параллель</Label>
                  <Input
                    id="edit-parallel"
                    name="parallel"
                    value={formData.parallel}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-curator">Куратор</Label>
                <Select
                  value={formData.curator_id?.toString() || ''}
                  onValueChange={(value) => {
                    const curatorId = value && value !== 'none' ? parseInt(value) : undefined;
                    const curator = curators.find(c => c.id === curatorId);
                    setFormData(prev => ({
                      ...prev,
                      curator_id: curatorId,
                      curator_name: curator?.name
                    }));
                  }}
                >
                  <SelectTrigger id="edit-curator">
                    <SelectValue placeholder="Выберите куратора" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    <SelectItem value="none">Без куратора</SelectItem>
                    {curators.map((curator) => (
                      <SelectItem key={curator.id} value={curator.id.toString()}>
                        {curator.name} ({curator.email})
                        {curator.shanyrak && ` - ${curator.shanyrak}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-studentCount">Количество учеников</Label>
                <Input
                  id="edit-studentCount"
                  name="student_count"
                  type="number"
                  value={formData.student_count?.toString() || "0"}
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
              <Button onClick={handleUpdateGrade}>Обновить</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Удалить класс</DialogTitle>
              <DialogDescription>
                Вы уверены, что хотите удалить этот класс? Это действие нельзя отменить.
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
                onClick={handleDeleteGrade}
              >
                Удалить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Multi Delete Confirmation Dialog */}
        <Dialog open={isMultiDeleteDialogOpen} onOpenChange={setIsMultiDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Удалить выбранные классы
              </DialogTitle>
              <DialogDescription>
                Вы уверены, что хотите удалить {selectedGradeIds.length} выбранных классов? 
                Все данные студентов и оценок будут удалены. Это действие нельзя отменить.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsMultiDeleteDialogOpen(false)}
              >
                Отмена
              </Button>
              <Button
                variant="destructive"
                onClick={handleMultiDelete}
              >
                Удалить {selectedGradeIds.length} классов
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Academic Year Dialog */}
        <Dialog open={isNewYearDialogOpen} onOpenChange={setIsNewYearDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarPlus className="h-5 w-5 text-primary" />
                Начать новый учебный год
              </DialogTitle>
              <DialogDescription>
                Эта операция выполнит следующие действия:
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Удаление выпускных классов</p>
                    <p className="text-sm text-red-600">
                      Все классы 12 параллели будут удалены вместе с данными студентов
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <GraduationCap className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800">Перевод классов</p>
                    <p className="text-sm text-blue-600">
                      Все остальные классы будут переведены на следующую параллель (10→11, 11→12)
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <strong>Внимание:</strong> Это действие необратимо. Рекомендуем сделать резервную копию данных перед продолжением.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsNewYearDialogOpen(false)}
                disabled={newYearProcessing}
              >
                Отмена
              </Button>
              <Button
                onClick={handleNewAcademicYear}
                disabled={newYearProcessing}
              >
                {newYearProcessing ? 'Обработка...' : 'Начать новый год'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  );
} 