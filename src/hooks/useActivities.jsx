import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { useAuth } from './useAuth'
import { toDateString } from '../utils/dates'

export function useActivities() {
  const { user } = useAuth()
  const [today, setToday] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDate, setSelectedDate] = useState(toDateString(new Date()))

  const todayStr = toDateString(new Date())
  const minDate = toDateString(new Date(Date.now() - 7 * 86400000))

  const fetchDay = useCallback(async (date) => {
    if (!user) return null
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .single()

    if (error && error.code !== 'PGRST116') {
      setError('Failed to load activity data. Please try again.')
      return null
    }

    if (!data) {
      return {
        morning: { done: false, gaayatri: 0 },
        afternoon: { done: false, gaayatri: 0 },
        evening: { done: false, gaayatri: 0 },
      }
    }

    return {
      morning: { done: data.morning_done ?? false, gaayatri: data.morning_gaayatri ?? 0 },
      afternoon: { done: data.afternoon_done ?? false, gaayatri: data.afternoon_gaayatri ?? 0 },
      evening: { done: data.evening_done ?? false, gaayatri: data.evening_gaayatri ?? 0 },
    }
  }, [user])

  const fetchHistory = useCallback(async () => {
    if (!user) return []
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(90)

    if (error) {
      setError('Failed to load history. Please try again.')
      return []
    }

    return (data || []).map((row) => ({
      id: row.id,
      date: row.date,
      morning: { done: row.morning_done ?? false, gaayatri: row.morning_gaayatri ?? 0 },
      afternoon: { done: row.afternoon_done ?? false, gaayatri: row.afternoon_gaayatri ?? 0 },
      evening: { done: row.evening_done ?? false, gaayatri: row.evening_gaayatri ?? 0 },
    }))
  }, [user])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    setError('')
    Promise.all([fetchDay(selectedDate), fetchHistory()]).then(([dayData, historyData]) => {
      setToday(dayData)
      setHistory(historyData)
      setLoading(false)
    })
  }, [user, selectedDate]) // eslint-disable-line react-hooks/exhaustive-deps

  const logAction = async (slot, action, profileFor = null) => {
    const field = `${slot}_done`
    const gaayatriField = `${slot}_gaayatri`

    let update
    if (action === 'done') {
      update = { [field]: true }
    } else if (action === 'undone') {
      update = { [field]: false }
    } else if (action === 'gaayatri_increment') {
      const current = today?.[slot]?.gaayatri ?? 0
      update = { [gaayatriField]: current + 1 }
    } else if (action === 'gaayatri_decrement') {
      const current = today?.[slot]?.gaayatri ?? 0
      update = { [gaayatriField]: Math.max(0, current - 1) }
    }

    const payload = {
      user_id: user.id,
      date: selectedDate,
      profile_for: profileFor,
      ...update,
    }

    let query = supabase.from('activities')
    if (profileFor) {
      // Family member activity: find existing or insert
      const { data: existing } = await supabase
        .from('activities')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', selectedDate)
        .eq('profile_for', profileFor)
        .maybeSingle()

      if (existing) {
        query = supabase.from('activities').update(update).eq('id', existing.id)
      } else {
        query = supabase.from('activities').insert(payload)
      }
    } else {
      // Self activity
      query = supabase.from('activities').upsert(payload, { onConflict: 'user_id,date', ignoreDuplicates: false })
    }

    const { error } = await query
    if (error) {
      setError('Failed to save your entry. Please try again.')
      return
    }
    setError('')

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
  }
}