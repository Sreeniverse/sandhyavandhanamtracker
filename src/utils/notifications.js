import { Capacitor } from '@capacitor/core'

const SLOT_CONFIG = {
  morning: { id: 100, title: 'Prathakala Sandhyavandhanam', body: 'Time for your morning prayer. Open the app!' },
  afternoon: { id: 200, title: 'Madhyanika Sandhyavandhanam', body: 'Time for your noon prayer. Open the app!' },
  evening: { id: 300, title: 'Saayamkala Sandhyavandhanam', body: 'Time for your evening prayer. Open the app!' },
}

const SLOT_TIMES = {
  morning: { hour: 9, minute: 0 },
  afternoon: { hour: 12, minute: 0 },
  evening: { hour: 18, minute: 30 },
}

export function isNative() {
  return Capacitor.isNativePlatform()
}

async function ensureChannel() {
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  await LocalNotifications.createChannel({
    id: 'reminders',
    name: 'Practice Reminders',
    importance: 5,
    visibility: 1,
  })
}

export async function checkPermission() {
  if (isNative()) {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const { display } = await LocalNotifications.checkPermissions()
    return display === 'granted'
  }
  return Notification.permission === 'granted'
}

export async function requestPermission() {
  if (isNative()) {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const { display } = await LocalNotifications.requestPermissions()
    return display === 'granted'
  }
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export async function scheduleAllReminders() {
  if (!isNative()) return
  const { LocalNotifications } = await import('@capacitor/local-notifications')

  await ensureChannel()

  const notifications = Object.entries(SLOT_CONFIG).map(([slot, config]) => {
    const time = SLOT_TIMES[slot]
    const now = new Date()
    const at = new Date()
    at.setHours(time.hour, time.minute, 0, 0)
    if (at <= now) at.setDate(at.getDate() + 1)

    return {
      id: config.id,
      title: config.title,
      body: config.body,
      schedule: { every: 'day', at },
      extra: { slot },
    }
  })

  await LocalNotifications.schedule({ notifications })
}

export async function cancelAllReminders() {
  if (!isNative()) return
  const { LocalNotifications } = await import('@capacitor/local-notifications')

  const ids = Object.values(SLOT_CONFIG).map(c => ({ id: c.id }))
  await LocalNotifications.cancel({ notifications: ids })
}

export async function cancelSlotReminder(slot) {
  if (!isNative()) return
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  const config = SLOT_CONFIG[slot]
  if (!config) return

  await LocalNotifications.cancel({ notifications: [{ id: config.id }] })
}

// [TEST] sendTestNotification - disabled after successful testing on web + Android
// export async function sendTestNotification() {
//   if (isNative()) {
//     const { LocalNotifications } = await import('@capacitor/local-notifications')
//     await ensureChannel()
//
//     const at = new Date(Date.now() + 5000)
//
//     await LocalNotifications.schedule({
//       notifications: [{
//         id: 999,
//         title: 'Sandhyavandhanam',
//         body: 'Test notification - if you see this, push is working!',
//         schedule: { at },
//         extra: { test: true },
//       }],
//     })
//
//     console.log(`Test notification will appear at ${at.toLocaleTimeString()}`)
//     return true
//   }
//
//   if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
//     new Notification('Sandhyavandhanam', { body: 'Test notification - if you see this, push is working!' })
//     return true
//   }
//
//   console.log('Test notification: no permission or unsupported platform.')
//   return false
// }

// [TEST] scheduleTestNotification - disabled after successful testing
// export async function scheduleTestNotification(slot) {
//   const config = SLOT_CONFIG[slot]
//   const time = SLOT_TIMES[slot]
//   if (!config || !time) {
//     console.error(`Unknown slot: ${slot}. Use: morning, afternoon, evening`)
//     return
//   }
//
//   if (isNative()) {
//     const { LocalNotifications } = await import('@capacitor/local-notifications')
//     await ensureChannel()
//
//     const at = new Date()
//     at.setHours(time.hour, time.minute, 0, 0)
//     if (at <= new Date()) at.setDate(at.getDate() + 1)
//
//     await LocalNotifications.schedule({
//       notifications: [{
//         id: config.id,
//         title: config.title,
//         body: config.body,
//         schedule: { at },
//         extra: { slot, test: true },
//       }],
//     })
//
//     console.log(`Test notification scheduled for ${slot} at ${at.toLocaleTimeString()}`)
//     return at
//   }
//
//   console.log('Test notification: not on native platform. Use web push via toggle instead.')
//   return null
// }