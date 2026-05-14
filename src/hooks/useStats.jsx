import { useMemo } from 'react'
import { SLOTS } from '../utils/slots'

export function useStats(history) {
  return useMemo(() => {
    if (!history || history.length === 0) {
      return {
        daysTracked: 0,
        perfectDays: 0,
        slotConsistency: {},
        overallConsistency: 0,
      }
    }

    const daysTracked = history.length
    const perfectDays = history.filter(
      (r) => r.morning.done && r.afternoon.done && r.evening.done
    ).length

    const slotConsistency = {}
    SLOTS.forEach(({ key }) => {
      const doneCount = history.filter((r) => r[key]?.done).length
      slotConsistency[key] = daysTracked > 0 ? Math.round((doneCount / daysTracked) * 100) : 0
    })

    const totalSlots = daysTracked * 3
    const totalDone = history.reduce(
      (sum, r) => sum + (r.morning.done ? 1 : 0) + (r.afternoon.done ? 1 : 0) + (r.evening.done ? 1 : 0),
      0
    )
    const overallConsistency = totalSlots > 0 ? Math.round((totalDone / totalSlots) * 100) : 0

    return { daysTracked, perfectDays, slotConsistency, overallConsistency }
  }, [history])
}