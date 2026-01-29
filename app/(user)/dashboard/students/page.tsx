'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search,
  User,
  Eye,
  GraduationCap,
  AlertTriangle,
  Users,
  Filter,
  UserCheck
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { handleApiError } from '@/utils/errorHandler';
import { toast } from 'sonner';
import type { Student, Grade, Subgroup } from '@/types';

const DANGER_LEVEL_COLORS = {
  0: 'bg-green-100 text-green-800',
  1: 'bg-yellow-100 text-yellow-800',
  2: 'bg-orange-100 text-orange-800',
  3: 'bg-red-100 text-red-800'
};

const DANGER_LEVEL_NAMES = {
  0: 'Низкий',
  1: 'Умеренный',
  2: 'Высокий',
  3: 'Критический'
};

interface StudentWithGrade extends Student {
  grade_info?: Grade;
  subgroup_info?: Subgroup;
  average_score?: number;
  danger_level?: number;
}

export default function StudentsPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [students, setStudents] = useState<StudentWithGrade[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentWithGrade[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedDangerLevel, setSelectedDangerLevel] = useState<string>('all');
  const [selectedParallel, setSelectedParallel] = useState<string>('all');

  // Read danger level from URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dangerParam = params.get('danger');
    if (dangerParam && ['0', '1', '2', '3'].includes(dangerParam)) {
      setSelectedDangerLevel(dangerParam);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/signin');
      return;
    }
    fetchData();
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    filterStudents();
  }, [students, searchQuery, selectedGrade, selectedDangerLevel, selectedParallel]);

  // Compute parallels from grades
  const parallels = Array.from(new Set(grades.map(g => {
    const match = g.grade.match(/^(\d+)/);
    return match ? match[1] : null;
  }))).filter(Boolean).sort((a, b) => parseInt(a!) - parseInt(b!));
  
  const filteredGrades = grades.filter(g => {
      if (selectedParallel === 'all') return true;
      return g.grade.startsWith(selectedParallel);
  });

  const fetchData = async () => {
    try {
      setLoading(true);

      // Get all grades and students data
      const [gradesData, classData] = await Promise.all([
        api.getAllGrades(),
        api.getAllClassData()
      ]);

      setGrades(gradesData);

      // Transform class data to student list with additional info
      const allStudents: StudentWithGrade[] = [];

      if (classData.class_data) {
        classData.class_data.forEach((classInfo: any) => {
          classInfo.class.forEach((student: any) => {
            const gradeInfo = gradesData.find(g => g.grade === student.class_liter);

            allStudents.push({
              id: student.id,
              name: student.student_name,
              email: student.email || undefined,
              student_id_number: undefined,
              phone: undefined,
              parent_contact: undefined,
              is_active: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              grade_id: gradeInfo?.id || 0,
              subgroup_id: undefined,
              user_id: undefined,
              grade_info: gradeInfo,
              average_score: student.avg_percentage || 0, // Use backend-calculated average
              danger_level: student.danger_level || 0
            });
          });
        });
      }

      setStudents(allStudents);
    } catch (error: any) {
      const normalized = (error && error.isApiError) ? error : handleApiError(error);
      // Если 404 (нет данных классов) — показываем пустой список без ошибки
      if (normalized.status === 404) {
        setStudents([]);
      } else {
        // Логируем исходную ошибку и нормализованную для диагностики
        try {
          const status = error?.response?.status;
          const data = error?.response?.data;
          console.error('Failed to fetch students data (raw status):', status);
          if (data) console.error('Failed to fetch students data (raw data):', data);
        } catch { }
        console.error('Failed to fetch students data (normalized):', normalized);
        toast.error(normalized.message || 'Не удалось загрузить данные студентов');
      }
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = students;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(query) ||
        (student.email && student.email.toLowerCase().includes(query)) ||
        (student.student_id_number && student.student_id_number.toLowerCase().includes(query))
      );
    }

    // Filter by grade
    if (selectedGrade !== 'all') {
      filtered = filtered.filter(student =>
        student.grade_info && `${student.grade_info.grade}_${student.grade_info.parallel}` === selectedGrade
      );
    } else if (selectedParallel !== 'all') {
      // If "All Grades" is selected but a Parallel is chosen, filter by Parallel
      filtered = filtered.filter(student => 
        student.grade_info && student.grade_info.grade.startsWith(selectedParallel)
      );
    }

    // Filter by danger level
    if (selectedDangerLevel !== 'all') {
      const dangerLevel = parseInt(selectedDangerLevel);
      filtered = filtered.filter(student => student.danger_level === dangerLevel);
    }

    setFilteredStudents(filtered);
  };

  const handleViewProfile = (studentId: number) => {
    router.push(`/dashboard/students/${studentId}`);
  };

  if (loading) {
    return (
      <PageContainer scrollable>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer scrollable>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Студенты</h1>
            <p className="text-muted-foreground">
              Управление профилями студентов и их успеваемостью
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Всего: {students.length}
            </Badge>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(level => {
            const count = students.filter(s => s.danger_level === level).length;
            return (
              <Card key={level}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {DANGER_LEVEL_NAMES[level as keyof typeof DANGER_LEVEL_NAMES]} риск
                  </CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{count}</div>
                  <p className="text-xs text-muted-foreground">
                    {students.length > 0 ? Math.round((count / students.length) * 100) : 0}% от общего числа
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Фильтры
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Поиск</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по имени, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Параллель</label>
                <Select value={selectedParallel} onValueChange={(v) => {setSelectedParallel(v); setSelectedGrade('all');}}>
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

              {/* Grade Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Класс</label>
                <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите класс" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все классы</SelectItem>
                    {filteredGrades.map((grade) => (
                      <SelectItem key={grade.id} value={`${grade.grade}_${grade.parallel}`}>
                        {grade.grade && grade.parallel && grade.grade.includes(grade.parallel) 
                          ? grade.grade 
                          : `${grade.grade} ${grade.parallel}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Danger Level Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Уровень риска</label>
                <Select value={selectedDangerLevel} onValueChange={setSelectedDangerLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите уровень" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все уровни</SelectItem>
                    {[0, 1, 2, 3].map(level => (
                      <SelectItem key={level} value={level.toString()}>
                        {DANGER_LEVEL_NAMES[level as keyof typeof DANGER_LEVEL_NAMES]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Students List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Список студентов ({filteredStudents.length})
            </CardTitle>
            <CardDescription>
              Нажмите на студента для просмотра подробного профиля
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredStudents.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Студенты не найдены</h3>
                <p className="text-muted-foreground">
                  Попробуйте изменить фильтры или критерии поиска
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleViewProfile(student.id)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">{student.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {student.grade_info && (
                            <span className="flex items-center gap-1">
                              <GraduationCap className="h-3 w-3" />
                              {student.grade_info.grade && student.grade_info.parallel && student.grade_info.grade.includes(student.grade_info.parallel)
                                ? student.grade_info.grade
                                : `${student.grade_info.grade} ${student.grade_info.parallel}`
                              }
                            </span>
                          )}
                          {student.email && <span>• {student.email}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      {student.average_score !== undefined && (
                        <Badge variant="outline">
                          {student.average_score}% средний балл
                        </Badge>
                      )}
                      <Badge className={DANGER_LEVEL_COLORS[student.danger_level as keyof typeof DANGER_LEVEL_COLORS]}>
                        {DANGER_LEVEL_NAMES[student.danger_level as keyof typeof DANGER_LEVEL_NAMES]}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}



