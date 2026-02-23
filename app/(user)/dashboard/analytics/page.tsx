'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'react-toastify';
import api from '@/lib/api';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  Search,
  Download,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface Student {
  id: number;
  name: string;
  email?: string;
  grade_id: number;
  actual_scores?: number[];
  predicted_scores?: number[];
  avg_percentage?: number;
  danger_level?: number;
  delta_percentage?: number;
  last_subject?: string;
}

interface Grade {
  id: number;
  grade: string;
  parallel: string;
  curator_name?: string;
  student_count: number;
  actual_student_count: number;
}

interface AnalyticsData {
  students: Student[];
  grades: Grade[];
  subjects: string[];
  parallels: string[];
}

// Modal Component for Student List
interface StudentListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  students: Student[];
  grades: Grade[];
  onStudentClick: (studentId: number) => void;
}

function StudentListModal({ isOpen, onClose, title, students, grades, onStudentClick }: StudentListModalProps) {
  const getGradeName = (gradeId: number) => {
    const grade = grades.find(g => g.id === gradeId);
    return grade?.grade || '-';
  };

  const getDangerBadgeLocal = (level: number | null | undefined) => {
    const variants: Record<number, { className: string; label: string }> = {
      0: { className: 'bg-green-100 text-green-800', label: 'Низкий' },
      1: { className: 'bg-yellow-100 text-yellow-800', label: 'Умеренный' },
      2: { className: 'bg-orange-100 text-orange-800', label: 'Высокий' },
      3: { className: 'bg-red-100 text-red-800', label: 'Критический' }
    };
    const variant = variants[level ?? 0] || variants[0];
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {students.length} студентов
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Имя</TableHead>
                <TableHead>Класс</TableHead>
                <TableHead className="text-center">Средний балл</TableHead>
                <TableHead className="text-center">Δ%</TableHead>
                <TableHead className="text-center">Риск</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map(student => (
                <TableRow 
                  key={student.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => onStudentClick(student.id)}
                >
                  <TableCell>
                    <div className="font-medium">{student.name}</div>
                    {student.email && (
                      <div className="text-xs text-gray-500">{student.email}</div>
                    )}
                  </TableCell>
                  <TableCell>{getGradeName(student.grade_id)}</TableCell>
                  <TableCell className="text-center">
                    {student.avg_percentage ? `${student.avg_percentage}%` : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    {student.delta_percentage !== undefined ? (
                      <span className={student.delta_percentage > 0 ? 'text-green-600' : student.delta_percentage < 0 ? 'text-red-600' : ''}>
                        {student.delta_percentage > 0 ? '+' : ''}{student.delta_percentage}%
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    {getDangerBadgeLocal(student.danger_level)}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData>({
    students: [],
    grades: [],
    subjects: [],
    parallels: []
  });
  
  // Filters
  const [selectedParallel, setSelectedParallel] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedDangerLevel, setSelectedDangerLevel] = useState<string>('all');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalStudents, setModalStudents] = useState<Student[]>([]);

  useEffect(() => {
    const loadUser = async () => {
      if (isAuthenticated && !authLoading) {
        try {
          const userData = await api.getCurrentUser();
          setUser(userData);
          if (userData.type !== 'admin') {
            toast.error('Доступ запрещен');
            router.push('/teacher/dashboard');
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
      fetchData(selectedSubject);
    }
  }, [user, selectedSubject]);

  const fetchData = async (subject?: string) => {
    setLoading(true);
    try {
      const [gradesRes, subjectsRes, parallelsRes, classDataRes] = await Promise.all([
        api.getAllGrades(),
        api.getSubjects(),
        api.getParallels(),
        api.getAllClassData(subject)
      ]);

      const allStudents: Student[] = [];
      if (classDataRes?.class_data) {
        classDataRes.class_data.forEach((classItem: any) => {
          if (classItem.class) {
            classItem.class.forEach((student: any) => {
              allStudents.push({
                id: student.id,
                name: student.student_name,
                email: student.email,
                grade_id: gradesRes.find((g: Grade) => g.grade === classItem.grade_liter)?.id || 0,
                actual_scores: student.actual_scores || student.actual_score,
                predicted_scores: student.predicted_scores,
                avg_percentage: student.avg_percentage,
                danger_level: student.danger_level,
                delta_percentage: student.delta_percentage,
                last_subject: classItem.subject_name
              });
            });
          }
        });
      }

      setData({
        students: allStudents,
        grades: gradesRes,
        subjects: subjectsRes,
        parallels: parallelsRes
      });
    } catch (error) {
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  // Get unique parallels from grades
  const uniqueParallels = useMemo(() => {
    const parallels = new Set<string>();
    data.grades.forEach(g => {
      if (g.parallel) parallels.add(g.parallel);
      // Also extract parallel from grade name (e.g., "12 А" -> "12")
      const match = g.grade.match(/^(\d+)/);
      if (match) parallels.add(match[1]);
    });
    return Array.from(parallels).sort((a, b) => Number(a) - Number(b));
  }, [data.grades]);

  // Filter grades by selected parallel
  const filteredGrades = useMemo(() => {
    if (selectedParallel === 'all') return data.grades;
    return data.grades.filter(g => 
      g.parallel === selectedParallel || g.grade.startsWith(selectedParallel)
    );
  }, [data.grades, selectedParallel]);

  // Filter students
  const filteredStudents = useMemo(() => {
    let students = [...data.students];

    // Filter by parallel
    if (selectedParallel !== 'all') {
      const gradeIds = filteredGrades.map(g => g.id);
      students = students.filter(s => gradeIds.includes(s.grade_id));
    }

    // Filter by grade
    if (selectedGrade !== 'all') {
      students = students.filter(s => s.grade_id === Number(selectedGrade));
    }

    // Filter by danger level
    if (selectedDangerLevel !== 'all') {
      students = students.filter(s => s.danger_level === Number(selectedDangerLevel));
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      students = students.filter(s => 
        s.name.toLowerCase().includes(query) ||
        s.email?.toLowerCase().includes(query)
      );
    }

    return students;
  }, [data.students, selectedParallel, selectedGrade, selectedDangerLevel, searchQuery, filteredGrades]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredStudents.length;
    const dangerCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };
    let totalAvg = 0;
    let avgCount = 0;
    let improving = 0;
    let declining = 0;

    filteredStudents.forEach(s => {
      if (s.danger_level !== undefined && s.danger_level !== null) {
        dangerCounts[s.danger_level as keyof typeof dangerCounts]++;
      }
      if (s.avg_percentage) {
        totalAvg += s.avg_percentage;
        avgCount++;
      }
      if (s.delta_percentage !== undefined) {
        if (s.delta_percentage > 0) improving++;
        else if (s.delta_percentage < 0) declining++;
      }
    });

    return {
      total,
      avgPercentage: avgCount > 0 ? (totalAvg / avgCount).toFixed(1) : 0,
      dangerCounts,
      improving,
      declining,
      atRisk: dangerCounts[2] + dangerCounts[3]
    };
  }, [filteredStudents]);

  // Stats by parallel - для понимания где больше рисков
  const parallelStats = useMemo(() => {
    const stats: { 
      [key: string]: { 
        total: number; 
        atRisk: number; 
        riskPercent: number;
        danger0: number;
        danger1: number;
        danger2: number;
        danger3: number;
        avgScore: number;
        students: Student[];
      } 
    } = {};

    uniqueParallels.forEach(parallel => {
      const parallelGrades = data.grades.filter(g => 
        g.parallel === parallel || g.grade.startsWith(parallel)
      );
      const gradeIds = parallelGrades.map(g => g.id);
      const parallelStudents = data.students.filter(s => gradeIds.includes(s.grade_id));
      
      let totalAvg = 0;
      let avgCount = 0;
      const dangerCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };

      parallelStudents.forEach(s => {
        if (s.danger_level !== undefined && s.danger_level !== null) {
          dangerCounts[s.danger_level as keyof typeof dangerCounts]++;
        }
        if (s.avg_percentage) {
          totalAvg += s.avg_percentage;
          avgCount++;
        }
      });

      const atRisk = dangerCounts[2] + dangerCounts[3];
      
      stats[parallel] = {
        total: parallelStudents.length,
        atRisk,
        riskPercent: parallelStudents.length > 0 ? (atRisk / parallelStudents.length) * 100 : 0,
        danger0: dangerCounts[0],
        danger1: dangerCounts[1],
        danger2: dangerCounts[2],
        danger3: dangerCounts[3],
        avgScore: avgCount > 0 ? totalAvg / avgCount : 0,
        students: parallelStudents
      };
    });

    return stats;
  }, [uniqueParallels, data.grades, data.students]);

  // Sort parallels by risk percentage
  const sortedParallelsByRisk = useMemo(() => {
    return Object.entries(parallelStats)
      .sort((a, b) => b[1].riskPercent - a[1].riskPercent)
      .map(([parallel, stats]) => ({ parallel, ...stats }));
  }, [parallelStats]);

  // Chart data for danger level distribution
  const dangerChartData = useMemo(() => ({
    labels: ['Низкий', 'Умеренный', 'Высокий', 'Критический'],
    datasets: [{
      data: [stats.dangerCounts[0], stats.dangerCounts[1], stats.dangerCounts[2], stats.dangerCounts[3]],
      backgroundColor: ['#22c55e', '#eab308', '#f97316', '#ef4444'],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  }), [stats]);

  // Chart data for grades comparison
  const gradeComparisonData = useMemo(() => {
    const gradeStats: { [key: string]: { total: number; atRisk: number; avgScore: number; count: number } } = {};
    
    filteredStudents.forEach(s => {
      const grade = data.grades.find(g => g.id === s.grade_id);
      if (grade) {
        if (!gradeStats[grade.grade]) {
          gradeStats[grade.grade] = { total: 0, atRisk: 0, avgScore: 0, count: 0 };
        }
        gradeStats[grade.grade].total++;
        if (s.danger_level && s.danger_level >= 2) {
          gradeStats[grade.grade].atRisk++;
        }
        if (s.avg_percentage) {
          gradeStats[grade.grade].avgScore += s.avg_percentage;
          gradeStats[grade.grade].count++;
        }
      }
    });

    const sortedGrades = Object.keys(gradeStats).sort();
    
    return {
      labels: sortedGrades,
      datasets: [
        {
          label: 'Всего студентов',
          data: sortedGrades.map(g => gradeStats[g].total),
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1
        },
        {
          label: 'В зоне риска',
          data: sortedGrades.map(g => gradeStats[g].atRisk),
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 1
        }
      ]
    };
  }, [filteredStudents, data.grades]);

  // Chart data for parallels comparison
  const parallelComparisonData = useMemo(() => {
    const sortedParallels = Object.keys(parallelStats).sort((a, b) => Number(a) - Number(b));
    
    return {
      labels: sortedParallels.map(p => `${p} класс`),
      datasets: [
        {
          label: 'Низкий риск',
          data: sortedParallels.map(p => parallelStats[p].danger0),
          backgroundColor: 'rgba(34, 197, 94, 0.7)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1
        },
        {
          label: 'Умеренный риск',
          data: sortedParallels.map(p => parallelStats[p].danger1),
          backgroundColor: 'rgba(234, 179, 8, 0.7)',
          borderColor: 'rgb(234, 179, 8)',
          borderWidth: 1
        },
        {
          label: 'Высокий риск',
          data: sortedParallels.map(p => parallelStats[p].danger2),
          backgroundColor: 'rgba(249, 115, 22, 0.7)',
          borderColor: 'rgb(249, 115, 22)',
          borderWidth: 1
        },
        {
          label: 'Критический риск',
          data: sortedParallels.map(p => parallelStats[p].danger3),
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 1
        }
      ]
    };
  }, [parallelStats]);

  // Risk percentage by parallel
  const riskPercentageData = useMemo(() => {
    const sortedParallels = Object.keys(parallelStats).sort((a, b) => Number(a) - Number(b));
    
    return {
      labels: sortedParallels.map(p => `${p} класс`),
      datasets: [{
        label: '% студентов в зоне риска',
        data: sortedParallels.map(p => parallelStats[p].riskPercent.toFixed(1)),
        backgroundColor: sortedParallels.map(p => 
          parallelStats[p].riskPercent > 30 ? 'rgba(239, 68, 68, 0.7)' :
          parallelStats[p].riskPercent > 20 ? 'rgba(249, 115, 22, 0.7)' :
          parallelStats[p].riskPercent > 10 ? 'rgba(234, 179, 8, 0.7)' :
          'rgba(34, 197, 94, 0.7)'
        ),
        borderColor: sortedParallels.map(p => 
          parallelStats[p].riskPercent > 30 ? 'rgb(239, 68, 68)' :
          parallelStats[p].riskPercent > 20 ? 'rgb(249, 115, 22)' :
          parallelStats[p].riskPercent > 10 ? 'rgb(234, 179, 8)' :
          'rgb(34, 197, 94)'
        ),
        borderWidth: 1
      }]
    };
  }, [parallelStats]);

  // Quarter performance data
  const quarterPerformanceData = useMemo(() => {
    const quarterTotals = [0, 0, 0, 0];
    const quarterCounts = [0, 0, 0, 0];

    filteredStudents.forEach(s => {
      if (s.actual_scores && Array.isArray(s.actual_scores)) {
        s.actual_scores.forEach((score, idx) => {
          if (score && score > 0 && idx < 4) {
            quarterTotals[idx] += score;
            quarterCounts[idx]++;
          }
        });
      }
    });

    return {
      labels: ['1 четверть', '2 четверть', '3 четверть', '4 четверть'],
      datasets: [{
        label: 'Средний балл',
        data: quarterTotals.map((total, idx) => 
          quarterCounts[idx] > 0 ? (total / quarterCounts[idx]).toFixed(1) : 0
        ),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.3,
        fill: true
      }]
    };
  }, [filteredStudents]);

  // Handler functions for showing students
  const showStudentsByDangerLevel = (level: number) => {
    const levelNames: Record<number, string> = {
      0: 'низким',
      1: 'умеренным',
      2: 'высоким',
      3: 'критическим'
    };
    const students = filteredStudents.filter(s => s.danger_level === level);
    setModalTitle(`Студенты с ${levelNames[level]} риском`);
    setModalStudents(students);
    setModalOpen(true);
  };

  const showAtRiskStudents = () => {
    const students = filteredStudents.filter(s => s.danger_level && s.danger_level >= 2);
    setModalTitle('Студенты в зоне риска');
    setModalStudents(students);
    setModalOpen(true);
  };

  const showParallelStudents = (parallel: string, dangerLevel?: number) => {
    const parallelData = parallelStats[parallel];
    if (!parallelData) return;
    
    let students = parallelData.students;
    let title = `Студенты ${parallel} класса`;
    
    if (dangerLevel !== undefined) {
      const levelNames: Record<number, string> = {
        0: 'низким',
        1: 'умеренным',
        2: 'высоким',
        3: 'критическим'
      };
      students = students.filter(s => s.danger_level === dangerLevel);
      title = `Студенты ${parallel} класса с ${levelNames[dangerLevel]} риском`;
    }
    
    setModalTitle(title);
    setModalStudents(students);
    setModalOpen(true);
  };

  const showParallelAtRisk = (parallel: string) => {
    const parallelData = parallelStats[parallel];
    if (!parallelData) return;
    
    const students = parallelData.students.filter(s => s.danger_level && s.danger_level >= 2);
    setModalTitle(`Студенты ${parallel} класса в зоне риска`);
    setModalStudents(students);
    setModalOpen(true);
  };

  const showGradeStudents = (gradeName: string) => {
    const grade = data.grades.find(g => g.grade === gradeName);
    if (!grade) return;
    
    const students = filteredStudents.filter(s => s.grade_id === grade.id);
    setModalTitle(`Студенты ${gradeName} класса`);
    setModalStudents(students);
    setModalOpen(true);
  };

  const handleStudentClick = (studentId: number) => {
    setModalOpen(false);
    router.push(`/dashboard/students?id=${studentId}`);
  };

  const getDangerBadge = (level: number | null | undefined) => {
    const variants: Record<number, { className: string; label: string }> = {
      0: { className: 'bg-green-100 text-green-800', label: 'Низкий' },
      1: { className: 'bg-yellow-100 text-yellow-800', label: 'Умеренный' },
      2: { className: 'bg-orange-100 text-orange-800', label: 'Высокий' },
      3: { className: 'bg-red-100 text-red-800', label: 'Критический' }
    };
    const variant = variants[level ?? 0] || variants[0];
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const getGradeName = (gradeId: number) => {
    const grade = data.grades.find(g => g.id === gradeId);
    return grade?.grade || '-';
  };

  const exportToCSV = () => {
    const headers = ['Имя', 'Email', 'Класс', 'Средний балл', 'Уровень риска', 'Изменение %'];
    const rows = filteredStudents.map(s => [
      s.name,
      s.email || '',
      getGradeName(s.grade_id),
      s.avg_percentage || '',
      s.danger_level ?? '',
      s.delta_percentage || ''
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <PageContainer scrollable>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg">Загрузка данных...</div>
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
            <h1 className="text-3xl font-bold">Аналитика</h1>
            <p className="text-gray-500">Анализ успеваемости и рисков студентов</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => fetchData(selectedSubject)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Обновить
            </Button>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Экспорт CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Фильтры</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Параллель</Label>
                <Select value={selectedParallel} onValueChange={setSelectedParallel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Все параллели" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все параллели</SelectItem>
                    {uniqueParallels.map(p => (
                      <SelectItem key={p} value={p}>{p} класс</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Класс</Label>
                <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Все классы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все классы</SelectItem>
                    {filteredGrades.map(g => (
                      <SelectItem key={g.id} value={String(g.id)}>{g.grade}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Предмет</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Все предметы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все предметы</SelectItem>
                    {data.subjects.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Уровень риска</Label>
                <Select value={selectedDangerLevel} onValueChange={setSelectedDangerLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Все уровни" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все уровни</SelectItem>
                    <SelectItem value="0">Низкий</SelectItem>
                    <SelectItem value="1">Умеренный</SelectItem>
                    <SelectItem value="2">Высокий</SelectItem>
                    <SelectItem value="3">Критический</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Поиск</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Поиск по имени..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards - Clickable */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => {
              setModalTitle('Все студенты');
              setModalStudents(filteredStudents);
              setModalOpen(true);
            }}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Всего студентов</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2">Нажмите чтобы посмотреть →</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Средний балл</p>
                  <p className="text-3xl font-bold">{stats.avgPercentage}%</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow border-red-200"
            onClick={showAtRiskStudents}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">В зоне риска</p>
                  <p className="text-3xl font-bold text-red-600">{stats.atRisk}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <p className="text-xs text-red-600 mt-2">Нажмите чтобы посмотреть →</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Прогресс</p>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 flex items-center">
                      <TrendingUp className="h-4 w-4 mr-1" />{stats.improving}
                    </span>
                    <span className="text-red-600 flex items-center">
                      <TrendingDown className="h-4 w-4 mr-1" />{stats.declining}
                    </span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="parallels" className="space-y-4">
          <TabsList>
            <TabsTrigger value="parallels">По параллелям</TabsTrigger>
            <TabsTrigger value="overview">Обзор</TabsTrigger>
            <TabsTrigger value="grades">По классам</TabsTrigger>
            <TabsTrigger value="quarters">По четвертям</TabsTrigger>
            <TabsTrigger value="students">Список студентов</TabsTrigger>
          </TabsList>

          {/* New Parallels Tab */}
          <TabsContent value="parallels" className="space-y-4">
            {/* Parallel Risk Ranking */}
            <Card>
              <CardHeader>
                <CardTitle>Рейтинг параллелей по уровню риска</CardTitle>
                <CardDescription>
                  Параллели отсортированы по проценту студентов в зоне риска. Нажмите на числа чтобы посмотреть студентов.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sortedParallelsByRisk.map((item, index) => (
                    <div 
                      key={item.parallel}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 && item.riskPercent > 20 ? 'bg-red-500' :
                        index === 1 && item.riskPercent > 15 ? 'bg-orange-500' :
                        index === 2 && item.riskPercent > 10 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-lg">{item.parallel} класс</span>
                          <div className="flex items-center gap-4">
                            <span 
                              className="text-sm text-gray-600 cursor-pointer hover:underline"
                              onClick={() => showParallelStudents(item.parallel)}
                            >
                              {item.total} студентов
                            </span>
                            <span 
                              className={`font-bold cursor-pointer hover:underline ${
                                item.riskPercent > 30 ? 'text-red-600' :
                                item.riskPercent > 20 ? 'text-orange-600' :
                                item.riskPercent > 10 ? 'text-yellow-600' :
                                'text-green-600'
                              }`}
                              onClick={() => showParallelAtRisk(item.parallel)}
                            >
                              {item.riskPercent.toFixed(1)}% в риске
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Badge 
                            className="bg-green-100 text-green-800 cursor-pointer hover:bg-green-200"
                            onClick={() => showParallelStudents(item.parallel, 0)}
                          >
                            {item.danger0} низкий
                          </Badge>
                          <Badge 
                            className="bg-yellow-100 text-yellow-800 cursor-pointer hover:bg-yellow-200"
                            onClick={() => showParallelStudents(item.parallel, 1)}
                          >
                            {item.danger1} умеренный
                          </Badge>
                          <Badge 
                            className="bg-orange-100 text-orange-800 cursor-pointer hover:bg-orange-200"
                            onClick={() => showParallelStudents(item.parallel, 2)}
                          >
                            {item.danger2} высокий
                          </Badge>
                          <Badge 
                            className="bg-red-100 text-red-800 cursor-pointer hover:bg-red-200"
                            onClick={() => showParallelStudents(item.parallel, 3)}
                          >
                            {item.danger3} критический
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Распределение рисков по параллелям</CardTitle>
                  <CardDescription>
                    Нажмите на столбец чтобы посмотреть студентов параллели
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <Bar 
                      data={parallelComparisonData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'bottom' }
                        },
                        scales: {
                          x: { stacked: true },
                          y: { stacked: true, beginAtZero: true }
                        },
                        onClick: (event, elements) => {
                          if (elements.length > 0) {
                            const index = elements[0].index;
                            const parallelLabel = parallelComparisonData.labels[index];
                            if (parallelLabel) {
                              const parallel = (parallelLabel as string).replace(' класс', '');
                              showParallelStudents(parallel);
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Процент студентов в зоне риска</CardTitle>
                  <CardDescription>
                    Нажмите на столбец чтобы посмотреть студентов в риске
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <Bar 
                      data={riskPercentageData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false }
                        },
                        scales: {
                          y: { 
                            beginAtZero: true,
                            max: 100,
                            title: { display: true, text: '%' }
                          }
                        },
                        onClick: (event, elements) => {
                          if (elements.length > 0) {
                            const index = elements[0].index;
                            const parallelLabel = riskPercentageData.labels[index];
                            if (parallelLabel) {
                              const parallel = (parallelLabel as string).replace(' класс', '');
                              showParallelAtRisk(parallel);
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Parallel Table */}
            <Card>
              <CardHeader>
                <CardTitle>Детализация по параллелям</CardTitle>
                <CardDescription>Нажмите на числа чтобы увидеть студентов</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Параллель</TableHead>
                      <TableHead className="text-center">Всего</TableHead>
                      <TableHead className="text-center">Средний балл</TableHead>
                      <TableHead className="text-center">Низкий</TableHead>
                      <TableHead className="text-center">Умеренный</TableHead>
                      <TableHead className="text-center">Высокий</TableHead>
                      <TableHead className="text-center">Критический</TableHead>
                      <TableHead className="text-center">% в риске</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(parallelStats)
                      .sort((a, b) => Number(a[0]) - Number(b[0]))
                      .map(([parallel, pStats]) => (
                        <TableRow key={parallel}>
                          <TableCell className="font-medium">{parallel} класс</TableCell>
                          <TableCell 
                            className="text-center cursor-pointer hover:underline text-blue-600"
                            onClick={() => showParallelStudents(parallel)}
                          >
                            {pStats.total}
                          </TableCell>
                          <TableCell className="text-center">
                            {pStats.avgScore.toFixed(1)}%
                          </TableCell>
                          <TableCell 
                            className="text-center cursor-pointer hover:underline text-green-600"
                            onClick={() => showParallelStudents(parallel, 0)}
                          >
                            {pStats.danger0}
                          </TableCell>
                          <TableCell 
                            className="text-center cursor-pointer hover:underline text-yellow-600"
                            onClick={() => showParallelStudents(parallel, 1)}
                          >
                            {pStats.danger1}
                          </TableCell>
                          <TableCell 
                            className="text-center cursor-pointer hover:underline text-orange-600"
                            onClick={() => showParallelStudents(parallel, 2)}
                          >
                            {pStats.danger2}
                          </TableCell>
                          <TableCell 
                            className="text-center cursor-pointer hover:underline text-red-600"
                            onClick={() => showParallelStudents(parallel, 3)}
                          >
                            {pStats.danger3}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-bold ${
                              pStats.riskPercent > 30 ? 'text-red-600' :
                              pStats.riskPercent > 20 ? 'text-orange-600' :
                              pStats.riskPercent > 10 ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              {pStats.riskPercent.toFixed(1)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Распределение по уровням риска</CardTitle>
                  <CardDescription>
                    Нажмите на секцию чтобы посмотреть студентов
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center">
                    <Pie 
                      data={dangerChartData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'bottom' }
                        },
                        onClick: (event, elements) => {
                          if (elements.length > 0) {
                            const index = elements[0].index;
                            showStudentsByDangerLevel(index);
                          }
                        }
                      }} 
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Динамика по четвертям</CardTitle>
                  <CardDescription>
                    Средние оценки по четвертям
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <Line 
                      data={quarterPerformanceData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'bottom' }
                        },
                        scales: {
                          y: { beginAtZero: true, max: 100 }
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Risk distribution by level */}
            <Card>
              <CardHeader>
                <CardTitle>Детальная статистика по уровням риска</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm text-green-700 font-medium">Низкий риск</div>
                    <div className="text-2xl font-bold text-green-800">{stats.dangerCounts[0]}</div>
                    <div className="text-xs text-green-600">
                      {stats.total > 0 ? ((stats.dangerCounts[0] / stats.total) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="text-sm text-yellow-700 font-medium">Умеренный риск</div>
                    <div className="text-2xl font-bold text-yellow-800">{stats.dangerCounts[1]}</div>
                    <div className="text-xs text-yellow-600">
                      {stats.total > 0 ? ((stats.dangerCounts[1] / stats.total) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-sm text-orange-700 font-medium">Высокий риск</div>
                    <div className="text-2xl font-bold text-orange-800">{stats.dangerCounts[2]}</div>
                    <div className="text-xs text-orange-600">
                      {stats.total > 0 ? ((stats.dangerCounts[2] / stats.total) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="text-sm text-red-700 font-medium">Критический риск</div>
                    <div className="text-2xl font-bold text-red-800">{stats.dangerCounts[3]}</div>
                    <div className="text-xs text-red-600">
                      {stats.total > 0 ? ((stats.dangerCounts[3] / stats.total) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="grades" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Сравнение по классам</CardTitle>
                <CardDescription>
                  Нажмите на столбец чтобы посмотреть студентов класса
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <Bar 
                    data={gradeComparisonData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'bottom' }
                      },
                      scales: {
                        y: { beginAtZero: true }
                      },
                      onClick: (event, elements) => {
                        if (elements.length > 0) {
                          const index = elements[0].index;
                          const gradeName = gradeComparisonData.labels[index];
                          if (gradeName) {
                            showGradeStudents(gradeName as string);
                          }
                        }
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Grade details table */}
            <Card>
              <CardHeader>
                <CardTitle>Детализация по классам</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Класс</TableHead>
                      <TableHead>Куратор</TableHead>
                      <TableHead className="text-center">Студентов</TableHead>
                      <TableHead className="text-center">Низкий риск</TableHead>
                      <TableHead className="text-center">Умеренный</TableHead>
                      <TableHead className="text-center">Высокий</TableHead>
                      <TableHead className="text-center">Критический</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGrades.map(grade => {
                      const gradeStudents = filteredStudents.filter(s => s.grade_id === grade.id);
                      const danger0 = gradeStudents.filter(s => s.danger_level === 0).length;
                      const danger1 = gradeStudents.filter(s => s.danger_level === 1).length;
                      const danger2 = gradeStudents.filter(s => s.danger_level === 2).length;
                      const danger3 = gradeStudents.filter(s => s.danger_level === 3).length;
                      
                      return (
                        <TableRow key={grade.id}>
                          <TableCell className="font-medium">{grade.grade}</TableCell>
                          <TableCell>{grade.curator_name || '-'}</TableCell>
                          <TableCell className="text-center">{gradeStudents.length}</TableCell>
                          <TableCell className="text-center">
                            <span className="text-green-600">{danger0}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-yellow-600">{danger1}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-orange-600">{danger2}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-red-600">{danger3}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quarters" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Успеваемость по четвертям</CardTitle>
                <CardDescription>
                  Средние оценки студентов по четвертям
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <Line 
                    data={quarterPerformanceData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'bottom' }
                      },
                      scales: {
                        y: { beginAtZero: true, max: 100 }
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Quarter stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {['1 четверть', '2 четверть', '3 четверть', '4 четверть'].map((quarter, idx) => {
                let total = 0;
                let count = 0;
                filteredStudents.forEach(s => {
                  if (s.actual_scores && s.actual_scores[idx] && s.actual_scores[idx] > 0) {
                    total += s.actual_scores[idx];
                    count++;
                  }
                });
                const avg = count > 0 ? (total / count).toFixed(1) : '—';
                
                return (
                  <Card key={idx}>
                    <CardContent className="pt-6">
                      <div className="text-sm text-gray-500">{quarter}</div>
                      <div className="text-2xl font-bold">{avg}%</div>
                      <div className="text-xs text-gray-400">{count} оценок</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="students" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Список студентов</CardTitle>
                <CardDescription>
                  {filteredStudents.length} студентов найдено
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Имя</TableHead>
                        <TableHead>Класс</TableHead>
                        <TableHead className="text-center">1 чет.</TableHead>
                        <TableHead className="text-center">2 чет.</TableHead>
                        <TableHead className="text-center">3 чет.</TableHead>
                        <TableHead className="text-center">4 чет.</TableHead>
                        <TableHead className="text-center">Средний</TableHead>
                        <TableHead className="text-center">Δ%</TableHead>
                        <TableHead className="text-center">Риск</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.slice(0, 50).map(student => (
                        <TableRow 
                          key={student.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => router.push(`/dashboard/students?id=${student.id}`)}
                        >
                          <TableCell>
                            <div className="font-medium">{student.name}</div>
                            {student.email && (
                              <div className="text-xs text-gray-500">{student.email}</div>
                            )}
                          </TableCell>
                          <TableCell>{getGradeName(student.grade_id)}</TableCell>
                          <TableCell className="text-center">
                            {student.actual_scores?.[0] || '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            {student.actual_scores?.[1] || '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            {student.actual_scores?.[2] || '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            {student.actual_scores?.[3] || '—'}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {student.avg_percentage ? `${student.avg_percentage}%` : '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            {student.delta_percentage !== undefined ? (
                              <span className={student.delta_percentage > 0 ? 'text-green-600' : student.delta_percentage < 0 ? 'text-red-600' : ''}>
                                {student.delta_percentage > 0 ? '+' : ''}{student.delta_percentage}%
                              </span>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            {getDangerBadge(student.danger_level)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredStudents.length > 50 && (
                    <div className="text-center py-4 text-gray-500">
                      Показано 50 из {filteredStudents.length} студентов. Используйте фильтры для уточнения.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Student List Modal */}
      <StudentListModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        students={modalStudents}
        grades={data.grades}
        onStudentClick={(studentId) => {
          setModalOpen(false);
          router.push(`/dashboard/students/${studentId}`);
        }}
      />
    </PageContainer>
  );
}
