'use client';
import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'react-toastify';
import api from "@/lib/api";
import TableContainer from './table';
import ChartContainer from './piechart';

export default function DashBoardPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [authCheckLoading, setAuthCheckLoading] = useState(true);
  const [dangerLevels, setDangerLevels] = useState({
    level0: 0,
    level1: 0,
    level2: 0,
    level3: 0
  });
  const [dangerousClasses, setDangerousClasses] = useState<any[]>([]);
  const [classDangerPercentages, setClassDangerPercentages] = useState<any[]>([]);
  const [gradeIdMap, setGradeIdMap] = useState<Map<string, number>>(new Map());

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
      toast.error('Доступ запрещен. Только администраторы могут просматривать панель управления.');
      router.push('/teacher/dashboard');
    }
  }, [user, authCheckLoading, router]);

  useEffect(() => {
    if (user && user.type === 'admin') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
      try {
        // First fetch all grades to get ID mapping
        const allGrades = await api.getAllGrades();
        const idMap = new Map<string, number>();
        allGrades.forEach(grade => {
          idMap.set(grade.grade, grade.id);
        });
        setGradeIdMap(idMap);

        const data = await api.getDangerLevels();
        const total = data.danger_level_stats.total_students || 0;
        const level1 = data.danger_level_stats[1]?.student_count || 0;
        const level2 = data.danger_level_stats[2]?.student_count || 0;
        const level3 = data.danger_level_stats[3]?.student_count || 0;
        const level0 = total - (level1 + level2 + level3);
        setDangerLevels({
          level0,
          level1,
          level2,
          level3
        });

        setDangerousClasses(data.all_dangerous_classes);

        try {
          const piechartData = await api.getDangerLevelsPieChart();
          if (piechartData && piechartData.class_danger_percentages) {
            setClassDangerPercentages(piechartData.class_danger_percentages);
          }
        } catch (piechartError) {
          console.error('Error fetching piechart data:', piechartError);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

  if (authCheckLoading || authLoading) {
    return (
      <PageContainer scrollable>
        <div className="py-4">
          <Card>
            <CardContent className="p-6 text-center">Проверка доступа...</CardContent>
          </Card>
        </div>
      </PageContainer>
    );
  }

  if (!user || user.type !== 'admin') {
    return null;
  }

  return (
    <PageContainer scrollable>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-4">
        <Card
          className="hover:border-orange-500 group transition duration-300 cursor-pointer"
          onClick={() => router.push('/dashboard/students?danger=3')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium group-hover:text-orange-500 transition duration-300">
              Критический
            </CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-triangle-alert group-hover:text-orange-500 transition duration-300">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold group-hover:text-orange-500 transition duration-300">
              {dangerLevels.level3}
            </div>
            <p className="text-xs text-muted-foreground group-hover:text-orange-500 transition duration-300">
              Студентов
            </p>
          </CardContent>
        </Card>

        <Card
          className="hover:border-red-500 group transition duration-300 cursor-pointer"
          onClick={() => router.push('/dashboard/students?danger=2')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 group-hover:text-red-500 transition duration-300">
            <CardTitle className="text-sm font-medium group-hover:text-red-500 transition duration-300">
              Высокий
            </CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-alert group-hover:text-red-500 transition duration-300">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold group-hover:text-red-500 transition duration-300">
              {dangerLevels.level2}
            </div>
            <p className="text-xs text-muted-foreground group-hover:text-red-500 transition duration-300">
              Студентов
            </p>
          </CardContent>
        </Card>

        <Card
          className="hover:border-yellow-500 group transition duration-300 cursor-pointer"
          onClick={() => router.push('/dashboard/students?danger=1')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 group-hover:text-yellow-500 transition duration-300">
            <CardTitle className="text-sm font-medium group-hover:text-yellow-500 transition duration-300">
              Умеренный
            </CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-octagon-alert">
              <path d="M12 16h.01" />
              <path d="M12 8v4" />
              <path d="M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z" />
            </svg>
          </CardHeader>
          <CardContent className="group-hover:text-yellow-500 transition duration-300">
            <div className="text-2xl font-bold">{dangerLevels.level1}</div>
            <p className="text-xs text-muted-foreground">
              Студентов
            </p>
          </CardContent>
        </Card>

        <Card
          className="hover:border-green-500 group transition duration-300 cursor-pointer"
          onClick={() => router.push('/dashboard/students?danger=0')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 group-hover:text-green-500 transition duration-300">
            <CardTitle className="text-sm font-medium group-hover:text-green-500 transition duration-300">
              Низкий
            </CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <path d="m9 11 3 3L22 4" />
            </svg>
          </CardHeader>
          <CardContent className="group-hover:text-green-500 transition duration-300">
            <div className="text-2xl font-bold">{dangerLevels.level0}</div>
            <p className="text-xs text-muted-foreground">
              Студентов
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4 mt-4 h-[70%]">
        <div className="w-[65%]">
          <ChartContainer
            dangerousClasses={dangerousClasses}
            classDangerPercentages={classDangerPercentages}
            gradeIdMap={gradeIdMap}
          />
        </div>
        <Card className="w-[35%]">
          <TableContainer
            dangerousClasses={dangerousClasses}
            gradeIdMap={gradeIdMap}
          />
        </Card>
      </div>
    </PageContainer>
  );
}
