import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import quarterOfYear from 'dayjs/plugin/quarterOfYear'

dayjs.extend(isoWeek)
dayjs.extend(quarterOfYear)

export type ViewMode = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'

export const COLUMN_WIDTHS: Record<ViewMode, number> = {
  hour: 80,
  day: 72,
  week: 120,
  month: 140,
  quarter: 180,
  year: 220,
}

export function getColumnWidth(mode: ViewMode): number {
  return COLUMN_WIDTHS[mode]
}

export function getTimelineColumns(start: string, end: string, mode: ViewMode): dayjs.Dayjs[] {
  const cols: dayjs.Dayjs[] = []
  let current = dayjs(start)
  const endDate = dayjs(end)

  if (mode === 'hour') {
    current = current.startOf('day')
    while (current.isBefore(endDate) || current.isSame(endDate, 'hour')) {
      cols.push(current)
      current = current.add(1, 'hour')
    }
  } else if (mode === 'day') {
    current = current.startOf('day')
    while (current.isBefore(endDate) || current.isSame(endDate, 'day')) {
      cols.push(current)
      current = current.add(1, 'day')
    }
  } else if (mode === 'week') {
    current = current.startOf('isoWeek')
    while (current.isBefore(endDate) || current.isSame(endDate, 'day')) {
      cols.push(current)
      current = current.add(1, 'week')
    }
  } else if (mode === 'month') {
    current = current.startOf('month')
    while (current.isBefore(endDate) || current.isSame(endDate, 'month')) {
      cols.push(current)
      current = current.add(1, 'month')
    }
  } else if (mode === 'quarter') {
    current = current.startOf('quarter')
    while (current.isBefore(endDate) || current.isSame(endDate, 'quarter')) {
      cols.push(current)
      current = current.add(1, 'quarter')
    }
  } else if (mode === 'year') {
    current = current.startOf('year')
    while (current.isBefore(endDate) || current.isSame(endDate, 'year')) {
      cols.push(current)
      current = current.add(1, 'year')
    }
  }

  return cols
}

export function getDateOffset(date: string, timelineStart: string, mode: ViewMode): number {
  const colWidth = getColumnWidth(mode)
  const dDate = dayjs(date)
  const dStart = dayjs(timelineStart)

  if (mode === 'hour') {
    return dDate.diff(dStart.startOf('day'), 'hour', true) * colWidth
  } else if (mode === 'day') {
    return dDate.diff(dStart.startOf('day'), 'day', true) * colWidth
  } else if (mode === 'week') {
    return (dDate.diff(dStart.startOf('isoWeek'), 'day', true) / 7) * colWidth
  } else if (mode === 'month') {
    const months = dDate.diff(dStart.startOf('month'), 'month')
    const startOfMonth = dStart.startOf('month').add(months, 'month')
    const daysInMonth = startOfMonth.daysInMonth()
    const extraDays = dDate.diff(startOfMonth, 'day', true)
    return (months + extraDays / daysInMonth) * colWidth
  } else if (mode === 'quarter') {
    const quarters = dDate.diff(dStart.startOf('quarter'), 'quarter')
    const startOfQuarter = dStart.startOf('quarter').add(quarters, 'quarter')
    const daysInQuarter = startOfQuarter.add(1, 'quarter').diff(startOfQuarter, 'day')
    const extraDays = dDate.diff(startOfQuarter, 'day', true)
    return (quarters + extraDays / daysInQuarter) * colWidth
  } else if (mode === 'year') {
    const years = dDate.diff(dStart.startOf('year'), 'year')
    const startOfYear = dStart.startOf('year').add(years, 'year')
    const daysInYear = startOfYear.add(1, 'year').diff(startOfYear, 'day')
    const extraDays = dDate.diff(startOfYear, 'day', true)
    return (years + extraDays / daysInYear) * colWidth
  }
  return 0
}

export function getTaskWidth(startDate: string, endDate: string, mode: ViewMode): number {
  // endDate is an exact datetime now, so we don't need to add 1 day if it's a timestamp.
  // BUT if a user creates a task that is "YYYY-MM-DD" without time, or start and end are exactly identical, we still want it to show up.
  const isSameTime = dayjs(startDate).isSame(dayjs(endDate))
  
  // If they are exactly the same, let's treat it as taking 1 hour visually or minimum width
  let actualEnd = endDate
  if (isSameTime) {
      actualEnd = dayjs(endDate).add(1, 'hour').format('YYYY-MM-DDTHH:mm')
  }

  const startOffset = getDateOffset(startDate, startDate, mode) 
  const endOffset = getDateOffset(actualEnd, startDate, mode)
  
  return Math.max(endOffset - startOffset, getColumnWidth(mode) / 4)
}

export function isWeekend(date: dayjs.Dayjs): boolean {
  const day = date.day()
  return day === 0 || day === 6
}

export function isToday(date: dayjs.Dayjs): boolean {
  return date.isSame(dayjs(), 'day')
}

export function formatDate(date: string | dayjs.Dayjs, format = 'YYYY-MM-DD'): string {
  return dayjs(date).format(format)
}
