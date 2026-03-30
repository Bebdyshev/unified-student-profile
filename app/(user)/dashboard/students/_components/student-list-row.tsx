'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Eye, GraduationCap, Pencil, Trash2, User } from 'lucide-react'
import type { Grade, Student } from '@/types'

interface StudentWithGrade extends Student {
  grade_info?: Grade
  average_score?: number
  danger_level?: number
}

interface StudentListRowProps {
  student: StudentWithGrade
  isAdmin: boolean
  isSelected: boolean
  dangerClassName: string
  dangerLabel: string
  gradeLabel: string
  onViewProfile: (studentId: number) => void
  onToggleSelect: (studentId: number, checked: boolean) => void
  onEdit: (student: StudentWithGrade) => void
  onDelete: (studentId: number) => void
}

const StudentListRowComponent = ({
  student,
  isAdmin,
  isSelected,
  dangerClassName,
  dangerLabel,
  gradeLabel,
  onViewProfile,
  onToggleSelect,
  onEdit,
  onDelete
}: StudentListRowProps) => {
  return (
    <div
      className="flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
      onClick={() => onViewProfile(student.id)}
    >
      <div className="flex items-center space-x-4">
        {isAdmin && (
          <div onClick={(event) => event.stopPropagation()}>
            <Checkbox checked={isSelected} onCheckedChange={(value) => onToggleSelect(student.id, Boolean(value))} />
          </div>
        )}
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h4 className="font-medium">{student.name}</h4>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {student.grade_info && (
              <span className="flex items-center gap-1">
                <GraduationCap className="h-3 w-3" />
                {gradeLabel}
              </span>
            )}
            {student.email && <span>• {student.email}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {student.average_score !== undefined && <Badge variant="outline">{student.average_score}% средний балл</Badge>}
        <Badge className={dangerClassName}>{dangerLabel}</Badge>
        {isAdmin && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={(event) => {
                event.stopPropagation()
                onEdit(student)
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(event) => {
                event.stopPropagation()
                onDelete(student.id)
              }}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </>
        )}
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export const StudentListRow = React.memo(StudentListRowComponent)
