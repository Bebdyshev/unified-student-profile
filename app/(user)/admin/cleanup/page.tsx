'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'react-toastify';
import api from '@/lib/api';
import { Trash2, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

interface InvalidStudent {
  id: number;
  name: string;
  email?: string;
  grade: string;
  grade_id: number;
  reason: string;
  is_active: number;
}

export default function DataCleanupPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [invalidStudents, setInvalidStudents] = useState<InvalidStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      if (isAuthenticated && !authLoading) {
        try {
          const userData = await api.getCurrentUser();
          setUser(userData);
          if (userData.type !== 'admin') {
            toast.error('Доступ запрещен');
            router.push('/dashboard');
          }
        } catch (error) {
          router.push('/signin');
        }
      } else if (!authLoading) {
        router.push('/signin');
      }
    };
    loadUser();
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (user && user.type === 'admin') {
      fetchInvalidStudents();
    }
  }, [user]);

  const fetchInvalidStudents = async () => {
    setLoading(true);
    try {
      const data = await api.getInvalidStudents();
      setInvalidStudents(data.students || []);
    } catch (error: any) {
      toast.error(`Ошибка загрузки данных: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    const confirmed = window.confirm(
      `Это действие удалит ${invalidStudents.length} некорректных записей студентов из базы данных. Продолжить?`
    )
    if (!confirmed) return

    setDeleting(true);
    try {
      const result = await api.deleteInvalidStudents();
      toast.success(result.message || `Удалено ${result.deleted_count} записей`);
      fetchInvalidStudents();
    } catch (error: any) {
      toast.error(`Ошибка удаления: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const result = await api.recalculateAllPredictions();
      toast.success(result.message || `Пересчитано ${result.updated_count} записей`);
    } catch (error: any) {
      toast.error(`Ошибка пересчета: ${error.message}`);
    } finally {
      setRecalculating(false);
    }
  };

  if (loading || authLoading) {
    return (
      <PageContainer scrollable>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg">Загрузка...</div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer scrollable>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Очистка данных</h1>
          <p className="text-muted-foreground mt-2">
            Управление некорректными записями студентов
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Некорректные записи
                </CardTitle>
                <CardDescription>
                  Найдено {invalidStudents.length} студентов с некорректными данными
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchInvalidStudents}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Обновить
                </Button>
                {invalidStudents.length > 0 && (
                  <Button variant="destructive" size="sm" disabled={deleting} onClick={handleDeleteAll}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Удалить все
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {invalidStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium">Все данные корректны</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Некорректных записей студентов не найдено
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Имя</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Класс</TableHead>
                      <TableHead>Причина</TableHead>
                      <TableHead className="text-center">Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invalidStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-mono text-sm">{student.id}</TableCell>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {student.email || '-'}
                        </TableCell>
                        <TableCell>{student.grade}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {student.reason}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={student.is_active === 1 ? 'default' : 'secondary'}>
                            {student.is_active === 1 ? 'Активен' : 'Неактивен'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Пересчет прогнозов</CardTitle>
                <CardDescription>
                  Пересчитать уровень учащегося и динамику для всех студентов
                </CardDescription>
              </div>
              <Button
                onClick={handleRecalculate}
                disabled={recalculating}
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${recalculating ? 'animate-spin' : ''}`} />
                {recalculating ? 'Пересчет...' : 'Пересчитать все'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Используйте эту функцию после:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Запуска миграции для заполнения teacher_percent</li>
              <li>Обновления настроек весов прогнозирования</li>
              <li>Исправления данных оценок</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Предотвращение проблем</CardTitle>
            <CardDescription>
              Система автоматически фильтрует некорректные данные при импорте
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">Валидация имен</div>
                <div className="text-muted-foreground">
                  Имена должны содержать минимум 2 символа и хотя бы одну букву
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">Фильтрация мусорных данных</div>
                <div className="text-muted-foreground">
                  Автоматически отсеиваются записи вроде "No", "N/A", цифры, специальные символы
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">Проверка при импорте</div>
                <div className="text-muted-foreground">
                  При загрузке Excel некорректные строки пропускаются с предупреждением
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
