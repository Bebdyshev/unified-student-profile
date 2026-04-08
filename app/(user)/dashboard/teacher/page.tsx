'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'react-toastify';
import { Users, BookOpen, School, AlertTriangle, Upload, Table2, LayoutGrid, Layers } from 'lucide-react';
import { handleApiError } from '@/utils/errorHandler';
import api from '@/lib/api';
import Link from 'next/link';
import {
  groupTeacherAssignmentsByGrade,
  unassignedTeacherAssignments,
  type TeacherAssignmentRow
} from '@/lib/teacher-assignments';
import { UploadScores } from '@/app/(user)/dashboard/classes/_components/upload-scores';
import { TeacherSubjectGroupsPanel } from '@/app/(user)/dashboard/teacher/_components/teacher-subject-groups-panel';

interface DashboardStats {
  totalStudents: number;
  totalClasses: number;
  totalSubjects: number;
  atRiskStudents: number;
}

const gradesEntryHref = (subjectId: number, gradeId: number | null) => {
  const g = gradeId != null ? `&grade=${gradeId}` : '';
  return `/dashboard/teacher/grades/entry?subject=${subjectId}${g}`;
};

type TabValue = 'overview' | 'subject-groups';

function TeacherDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [assignments, setAssignments] = useState<TeacherAssignmentRow[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalClasses: 0,
    totalSubjects: 0,
    atRiskStudents: 0
  });
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadPrefill, setUploadPrefill] = useState<{
    gradeId?: number;
    subjectId?: number;
  }>({});
  const [currentUser, setCurrentUser] = useState<{
    type?: string;
    show_subject_groups_nav?: boolean;
  } | null>(null);

  const showSubjectGroupsTab =
    currentUser?.type === 'admin' || currentUser?.show_subject_groups_nav === true;

  const [activeTab, setActiveTab] = useState<TabValue>('overview');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [assignmentsData, me] = await Promise.all([
        api.getMyTeacherAssignments(),
        api.getCurrentUser()
      ]);
      setAssignments(assignmentsData);
      setCurrentUser(me);

      const uniqueSubjects = new Set(assignmentsData.map((a: TeacherAssignmentRow) => a.subject_id));
      const uniqueClasses = new Set(
        assignmentsData.filter((a: TeacherAssignmentRow) => a.grade_id).map((a: TeacherAssignmentRow) => a.grade_id)
      );

      setStats({
        totalStudents: 0,
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (loading || !currentUser) return;
    const want = searchParams.get('tab') === 'subject-groups' ? 'subject-groups' : 'overview';
    if (want === 'subject-groups' && !showSubjectGroupsTab) {
      setActiveTab('overview');
      router.replace('/dashboard/teacher', { scroll: false });
      return;
    }
    setActiveTab(want);
  }, [loading, currentUser, searchParams, showSubjectGroupsTab, router]);

  const handleTabChange = (value: string) => {
    const v = value as TabValue;
    setActiveTab(v);
    if (v === 'subject-groups') {
      router.replace('/dashboard/teacher?tab=subject-groups', { scroll: false });
    } else {
      router.replace('/dashboard/teacher', { scroll: false });
    }
  };

  const handleOpenExcelUpload = (gradeId?: number, subjectId?: number) => {
    setUploadPrefill({ gradeId, subjectId });
    setUploadOpen(true);
  };

  const handleUploadOpenChange = (open: boolean) => {
    setUploadOpen(open);
    if (!open) {
      setUploadPrefill({});
    }
  };

  const grouped = groupTeacherAssignmentsByGrade(assignments);
  const unassigned = unassignedTeacherAssignments(assignments);

  type AssignmentTableRow = {
    key: string;
    gradeId: number | null;
    gradeLabel: string;
    subjectId: number;
    subjectName: string;
    subgroup?: string;
    isUnassigned: boolean;
  };

  const assignmentTableRows: AssignmentTableRow[] = [];

  for (const g of grouped) {
    for (const row of g.rows) {
      assignmentTableRows.push({
        key: `g-${g.gradeId}-${row.subjectId}-${row.subgroup ?? 'x'}`,
        gradeId: g.gradeId,
        gradeLabel: g.gradeName,
        subjectId: row.subjectId,
        subjectName: row.subjectName,
        subgroup: row.subgroup,
        isUnassigned: false,
      });
    }
  }
  for (const row of unassigned) {
    assignmentTableRows.push({
      key: `u-${row.subjectId}-${row.subgroup ?? 'x'}`,
      gradeId: null,
      gradeLabel: 'Все классы',
      subjectId: row.subjectId,
      subjectName: row.subjectName,
      subgroup: row.subgroup,
      isUnassigned: true,
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Загрузка...</div>
      </div>
    );
  }

  return (
    <PageContainer scrollable>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight">Панель учителя</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Классы и предметы по назначению. Табличный ввод — на отдельной странице, загрузка Excel — в окне с
              инструкцией.
            </p>
          </div>
          {activeTab === 'overview' && (
            <div className="flex w-full shrink-0 flex-row flex-nowrap items-center justify-end gap-2 sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 min-h-9 flex-1 gap-2 whitespace-nowrap sm:flex-initial sm:min-w-[10.5rem]"
                onClick={() => handleOpenExcelUpload()}
              >
                <Upload className="h-4 w-4 shrink-0" aria-hidden />
                Загрузка из Excel
              </Button>
              <Button asChild variant="default" size="sm" className="h-9 min-h-9 flex-1 sm:flex-initial sm:min-w-[10.5rem]">
                <Link
                  href="/dashboard/teacher/grades/entry"
                  className="inline-flex h-9 w-full items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Table2 className="h-4 w-4 shrink-0" aria-hidden />
                  Табличный ввод оценок
                </Link>
              </Button>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList
            className={`
              flex h-auto w-full flex-wrap justify-start gap-1 rounded-lg border bg-muted/80 p-1 sm:w-auto
            `}
          >
            <TabsTrigger value="overview" className="gap-2 data-[state=active]:shadow-sm">
              <LayoutGrid className="h-4 w-4" />
              Обзор
            </TabsTrigger>
            {showSubjectGroupsTab && (
              <TabsTrigger value="subject-groups" className="gap-2 data-[state=active]:shadow-sm">
                <Layers className="h-4 w-4" />
                Предметные группы
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="mt-0 space-y-6 focus-visible:outline-none">
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

            <Card>
              <CardHeader>
                <CardTitle>Мои назначения</CardTitle>
                <CardDescription>
                  Табличный ввод оценок или загрузка Excel — для каждой строки (класс + предмет)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {assignmentTableRows.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    У вас пока нет назначенных классов или предметов.
                    <br />
                    Обратитесь к администратору для получения назначений.
                  </div>
                ) : (
                  <div className="rounded-lg border bg-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th
                              scope="col"
                              className="text-left font-medium text-muted-foreground px-4 py-3 w-[22%]"
                            >
                              Класс
                            </th>
                            <th
                              scope="col"
                              className="text-left font-medium text-muted-foreground px-4 py-3 w-[28%]"
                            >
                              Предмет
                            </th>
                            <th
                              scope="col"
                              className="text-left font-medium text-muted-foreground px-4 py-3 w-[18%]"
                            >
                              Подгруппа
                            </th>
                            <th
                              scope="col"
                              className="text-right font-medium text-muted-foreground px-4 py-3 w-[32%]"
                            >
                              Действия
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {assignmentTableRows.map((row, index) => (
                            <tr
                              key={row.key}
                              className={`
                            border-b border-border/60 last:border-0
                            transition-colors hover:bg-muted/40
                            ${
                              row.isUnassigned
                                ? 'bg-amber-50/40 dark:bg-amber-950/20'
                                : index % 2 === 1
                                  ? 'bg-muted/20'
                                  : ''
                            }
                          `}
                            >
                              <td className="px-4 py-3 align-middle">
                                <div className="flex items-center gap-2">
                                  <School
                                    className={`h-4 w-4 shrink-0 ${row.isUnassigned ? 'text-amber-600' : 'text-primary'}`}
                                    aria-hidden
                                  />
                                  <span
                                    className={
                                      row.isUnassigned
                                        ? 'text-amber-900 dark:text-amber-100 font-medium'
                                        : 'font-medium'
                                    }
                                  >
                                    {row.gradeLabel}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 align-middle font-medium">{row.subjectName}</td>
                              <td className="px-4 py-3 align-middle text-muted-foreground">
                                {row.subgroup ? (
                                  <Badge variant="secondary" className="text-xs font-normal">
                                    {row.subgroup}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground/70">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 align-middle">
                                <div className="flex flex-wrap justify-end gap-2">
                                  <Button variant="default" size="sm" asChild className="gap-1 h-8">
                                    <Link
                                      href={gradesEntryHref(row.subjectId, row.gradeId)}
                                      aria-label={`Табличный ввод: ${row.subjectName}, ${row.gradeLabel}`}
                                    >
                                      <Table2 className="h-3.5 w-3.5" />
                                      Таблица
                                    </Link>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1 h-8"
                                    type="button"
                                    onClick={() =>
                                      handleOpenExcelUpload(row.gradeId ?? undefined, row.subjectId)
                                    }
                                    aria-label={`Загрузка Excel: ${row.subjectName}, ${row.gradeLabel}`}
                                  >
                                    <Upload className="h-3.5 w-3.5" />
                                    Excel
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {unassigned.length > 0 && (
                      <p className="text-xs text-muted-foreground px-4 py-2.5 border-t bg-muted/20">
                        Строки с пометкой «Все классы» — назначение только по предмету; класс выберите при вводе или в
                        форме Excel.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Быстрые ссылки</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/teacher/classes">
                      <Users className="mr-2 h-4 w-4" />
                      Мои классы
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/analytics">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Аналитика учеников
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {showSubjectGroupsTab && (
            <TabsContent value="subject-groups" className="mt-0 focus-visible:outline-none">
              <TeacherSubjectGroupsPanel embedded />
            </TabsContent>
          )}
        </Tabs>
      </div>

      <UploadScores
        open={uploadOpen}
        onOpenChange={handleUploadOpenChange}
        initialGradeId={uploadPrefill.gradeId}
        initialSubjectId={uploadPrefill.subjectId}
        onUploadComplete={() => {
          fetchData();
        }}
      />
    </PageContainer>
  );
}

export default function TeacherDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg text-muted-foreground">Загрузка...</div>
        </div>
      }
    >
      <TeacherDashboardContent />
    </Suspense>
  );
}
