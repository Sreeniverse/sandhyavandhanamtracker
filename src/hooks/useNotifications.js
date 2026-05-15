import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { isNative, checkPermission, requestPermission, scheduleAllReminders, cancelAllReminders } from '../utils/notifications'

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

function swReady(timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    if (!navigator.serviceWorker.controller) {
      const timer = setTimeout(() => reject(new Error('Service worker not ready. Try refreshing the page.')), timeoutMs)
      navigator.serviceWorker.ready.then((reg) => {
        clearTimeout(timer)
        resolve(reg)
      }).catch((err) => {
        clearTimeout(timer)
        reject(err)
      })
    } else {
      navigator.serviceWorker.ready.then(resolve).catch(reject)
    }
  })
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
      await cancelAllReminders()
      const { error: dbError } = await supabase
        .from('notification_preferences')
        .upsert({ user_id: user.id, enabled: false }, { onConflict: 'user_id' })
      if (dbError) {
        setError('Failed to save preference: ' + dbError.message)
        return
      }
      setEnabled(false)
      return
    }

    try {
      const alreadyGranted = await checkPermission()
      if (!alreadyGranted) {
        const granted = await requestPermission()
        if (!granted) {
          setError('Notification permission was denied. Enable it in your browser or device settings.')
          return
        }
      }

      if (isNative()) {
        await scheduleAllReminders()
      } else {
        if (!isPushSupported()) {
          setError('Push notifications require HTTPS. They will work on the deployed site (Netlify).')
          return
        }

        if (!VAPID_PUBLIC_KEY) {
          setError('Push notifications are not configured. Please set VITE_VAPID_PUBLIC_KEY.')
          return
        }

        let registration
        try {
          registration = await swReady()
        } catch (err) {
          setError(err.message || 'Service worker not available.')
          return
        }

        let subscription = await registration.pushManager.getSubscription()

        if (!subscription) {
          try {
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            })
          } catch (subErr) {
            if (subErr.name === 'NotAllowedError') {
              setError('Notification permission was denied by the browser.')
            } else {
              setError('Failed to set up push notifications: ' + (subErr.message || 'Unknown error'))
            }
            return
          }
        }

        const sub = subscription.toJSON()
        const { error: subError } = await supabase.from('push_subscriptions').upsert({
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh: sub.keys.p256dh,
          auth_key: sub.keys.auth,
        }, { onConflict: 'endpoint' })
        if (subError) {
          setError('Failed to save notification subscription: ' + subError.message)
          return
        }
      }

      const { error: prefError } = await supabase
        .from('notification_preferences')
        .upsert({ user_id: user.id, enabled: true }, { onConflict: 'user_id' })
      if (prefError) {
        setError('Failed to save preference: ' + prefError.message)
        return
      }

      setEnabled(true)
    } catch (err) {
      setError(err.message || 'Failed to enable notifications')
    }
  }

  const supported = isNative() || isPushSupported()

  return { enabled, loading, error, supported, toggle }
}
