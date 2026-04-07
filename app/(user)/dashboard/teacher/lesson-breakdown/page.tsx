'use client'

import { useMemo, useState } from 'react'
import PageContainer from '@/components/layout/page-container'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'react-toastify'
import { Copy, Plus, Trash2 } from 'lucide-react'

type PeriodType = 'first-half' | 'second-half'

type BreakdownRow = {
  id: string
  groupName: string
  lessonsCount: number
  amount: number
  lessonDatesText: string
  startDateText: string
  endDateText: string
}

const DEFAULT_TELEGRAM_CONTACT = '@gauhar107'
const DEFAULT_PHONE_CONTACT = '+7 705 893 00 24'

const formatMoney = (amount: number): string => {
  return `${new Intl.NumberFormat('ru-RU').format(amount)} тг`
}

const formatDateToRuLong = (rawDate: string): string => {
  if (!rawDate) return ''
  const date = new Date(`${rawDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  const day = new Intl.DateTimeFormat('ru-RU', { day: 'numeric' }).format(date)
  const month = new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(date)
  const year = new Intl.DateTimeFormat('ru-RU', { year: 'numeric' }).format(date)
  return `${day} ${month} ${year}`
}

const createEmptyRow = (): BreakdownRow => ({
  id: crypto.randomUUID(),
  groupName: '',
  lessonsCount: 0,
  amount: 0,
  lessonDatesText: '',
  startDateText: '',
  endDateText: ''
})

export default function TeacherLessonBreakdownPage() {
  const [periodType, setPeriodType] = useState<PeriodType>('second-half')
  const [periodDate, setPeriodDate] = useState<string>('')
  const [rows, setRows] = useState<BreakdownRow[]>([createEmptyRow()])
  const [telegramContact, setTelegramContact] = useState<string>(DEFAULT_TELEGRAM_CONTACT)
  const [phoneContact, setPhoneContact] = useState<string>(DEFAULT_PHONE_CONTACT)

  const totalAmount = useMemo(
    () => rows.reduce((sum, row) => sum + (Number.isFinite(row.amount) ? row.amount : 0), 0),
    [rows]
  )

  const salaryDateLabel = useMemo(() => {
    return formatDateToRuLong(periodDate)
  }, [periodDate])

  const periodLabel = periodType === 'first-half' ? 'с 1 по 15 число месяца' : 'с 16 числа по конец месяца'

  const generatedText = useMemo(() => {
    if (!salaryDateLabel) return ''

    const lines: string[] = []
    lines.push('Здравствуйте!')
    lines.push(`Зарплата за ${periodLabel} на ${salaryDateLabel}:`)
    lines.push('')

    rows.forEach((row, index) => {
      const itemTitle = `${index + 1}. ${row.groupName || 'Без названия'} — ${row.lessonsCount || 0} уроков`
      lines.push(itemTitle)
      lines.push(formatMoney(row.amount || 0))
      lines.push(`(${row.lessonDatesText || '-'})`)
      lines.push(`старт ${row.startDateText || '-'} — финиш ${row.endDateText || '-'}`)
      lines.push('')
    })

    const sumExpression = rows.map((row) => String(row.amount || 0)).join('+') || '0'
    lines.push(`Итого: ${sumExpression} = ${formatMoney(totalAmount)}`)
    lines.push('')
    lines.push(`Для отправки в Telegram: ${telegramContact || '-'} и ${phoneContact || '-'}`)

    return lines.join('\n')
  }, [periodLabel, salaryDateLabel, rows, totalAmount, telegramContact, phoneContact])

  const handleRowChange = <K extends keyof BreakdownRow>(id: string, key: K, value: BreakdownRow[K]) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row
        return { ...row, [key]: value }
      })
    )
  }

  const handleAddRow = () => {
    setRows((prev) => [...prev, createEmptyRow()])
  }

  const handleDeleteRow = (id: string) => {
    if (rows.length === 1) {
      toast.info('Должна остаться хотя бы одна строка')
      return
    }
    setRows((prev) => prev.filter((row) => row.id !== id))
  }

  const handleCopy = async () => {
    if (!generatedText) {
      toast.error('Сначала выберите дату и заполните данные')
      return
    }

    try {
      await navigator.clipboard.writeText(generatedText)
      toast.success('Текст расшифровки скопирован')
    } catch {
      toast.error('Не удалось скопировать текст')
    }
  }

  return (
    <PageContainer scrollable>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold">Расшифровка по урокам</h1>
          <p className="text-sm text-muted-foreground">
            Сформируйте текст по шаблону для Telegram по интервалам 1-15 и 16-конец месяца
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Параметры периода</CardTitle>
            <CardDescription>Выберите интервал расчета и дату, на которую формируется зарплата</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Интервал</Label>
              <Select value={periodType} onValueChange={(value) => setPeriodType(value as PeriodType)}>
                <SelectTrigger aria-label="Выберите интервал">
                  <SelectValue placeholder="Выберите интервал" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first-half">1-полмесяца</SelectItem>
                  <SelectItem value="second-half">полмесяца-конец месяца</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary-date">Дата зарплаты</Label>
              <Input
                id="salary-date"
                type="date"
                value={periodDate}
                onChange={(event) => setPeriodDate(event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Позиции расшифровки</CardTitle>
            <CardDescription>Добавьте группы с количеством уроков, суммой, датами и периодом старта/финиша</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {rows.map((row) => (
              <div key={row.id} className="rounded-lg border p-4">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Название группы</Label>
                    <Input
                      value={row.groupName}
                      onChange={(event) => handleRowChange(row.id, 'groupName', event.target.value)}
                      placeholder="Например, SAT December 11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Количество уроков</Label>
                    <Input
                      type="number"
                      min={0}
                      value={row.lessonsCount}
                      onChange={(event) => handleRowChange(row.id, 'lessonsCount', Number(event.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Сумма (тг)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={row.amount}
                      onChange={(event) => handleRowChange(row.id, 'amount', Number(event.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2 lg:col-span-2">
                    <Label>Даты уроков</Label>
                    <Input
                      value={row.lessonDatesText}
                      onChange={(event) => handleRowChange(row.id, 'lessonDatesText', event.target.value)}
                      placeholder="17.02; 19.02; 21.02; 24.02; 26.02; 28.02"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Старт</Label>
                    <Input
                      value={row.startDateText}
                      onChange={(event) => handleRowChange(row.id, 'startDateText', event.target.value)}
                      placeholder="20.12.25"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Финиш</Label>
                    <Input
                      value={row.endDateText}
                      onChange={(event) => handleRowChange(row.id, 'endDateText', event.target.value)}
                      placeholder="12.03.26"
                    />
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button type="button" variant="ghost" onClick={() => handleDeleteRow(row.id)} className="gap-2 text-destructive">
                    <Trash2 className="h-4 w-4" />
                    Удалить
                  </Button>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={handleAddRow} className="gap-2">
              <Plus className="h-4 w-4" />
              Добавить позицию
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Контакты для Telegram</CardTitle>
            <CardDescription>Контакты будут добавлены в конец сформированного текста</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="telegram-contact">Telegram</Label>
              <Input
                id="telegram-contact"
                value={telegramContact}
                onChange={(event) => setTelegramContact(event.target.value)}
                placeholder="@gauhar107"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone-contact">Телефон</Label>
              <Input
                id="phone-contact"
                value={phoneContact}
                onChange={(event) => setPhoneContact(event.target.value)}
                placeholder="+7 705 893 00 24"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Готовый текст</CardTitle>
              <CardDescription>Проверьте текст и скопируйте для отправки</CardDescription>
            </div>
            <Button type="button" onClick={handleCopy} className="gap-2">
              <Copy className="h-4 w-4" />
              Скопировать
            </Button>
          </CardHeader>
          <CardContent>
            <Textarea
              value={generatedText}
              readOnly
              className="min-h-[320px] font-mono text-sm"
              placeholder="Здесь появится готовая расшифровка"
            />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
