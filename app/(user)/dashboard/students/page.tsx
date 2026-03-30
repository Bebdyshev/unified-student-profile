'use client'

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PageContainer from '@/components/layout/page-container'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Search, AlertTriangle, Users, Filter, UserCheck, Upload, Plus } from 'lucide-react'
import api from '@/lib/api'
import { useAuth } from '@/hooks/use-auth'
import { handleApiError } from '@/utils/errorHandler'
import { toast } from 'sonner'
import type { Student, Grade, Subgroup } from '@/types'
import { StudentListRow } from './_components/student-list-row'

const DANGER_LEVEL_COLORS = {
  0: 'bg-green-100 text-green-800',
  1: 'bg-yellow-100 text-yellow-800',
  2: 'bg-orange-100 text-orange-800',
  3: 'bg-red-100 text-red-800'
}

const DANGER_LEVEL_NAMES = {
  0: 'Низкий',
  1: 'Умеренный',
  2: 'Высокий',
  3: 'Критический'
}

interface StudentWithGrade extends Student {
  grade_info?: Grade
  subgroup_info?: Subgroup
  average_score?: number
  danger_level?: number
}

interface StudentFormState {
  name: string
  email: string
  grade_id: string
}

const getGradeDisplayName = (grade: Grade): string => {
  const rawGrade = String(grade.grade || '').trim()
  const rawParallel = String(grade.parallel || '').trim().toUpperCase()

  const compact = rawGrade.replace(/\s+/g, '')
  const match = compact.match(/^(\d{1,2})([A-Za-zА-Яа-яЁёІіҢңҒғҚқӨөҰұҮүҺһ])$/)
  if (match) return `${match[1]}${match[2].toUpperCase()}`

  if (!rawGrade && rawParallel) return rawParallel
  if (!rawParallel) return rawGrade

  const gradeNum = rawGrade.match(/^(\d{1,2})/)
  if (gradeNum) return `${gradeNum[1]}${rawParallel}`

  return `${rawGrade} ${rawParallel}`.trim()
}

const getGradeParallelKey = (grade: Grade): string => {
  const gradeText = String(grade.grade || '').trim()
  const match = gradeText.match(/^(\d{1,2})/)
  if (match) return match[1]
  const parallelText = String(grade.parallel || '').trim()
  const parallelMatch = parallelText.match(/^(\d{1,2})/)
  return parallelMatch ? parallelMatch[1] : ''
}

export default function StudentsPage() {
  const router = useRouter()
  const { isAuthenticated, loading: authLoading } = useAuth()

  const [students, setStudents] = useState<StudentWithGrade[]>([])
  const [filteredStudents, setFilteredStudents] = useState<StudentWithGrade[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGrade, setSelectedGrade] = useState<string>('all')
  const [selectedDangerLevel, setSelectedDangerLevel] = useState<string>('all')
  const [selectedParallel, setSelectedParallel] = useState<string>('all')
  const [isUploadingStudents, setIsUploadingStudents] = useState(false)
  const bulkUploadInputRef = useRef<HTMLInputElement | null>(null)

  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([])
  const [bulkTargetGradeId, setBulkTargetGradeId] = useState<string>('none')
  const [bulkTargetParallel, setBulkTargetParallel] = useState<string>('none')
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<StudentWithGrade | null>(null)
  const [createParallel, setCreateParallel] = useState<string>('none')
  const [editParallel, setEditParallel] = useState<string>('none')
  const [studentForm, setStudentForm] = useState<StudentFormState>({
    name: '',
    email: '',
    grade_id: ''
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const dangerParam = params.get('danger')
    const parallelParam = params.get('parallel')
    const gradeIdParam = params.get('gradeId')

    if (dangerParam && ['0', '1', '2', '3'].includes(dangerParam)) setSelectedDangerLevel(dangerParam)
    if (parallelParam) setSelectedParallel(parallelParam)
    if (gradeIdParam) setSelectedGrade(gradeIdParam)
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      router.push('/signin')
      return
    }
    fetchData()
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    filterStudents()
  }, [students, searchQuery, selectedGrade, selectedDangerLevel, selectedParallel])

  useEffect(() => {
    const filteredIds = new Set(filteredStudents.map((student) => student.id))
    setSelectedStudentIds((previous) => previous.filter((id) => filteredIds.has(id)))
  }, [filteredStudents])

  const uniqueGrades = useMemo(() => {
    const uniqueByLabel = new Map<string, Grade>()
    for (const grade of grades) {
      const label = getGradeDisplayName(grade)
      if (!uniqueByLabel.has(label)) {
        uniqueByLabel.set(label, grade)
      }
    }

    return Array.from(uniqueByLabel.values()).sort((a, b) => {
      const aMatch = String(a.grade).match(/^(\d+)\s*([A-Za-zА-Яа-яЁёІіҢңҒғҚқӨөҰұҮүҺһ]*)/)
      const bMatch = String(b.grade).match(/^(\d+)\s*([A-Za-zА-Яа-яЁёІіҢңҒғҚқӨөҰұҮүҺһ]*)/)
      const aNum = aMatch ? parseInt(aMatch[1], 10) : 0
      const bNum = bMatch ? parseInt(bMatch[1], 10) : 0
      if (aNum !== bNum) return aNum - bNum
      const aLetter = aMatch?.[2] || String(a.parallel || '')
      const bLetter = bMatch?.[2] || String(b.parallel || '')
      return aLetter.localeCompare(bLetter)
    })
  }, [grades])

  const parallels = useMemo(
    () =>
      Array.from(
        new Set(
          uniqueGrades
            .map((grade) => {
              const match = grade.grade.match(/^(\d+)/)
              return match ? match[1] : null
            })
            .filter(Boolean)
        )
      ).sort((a, b) => parseInt(a!) - parseInt(b!)),
    [uniqueGrades]
  )

  const filteredGrades = useMemo(() => {
    if (selectedParallel === 'all') return uniqueGrades
    return uniqueGrades.filter((grade) => grade.grade.startsWith(selectedParallel))
  }, [uniqueGrades, selectedParallel])

  const gradesByParallel = useMemo(() => {
    const grouped = new Map<string, Grade[]>()
    uniqueGrades.forEach((grade) => {
      const key = getGradeParallelKey(grade)
      if (!key) return
      const current = grouped.get(key) || []
      current.push(grade)
      grouped.set(key, current)
    })
    return grouped
  }, [uniqueGrades])

  const createParallelGrades = useMemo(() => {
    if (createParallel === 'none') return []
    return gradesByParallel.get(createParallel) || []
  }, [createParallel, gradesByParallel])

  const editParallelGrades = useMemo(() => {
    if (editParallel === 'none') return []
    return gradesByParallel.get(editParallel) || []
  }, [editParallel, gradesByParallel])

  const bulkParallelGrades = useMemo(() => {
    if (bulkTargetParallel === 'none') return []
    return gradesByParallel.get(bulkTargetParallel) || []
  }, [bulkTargetParallel, gradesByParallel])

  const isAllFilteredSelected = filteredStudents.length > 0 && filteredStudents.every((student) => selectedStudentIds.includes(student.id))
  const selectedStudentIdSet = useMemo(() => new Set(selectedStudentIds), [selectedStudentIds])

  const fetchData = async () => {
    try {
      setLoading(true)

      const [gradesData, classData, currentUser] = await Promise.all([
        api.getAllGrades(),
        api.getAllClassData(),
        api.getCurrentUser()
      ])

      setIsAdmin(currentUser.type === 'admin')
      setGrades(gradesData)

      const studentsById = new Map<number, StudentWithGrade>()
      if (classData.class_data) {
        classData.class_data.forEach((classInfo: any) => {
          classInfo.class.forEach((student: any) => {
            const gradeInfo = gradesData.find((grade) => grade.grade === student.class_liter)
            const candidate: StudentWithGrade = {
              id: student.id,
              name: student.student_name,
              email: student.email || undefined,
              student_id_number: undefined,
              phone: undefined,
              parent_contact: undefined,
              is_active: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              grade_id: gradeInfo?.id || 0,
              subgroup_id: undefined,
              user_id: undefined,
              grade_info: gradeInfo,
              average_score: student.avg_percentage || 0,
              danger_level: student.danger_level || 0
            }

            const existing = studentsById.get(student.id)
            if (!existing) {
              studentsById.set(student.id, candidate)
              return
            }

            const existingAvg = Number(existing.average_score || 0)
            const candidateAvg = Number(candidate.average_score || 0)
            const shouldReplace = candidateAvg > existingAvg

            if (shouldReplace) {
              studentsById.set(student.id, candidate)
            }
          })
        })
      }

      setStudents(Array.from(studentsById.values()))
    } catch (error: any) {
      const normalized = error && error.isApiError ? error : handleApiError(error)
      if (normalized.status === 404) {
        setStudents([])
      } else {
        toast.error(normalized.message || 'Не удалось загрузить данные студентов')
      }
    } finally {
      setLoading(false)
    }
  }

  const filterStudents = () => {
    let filtered = students

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((student) => student.name.toLowerCase().includes(query) || (student.email && student.email.toLowerCase().includes(query)))
    }

    if (selectedGrade !== 'all') {
      filtered = filtered.filter((student) => String(student.grade_id) === selectedGrade)
    } else if (selectedParallel !== 'all') {
      filtered = filtered.filter((student) => student.grade_info && student.grade_info.grade.startsWith(selectedParallel))
    }

    if (selectedDangerLevel !== 'all') {
      const dangerLevel = parseInt(selectedDangerLevel)
      filtered = filtered.filter((student) => student.danger_level === dangerLevel)
    }

    setFilteredStudents(filtered)
  }

  const handleViewProfile = useCallback((studentId: number) => {
    router.push(`/dashboard/students/${studentId}`)
  }, [router])

  const handleOpenBulkUpload = () => {
    if (isUploadingStudents) return
    bulkUploadInputRef.current?.click()
  }

  const handleBulkUploadStudents = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      toast.error('Загрузите Excel файл формата .xlsx или .xls')
      return
    }

    try {
      setIsUploadingStudents(true)
      const result = await api.bulkUploadStudents(file)
      const successMessage = `Импорт завершен: добавлено ${result.created_count}, обновлено ${result.updated_count}, пропущено ${result.skipped_count}`
      if (result.error_count > 0) {
        toast.warning(`${successMessage}. Ошибок: ${result.error_count}`)
      } else {
        toast.success(successMessage)
      }
      await fetchData()
    } catch (error: any) {
      const normalized = error && error.isApiError ? error : handleApiError(error)
      toast.error(normalized.message || 'Не удалось выполнить bulk upload учащихся')
    } finally {
      setIsUploadingStudents(false)
    }
  }

  const handleToggleStudentSelection = useCallback((studentId: number, checked: boolean) => {
    if (checked) {
      setSelectedStudentIds((previous) => [...previous, studentId])
      return
    }
    setSelectedStudentIds((previous) => previous.filter((id) => id !== studentId))
  }, [])

  const handleToggleSelectAllFiltered = (checked: boolean) => {
    if (!checked) {
      const filteredIds = new Set(filteredStudents.map((student) => student.id))
      setSelectedStudentIds((previous) => previous.filter((id) => !filteredIds.has(id)))
      return
    }

    const merged = new Set(selectedStudentIds)
    filteredStudents.forEach((student) => merged.add(student.id))
    setSelectedStudentIds(Array.from(merged))
  }

  const openCreateDialog = useCallback(() => {
    setStudentForm({ name: '', email: '', grade_id: '' })
    setCreateParallel('none')
    setIsCreateDialogOpen(true)
  }, [])

  const openEditDialog = useCallback((student: StudentWithGrade) => {
    const studentGrade = uniqueGrades.find((grade) => grade.id === student.grade_id)
    const parallelKey = studentGrade ? getGradeParallelKey(studentGrade) : 'none'
    setEditingStudent(student)
    setStudentForm({
      name: student.name || '',
      email: student.email || '',
      grade_id: student.grade_id ? String(student.grade_id) : ''
    })
    setEditParallel(parallelKey || 'none')
    setIsEditDialogOpen(true)
  }, [uniqueGrades])

  const handleCreateStudent = async () => {
    if (!studentForm.name.trim() || !studentForm.grade_id) {
      toast.error('Укажите ФИО и класс')
      return
    }

    try {
      await api.createStudent({
        name: studentForm.name.trim(),
        email: studentForm.email.trim() || undefined,
        grade_id: parseInt(studentForm.grade_id)
      })
      toast.success('Ученик добавлен')
      setIsCreateDialogOpen(false)
      await fetchData()
    } catch (error: any) {
      const normalized = error && error.isApiError ? error : handleApiError(error)
      toast.error(normalized.message || 'Не удалось добавить ученика')
    }
  }

  const handleUpdateStudent = async () => {
    if (!editingStudent) return
    if (!studentForm.name.trim() || !studentForm.grade_id) {
      toast.error('Укажите ФИО и класс')
      return
    }

    try {
      await api.updateStudent(editingStudent.id, {
        name: studentForm.name.trim(),
        email: studentForm.email.trim() || undefined,
        grade_id: parseInt(studentForm.grade_id)
      })
      toast.success('Данные ученика обновлены')
      setIsEditDialogOpen(false)
      setEditingStudent(null)
      await fetchData()
    } catch (error: any) {
      const normalized = error && error.isApiError ? error : handleApiError(error)
      toast.error(normalized.message || 'Не удалось обновить ученика')
    }
  }

  const handleDeleteStudent = useCallback(async (studentId: number) => {
    const isConfirmed = window.confirm('Удалить ученика? Это действие нельзя отменить')
    if (!isConfirmed) return

    try {
      await api.deleteStudent(studentId)
      toast.success('Ученик удален')
      setSelectedStudentIds((previous) => previous.filter((id) => id !== studentId))
      await fetchData()
    } catch (error: any) {
      const normalized = error && error.isApiError ? error : handleApiError(error)
      toast.error(normalized.message || 'Не удалось удалить ученика')
    }
  }, [])

  const handleBulkDelete = async () => {
    if (selectedStudentIds.length === 0) return
    const isConfirmed = window.confirm(`Удалить выбранных учеников: ${selectedStudentIds.length}?`)
    if (!isConfirmed) return

    try {
      setIsBulkProcessing(true)
      const results = await Promise.allSettled(selectedStudentIds.map((id) => api.deleteStudent(id)))
      const failedCount = results.filter((result) => result.status === 'rejected').length
      const deletedCount = results.length - failedCount
      if (deletedCount > 0) toast.success(`Удалено: ${deletedCount}`)
      if (failedCount > 0) toast.warning(`Не удалось удалить: ${failedCount}`)
      setSelectedStudentIds([])
      await fetchData()
    } finally {
      setIsBulkProcessing(false)
    }
  }

  const handleBulkMoveToGrade = async () => {
    if (selectedStudentIds.length === 0 || bulkTargetParallel === 'none' || bulkTargetGradeId === 'none') {
      toast.error('Выберите учеников, параллель и класс для переноса')
      return
    }

    try {
      setIsBulkProcessing(true)
      const targetGradeId = parseInt(bulkTargetGradeId)
      const results = await Promise.allSettled(
        selectedStudentIds.map((id) =>
          api.updateStudent(id, {
            grade_id: targetGradeId
          })
        )
      )
      const failedCount = results.filter((result) => result.status === 'rejected').length
      const updatedCount = results.length - failedCount
      if (updatedCount > 0) toast.success(`Перенесено в класс: ${updatedCount}`)
      if (failedCount > 0) toast.warning(`Не удалось перенести: ${failedCount}`)
      setSelectedStudentIds([])
      setBulkTargetParallel('none')
      setBulkTargetGradeId('none')
      await fetchData()
    } finally {
      setIsBulkProcessing(false)
    }
  }

  if (loading) {
    return (
      <PageContainer scrollable>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer scrollable>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Студенты</h1>
            <p className="text-muted-foreground">Управление профилями студентов и их успеваемостью</p>
          </div>
          <div className="flex items-center gap-2">
            <input ref={bulkUploadInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleBulkUploadStudents} />
            {isAdmin && (
              <Button variant="default" onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Добавить ученика
              </Button>
            )}
            <Button variant="outline" onClick={handleOpenBulkUpload} disabled={isUploadingStudents}>
              <Upload className="mr-2 h-4 w-4" />
              {isUploadingStudents ? 'Загрузка...' : 'Bulk upload Excel'}
            </Button>
            <Badge variant="outline" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Всего: {students.length}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((level) => {
            const count = students.filter((student) => student.danger_level === level).length
            return (
              <Card key={level}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{DANGER_LEVEL_NAMES[level as keyof typeof DANGER_LEVEL_NAMES]} риск</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{count}</div>
                  <p className="text-xs text-muted-foreground">{students.length > 0 ? Math.round((count / students.length) * 100) : 0}% от общего числа</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Фильтры
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Поиск</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Поиск по имени, email..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-10" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Параллель</Label>
                <Select
                  value={selectedParallel}
                  onValueChange={(value) => {
                    setSelectedParallel(value)
                    setSelectedGrade('all')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Все параллели" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все параллели</SelectItem>
                    {parallels.map((parallel) => (
                      <SelectItem key={parallel!} value={parallel!}>
                        {parallel} классы
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Класс</Label>
                <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите класс" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все классы</SelectItem>
                    {filteredGrades.map((grade) => (
                      <SelectItem key={grade.id} value={String(grade.id)}>
                        {getGradeDisplayName(grade)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Уровень риска</Label>
                <Select value={selectedDangerLevel} onValueChange={setSelectedDangerLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите уровень" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все уровни</SelectItem>
                    {[0, 1, 2, 3].map((level) => (
                      <SelectItem key={level} value={level.toString()}>
                        {DANGER_LEVEL_NAMES[level as keyof typeof DANGER_LEVEL_NAMES]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Массовые действия</CardTitle>
              <CardDescription>Отметьте нескольких учеников и примените действие ко всем выбранным</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary">Выбрано: {selectedStudentIds.length}</Badge>
                <Button variant="destructive" disabled={selectedStudentIds.length === 0 || isBulkProcessing} onClick={handleBulkDelete}>
                  Удалить выбранных
                </Button>
                <Select
                  value={bulkTargetParallel}
                  onValueChange={(value) => {
                    setBulkTargetParallel(value)
                    setBulkTargetGradeId('none')
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Параллель" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Параллель</SelectItem>
                    {parallels.map((parallel) => (
                      <SelectItem key={parallel!} value={parallel!}>
                        {parallel} класс
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={bulkTargetGradeId} onValueChange={setBulkTargetGradeId}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Перенести в класс" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Выберите класс</SelectItem>
                    {bulkParallelGrades.map((grade) => (
                      <SelectItem key={grade.id} value={String(grade.id)}>
                        {getGradeDisplayName(grade)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  disabled={selectedStudentIds.length === 0 || bulkTargetParallel === 'none' || bulkTargetGradeId === 'none' || isBulkProcessing}
                  onClick={handleBulkMoveToGrade}
                >
                  Перенести выбранных
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Список студентов ({filteredStudents.length})
            </CardTitle>
            <CardDescription>
              {isAdmin ? 'Вы можете выделять нескольких учеников и управлять ими массово' : 'Нажмите на ученика для просмотра профиля'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredStudents.length === 0 ? (
              <div className="py-8 text-center">
                <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-medium">Студенты не найдены</h3>
                <p className="text-muted-foreground">Попробуйте изменить фильтры или критерии поиска</p>
              </div>
            ) : (
              <div className="space-y-3">
                {isAdmin && (
                  <div className="flex items-center gap-3 rounded border p-3">
                    <Checkbox checked={isAllFilteredSelected} onCheckedChange={(value) => handleToggleSelectAllFiltered(Boolean(value))} />
                    <span className="text-sm text-muted-foreground">Выбрать всех в текущем фильтре</span>
                  </div>
                )}

                {filteredStudents.map((student) => (
                  <StudentListRow
                    key={student.id}
                    student={student}
                    isAdmin={isAdmin}
                    isSelected={selectedStudentIdSet.has(student.id)}
                    dangerClassName={DANGER_LEVEL_COLORS[student.danger_level as keyof typeof DANGER_LEVEL_COLORS]}
                    dangerLabel={DANGER_LEVEL_NAMES[student.danger_level as keyof typeof DANGER_LEVEL_NAMES]}
                    gradeLabel={student.grade_info ? getGradeDisplayName(student.grade_info) : '-'}
                    onViewProfile={handleViewProfile}
                    onToggleSelect={handleToggleStudentSelection}
                    onEdit={openEditDialog}
                    onDelete={handleDeleteStudent}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить ученика</DialogTitle>
            <DialogDescription>Создайте нового ученика и сразу назначьте класс</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ФИО</Label>
              <Input value={studentForm.name} onChange={(event) => setStudentForm((previous) => ({ ...previous, name: event.target.value }))} placeholder="Введите ФИО" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={studentForm.email} onChange={(event) => setStudentForm((previous) => ({ ...previous, email: event.target.value }))} placeholder="student@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Параллель</Label>
              <Select
                value={createParallel}
                onValueChange={(value) => {
                  setCreateParallel(value)
                  setStudentForm((previous) => ({ ...previous, grade_id: '' }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите параллель" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Выберите параллель</SelectItem>
                  {parallels.map((parallel) => (
                    <SelectItem key={parallel!} value={parallel!}>
                      {parallel} класс
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Класс</Label>
              <Select value={studentForm.grade_id || 'none'} onValueChange={(value) => setStudentForm((previous) => ({ ...previous, grade_id: value === 'none' ? '' : value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите класс" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Выберите класс</SelectItem>
                  {createParallelGrades.map((grade) => (
                    <SelectItem key={grade.id} value={String(grade.id)}>
                      {getGradeDisplayName(grade)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreateStudent}>Добавить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать ученика</DialogTitle>
            <DialogDescription>Измените данные ученика, включая перевод в другой класс</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ФИО</Label>
              <Input value={studentForm.name} onChange={(event) => setStudentForm((previous) => ({ ...previous, name: event.target.value }))} placeholder="Введите ФИО" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={studentForm.email} onChange={(event) => setStudentForm((previous) => ({ ...previous, email: event.target.value }))} placeholder="student@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Параллель</Label>
              <Select
                value={editParallel}
                onValueChange={(value) => {
                  setEditParallel(value)
                  setStudentForm((previous) => ({ ...previous, grade_id: '' }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите параллель" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Выберите параллель</SelectItem>
                  {parallels.map((parallel) => (
                    <SelectItem key={parallel!} value={parallel!}>
                      {parallel} класс
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Класс</Label>
              <Select value={studentForm.grade_id || 'none'} onValueChange={(value) => setStudentForm((previous) => ({ ...previous, grade_id: value === 'none' ? '' : value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите класс" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Выберите класс</SelectItem>
                  {editParallelGrades.map((grade) => (
                    <SelectItem key={grade.id} value={String(grade.id)}>
                      {getGradeDisplayName(grade)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleUpdateStudent}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}



