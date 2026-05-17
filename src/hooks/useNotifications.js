import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { isNative, checkPermission, requestPermission, scheduleAllReminders, cancelAllReminders } from '../utils/notifications'
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
  console.log('[PUSH] setupWebPush called', { userId, isPushSupported: isPushSupported(), hasVapidKey: !!VAPID_PUBLIC_KEY })
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) {
    console.warn('[PUSH] Web Push not supported or VAPID key missing')
    return
  }
  try {
    console.log('[PUSH] waiting for serviceWorker.ready...')
    const registration = await navigator.serviceWorker.ready
    console.log('[PUSH] SW ready, checking existing subscription...')
    let subscription = await registration.pushManager.getSubscription()
    console.log('[PUSH] existing subscription:', subscription ? 'yes' : 'no')
    if (!subscription) {
      console.log('[PUSH] subscribing with VAPID key...')
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      console.log('[PUSH] subscribe succeeded')
    }
    const sub = subscription.toJSON()
    console.log('[PUSH] saving subscription to DB...')
    await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth_key: sub.keys.auth,
    }, { onConflict: 'endpoint' })
    console.log('[PUSH] subscription saved successfully')
  } catch (err) {
    console.error('[PUSH] Failed to setup web push:', err)
  }
}

async function deleteWebPushSubscription(userId) {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await subscription.unsubscribe()
      await supabase.from('push_subscriptions').delete().eq('user_id', userId)
    }
  } catch (err) {
    console.error('Failed to delete web push subscription:', err)
  }
}

async function savePref(userId, enabled) {
  const { error } = await supabase
    .from('notification_preferences')
    .upsert({ user_id: userId, enabled }, { onConflict: 'user_id' })
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

  // Reschedule local notifications on mount if enabled on native
  useEffect(() => {
    if (!native || !enabled) return
    scheduleAllReminders().catch(err => console.error('Reschedule failed:', err))
  }, [native, enabled])

  const toggle = useCallback(async () => {
    setError('')
    const next = !enabled

    if (next) {
      // Enabling push notifications
      if (native) {
        const hasPermission = await checkPermission()
        if (!hasPermission) {
          const granted = await requestPermission()
          if (!granted) {
            setError('Notification permission was denied.')
            return
          }
        }
      } else {
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
      // Disabling push notifications
      if (native) {
        cancelAllReminders()
      } else {
        await deleteWebPushSubscription(user.id)
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
        console.log('[PUSH] toggle complete, calling setupWebPush...')
        await setupWebPush(user.id)
      }
    }
  }, [user, native, enabled])

  const supported = native || isPushSupported()

  return { enabled, loading, error, supported, toggle }
}