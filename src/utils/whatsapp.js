import { Capacitor } from '@capacitor/core'

export function buildShareText(slot, dateDisplay) {
  return `🙏 Completed ${slot.fullLabel} ${slot.icon} on ${dateDisplay}.`
}

export function whatsappShareUrl(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export function shareToWhatsApp(text) {
  const url = whatsappShareUrl(text)
  // On Android, Capacitor hands external URLs to the OS, which opens the WhatsApp app
  if (Capacitor.isNativePlatform()) window.location.href = url
  else window.open(url, '_blank', 'noopener')
}
