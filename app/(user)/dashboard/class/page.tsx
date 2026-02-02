'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'react-toastify';
import api, { ClassData, Student } from '@/lib/api';

export default function ClassPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const classParam = searchParams.get('class');
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [authCheckLoading, setAuthCheckLoading] = useState(true);
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      toast.error('Доступ запрещен. Только администраторы могут просматривать детали класса.');
      router.push('/dashboard');
    }
  }, [user, authCheckLoading, router]);

  useEffect(() => {
    if (user && user.type === 'admin') {
      fetchClassData();
    }
  }, [user, classParam]);

  const fetchClassData = async () => {
      if (!classParam) {
        setError('Класс не указан');
        setLoading(false);
        return;
      }
      console.log(`/classes/class/${classParam}`);
      try {
        setLoading(true);
        // Parse classParam to get parallel and class name
        const [parallel, className] = classParam.split(' ');
        const response = await api.getClassData(parallel, className);
        setClassData(response);
        setError(null);
      } catch (err) {
        console.error('Error fetching class data:', err);
        setError('Ошибка при загрузке данных класса');
      } finally {
        setLoading(false);
      }
    };

  const getDangerLevelColor = (level: number) => {
    if (level >= 2.5) return 'text-red-500';
    if (level >= 1.5) return 'text-yellow-500';
    return 'text-orange-500';
  };

  const getDangerLevelBgColor = (level: number) => {
    if (level >= 2.5) return 'bg-red-100';
    if (level >= 1.5) return 'bg-yellow-100';
    return 'bg-orange-100';
  };

  if (authCheckLoading || authLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-full">
          <p className="text-lg">Проверка доступа...</p>
        </div>
      </PageContainer>
    );
  }

  if (!user || user.type !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-full">
          <p className="text-lg">Загрузка данных класса...</p>
        </div>
      </PageContainer>
    );
  }

  if (error || !classData) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-lg text-red-500">{error || 'Данные класса не найдены'}</p>
          <p className="mt-2">Проверьте правильность URL или выберите класс из списка</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer scrollable>
      <div className="py-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">
            Класс {classData.class_name}
          </h1>
          <div className={`px-4 py-2 rounded-lg ${getDangerLevelBgColor(classData.avg_danger_level)}`}>
            <span className="font-semibold">Средний уровень опасности: </span>
            <span className={`font-bold ${getDangerLevelColor(classData.avg_danger_level)}`}>
              {classData.avg_danger_level.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Секция со списком учеников */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Список учеников</CardTitle>
            <CardDescription>Информация об учениках класса {classData.class_name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 border text-left">№</th>
                    <th className="px-4 py-2 border text-left">Имя</th>
                    <th className="px-4 py-2 border text-center">Уровень опасности</th>
                    <th className="px-4 py-2 border text-center">Посещаемость</th>
                    <th className="px-4 py-2 border text-center">Средний балл</th>
                  </tr>
                </thead>
                <tbody>
                  {classData.students.map((student, index) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 border">{index + 1}</td>
                      <td className="px-4 py-2 border">{student.name}</td>
                      <td className="px-4 py-2 border text-center">
                        <span className={getDangerLevelColor(student.danger_level || 0)}>
                          {(student.danger_level || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-2 border text-center">
                        N/A
                      </td>
                      <td className="px-4 py-2 border text-center">
                        {(student.average_grade || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Секция со статистикой */}
        <h2 className="text-xl font-semibold mb-4">Статистика класса</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Распределение по уровню опасности</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center">
                <p className="text-muted-foreground">Здесь будет график распределения</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Посещаемость</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center">
                <p className="text-muted-foreground">Здесь будет график посещаемости</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Успеваемость по предметам</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center">
                <p className="text-muted-foreground">Здесь будет график успеваемости</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Динамика изменений</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center">
                <p className="text-muted-foreground">Здесь будет график динамики</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
} 