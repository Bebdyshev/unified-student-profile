'use client';

import { useEffect, useState } from 'react';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-toastify';
import { Users, BookOpen, ChevronRight, School, Table2, Upload } from 'lucide-react';
import { handleApiError } from '@/utils/errorHandler';
import api from '@/lib/api';
import Link from 'next/link';
import { groupTeacherAssignmentsByGrade, type TeacherAssignmentRow } from '@/lib/teacher-assignments';
import { UploadScores } from '@/app/(user)/dashboard/classes/_components/upload-scores';

const gradesEntryHref = (subjectId: number, gradeId: number) =>
  `/dashboard/teacher/grades/entry?subject=${subjectId}&grade=${gradeId}`;

export default function TeacherClassesPage() {
  const [assignments, setAssignments] = useState<TeacherAssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadPrefill, setUploadPrefill] = useState<{ gradeId?: number; subjectId?: number }>({});

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const data = await api.getMyTeacherAssignments();
      setAssignments(data);
    } catch (err) {
      const apiError = handleApiError(err);
      toast.error(`Ошибка загрузки данных: ${apiError.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenExcel = (gradeId: number, subjectId: number) => {
    setUploadPrefill({ gradeId, subjectId });
    setUploadOpen(true);
  };

  const handleUploadOpenChange = (open: boolean) => {
    setUploadOpen(open);
    if (!open) {
      setUploadPrefill({});
    }
  };

  const groupedAssignments = groupTeacherAssignmentsByGrade(assignments);

  if (loading) {
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
          <h1 className="text-2xl font-bold">Мои классы</h1>
          <p className="text-gray-500">Классы, в которых вы преподаёте — оценки в таблице или загрузкой Excel</p>
        </div>

        {groupedAssignments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              У вас пока нет назначенных классов.
              <br />
              Обратитесь к администратору для получения назначений.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedAssignments.map((group) => {
              const firstSubjectId = group.rows[0]?.subjectId;
              return (
                <Card key={group.gradeId} className="hover:shadow-md transition-shadow flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <School className="h-5 w-5 text-blue-600 shrink-0" />
                        <CardTitle className="text-xl">{group.gradeName}</CardTitle>
                      </div>
                      <Badge variant="outline">
                        {group.rows.length}{' '}
                        {group.rows.length === 1 ? 'предмет' : 'предметов'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-1 gap-4">
                    <div className="space-y-2 flex-1">
                      {group.rows.map((row) => (
                        <div key={`${row.subjectId}-${row.subgroup ?? 'x'}`} className="flex items-center gap-2 text-sm">
                          <BookOpen className="h-4 w-4 text-gray-400 shrink-0" />
                          <span>{row.subjectName}</span>
                          {row.subgroup && (
                            <Badge variant="secondary" className="text-xs">
                              {row.subgroup}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2 pt-2 border-t">
                      {firstSubjectId != null && (
                        <Button variant="default" className="w-full" asChild>
                          <Link href={gradesEntryHref(firstSubjectId, group.gradeId)}>
                            <Table2 className="mr-2 h-4 w-4" />
                            Табличный ввод
                            <ChevronRight className="ml-auto h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      {firstSubjectId != null && (
                        <Button
                          variant="outline"
                          className="w-full"
                          type="button"
                          onClick={() => handleOpenExcel(group.gradeId, firstSubjectId)}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Загрузка из Excel
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <UploadScores
        open={uploadOpen}
        onOpenChange={handleUploadOpenChange}
        initialGradeId={uploadPrefill.gradeId}
        initialSubjectId={uploadPrefill.subjectId}
        onUploadComplete={() => {
          fetchAssignments();
        }}
      />
    </PageContainer>
  );
}
