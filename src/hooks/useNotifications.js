import { useState, useEffect } from 'react'
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
  } catch (_) {
    // push setup is best-effort
  }
}

export function useNotifications(user) {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  const toggle = async () => {
    setError('')

    if (enabled) {
      setEnabled(false)
      await cancelAllReminders()
      await supabase
        .from('notification_preferences')
        .upsert({ user_id: user.id, enabled: false }, { onConflict: 'user_id' })
      return
    }

    if (!isNative()) {
      if (Notification.permission === 'denied') {
        setError('Notifications are blocked. Enable them in your browser settings.')
        return
      }

      if (Notification.permission === 'default') {
        const result = await Notification.requestPermission()
        if (result !== 'granted') {
          setError('Notification permission was denied.')
          return
        }
      }
    }

    setEnabled(true)

    supabase
      .from('notification_preferences')
      .upsert({ user_id: user.id, enabled: true }, { onConflict: 'user_id' })
      .then(({ error: prefError }) => {
        if (prefError) setError('Failed to save: ' + prefError.message)
      })

    if (isNative()) {
      scheduleAllReminders()
    } else {
      setupWebPush(user.id)
    }
  }

  const supported = isNative() || isPushSupported()

  return { enabled, loading, error, supported, toggle }
}
