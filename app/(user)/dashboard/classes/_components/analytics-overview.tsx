'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  TrendingDown,
  TrendingUp,
  Users, 
  BookOpen,
  Lightbulb,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  School,
  Target
} from 'lucide-react';
import api, { InsightsData, AtRiskStudent, ProblemClass, SubjectAnalysis, Recommendation } from '@/lib/api';
import { toast } from 'sonner';

interface Grade {
  id: number;
  grade: string;
  parallel: string;
  curatorName: string;
  shanyrak: string;
  studentCount?: number;
  actualStudentCount?: number;
}

interface AnalyticsOverviewProps {
  grades: Grade[];
  onTabChange?: (tab: string) => void;
}

export default function AnalyticsOverview({ grades, onTabChange }: AnalyticsOverviewProps) {
  const router = useRouter();
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
  }, []);

  const handleActionClick = (link: string | null) => {
    if (!link) return;
    
    // Check if it's an internal tab switch for /dashboard/classes
    if (link === '/dashboard/classes' && onTabChange) {
      onTabChange('classes');
    } else {
      router.push(link);
    }
  };

  const fetchInsights = async () => {

    setLoading(true);
    try {
      const data = await api.getInsights();
      setInsights(data);
    } catch (err: any) {
      toast.error(`Ошибка загрузки аналитики: ${err.message || 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'urgent': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'info': return <Info className="h-5 w-5 text-blue-500" />;
      case 'success': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      default: return <Info className="h-5 w-5" />;
    }
  };

  const getRecommendationStyle = (type: string) => {
    switch (type) {
      case 'urgent': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-orange-200 bg-orange-50';
      case 'info': return 'border-blue-200 bg-blue-50';
      case 'success': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getPriorityBadge = (priority: string) => {
    return priority === 'critical' 
      ? <Badge variant="destructive">Критический</Badge>
      : <Badge variant="secondary" className="bg-orange-100 text-orange-800">Высокий</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'critical': return <Badge variant="destructive">Критический</Badge>;
      case 'warning': return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Внимание</Badge>;
      case 'ok': return <Badge className="bg-green-100 text-green-800 border-green-200">Норма</Badge>;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Загрузка аналитики...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Нет данных для отображения
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalStudents = grades.reduce((sum, grade) => sum + (grade.actualStudentCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего студентов</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.summary.total_students || totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              в {grades.length} классах
            </p>
          </CardContent>
        </Card>

        <Card className={insights.summary.at_risk_count > 0 ? 'border-orange-200' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">В зоне риска</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{insights.summary.at_risk_count}</div>
            <p className="text-xs text-muted-foreground">
              {insights.summary.at_risk_percentage}% от общего числа
            </p>
          </CardContent>
        </Card>

        <Card className={insights.summary.critical_count > 0 ? 'border-red-200' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Критические случаи</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{insights.summary.critical_count}</div>
            <p className="text-xs text-muted-foreground">
              требуют немедленного внимания
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Проблемных классов</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.problem_classes.length}</div>
            <p className="text-xs text-muted-foreground">
              требуют мониторинга
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Рекомендации
          </CardTitle>
          <CardDescription>
            На что обратить внимание в первую очередь
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.recommendations.map((rec, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-lg border ${getRecommendationStyle(rec.type)}`}
              >
                <div className="flex items-start gap-3">
                  {getRecommendationIcon(rec.type)}
                  <div className="flex-1">
                    <h4 className="font-semibold">{rec.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                    {rec.action && rec.link && (
                      <Button 
                        variant="link" 
                        className="p-0 h-auto mt-2"
                        onClick={() => handleActionClick(rec.link)}
                      >
                        {rec.action} <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* At-Risk Students */}
      {insights.at_risk_students.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Студенты, требующие внимания
            </CardTitle>
            <CardDescription>
              Топ-10 студентов с наибольшим уровнем риска
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.at_risk_students.map((student) => (
                <div 
                  key={student.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/dashboard/students/${student.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      student.priority === 'critical' ? 'bg-red-100' : 'bg-orange-100'
                    }`}>
                      <TrendingDown className={`h-5 w-5 ${
                        student.priority === 'critical' ? 'text-red-600' : 'text-orange-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-muted-foreground">{student.class}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Уровень риска:</span>{' '}
                        <span className="font-medium">{student.avg_danger_level}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {student.subjects_affected} предметов
                      </p>
                    </div>
                    {getPriorityBadge(student.priority)}
                  </div>
                </div>
              ))}
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => router.push('/dashboard/students?danger=2')}
            >
              Показать всех студентов в зоне риска
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Problem Classes */}
      {insights.problem_classes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Классы, требующие мониторинга
            </CardTitle>
            <CardDescription>
              Классы с повышенным средним уровнем риска
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.problem_classes.map((cls) => (
                <div 
                  key={cls.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      cls.attention_needed === 'immediate' ? 'bg-red-100' : 'bg-yellow-100'
                    }`}>
                      <Target className={`h-5 w-5 ${
                        cls.attention_needed === 'immediate' ? 'text-red-600' : 'text-yellow-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium">{cls.class}</p>
                      <p className="text-sm text-muted-foreground">
                        Куратор: {cls.curator}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm">
                        <span className="font-medium">{cls.at_risk_students}</span>
                        <span className="text-muted-foreground"> / {cls.student_count}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">в зоне риска</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {cls.avg_danger_level.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">средний риск</p>
                    </div>
                    <Badge variant={cls.attention_needed === 'immediate' ? 'destructive' : 'outline'}>
                      {cls.attention_needed === 'immediate' ? 'Срочно' : 'Наблюдение'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subject Analysis */}
      {insights.subject_analysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Анализ по предметам
            </CardTitle>
            <CardDescription>
              Успеваемость студентов по различным предметам
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.subject_analysis.map((subject, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      subject.status === 'critical' ? 'bg-red-100' : 
                      subject.status === 'warning' ? 'bg-orange-100' : 'bg-green-100'
                    }`}>
                      <BookOpen className={`h-5 w-5 ${
                        subject.status === 'critical' ? 'text-red-600' : 
                        subject.status === 'warning' ? 'text-orange-600' : 'text-green-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium">{subject.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        {subject.students_count} студентов
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Проблемных:</span>{' '}
                        <span className="font-medium">{subject.problem_students}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Δ {subject.avg_performance_gap}%
                      </p>
                    </div>
                    {getStatusBadge(subject.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {insights.at_risk_students.length === 0 && 
       insights.problem_classes.length === 0 && 
       insights.subject_analysis.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Отличные результаты!</h3>
            <p className="text-muted-foreground">
              На данный момент все студенты показывают хорошую успеваемость.
              Продолжайте мониторинг для раннего выявления проблем.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}