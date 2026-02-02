'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';
import type { Subject } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SubjectsPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [authCheckLoading, setAuthCheckLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [current, setCurrent] = useState<Subject | null>(null);
  const [form, setForm] = useState<{ name: string; description?: string; applicable_parallels: number[] }>({ name: '', applicable_parallels: Array.from({ length: 6 }, (_, i) => i + 7) });

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
      toast.error('Доступ запрещен. Только администраторы могут управлять предметами.');
      router.push('/dashboard');
    }
  }, [user, authCheckLoading, router]);

  useEffect(() => {
    if (user && user.type === 'admin') {
      fetchSubjects();
    }
  }, [user]);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const data = await api.getAllSubjects();
      setSubjects(data);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Не удалось загрузить предметы');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm({ name: '', description: '', applicable_parallels: Array.from({ length: 6 }, (_, i) => i + 7) });
    setIsCreateOpen(true);
  };

  const createSubject = async () => {
    if (!form.name.trim()) return;
    try {
      await api.createSubject({ name: form.name.trim(), description: form.description, applicable_parallels: form.applicable_parallels } as any);
      setIsCreateOpen(false);
      await fetchSubjects();
    } catch (e) {
      // handled by interceptor
    }
  };

  const openEdit = (s: Subject) => {
    setCurrent(s);
    setForm({ name: s.name, description: s.description || '', applicable_parallels: (s as any).applicable_parallels || [] });
    setIsEditOpen(true);
  };

  const saveEdit = async () => {
    if (!current) return;
    try {
      await api.updateSubject(current.id, { name: form.name, description: form.description, applicable_parallels: form.applicable_parallels } as any);
      setIsEditOpen(false);
      setCurrent(null);
      await fetchSubjects();
    } catch (e) {
      // handled by interceptor
    }
  };

  const deleteSubject = async (id: number) => {
    try {
      await api.deleteSubject(id);
      await fetchSubjects();
    } catch (e) {}
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
      <div className="py-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Предметы</h1>
          <Button onClick={openCreate} className="flex items-center gap-2">
            <Plus size={16} /> Добавить предмет
          </Button>
        </div>

        {error && (
          <Card className="border-red-300 bg-red-50">
            <CardContent className="p-4 text-red-600">{error}</CardContent>
          </Card>
        )}

        {loading ? (
          <Card>
            <CardContent className="p-6 text-center">Загрузка предметов...</CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Справочник предметов</CardTitle>
              <CardDescription>Список активных предметов</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-left">
                      <th className="p-3 border-b border-gray-200 font-semibold">ID</th>
                      <th className="p-3 border-b border-gray-200 font-semibold">Название</th>
                      <th className="p-3 border-b border-gray-200 font-semibold">Описание</th>
                      <th className="p-3 border-b border-gray-200 font-semibold text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="p-3 border-b border-gray-200">{s.id}</td>
                        <td className="p-3 border-b border-gray-200 font-medium">{s.name}</td>
                        <td className="p-3 border-b border-gray-200 text-sm text-muted-foreground">
                          {s.description || '-'}
                          {Array.isArray((s as any).applicable_parallels) && (s as any).applicable_parallels.length > 0 && (
                            <div className="mt-1 text-xs">Параллели: {(s as any).applicable_parallels.join(', ')}</div>
                          )}
                        </td>
                        <td className="p-3 border-b border-gray-200 text-right space-x-2">
                          <Button variant="outline" size="icon" onClick={() => openEdit(s)} className="h-8 w-8" title="Редактировать">
                            <Pencil size={16} />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => deleteSubject(s.id)} className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" title="Удалить">
                            <Trash2 size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить предмет</DialogTitle>
              <DialogDescription>Заполните данные нового предмета</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="subj-name">Название *</Label>
                <Input id="subj-name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="subj-desc">Описание (необязательно)</Label>
                <Input id="subj-desc" value={form.description || ''} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Параллели (7–12)</Label>
                <div className="grid grid-cols-6 gap-2">
                  {Array.from({ length: 6 }, (_, i) => i + 7).map((g) => {
                    const active = form.applicable_parallels.includes(g);
                    return (
                      <Button
                        key={g}
                        type="button"
                        variant={active ? 'default' : 'outline'}
                        onClick={() => setForm((p) => ({
                          ...p,
                          applicable_parallels: active
                            ? p.applicable_parallels.filter((x) => x !== g)
                            : [...p.applicable_parallels, g].sort((a, b) => a - b)
                        }))}
                      >
                        {g}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Отмена</Button>
              <Button onClick={createSubject} disabled={!form.name.trim()}>Создать</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Редактировать предмет</DialogTitle>
              <DialogDescription>Измените данные предмета</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-subj-name">Название *</Label>
                <Input id="edit-subj-name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-subj-desc">Описание (необязательно)</Label>
                <Input id="edit-subj-desc" value={form.description || ''} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Параллели (7–12)</Label>
                <div className="grid grid-cols-6 gap-2">
                  {Array.from({ length: 6 }, (_, i) => i + 7).map((g) => {
                    const active = form.applicable_parallels.includes(g);
                    return (
                      <Button
                        key={g}
                        type="button"
                        variant={active ? 'default' : 'outline'}
                        onClick={() => setForm((p) => ({
                          ...p,
                          applicable_parallels: active
                            ? p.applicable_parallels.filter((x) => x !== g)
                            : [...p.applicable_parallels, g].sort((a, b) => a - b)
                        }))}
                      >
                        {g}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Отмена</Button>
              <Button onClick={saveEdit} disabled={!form.name.trim()}>Сохранить</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  );
}


