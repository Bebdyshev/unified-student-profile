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
    Users,
    GraduationCap,
    AlertTriangle,
    User,
    Mail,
    TrendingUp,
    BookOpen
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import type { Grade, Student } from '@/types';

const DANGER_LEVEL_COLORS = {
    0: 'bg-green-100 text-green-800',
    1: 'bg-yellow-100 text-yellow-800',
    2: 'bg-orange-100 text-orange-800',
    3: 'bg-red-100 text-red-800'
};

const DANGER_LEVEL_NAMES = {
    0: 'Низкий',
    1: 'Умеренный',
    2: 'Высокий',
    3: 'Критический'
};

export default function ClassProfilePage() {
    const params = useParams();
    const router = useRouter();
    const gradeId = parseInt(params.id as string);

    const [grade, setGrade] = useState<Grade | null>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (gradeId) {
            fetchClassData();
        }
    }, [gradeId]);

    const fetchClassData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [gradeData, studentsData] = await Promise.all([
                api.getGradeById(gradeId),
                api.getStudentsByGrade(gradeId)
            ]);

            setGrade(gradeData);
            console.log('Students data received:', studentsData);
            console.log('First student avg_percentage:', studentsData[0]?.avg_percentage);
            setStudents(studentsData);
        } catch (error: any) {
            console.error('Failed to fetch class data:', error);
            setError(error.message || 'Не удалось загрузить данные класса');
            toast.error('Ошибка при загрузке данных класса');
        } finally {
            setLoading(false);
        }
    };

    const calculateAverageDanger = () => {
        if (students.length === 0) return 0;
        const totalDanger = students.reduce((sum, s) => sum + (s.danger_level || 0), 0);
        return Math.round((totalDanger / students.length) * 10) / 10;
    };

    const calculateAverageScore = () => {
        if (students.length === 0) return 0;
        const studentsWithScores = students.filter(s => s.avg_percentage);
        if (studentsWithScores.length === 0) return 0;
        const totalScore = studentsWithScores.reduce((sum, s) => sum + s.avg_percentage, 0);
        return Math.round((totalScore / studentsWithScores.length) * 10) / 10;
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

    if (error || !grade) {
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

    const avgDanger = calculateAverageDanger();
    const avgScore = calculateAverageScore();
    const atRiskCount = students.filter(s => (s.danger_level || 0) >= 2).length;

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
                            <h1 className="text-2xl font-bold">Класс {grade.grade} {grade.parallel}</h1>
                            <p className="text-muted-foreground">
                                {grade.curator_info ? `Куратор: ${grade.curator_info.name}` : 'Куратор не назначен'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-base px-4 py-1">
                            {students.length} учеников
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
                            <div className="text-2xl font-bold">{avgScore}%</div>
                            <p className="text-xs text-muted-foreground">
                                По всему классу
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">В зоне риска</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{atRiskCount}</div>
                            <p className="text-xs text-muted-foreground">
                                Студентов с высоким риском
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Индекс риска</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{avgDanger}</div>
                            <p className="text-xs text-muted-foreground">
                                Средний уровень (0-3)
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Куратор</CardTitle>
                            <User className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm font-medium truncate">
                                {grade.curator_info?.name || 'Не назначен'}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                                {grade.curator_info?.email || '-'}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Students List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Список студентов</CardTitle>
                        <CardDescription>
                            Нажмите на студента для просмотра подробной информации
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {students.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    В этом классе пока нет студентов
                                </p>
                            ) : (
                                <div className="grid gap-4">
                                    {students.map((student) => (
                                        <div
                                            key={student.id}
                                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                                            onClick={() => router.push(`/dashboard/students/${student.id}`)}
                                        >
                                            <div className="flex items-center space-x-4">
                                                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                                    <User className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <h4 className="font-medium">{student.name}</h4>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Mail className="h-3 w-3" />
                                                        {student.email || 'Email не указан'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-4">
                                                <div className="text-right">
                                                    <div className="text-sm font-medium">
                                                        {student.avg_percentage ? `${student.avg_percentage}%` : 'Нет оценок'}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Средний балл
                                                    </div>
                                                </div>

                                                <Badge className={DANGER_LEVEL_COLORS[(student.danger_level || 0) as keyof typeof DANGER_LEVEL_COLORS]}>
                                                    {DANGER_LEVEL_NAMES[(student.danger_level || 0) as keyof typeof DANGER_LEVEL_NAMES]}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </PageContainer>
    );
}
