import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { isNative, scheduleAllReminders, cancelAllReminders } from '../utils/notifications'
import { friendlyError } from '../utils/errors'

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
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) {
    console.warn('Web Push not supported or VAPID key missing')
    return
  }
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
  } catch (err) {
    console.error('Failed to setup web push:', err)
  }
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

  const toggle = useCallback(async () => {
    setError('')
    const next = !enabled

    if (next) {
      // Enabling
      if (!native) {
        const perm = Notification.permission
        if (perm === 'denied') {
          setError('Notifications are blocked. Enable them in your browser settings.')
          return
        }
        if (perm === 'default') {
          const result = await Notification.requestPermission()
          if (result !== 'granted') {
            setError('Notification permission was denied.')
            return
          }
        }
      }
    } else {
      // Disabling
      if (native) {
        cancelAllReminders()
      }
    }

    const saveError = await savePref(user.id, next)
    if (saveError) {
      setError(friendlyError(saveError))
      return
    }

    setEnabled(next)

    if (next) {
      if (native) {
        await scheduleAllReminders()
      } else {
        await setupWebPush(user.id)
      }
    }
  }, [user, native, enabled])

  const supported = native || isPushSupported()

  return { enabled, loading, error, supported, toggle }
}