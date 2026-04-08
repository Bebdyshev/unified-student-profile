export type TeacherAssignmentRow = {
  id: number
  teacher_id: number
  subject_id: number
  grade_id: number | null
  subgroup_id: number | null
  teacher_name: string
  subject_name: string
  grade_name: string | null
  subgroup_name: string | null
  /** Справочник предметов: разрешены предметные группы 11–12 */
  subject_allows_subject_groups?: boolean
}

export type AssignmentRowView = {
  assignmentId: number
  subjectId: number
  subjectName: string
  subgroup?: string
}

export type GroupedAssignmentsByGrade = {
  gradeId: number
  gradeName: string
  rows: AssignmentRowView[]
}

const rowKey = (a: TeacherAssignmentRow) =>
  `${a.subject_id}-${a.subgroup_id ?? 'none'}`

/** Group assignments that have a grade; dedupe by subject + subgroup within each grade */
export const groupTeacherAssignmentsByGrade = (
  assignments: TeacherAssignmentRow[]
): GroupedAssignmentsByGrade[] => {
  const acc = new Map<
    number,
    { gradeName: string; seen: Set<string>; rows: AssignmentRowView[] }
  >()

  for (const a of assignments) {
    if (a.grade_id == null || !a.grade_name) continue
    const k = rowKey(a)
    let bucket = acc.get(a.grade_id)
    if (!bucket) {
      bucket = { gradeName: a.grade_name, seen: new Set(), rows: [] }
      acc.set(a.grade_id, bucket)
    }
    if (bucket.seen.has(k)) continue
    bucket.seen.add(k)
    bucket.rows.push({
      assignmentId: a.id,
      subjectId: a.subject_id,
      subjectName: a.subject_name,
      subgroup: a.subgroup_name ?? undefined
    })
  }

  return Array.from(acc.entries())
    .map(([gradeId, { gradeName, rows }]) => ({
      gradeId,
      gradeName,
      rows
    }))
    .sort((a, b) => a.gradeName.localeCompare(b.gradeName, 'ru', { numeric: true }))
}

/** Assignments without a specific class (school-wide subject, etc.) */
export const unassignedTeacherAssignments = (
  assignments: TeacherAssignmentRow[]
): AssignmentRowView[] => {
  const seen = new Set<string>()
  const out: AssignmentRowView[] = []
  for (const a of assignments) {
    if (a.grade_id != null) continue
    const k = rowKey(a)
    if (seen.has(k)) continue
    seen.add(k)
    out.push({
      assignmentId: a.id,
      subjectId: a.subject_id,
      subjectName: a.subject_name,
      subgroup: a.subgroup_name ?? undefined
    })
  }
  return out
}

/** Unique subject names from assignments (for analytics filters) */
export const subjectNamesFromAssignments = (
  assignments: TeacherAssignmentRow[]
): string[] => {
  const names = new Set<string>()
  for (const a of assignments) {
    if (a.subject_name) names.add(a.subject_name)
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b, 'ru'))
}
