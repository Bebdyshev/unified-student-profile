'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-toastify';
import { Users, BookOpen, School, AlertTriangle } from 'lucide-react';
import { handleApiError } from '@/utils/errorHandler';
import api from '@/lib/api';
import Link from 'next/link';

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

interface DashboardStats {
  totalStudents: number;
  totalClasses: number;
  totalSubjects: number;
  atRiskStudents: number;
}

export default function TeacherDashboardPage() {
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalClasses: 0,
    totalSubjects: 0,
    atRiskStudents: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const assignmentsData = await api.getMyTeacherAssignments();
      setAssignments(assignmentsData);
      
      // Calculate stats
      const uniqueSubjects = new Set(assignmentsData.map((a: TeacherAssignment) => a.subject_id));
      const uniqueClasses = new Set(assignmentsData.filter((a: TeacherAssignment) => a.grade_id).map((a: TeacherAssignment) => a.grade_id));
      
      setStats({
        totalStudents: 0, // Will be fetched from separate endpoint
        totalClasses: uniqueClasses.size,
        totalSubjects: uniqueSubjects.size,
        atRiskStudents: 0
      });
    } catch (err) {
      const apiError = handleApiError(err);
      toast.error(`Ошибка загрузки данных: ${apiError.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Панель учителя</h1>
          <p className="text-gray-500">Добро пожаловать! Здесь вы можете управлять оценками ваших студентов.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Мои классы</CardTitle>
            <School className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClasses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Мои предметы</CardTitle>
            <BookOpen className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubjects}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Назначений</CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">В зоне риска</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.atRiskStudents}</div>
          </CardContent>
        </Card>
      </div>

      {/* Assignments */}
      <Card>
        <CardHeader>
          <CardTitle>Мои назначения</CardTitle>
          <CardDescription>
            Классы и предметы, которые вам назначены
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              У вас пока нет назначенных классов или предметов.
              <br />
              Обратитесь к администратору для получения назначений.
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <div 
                  key={assignment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">{assignment.subject_name}</div>
                      <div className="text-sm text-gray-500">
                        {assignment.grade_name || 'Все классы'}
                        {assignment.subgroup_name && ` • ${assignment.subgroup_name}`}
                      </div>
                    </div>
                  </div>
                  <Link href={`/teacher/grades/entry?subject=${assignment.subject_id}&grade=${assignment.grade_id || ''}`}>
                    <Button variant="outline" size="sm">
                      Ввести оценки
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Быстрые действия</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/teacher/grades/entry">
              <Button>
                <BookOpen className="mr-2 h-4 w-4" />
                Ввести оценки
              </Button>
            </Link>
            <Link href="/teacher/classes">
              <Button variant="outline">
                <Users className="mr-2 h-4 w-4" />
                Мои студенты
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
