import { useCallback } from 'react'
import dayjs from 'dayjs'

export function useDayJs() {
  const formatDateTime = useCallback((value?: string) => {
    if (!value) {
      return ''
    }

    const parsed = dayjs(value)

    if (!parsed.isValid()) {
      return value
    }

    const now = dayjs()

    if (parsed.isSame(now, 'day')) {
      return parsed.format('HH:mm')
    }

    if (parsed.isSame(now, 'year')) {
      return parsed.format('MM-DD HH:mm')
    }

    return parsed.format('YYYY-MM-DD HH:mm')
  }, [])

  return {
    dayjs,
    formatDateTime,
  }
}
