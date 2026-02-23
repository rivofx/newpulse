import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = diff / (1000 * 60 * 60)
  const days = hours / 24

  if (hours < 1) {
    const mins = Math.floor(diff / (1000 * 60))
    if (mins < 1) return 'just now'
    return `${mins}m ago`
  }
  if (hours < 24) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  if (days < 7) {
    return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function formatDateDivider(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)

  if (diff < 1) return 'Today'
  if (diff < 2) return 'Yesterday'
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

const PROFANITY_LIST = ['damn', 'hell', 'crap'] // extend as needed - keeping it minimal
export function filterProfanity(text: string): string {
  let filtered = text
  PROFANITY_LIST.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi')
    filtered = filtered.replace(regex, '*'.repeat(word.length))
  })
  return filtered
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getAvatarColor(userId: string): string {
  const colors = [
    'bg-rose-500', 'bg-pink-500', 'bg-fuchsia-500',
    'bg-violet-500', 'bg-indigo-500', 'bg-blue-500',
    'bg-sky-500', 'bg-cyan-500', 'bg-teal-500',
    'bg-emerald-500', 'bg-green-500', 'bg-amber-500',
    'bg-orange-500', 'bg-red-500',
  ]
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// Rate limiting - simple client-side
const messageTimes: number[] = []
export function checkRateLimit(maxMessages = 5, windowMs = 3000): boolean {
  const now = Date.now()
  const windowStart = now - windowMs
  const recent = messageTimes.filter(t => t > windowStart)
  if (recent.length >= maxMessages) return false
  messageTimes.push(now)
  // cleanup
  while (messageTimes.length > 100) messageTimes.shift()
  return true
}
