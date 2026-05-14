import { Capacitor } from '@capacitor/core'

const SLOT_CONFIG = {
  morning: { id: 100, title: 'Prathakala Sandhyavandhanam', body: 'Time for your morning prayer. Open the app!' },
  afternoon: { id: 200, title: 'Madhyanika Sandhyavandhanam', body: 'Time for your noon prayer. Open the app!' },
  evening: { id: 300, title: 'Saayamkala Sandhyavandhanam', body: 'Time for your evening prayer. Open the app!' },
}

const SLOT_TIMES = {
  morning: { hour: 11, minute: 0 },
  afternoon: { hour: 15, minute: 0 },
  evening: { hour: 20, minute: 0 },
}

export function isNative() {
  return Capacitor.isNativePlatform()
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
