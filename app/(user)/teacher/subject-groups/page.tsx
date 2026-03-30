'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import PageContainer from '@/components/layout/page-container'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'react-toastify'
import { handleApiError } from '@/utils/errorHandler'
import api from '@/lib/api'
import type {
  SubjectGroup,
  SubjectGroupMemberRow,
  SubjectGroupParallelStudent
} from '@/types'
import { Loader2, Plus, Trash2, UserPlus } from 'lucide-react'

interface TeacherAssignmentRow {
  subject_id: number
  subject_name: string
  grade_id: number | null
  grade_name: string | null
}

const parallelFromGradeLabel = (name: string | null | undefined): number | null => {
  if (!name) return null
  const m = String(name).trim().match(/^(\d{1,2})/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return n === 11 || n === 12 ? n : null
}

const letterFromGradeLabel = (name: string | null | undefined): string => {
  if (!name) return ''
  const t = String(name).trim()
  const m = t.match(/^(\d{1,2})\s*([A-Za-zА-Яа-яЁёІіҢңҒғҚқӨөҰұҮүҺһ]?)/u)
  if (m && m[2]) return m[2].toUpperCase()
  const tail = t.replace(/^\d{1,2}\s*/, '').trim()
  return tail ? tail.charAt(0).toUpperCase() : ''
}

export default function TeacherSubjectGroupsPage() {
  const [groups, setGroups] = useState<SubjectGroup[]>([])
  const [assignments, setAssignments] = useState<TeacherAssignmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [members, setMembers] = useState<SubjectGroupMemberRow[]>([])
  const [candidates, setCandidates] = useState<SubjectGroupParallelStudent[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createSubjectId, setCreateSubjectId] = useState<string>('')
  const [createAnchorId, setCreateAnchorId] = useState<string>('')
  const [createName, setCreateName] = useState('')
  const [savingMembers, setSavingMembers] = useState(false)
  const [search, setSearch] = useState('')
  const [letterFilter, setLetterFilter] = useState<string>('all')
  const [selectedToAdd, setSelectedToAdd] = useState<Set<number>>(new Set())

  const loadBase = useCallback(async () => {
    setLoading(true)
    try {
      const [g, a] = await Promise.all([
        api.getMySubjectGroups(),
        api.getMyTeacherAssignments()
      ])
      setGroups(g)
      setAssignments(
        (a as TeacherAssignmentRow[]).map((x) => ({
          subject_id: x.subject_id,
          subject_name: x.subject_name,
          grade_id: x.grade_id,
          grade_name: x.grade_name
        }))
      )
    } catch (err) {
      const e = handleApiError(err)
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBase()
  }, [loadBase])

  useEffect(() => {
    if (!createOpen) return
    if (anchorOptions.length === 0) {
      setCreateAnchorId('')
      return
    }
    const stillValid = anchorOptions.some((o) => String(o.grade_id) === createAnchorId)
    if (!stillValid) {
      setCreateAnchorId(String(anchorOptions[0].grade_id))
    }
  }, [createOpen, anchorOptions, createAnchorId])

  const subjectOptions = useMemo(() => {
    const map = new Map<number, string>()
    for (const a of assignments) {
      const p = parallelFromGradeLabel(a.grade_name)
      if (p !== null && a.grade_id != null) {
        map.set(a.subject_id, a.subject_name)
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [assignments])

  const anchorOptions = useMemo(() => {
    const sid = parseInt(createSubjectId, 10)
    if (!sid) return []
    const rows: { grade_id: number; label: string }[] = []
    const seen = new Set<number>()
    for (const a of assignments) {
      if (a.subject_id !== sid || a.grade_id == null) continue
      if (parallelFromGradeLabel(a.grade_name) == null) continue
      if (seen.has(a.grade_id)) continue
      seen.add(a.grade_id)
      rows.push({
        grade_id: a.grade_id,
        label: a.grade_name || `Класс #${a.grade_id}`
      })
    }
    return rows
  }, [assignments, createSubjectId])

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  )

  const loadGroupDetail = useCallback(async (groupId: number) => {
    setDetailLoading(true)
    setSelectedToAdd(new Set())
    try {
      const [mrows, pool] = await Promise.all([
        api.getSubjectGroupMembers(groupId),
        api.getSubjectGroupParallelStudents(groupId)
      ])
      setMembers(mrows)
      setCandidates(pool)
    } catch (err) {
      const e = handleApiError(err)
      toast.error(e.message)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedGroupId != null) {
      loadGroupDetail(selectedGroupId)
    } else {
      setMembers([])
      setCandidates([])
    }
  }, [selectedGroupId, loadGroupDetail])

  const memberIdSet = useMemo(() => new Set(members.map((m) => m.student_id)), [members])

  const letterOptions = useMemo(() => {
    const letters = new Set<string>()
    for (const c of candidates) {
      const L = letterFromGradeLabel(c.grade_name)
      if (L) letters.add(L)
    }
    return Array.from(letters).sort()
  }, [candidates])

  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase()
    return candidates.filter((c) => {
      if (memberIdSet.has(c.id)) return false
      if (letterFilter !== 'all') {
        const L = letterFromGradeLabel(c.grade_name)
        if (L !== letterFilter) return false
      }
      if (q && !(c.name || '').toLowerCase().includes(q)) return false
      return true
    })
  }, [candidates, memberIdSet, search, letterFilter])

  const handleOpenCreate = () => {
    setCreateSubjectId(subjectOptions[0] ? String(subjectOptions[0].id) : '')
    setCreateAnchorId('')
    setCreateName('')
    setCreateOpen(true)
  }

  const handleCreateGroup = async () => {
    const sid = parseInt(createSubjectId, 10)
    const aid = parseInt(createAnchorId, 10)
    if (!sid || !aid || !createName.trim()) {
      toast.error('Заполните предмет, якорный класс и название')
      return
    }
    try {
      await api.createTeacherSubjectGroup({
        subject_id: sid,
        name: createName.trim(),
        anchor_grade_id: aid
      })
      toast.success('Группа создана')
      setCreateOpen(false)
      await loadBase()
    } catch (err) {
      const e = handleApiError(err)
      toast.error(e.message)
    }
  }

  const handleDeactivateGroup = async (id: number) => {
    if (!confirm('Деактивировать эту предметную группу?')) return
    try {
      await api.updateSubjectGroup(id, { is_active: 0 })
      toast.success('Группа деактивирована')
      if (selectedGroupId === id) setSelectedGroupId(null)
      await loadBase()
    } catch (err) {
      const e = handleApiError(err)
      toast.error(e.message)
    }
  }

  const handleRemoveMember = async (studentId: number) => {
    if (!selectedGroupId) return
    try {
      await api.removeSubjectGroupMember(selectedGroupId, studentId)
      toast.success('Ученик исключён')
      await loadGroupDetail(selectedGroupId)
    } catch (err) {
      const e = handleApiError(err)
      toast.error(e.message)
    }
  }

  const handleToggleCandidate = (studentId: number, checked: boolean) => {
    setSelectedToAdd((prev) => {
      const next = new Set(prev)
      if (checked) next.add(studentId)
      else next.delete(studentId)
      return next
    })
  }

  const handleAddSelected = async () => {
    if (!selectedGroupId || selectedToAdd.size === 0) return
    setSavingMembers(true)
    try {
      const res = await api.addSubjectGroupMembers(selectedGroupId, Array.from(selectedToAdd))
      if (res.errors?.length) {
        toast.warning(`Добавлено: ${res.added_or_reactivated}. Ошибки: ${res.errors.slice(0, 3).join('; ')}`)
      } else {
        toast.success(`Добавлено учеников: ${res.added_or_reactivated}`)
      }
      setSelectedToAdd(new Set())
      await loadGroupDetail(selectedGroupId)
    } catch (err) {
      const e = handleApiError(err)
      toast.error(e.message)
    } finally {
      setSavingMembers(false)
    }
  }

  const handleSelectAllFiltered = (checked: boolean) => {
    if (!checked) {
      setSelectedToAdd(new Set())
      return
    }
    setSelectedToAdd(new Set(filteredCandidates.map((c) => c.id)))
  }

  if (loading) {
    return (
      <PageContainer scrollable>
        <div className="flex min-h-[320px] items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Загрузка…</span>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer scrollable>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Предметные группы (11–12)</h1>
            <p className="text-sm text-muted-foreground">
              Создавайте группы по предмету и собирайте учеников из разных литер одной параллели.
            </p>
          </div>
          <Button type="button" onClick={handleOpenCreate} className="shrink-0 gap-2">
            <Plus className="h-4 w-4" aria-hidden />
            Новая группа
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Мои группы</CardTitle>
              <CardDescription>Только группы, которые вы создали</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {groups.length === 0 ? (
                <p className="text-sm text-muted-foreground">Пока нет групп. Создайте первую.</p>
              ) : (
                <ul className="space-y-2">
                  {groups.map((g) => (
                    <li key={g.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedGroupId(g.id)}
                        className={`flex w-full flex-col rounded-lg border p-3 text-left transition-colors hover:bg-muted/60 ${
                          selectedGroupId === g.id ? 'border-primary bg-muted/40' : 'border-border'
                        }`}
                      >
                        <span className="font-medium">{g.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {g.subject_name ?? `Предмет #${g.subject_id}`} · {g.grade_name ?? `Класс #${g.grade_id}`}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Состав группы</CardTitle>
              <CardDescription>
                {selectedGroup
                  ? `${selectedGroup.name} — добавьте учеников той же параллели (11 или 12), другие литеры разрешены`
                  : 'Выберите группу слева'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!selectedGroupId && (
                <p className="text-sm text-muted-foreground">Ничего не выбрано.</p>
              )}
              {selectedGroupId && detailLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Загрузка состава…
                </div>
              )}
              {selectedGroup && !detailLoading && (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeactivateGroup(selectedGroup.id)}
                    >
                      Деактивировать группу
                    </Button>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-medium">В группе ({members.length})</h3>
                    {members.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Пока никого нет — добавьте ниже.</p>
                    ) : (
                      <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
                        {members.map((m) => (
                          <li
                            key={m.id}
                            className="flex items-center justify-between gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50"
                          >
                            <span>
                              {m.name ?? `Ученик #${m.student_id}`}
                              {m.grade_name ? (
                                <Badge variant="secondary" className="ml-2 font-normal">
                                  {m.grade_name}
                                </Badge>
                              ) : null}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-destructive"
                              aria-label={`Удалить ${m.name ?? m.student_id} из группы`}
                              onClick={() => handleRemoveMember(m.student_id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="space-y-3 border-t pt-4">
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="min-w-[180px] flex-1 space-y-2">
                        <Label htmlFor="sg-search">Поиск по ФИО</Label>
                        <Input
                          id="sg-search"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Начните вводить имя…"
                          autoComplete="off"
                        />
                      </div>
                      <div className="w-full min-w-[140px] max-w-[200px] space-y-2">
                        <Label>Литера класса</Label>
                        <Select value={letterFilter} onValueChange={setLetterFilter}>
                          <SelectTrigger aria-label="Фильтр по литере">
                            <SelectValue placeholder="Все" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Все литеры</SelectItem>
                            {letterOptions.map((L) => (
                              <SelectItem key={L} value={L}>
                                {L}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="sg-select-all"
                          checked={
                            filteredCandidates.length > 0 &&
                            filteredCandidates.every((c) => selectedToAdd.has(c.id))
                          }
                          onCheckedChange={(v) => handleSelectAllFiltered(v === true)}
                          aria-label="Выбрать всех в списке"
                        />
                        <Label htmlFor="sg-select-all" className="text-sm font-normal">
                          Выбрать всех в списке ({filteredCandidates.length})
                        </Label>
                      </div>
                      <Button
                        type="button"
                        disabled={selectedToAdd.size === 0 || savingMembers}
                        onClick={handleAddSelected}
                        className="gap-2"
                      >
                        {savingMembers ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserPlus className="h-4 w-4" aria-hidden />
                        )}
                        Добавить выбранных ({selectedToAdd.size})
                      </Button>
                    </div>

                    <ul
                      className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2"
                      role="list"
                      aria-label="Ученики для добавления в группу"
                    >
                      {filteredCandidates.length === 0 ? (
                        <li className="px-2 py-4 text-center text-sm text-muted-foreground">
                          Нет учеников по фильтру или все уже в группе.
                        </li>
                      ) : (
                        filteredCandidates.map((c) => (
                          <li
                            key={c.id}
                            className="flex items-center gap-3 rounded px-2 py-2 hover:bg-muted/40"
                          >
                            <Checkbox
                              id={`sg-cand-${c.id}`}
                              checked={selectedToAdd.has(c.id)}
                              onCheckedChange={(v) => handleToggleCandidate(c.id, v === true)}
                              aria-label={`Выбрать ${c.name ?? c.id}`}
                            />
                            <label htmlFor={`sg-cand-${c.id}`} className="flex flex-1 cursor-pointer flex-wrap gap-2">
                              <span className="font-medium">{c.name ?? `Ученик #${c.id}`}</span>
                              {c.grade_name ? (
                                <Badge variant="outline" className="font-normal">
                                  {c.grade_name}
                                </Badge>
                              ) : null}
                            </label>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Новая предметная группа</DialogTitle>
            <DialogDescription>
              Якорный класс задаёт параллель (11 или 12). Учеников из других литер этой параллели можно добавить позже.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Предмет</Label>
              <Select value={createSubjectId} onValueChange={(v) => { setCreateSubjectId(v); setCreateAnchorId('') }}>
                <SelectTrigger aria-label="Предмет">
                  <SelectValue placeholder="Выберите предмет" />
                </SelectTrigger>
                <SelectContent>
                  {subjectOptions.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Якорный класс (11/12)</Label>
              <Select value={createAnchorId} onValueChange={setCreateAnchorId}>
                <SelectTrigger aria-label="Якорный класс">
                  <SelectValue placeholder="Выберите класс из ваших назначений" />
                </SelectTrigger>
                <SelectContent>
                  {anchorOptions.map((o) => (
                    <SelectItem key={o.grade_id} value={String(o.grade_id)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sg-new-name">Название группы</Label>
              <Input
                id="sg-new-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Например, Биология — профиль А"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button type="button" onClick={handleCreateGroup}>
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
