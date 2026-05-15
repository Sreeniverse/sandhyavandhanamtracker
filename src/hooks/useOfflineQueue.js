import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabase'

const STORAGE_KEY = 'offlineQueue'

function loadQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveQueue(queue) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
}

export function useOfflineQueue(isOnline) {
  const [queue, setQueue] = useState(loadQueue)
  const replaying = useRef(false)

  const queueCount = queue.length

  const enqueue = useCallback((entry) => {
    setQueue((prev) => {
      const next = [...prev, { ...entry, id: crypto.randomUUID(), timestamp: Date.now() }]
      saveQueue(next)
      return next
    })
  }, [])

  const replay = useCallback(async () => {
    const current = loadQueue()
    if (current.length === 0 || replaying.current) return
    replaying.current = true

    const remaining = []

    for (const item of current) {
      try {
        const { error } = await supabase
          .from('activities')
          .upsert(
            {
              user_id: item.userId,
              date: item.date,
              profile_for: item.profileFor || null,
              [`${item.slot}_done`]: item.value,
            },
            {
              onConflict: 'user_id,date,profile_for_key',
            }
          )

        if (error) {
          remaining.push(item)
        }
      } catch {
        remaining.push(item)
      }
    }

    setQueue(remaining)
    saveQueue(remaining)
    replaying.current = false
    return remaining.length === 0
  }, [])

  // Auto-replay when coming back online
  useEffect(() => {
    if (isOnline && queue.length > 0) {
      replay()
    }
  }, [isOnline, queue.length, replay])

  return { queueCount, enqueue, replay }
}