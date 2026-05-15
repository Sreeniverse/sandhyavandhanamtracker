import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { isNative, scheduleAllReminders, cancelAllReminders } from '../utils/notifications'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function isPushSupported() {
  return window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

async function setupWebPush(userId) {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) return
  try {
    const registration = await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }
    const sub = subscription.toJSON()
    await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth_key: sub.keys.auth,
    }, { onConflict: 'endpoint' })
  } catch (_) {}
}

async function savePref(userId, val) {
  const { error } = await supabase
    .from('notification_preferences')
    .upsert({ user_id: userId, enabled: val }, { onConflict: 'user_id' })
  return error
}

export function useNotifications(user) {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const native = isNative()

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    supabase
      .from('notification_preferences')
      .select('enabled')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setEnabled(data?.enabled ?? false)
        setLoading(false)
      })
  }, [user])

  const toggle = useCallback(() => {
    setError('')
    setEnabled(prev => {
      const next = !prev

      if (next) {
        // Enabling
        if (!native) {
          const perm = Notification.permission
          if (perm === 'denied') {
            setError('Notifications are blocked. Enable them in your browser settings.')
            return false
          }
          if (perm === 'default') {
            Notification.requestPermission().then(result => {
              if (result === 'granted') {
                setEnabled(true)
              } else {
                setError('Notification permission was denied.')
              }
            })
            return false
          }
        }
      } else {
        // Disabling
        cancelAllReminders()
      }

      // Fire async work
      savePref(user.id, next).then(err => {
        if (err) setError('Failed to save: ' + err.message)
      })

      if (next) {
        if (native) {
          scheduleAllReminders()
        } else {
          setupWebPush(user.id)
        }
      }

      return next
    })
  }, [user, native])

  const supported = native || isPushSupported()

  return { enabled, loading, error, supported, toggle }
}
