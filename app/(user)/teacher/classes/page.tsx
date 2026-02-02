'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-toastify';
import { Users, BookOpen, ChevronRight } from 'lucide-react';
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

interface GroupedAssignment {
  gradeId: number;
  gradeName: string;
  subjects: { id: number; name: string; subgroup?: string }[];
}

export default function TeacherClassesPage() {
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Group assignments by grade
  const groupedByGrade = assignments.reduce((acc, assignment) => {
    if (!assignment.grade_id || !assignment.grade_name) return acc;
    
    const key = assignment.grade_id;
    if (!acc[key]) {
      acc[key] = {
        gradeId: assignment.grade_id,
        gradeName: assignment.grade_name,
        subjects: []
      };
    }
    
    acc[key].subjects.push({
      id: assignment.subject_id,
      name: assignment.subject_name,
      subgroup: assignment.subgroup_name || undefined
    });
    
    return acc;
  }, {} as Record<number, GroupedAssignment>);

  const groupedAssignments = Object.values(groupedByGrade);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Мои классы</h1>
        <p className="text-gray-500">Классы, в которых вы преподаёте</p>
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
          {groupedAssignments.map((group) => (
            <Card key={group.gradeId} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{group.gradeName}</CardTitle>
                  <Badge variant="outline">
                    {group.subjects.length} {group.subjects.length === 1 ? 'предмет' : 'предметов'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {group.subjects.map((subject, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <BookOpen className="h-4 w-4 text-gray-400" />
                      <span>{subject.name}</span>
                      {subject.subgroup && (
                        <Badge variant="secondary" className="text-xs">
                          {subject.subgroup}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
                <Link 
                  href={`/teacher/grades/entry?grade=${group.gradeId}&subject=${group.subjects[0]?.id || ''}`}
                  className="block"
                >
                  <Button variant="outline" className="w-full">
                    <Users className="mr-2 h-4 w-4" />
                    Открыть класс
                    <ChevronRight className="ml-auto h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
