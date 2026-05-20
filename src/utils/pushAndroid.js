import { Capacitor } from '@capacitor/core'
import { supabase } from '../supabase'
import { logError } from './logger'

const TAG = 'FCM'

export async function registerFCM(userId) {
  console.log(`[${TAG}] registerFCM called, platform=${Capacitor.getPlatform()}, native=${Capacitor.isNativePlatform()}`)

  if (!Capacitor.isNativePlatform()) {
    console.log(`[${TAG}] skipping - not native platform`)
    return null
  }
  if (Capacitor.getPlatform() !== 'android') {
    console.log(`[${TAG}] skipping - not android`)
    return null
  }

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    console.log(`[${TAG}] plugin loaded`)

    const permStatus = await PushNotifications.checkPermissions()
    console.log(`[${TAG}] checkPermissions: receive=${permStatus.receive}`)

    if (permStatus.receive !== 'granted') {
      console.log(`[${TAG}] requesting permissions...`)
      const requested = await PushNotifications.requestPermissions()
      console.log(`[${TAG}] requestPermissions: receive=${requested.receive}`)
      if (requested.receive !== 'granted') {
        throw new Error('Notification permission denied')
      }
    }

    console.log(`[${TAG}] registering for FCM token...`)
    const token = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('FCM registration timed out')), 15000)
      PushNotifications.addListener('registration', (data) => {
        console.log(`[${TAG}] registration event: token=${data.value.substring(0, 30)}...`)
        clearTimeout(timeout)
        resolve(data.value)
      })
      PushNotifications.addListener('registrationError', (err) => {
        console.log(`[${TAG}] registrationError event: ${JSON.stringify(err)}`)
        clearTimeout(timeout)
        reject(new Error(err.error || 'FCM registration failed'))
      })
      PushNotifications.register()
      console.log(`[${TAG}] PushNotifications.register() called, waiting for token...`)
    })

    console.log(`[${TAG}] got FCM token: ${token.substring(0, 30)}...`)

    console.log(`[${TAG}] deleting old android subscriptions...`)
    const { error: delErr } = await supabase.from('push_subscriptions').delete().match({ user_id: userId, platform: 'android' })
    if (delErr) console.log(`[${TAG}] delete error: ${delErr.code} ${delErr.message}`)

    console.log(`[${TAG}] inserting new android subscription...`)
    const { error } = await supabase.from('push_subscriptions').insert({
      user_id: userId,
      endpoint: token,
      p256dh: '',
      auth_key: '',
      platform: 'android',
    })
    if (error) {
      console.log(`[${TAG}] insert error: ${error.code} ${error.message} ${JSON.stringify(error.details)}`)
      logError('registerFCM insert', error)
    } else {
      console.log(`[${TAG}] subscription saved successfully`)
    }

    return token
  } catch (err) {
    console.log(`[${TAG}] error: ${err.message}`)
    logError('registerFCM', err)
    throw err
  }
}

export async function unregisterFCM(userId) {
  console.log(`[${TAG}] unregisterFCM called`)
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    console.log(`[${TAG}] unregisterFCM skipping - not native android`)
    return
  }

  const { error } = await supabase.from('push_subscriptions').delete().match({
    user_id: userId,
    platform: 'android',
  })

  if (error) {
    console.log(`[${TAG}] unregisterFCM delete error: ${error.code} ${error.message}`)
    logError('unregisterFCM delete', error)
  } else {
    console.log(`[${TAG}] unregisterFCM success`)
  }
}

export function listenForPushTaps() {
  console.log(`[${TAG}] listenForPushTaps called, native=${Capacitor.isNativePlatform()}`)
  if (!Capacitor.isNativePlatform()) {
    console.log(`[${TAG}] listenForPushTaps skipping - not native`)
    return
  }

  import('@capacitor/push-notifications').then(({ PushNotifications }) => {
    console.log(`[${TAG}] pushNotificationActionPerformed listener added`)
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log(`[${TAG}] push notification tapped: ${JSON.stringify(notification.notification.data)}`)
      const url = notification.notification.data?.url || '/'
      window.location.href = url
    })
  })
}
