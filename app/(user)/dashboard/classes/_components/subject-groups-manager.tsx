'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import type { SubjectGroup, Subject } from '@/types'

const ELECTIVE_SUBJECTS = ['Физика', 'Химия', 'Биология', 'География', 'Графика и проектирование', 'Информатика']

interface GradeOption {
  id: number
  grade: string
  parallel: string
}

const parseParallel = (g: GradeOption): number => {
  const num = parseInt(g.grade, 10)
  return Number.isFinite(num) ? num : NaN
}

export function SubjectGroupsManager() {
  const [grades, setGrades] = useState<GradeOption[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [groups, setGroups] = useState<SubjectGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ grade_id: 0, subject_id: 0, name: '' })

  const eligibleGrades = grades.filter((g) => {
    const p = parseParallel(g)
    return p >= 7 && p <= 12
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [gradesRes, subjectsRes, groupsRes] = await Promise.all([
        api.getAllGrades(),
        api.getAllSubjects(),
        api.getSubjectGroups(),
      ])
      setGrades(gradesRes as GradeOption[])
      setSubjects(subjectsRes as Subject[])
      setGroups(groupsRes as SubjectGroup[])
    } catch (e: any) {
      toast.error(e?.message || 'Не удалось загрузить данные')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!createForm.grade_id || !createForm.subject_id || !createForm.name.trim()) {
      toast.error('Заполните все поля')
      return
    }
    try {
      await api.createSubjectGroup({
        grade_id: createForm.grade_id,
        subject_id: createForm.subject_id,
        name: createForm.name.trim(),
      })
      toast.success('Предметная группа создана')
      setIsCreateOpen(false)
      setCreateForm({ grade_id: 0, subject_id: 0, name: '' })
      loadData()
    } catch (e: any) {
      toast.error(e?.message || 'Ошибка создания')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить предметную группу?')) return
    try {
      await api.deleteSubjectGroup(id)
      toast.success('Группа удалена')
      loadData()
    } catch (e: any) {
      toast.error(e?.message || 'Ошибка удаления')
    }
  }

  const selectedGrade = eligibleGrades.find((g) => g.id === createForm.grade_id)
  const selectedParallel = selectedGrade ? parseParallel(selectedGrade) : NaN
  const isSenior = selectedParallel === 11 || selectedParallel === 12

  // 11-12: elective subjects only unless subject.allows_subject_groups explicitly includes more.
  // 7-10: any subject with allows_subject_groups enabled (in-class subject subgroups).
  const subjectsForGroupFlag = subjects.filter((s) => (s as any).allows_subject_groups)
  const electiveSubjectsFiltered = subjectsForGroupFlag.filter((s) =>
    ELECTIVE_SUBJECTS.some((e) => s.name.toLowerCase().includes(e.toLowerCase()))
  )
  const allSubjectsForSelect = isSenior
    ? (electiveSubjectsFiltered.length > 0 ? electiveSubjectsFiltered : subjectsForGroupFlag)
    : subjectsForGroupFlag

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">Загрузка...</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Предметные группы (7–12 классы)</CardTitle>
          <CardDescription>
            7–10: деление класса на подгруппы по предмету (например, казахский язык — 2 подгруппы, 2 учителя).
            11–12: элективные группы (физика, химия, биология, география, ГиП, информатика).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {eligibleGrades.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Нет подходящих классов (7–12). Создайте классы в разделе «Классы».
            </p>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Всего групп: {groups.length}
                </p>
                <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                  <Plus size={16} /> Добавить группу
                </Button>
              </div>

              <div className="border rounded-lg divide-y">
                {groups.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    Предметные группы не созданы. Добавьте группы для классов 7–12.
                  </div>
                ) : (
                  groups.map((g) => (
                    <div
                      key={g.id}
                      className="flex items-center justify-between p-3 hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-medium">{g.grade_name || `Класс ${g.grade_id}`}</span>
                        <span className="text-muted-foreground">{g.subject_name || `Предмет ${g.subject_id}`}</span>
                        <Badge variant="secondary">{g.name}</Badge>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(g.id)}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать предметную группу</DialogTitle>
            <DialogDescription>
              Для 7–10: деление одного класса на подгруппы по предмету. Для 11–12: элективные группы.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Класс</Label>
              <Select
                value={createForm.grade_id?.toString() || ''}
                onValueChange={(v) => setCreateForm((p) => ({ ...p, grade_id: parseInt(v, 10), subject_id: 0 }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите класс" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleGrades.map((gr) => (
                    <SelectItem key={gr.id} value={gr.id.toString()}>
                      {gr.grade}{gr.parallel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Предмет</Label>
              <Select
                value={createForm.subject_id?.toString() || ''}
                onValueChange={(v) => setCreateForm((p) => ({ ...p, subject_id: parseInt(v, 10) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите предмет" />
                </SelectTrigger>
                <SelectContent>
                  {allSubjectsForSelect.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Название группы</Label>
              <Input
                placeholder="Например: Группа А"
                value={createForm.name}
                onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreate}>
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
