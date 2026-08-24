const CURRENCY = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
})

export function parseTime(value) {
  const [hours = 0, minutes = 0] = String(value).split(':').map(Number)
  return hours * 60 + minutes
}

export function timeOnDate(date, value) {
  const result = new Date(date)
  const totalMinutes = parseTime(value)
  result.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0)
  return result
}

export function paidMinutesPerDay(settings) {
  const shift = parseTime(settings.endTime) - parseTime(settings.startTime)
  const lunch = Math.max(0, parseTime(settings.lunchEnd) - parseTime(settings.lunchStart))
  return Math.max(1, shift - lunch)
}

export function getRates(settings) {
  const baseSalary = Number(settings.monthlySalary)
  const displayedSalary = settings.displayBasis === 'net' ? baseSalary * 0.8 : baseSalary
  const daily = displayedSalary / Math.max(1, Number(settings.workdays))
  const hourly = daily / (paidMinutesPerDay(settings) / 60)
  return {
    daily,
    hourly,
    minute: hourly / 60,
    second: hourly / 3600,
  }
}

export function dateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isDefaultWorkday(date) {
  const day = date.getDay()
  return day !== 0 && day !== 6
}

export function isWorkday(date, attendance = {}) {
  const override = attendance[dateKey(date)]
  if (override === 'work') return true
  if (override === 'rest') return false
  return isDefaultWorkday(date)
}

export function getWorkSnapshot(now, settings, attendance = {}) {
  const start = timeOnDate(now, settings.startTime)
  const end = timeOnDate(now, settings.endTime)
  const lunchStart = timeOnDate(now, settings.lunchStart)
  const lunchEnd = timeOnDate(now, settings.lunchEnd)
  const workday = isWorkday(now, attendance)
  const totalPaidSeconds = paidMinutesPerDay(settings) * 60

  let paidSeconds = 0
  if (workday && now > start) {
    const firstBlockEnd = now < lunchStart ? now : lunchStart
    paidSeconds += Math.max(0, Math.floor((firstBlockEnd - start) / 1000))
    if (now > lunchEnd) {
      const secondBlockEnd = now < end ? now : end
      paidSeconds += Math.max(0, Math.floor((secondBlockEnd - lunchEnd) / 1000))
    }
  }
  paidSeconds = Math.min(totalPaidSeconds, paidSeconds)

  let status = '今日休息'
  let statusDetail = '今天不必为时间标价'
  let countdownSeconds = 0
  if (workday) {
    if (now < start) {
      status = '等待开工'
      statusDetail = '距离今天上班'
      countdownSeconds = Math.max(0, Math.floor((start - now) / 1000))
    } else if (now >= end) {
      status = '今日已下班'
      statusDetail = '今天的时间已经到账'
    } else if (now >= lunchStart && now < lunchEnd) {
      status = '午休进行中'
      statusDetail = '距离今天下班'
      countdownSeconds = Math.max(0, Math.floor((end - now) / 1000))
    } else {
      status = '工作计价中'
      statusDetail = '距离今天下班'
      countdownSeconds = Math.max(0, Math.floor((end - now) / 1000))
    }
  }

  return {
    status,
    statusDetail,
    workday,
    paidSeconds,
    totalPaidSeconds,
    progress: Math.min(100, Math.max(0, (paidSeconds / totalPaidSeconds) * 100)),
    countdownSeconds,
    earnings: paidSeconds * getRates(settings).second,
  }
}

export function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const hours = String(Math.floor(safeSeconds / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((safeSeconds % 3600) / 60)).padStart(2, '0')
  const seconds = String(safeSeconds % 60).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

export function formatMoney(value) {
  return CURRENCY.format(Number.isFinite(value) ? value : 0)
}

export function monthDays(year, month) {
  const days = []
  const first = new Date(year, month, 1)
  const leading = (first.getDay() + 6) % 7
  const count = new Date(year, month + 1, 0).getDate()
  for (let i = 0; i < leading; i += 1) days.push(null)
  for (let day = 1; day <= count; day += 1) days.push(new Date(year, month, day))
  while (days.length % 7 !== 0) days.push(null)
  return days
}

export function countWorkdays(year, month, attendance = {}, throughDate = null) {
  const count = new Date(year, month + 1, 0).getDate()
  let total = 0
  for (let day = 1; day <= count; day += 1) {
    const date = new Date(year, month, day)
    if (throughDate && date > throughDate) continue
    if (isWorkday(date, attendance)) total += 1
  }
  return total
}
