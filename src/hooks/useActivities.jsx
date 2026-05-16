import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { useAuth } from './useAuth'
import { useOnlineStatus } from './useOnlineStatus'
import { useOfflineQueue } from './useOfflineQueue'
import { toDateString } from '../utils/dates'
import { friendlyError } from '../utils/errors'

export function useActivities() {
  const { user, selectedProfile, familyMembers } = useAuth()
  const isOnline = useOnlineStatus()
  const { queueCount, enqueue, replay } = useOfflineQueue(isOnline)
  const [today, setToday] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDate, setSelectedDate] = useState(toDateString(new Date()))

  const todayStr = toDateString(new Date())
  const minDate = toDateString(new Date(Date.now() - 3 * 86400000))

  const fetchDay = useCallback(async (date) => {
    if (!user) return null
    let query = supabase
      .from('activities')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)

    if (selectedProfile) {
      query = query.eq('profile_for', selectedProfile.id)
    } else {
      query = query.is('profile_for', null)
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      setError(friendlyError(error))
      return null
    }

    if (!data) {
      return {
        morning: { done: false },
        afternoon: { done: false },
        evening: { done: false },
      }
    }

    return {
      morning: { done: data.morning_done ?? false },
      afternoon: { done: data.afternoon_done ?? false },
      evening: { done: data.evening_done ?? false },
    }
  }, [user, selectedProfile])

  const fetchHistory = useCallback(async () => {
    if (!user) return []
    let query = supabase
      .from('activities')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(90)

    if (selectedProfile) {
      query = query.eq('profile_for', selectedProfile.id)
    } else {
      query = query.is('profile_for', null)
    }

    const { data, error } = await query

    if (error) {
      setError(friendlyError(error))
      return []
    }

    return (data || []).map((row) => ({
      id: row.id,
      date: row.date,
      profile_for: row.profile_for,
      morning: { done: row.morning_done ?? false },
      afternoon: { done: row.afternoon_done ?? false },
      evening: { done: row.evening_done ?? false },
    }))
  }, [user, selectedProfile])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    setError('')
    Promise.all([fetchDay(selectedDate), fetchHistory()]).then(([dayData, historyData]) => {
      setToday(dayData)
      setHistory(historyData)
      setLoading(false)
    }).catch((err) => {
      setError(friendlyError(err))
      setLoading(false)
    })
  }, [user, selectedProfile, selectedDate, fetchDay, fetchHistory])

  const logAction = async (slot, action) => {
    const field = `${slot}_done`
    const profileFor = selectedProfile ? selectedProfile.id : null
    const value = action === 'done'

    // Optimistic update: immediately update local state
    setToday((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        [slot]: { done: value },
      }
    })

    // Also update history optimistically
    setHistory((prev) => {
      const existingIndex = prev.findIndex(
        (r) => r.date === selectedDate && (r.profile_for === profileFor || (!r.profile_for && !profileFor))
      )
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          [slot]: { done: value },
        }
        return updated
      }
      return prev
    })

    if (!isOnline) {
      // Queue for later replay
      enqueue({
        userId: user.id,
        date: selectedDate,
        profileFor,
        slot,
        action,
        value,
      })
      return
    }

    // Online: fire and forget, then refetch to confirm
    const { error } = await supabase
      .from('activities')
      .upsert(
        {
          user_id: user.id,
          date: selectedDate,
          profile_for: profileFor,
          [field]: value,
        },
        {
          onConflict: 'user_id,date,profile_for_key',
        }
      )

    if (error) {
      // Revert optimistic update on error
      setError(friendlyError(error))
      const newToday = await fetchDay(selectedDate)
      setToday(newToday)
      const newHistory = await fetchHistory()
      setHistory(newHistory)
      return
    }

    setError('')

    // Refetch to confirm server state
    const newToday = await fetchDay(selectedDate)
    setToday(newToday)
    const newHistory = await fetchHistory()
    setHistory(newHistory)
  }

  const navigateDate = (delta) => {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + delta)
    const newDate = toDateString(d)
    if (newDate < minDate || newDate > todayStr) return
    setSelectedDate(newDate)
  }

  const goToToday = () => setSelectedDate(todayStr)

  const isToday = selectedDate === todayStr
  const isPastDate = selectedDate < todayStr

  return {
    today, history, loading, error, logAction,
    selectedDate, navigateDate, goToToday,
    isToday, isPastDate, canGoBack: selectedDate > minDate,
    canGoForward: selectedDate < todayStr,
    queueCount, isOnline,
  }
}