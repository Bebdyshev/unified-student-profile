'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  User, 
  GraduationCap, 
  TrendingDown, 
  TrendingUp, 
  Award, 
  AlertTriangle,
  Calendar,
  Mail,
  Phone,
  Users,
  BookOpen,
  Trophy,
  FileText
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import type { StudentProfile, DisciplinaryAction, Achievement, StudentScore } from '@/types';

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

const SEVERITY_COLORS = {
  1: 'bg-blue-100 text-blue-800',
  2: 'bg-yellow-100 text-yellow-800',
  3: 'bg-orange-100 text-orange-800',
  4: 'bg-red-100 text-red-800',
  5: 'bg-red-200 text-red-900'
};

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = parseInt(params.id as string);

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (studentId) {
      fetchStudentProfile();
    }
  }, [studentId]);

  const fetchStudentProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const profileData = await api.getStudentProfile(studentId);
      setStudent(profileData);
    } catch (error: any) {
      console.error('Failed to fetch student profile:', error);
      setError(error.message || 'Не удалось загрузить профиль студента');
      toast.error('Ошибка при загрузке профиля студента');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateOverallDangerLevel = (scores: StudentScore[]) => {
    if (scores.length === 0) return 0;
    const totalDanger = scores.reduce((sum, score) => sum + score.danger_level, 0);
    return Math.round(totalDanger / scores.length);
  };

  const calculateAverageScore = (scores: StudentScore[]) => {
    if (scores.length === 0) return 0;
    const allScores = scores.flatMap(score => score.actual_scores.filter(s => s > 0));
    if (allScores.length === 0) return 0;
    return Math.round((allScores.reduce((sum, score) => sum + score, 0) / allScores.length) * 10) / 10;
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

  if (error || !student) {
    return (
      <PageContainer scrollable>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <AlertTriangle className="h-12 w-12 text-red-500" />
          <h2 className="text-xl font-semibold">Ошибка загрузки</h2>
          <p className="text-muted-foreground text-center">{error}</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Вернуться назад
          </Button>
        </div>
      </PageContainer>
    );
  }

  const overallDangerLevel = calculateOverallDangerLevel(student.scores);
  const averageScore = calculateAverageScore(student.scores);
  const totalAchievementPoints = student.achievements.reduce((sum, achievement) => sum + achievement.points, 0);
  const unresolvedDisciplinaryActions = student.disciplinary_actions.filter(action => action.is_resolved === 0);

  return (
    <PageContainer scrollable>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{student.name}</h1>
              <p className="text-muted-foreground">
                {student.grade_info ? `${student.grade_info.grade} ${student.grade_info.parallel}` : 'Класс не указан'}
                {student.subgroup_info && ` • ${student.subgroup_info.name}`}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={`${DANGER_LEVEL_COLORS[overallDangerLevel as keyof typeof DANGER_LEVEL_COLORS]} text-white`}>
              {DANGER_LEVEL_NAMES[overallDangerLevel as keyof typeof DANGER_LEVEL_NAMES]} риск
            </Badge>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Средний балл</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageScore}%</div>
              <p className="text-xs text-muted-foreground">
                По {student.scores.length} предметам
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Достижения</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{student.achievements.length}</div>
              <p className="text-xs text-muted-foreground">
                {totalAchievementPoints} баллов
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Дисциплина</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unresolvedDisciplinaryActions.length}</div>
              <p className="text-xs text-muted-foreground">
                Нерешенных вопросов
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Уровень риска</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallDangerLevel}</div>
              <p className="text-xs text-muted-foreground">
                {DANGER_LEVEL_NAMES[overallDangerLevel as keyof typeof DANGER_LEVEL_NAMES]}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Student Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Информация о студенте
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Email:</span>
                  <span className="text-sm">{student.email || 'Не указан'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Телефон:</span>
                  <span className="text-sm">{student.phone || 'Не указан'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Контакт родителей:</span>
                  <span className="text-sm">{student.parent_contact || 'Не указан'}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">ID студента:</span>
                  <span className="text-sm">{student.student_id_number || 'Не указан'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Дата создания:</span>
                  <span className="text-sm">{formatDate(student.created_at)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Information Tabs */}
        <Tabs defaultValue="grades" className="space-y-4">
          <TabsList>
            <TabsTrigger value="grades" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Оценки ({student.scores.length})
            </TabsTrigger>
            <TabsTrigger value="achievements" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Достижения ({student.achievements.length})
            </TabsTrigger>
            <TabsTrigger value="discipline" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Дисциплина ({student.disciplinary_actions.length})
            </TabsTrigger>
          </TabsList>

          {/* Grades Tab */}
          <TabsContent value="grades" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Успеваемость по предметам</CardTitle>
                <CardDescription>
                  Актуальные и прогнозируемые оценки с уровнем риска
                </CardDescription>
              </CardHeader>
              <CardContent>
                {student.scores.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Оценки не найдены
                  </p>
                ) : (
                  <div className="space-y-4">
                    {student.scores.map((score, index) => (
                      <div key={score.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium">{score.subject_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Учитель: {score.teacher_name} • Семестр: {score.semester}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`${DANGER_LEVEL_COLORS[score.danger_level as keyof typeof DANGER_LEVEL_COLORS]} text-white`}>
                              {DANGER_LEVEL_NAMES[score.danger_level as keyof typeof DANGER_LEVEL_NAMES]}
                            </Badge>
                            {score.delta_percentage && (
                              <Badge variant="outline">
                                Δ {score.delta_percentage}%
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Quarterly Predictions Table */}
                        <div className="overflow-x-auto mt-4">
                          <table className="w-full border-collapse text-sm">
                            <thead>
                              <tr className="bg-muted">
                                <th className="border px-3 py-2 text-left">ФИО</th>
                                <th className="border px-3 py-2 text-center">Оценка учителя, %</th>
                                <th className="border px-3 py-2 text-center">Процент за 1 предыдущий класс</th>
                                <th className="border px-3 py-2 text-center">Q1</th>
                                <th className="border px-3 py-2 text-center">Q2</th>
                                <th className="border px-3 py-2 text-center">Q3</th>
                                <th className="border px-3 py-2 text-center">Q4</th>
                                <th className="border px-3 py-2 text-center">Высчитанный предикт</th>
                                <th className="border px-3 py-2 text-center">Реальный процент</th>
                                <th className="border px-3 py-2 text-center">Динамика (+/-)</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="border px-3 py-2 font-medium">{student.name}</td>
                                <td className="border px-3 py-2 text-center">
                                  {score.teacher_name ? 'Есть' : 'Н/Д'}
                                </td>
                                <td className="border px-3 py-2 text-center">
                                  {score.previous_class_score !== null && score.previous_class_score !== undefined 
                                    ? `${score.previous_class_score.toFixed(1)}%` 
                                    : 'Н/Д'}
                                </td>
                                {[0, 1, 2, 3].map((quarterIdx) => {
                                  const actual = score.actual_scores?.[quarterIdx] || 0;
                                  const predicted = score.predicted_scores?.[quarterIdx] || 0;
                                  const hasActual = actual > 0;
                                  const diff = hasActual ? (actual - predicted).toFixed(1) : null;
                                  
                                  return (
                                    <td key={quarterIdx} className="border px-3 py-2 text-center">
                                      <div className="space-y-1">
                                        <div className={`font-medium ${hasActual ? 'text-green-600' : 'text-muted-foreground'}`}>
                                          {hasActual ? `${actual.toFixed(1)}%` : 'Н/Д'}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          Прогноз: {predicted > 0 ? `${predicted.toFixed(1)}%` : 'Н/Д'}
                                        </div>
                                        {diff && (
                                          <div className={`text-xs font-semibold ${parseFloat(diff) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {parseFloat(diff) >= 0 ? '+' : ''}{diff}%
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  );
                                })}
                                <td className="border px-3 py-2 text-center">
                                  {score.predicted_scores && score.predicted_scores.length > 0
                                    ? `${(score.predicted_scores.reduce((a: number, b: number) => a + b, 0) / score.predicted_scores.length).toFixed(1)}%`
                                    : 'Н/Д'}
                                </td>
                                <td className="border px-3 py-2 text-center">
                                  {score.actual_scores && score.actual_scores.length > 0
                                    ? (() => {
                                        const validScores = score.actual_scores.filter((s: number) => s > 0);
                                        return validScores.length > 0
                                          ? `${(validScores.reduce((a: number, b: number) => a + b, 0) / validScores.length).toFixed(1)}%`
                                          : 'Н/Д';
                                      })()
                                    : 'Н/Д'}
                                </td>
                                <td className="border px-3 py-2 text-center">
                                  {score.delta_percentage !== null && score.delta_percentage !== undefined
                                    ? (
                                        <span className={`font-semibold ${score.delta_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {score.delta_percentage >= 0 ? '+' : ''}{score.delta_percentage.toFixed(1)}%
                                        </span>
                                      )
                                    : 'Н/Д'}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Достижения студента</CardTitle>
                <CardDescription>
                  Награды и достижения в различных категориях
                </CardDescription>
              </CardHeader>
              <CardContent>
                {student.achievements.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Достижения не найдены
                  </p>
                ) : (
                  <div className="space-y-4">
                    {student.achievements.map((achievement) => (
                      <div key={achievement.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Trophy className="h-4 w-4 text-yellow-500" />
                              <h4 className="font-medium">{achievement.title}</h4>
                              <Badge variant="secondary">{achievement.category}</Badge>
                              {achievement.points > 0 && (
                                <Badge className="bg-yellow-100 text-yellow-800">
                                  +{achievement.points} баллов
                                </Badge>
                              )}
                            </div>
                            {achievement.description && (
                              <p className="text-sm text-muted-foreground mb-2">
                                {achievement.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Дата: {formatDate(achievement.achievement_date)}</span>
                              {achievement.awarder_name && (
                                <span>Выдал: {achievement.awarder_name}</span>
                              )}
                            </div>
                          </div>
                          {achievement.certificate_url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={achievement.certificate_url} target="_blank" rel="noopener noreferrer">
                                Сертификат
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Discipline Tab */}
          <TabsContent value="discipline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Дисциплинарные записи</CardTitle>
                <CardDescription>
                  История дисциплинарных взысканий и их статус
                </CardDescription>
              </CardHeader>
              <CardContent>
                {student.disciplinary_actions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Дисциплинарные записи не найдены
                  </p>
                ) : (
                  <div className="space-y-4">
                    {student.disciplinary_actions.map((action) => (
                      <div key={action.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{action.action_type}</h4>
                              <Badge className={SEVERITY_COLORS[action.severity_level as keyof typeof SEVERITY_COLORS]}>
                                Уровень {action.severity_level}
                              </Badge>
                              <Badge variant={action.is_resolved ? "default" : "destructive"}>
                                {action.is_resolved ? "Решено" : "Активно"}
                              </Badge>
                            </div>
                            <p className="text-sm mb-2">{action.description}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Дата: {formatDate(action.action_date)}</span>
                              {action.issuer_name && (
                                <span>Выдал: {action.issuer_name}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {action.resolution_notes && (
                          <div className="mt-3 p-3 bg-muted rounded">
                            <h5 className="text-sm font-medium mb-1">Примечания к решению:</h5>
                            <p className="text-sm">{action.resolution_notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
}



