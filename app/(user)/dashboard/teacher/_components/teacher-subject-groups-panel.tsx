'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { handleApiError } from '@/utils/errorHandler'
import api from '@/lib/api'
import type {
  SubjectGroup,
  SubjectGroupMemberRow,
  SubjectGroupParallelStudent
} from '@/types'
import { Loader2, Plus, Trash2, UserPlus } from 'lucide-react'
import type { TeacherAssignmentRow as LibTeacherAssignmentRow } from '@/lib/teacher-assignments'

interface TeacherAssignmentRow {
  subject_id: number
  subject_name: string
  grade_id: number | null
  grade_name: string | null
  subject_allows_subject_groups?: boolean
}

const parallelFromGradeLabel = (name: string | null | undefined): number | null => {
  if (!name) return null
  const s = String(name).trim()
  const lead = s.match(/^(\d{1,2})/)
  if (lead) {
    const n = parseInt(lead[1], 10)
    if (n === 11 || n === 12) return n
  }
  const inner = s.match(/\b(1[12])\b/)
  if (inner) {
    const n = parseInt(inner[1], 10)
    if (n === 11 || n === 12) return n
  }
  return null
}

const letterFromGradeLabel = (name: string | null | undefined): string => {
  if (!name) return ''
  const t = String(name).trim()
  const m = t.match(/^(\d{1,2})\s*([A-Za-zА-Яа-яЁёІіҢңҒғҚқӨөҰұҮүҺһ]?)/)
  if (m && m[2]) return m[2].toUpperCase()
  const tail = t.replace(/^\d{1,2}\s*/, '').trim()
  return tail ? tail.charAt(0).toUpperCase() : ''
}

type AccessBlock = 'none' | 'not-teacher' | 'no-subject-groups-flag'

export type TeacherSubjectGroupsPanelProps = {
  /** Вкладка на панели учителя: без редиректов, только текст */
  embedded?: boolean
}

export const TeacherSubjectGroupsPanel = ({ embedded = false }: TeacherSubjectGroupsPanelProps) => {
  const router = useRouter()
  const [groups, setGroups] = useState<SubjectGroup[]>([])
  const [assignments, setAssignments] = useState<TeacherAssignmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [accessBlock, setAccessBlock] = useState<AccessBlock>('none')
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
  /** Сырые строки GET /teacher/my-assignments — для предметов/якорей, если синтетика обрезана фильтрами API */
  const [sourceAssignmentsFromApi, setSourceAssignmentsFromApi] = useState<TeacherAssignmentRow[]>([])
  /** Сколько классов 11–12 пришло из справочника (якоря) */
  const [anchorGradesAvailableCount, setAnchorGradesAvailableCount] = useState(0)

  const loadBase = useCallback(async () => {
    setLoading(true)
    setAccessBlock('none')
    setSourceAssignmentsFromApi([])
    setAnchorGradesAvailableCount(0)
    try {
      const currentUser = await api.getCurrentUser()
      const isAdmin = currentUser.type === 'admin'

      if (!isAdmin && currentUser.type !== 'teacher') {
        if (!embedded) router.replace('/dashboard')
        setAccessBlock('not-teacher')
        setLoading(false)
        return
      }

      let assignmentsData: TeacherAssignmentRow[]

      if (isAdmin) {
        const [allGroups, allSubjects, allGrades] = await Promise.all([
          api.getMySubjectGroups().catch(() => [] as SubjectGroup[]),
          api.getAllSubjects(),
          api.getAllGrades()
        ])
        setGroups(allGroups)

        const rows: TeacherAssignmentRow[] = []
        for (const subj of allSubjects) {
          if ((subj as { allows_subject_groups?: boolean }).allows_subject_groups !== true) continue
          for (const grade of allGrades) {
            const p = parallelFromGradeLabel(`${grade.grade}${grade.parallel}`)
            if (p !== null) {
              rows.push({
                subject_id: subj.id,
                subject_name: subj.name,
                grade_id: grade.id,
                grade_name: `${grade.grade}${grade.parallel}`
              })
            }
          }
        }
        assignmentsData = rows
      } else {
        if (currentUser.show_subject_groups_nav !== true) {
          const msg =
            'Раздел «Предметные группы» доступен преподавателям биологии, химии, физики и информатики.'
          if (embedded) {
            setAccessBlock('no-subject-groups-flag')
            setLoading(false)
            return
          }
          toast.info(msg)
          router.replace('/dashboard/teacher')
          setLoading(false)
          return
        }

        const assignmentRows = (await api.getMyTeacherAssignments()) as LibTeacherAssignmentRow[]

        const [g, allGrades] = await Promise.all([
          api.getMySubjectGroups(),
          api.getAllGrades({ purpose: 'subject_group_anchors' }),
        ])
        setGroups(g)

        const realAssignments = (assignmentRows as TeacherAssignmentRow[]).map((x) => ({
          subject_id: x.subject_id,
          subject_name: x.subject_name,
          grade_id: x.grade_id,
          grade_name: x.grade_name,
          subject_allows_subject_groups: x.subject_allows_subject_groups
        }))

        const teacherSubjects = new Map<number, string>()
        for (const row of realAssignments) {
          if (row.subject_allows_subject_groups !== true) continue
          teacherSubjects.set(row.subject_id, row.subject_name)
        }

        const grades1112 = allGrades.filter((grade: { grade: string; parallel: string }) => {
          const p = parallelFromGradeLabel(`${grade.grade}${grade.parallel}`)
          return p !== null
        })

        const rows: TeacherAssignmentRow[] = []
        teacherSubjects.forEach((sname, sid) => {
          for (const grade of grades1112) {
            rows.push({
              subject_id: sid,
              subject_name: sname,
              grade_id: grade.id,
              grade_name: `${grade.grade}${grade.parallel}`
            })
          }
        })
        assignmentsData = rows
        setSourceAssignmentsFromApi(realAssignments)
        setAnchorGradesAvailableCount(grades1112.length)
      }

      setAssignments(assignmentsData)
    } catch (err) {
      const e = handleApiError(err)
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [router, embedded])

  useEffect(() => {
    loadBase()
  }, [loadBase])

  const subjectOptions = useMemo(() => {
    const map = new Map<number, string>()
    const isSubjectGroupEligible = (subjectId: number) => {
      if (sourceAssignmentsFromApi.length === 0) {
        return true
      }
      return sourceAssignmentsFromApi.some(
        (r) => r.subject_id === subjectId && r.subject_allows_subject_groups === true
      )
    }
    const add = (subjectId: number, name: string | null | undefined) => {
      if (!name || !isSubjectGroupEligible(subjectId)) return
      map.set(subjectId, name)
    }
    for (const a of assignments) {
      const p = parallelFromGradeLabel(a.grade_name)
      if (p !== null && a.grade_id != null) {
        add(a.subject_id, a.subject_name)
      }
    }
    for (const row of sourceAssignmentsFromApi) {
      const p = parallelFromGradeLabel(row.grade_name)
      if (row.grade_id != null && p !== null) {
        add(row.subject_id, row.subject_name)
      }
    }
    for (const row of sourceAssignmentsFromApi) {
      if (row.grade_id != null) continue
      const hasAnchorsForSubject = assignments.some(
        (a) =>
          a.subject_id === row.subject_id &&
          a.grade_id != null &&
          parallelFromGradeLabel(a.grade_name) !== null
      )
      if (hasAnchorsForSubject) {
        add(row.subject_id, row.subject_name)
      }
    }
    if (
      map.size === 0 &&
      sourceAssignmentsFromApi.some((r) => r.subject_allows_subject_groups === true) &&
      anchorGradesAvailableCount > 0
    ) {
      for (const row of sourceAssignmentsFromApi) {
        if (row.subject_allows_subject_groups === true) {
          add(row.subject_id, row.subject_name)
        }
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  }, [assignments, sourceAssignmentsFromApi, anchorGradesAvailableCount])

  const anchorOptions = useMemo(() => {
    const sid = parseInt(createSubjectId, 10)
    if (!sid) return []
    const rows: { grade_id: number; label: string }[] = []
    const seen = new Set<number>()
    const pushRow = (gradeId: number, label: string) => {
      if (seen.has(gradeId)) return
      seen.add(gradeId)
      rows.push({ grade_id: gradeId, label })
    }
    for (const a of assignments) {
      if (a.subject_id !== sid || a.grade_id == null) continue
      if (parallelFromGradeLabel(a.grade_name) == null) continue
      pushRow(a.grade_id, a.grade_name || `Класс #${a.grade_id}`)
    }
    if (rows.length === 0 && sourceAssignmentsFromApi.length > 0) {
      for (const row of sourceAssignmentsFromApi) {
        if (row.subject_id !== sid || row.grade_id == null) continue
        if (row.subject_allows_subject_groups !== true) continue
        if (parallelFromGradeLabel(row.grade_name) == null) continue
        pushRow(row.grade_id, row.grade_name || `Класс #${row.grade_id}`)
      }
    }
    return rows.sort((a, b) => a.label.localeCompare(b.label, 'ru', { numeric: true }))
  }, [assignments, createSubjectId, sourceAssignmentsFromApi])

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
    if (subjectOptions.length > 0) {
      setCreateSubjectId(String(subjectOptions[0].id))
    } else {
      setCreateSubjectId('')
      toast.warning(
        'Нет предметов из ваших назначений. Обратитесь к администратору, чтобы назначить предметы (и при необходимости создать классы 11–12).'
      )
    }
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
      <div className="flex min-h-[280px] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Загрузка…</span>
      </div>
    )
  }

  if (accessBlock === 'not-teacher') {
    return (
      <Alert>
        <AlertDescription>Раздел доступен только учителям и администраторам.</AlertDescription>
      </Alert>
    )
  }

  if (accessBlock === 'no-subject-groups-flag') {
    return (
      <Alert>
        <AlertDescription>
          Предметные группы (11–12 класс) доступны преподавателям по отдельному согласованию (например, биология,
          химия, физика, информатика). Обратитесь к администратору.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="relative z-20 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Предметные группы (11–12)</h2>
          <p className="text-sm text-muted-foreground">
            Создавайте группы по предмету и собирайте учеников из разных литер одной параллели.
          </p>
        </div>
        <Button type="button" onClick={handleOpenCreate} className="relative z-20 shrink-0 gap-2">
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
            {!selectedGroupId && <p className="text-sm text-muted-foreground">Ничего не выбрано.</p>}
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          className="sm:max-w-md"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Новая предметная группа</DialogTitle>
            <DialogDescription>
              Якорный класс задаёт параллель (11 или 12). Учеников из других литер этой параллели можно добавить
              позже.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {subjectOptions.length === 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  Список предметов пуст: нет подходящих назначений (нужен активный предмет физики/биологии/химии/информатики
                  и при необходимости классы 11–12 в справочнике). Обновите страницу после изменений администратором.
                </AlertDescription>
              </Alert>
            )}
            {subjectOptions.length > 0 && createSubjectId && anchorOptions.length === 0 && (
              <Alert>
                <AlertDescription>
                  Для выбранного предмета не найдено классов 11–12. В справочнике школы должны быть параллели 11 и 12
                  (например 11А, 12Б) — их создаёт администратор.
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label>Предмет</Label>
              <Select
                value={createSubjectId || undefined}
                onValueChange={(v) => {
                  setCreateSubjectId(v)
                  setCreateAnchorId('')
                }}
                disabled={subjectOptions.length === 0}
              >
                <SelectTrigger aria-label="Предмет">
                  <SelectValue placeholder="Выберите предмет" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[120]">
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
              <Select
                value={createAnchorId || undefined}
                onValueChange={setCreateAnchorId}
                disabled={!createSubjectId || anchorOptions.length === 0}
              >
                <SelectTrigger aria-label="Якорный класс">
                  <SelectValue placeholder="Выберите класс (11 или 12)" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[120]">
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
            <Button
              type="button"
              onClick={handleCreateGroup}
              disabled={
                subjectOptions.length === 0 ||
                !createSubjectId ||
                anchorOptions.length === 0 ||
                !createName.trim()
              }
            >
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
