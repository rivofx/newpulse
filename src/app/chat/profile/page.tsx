'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Loader2, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { useToast } from '@/components/ui/Toast'
import { useTheme } from '@/components/ui/ThemeProvider'
import type { Profile } from '@/types/database'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { theme, toggle } = useTheme()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data)
        setDisplayName(data.display_name)
        setAvatarUrl(data.avatar_url || '')
        setStatus(data.status || '')
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = displayName.trim()
    if (!trimmedName || !profile) return
    if (trimmedName.length < 2 || trimmedName.length > 30) {
      toast('Display name must be 2–30 characters', 'error')
      return
    }

    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: trimmedName,
        avatar_url: avatarUrl.trim() || null,
        status: status.trim().slice(0, 100) || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)

    if (error) toast(error.message, 'error')
    else {
      toast('Profile updated!', 'success')
      router.refresh()
    }
    setSaving(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin pb-16 md:pb-0">
      {/* Header */}
      <div className="sticky top-0 bg-surface-1 border-b border-[hsl(var(--border))] px-4 py-3 z-10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center">
          <User className="w-5 h-5 text-violet-400" />
        </div>
        <h1 className="font-bold text-ink" style={{ fontFamily: 'var(--font-display)' }}>Profile</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Avatar display */}
        <div className="flex flex-col items-center mb-8">
          <Avatar
            src={avatarUrl || null}
            name={displayName || 'User'}
            userId={profile?.id || ''}
            size="xl"
          />
          <h2 className="mt-3 text-xl font-bold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
            {profile?.display_name}
          </h2>
          {status && <p className="text-sm text-ink-muted mt-0.5">{status}</p>}
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="input-base"
              maxLength={30}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Avatar URL</label>
            <input
              type="url"
              value={avatarUrl}
              onChange={e => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="input-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Status</label>
            <input
              type="text"
              value={status}
              onChange={e => setStatus(e.target.value)}
              placeholder="What's on your mind?"
              className="input-base"
              maxLength={100}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[hsl(var(--border))] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-ink text-sm">Appearance</p>
              <p className="text-xs text-ink-subtle">Currently: {theme} mode</p>
            </div>
            <button onClick={toggle} className="btn-secondary text-sm py-1.5 px-3">
              Switch to {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-rose-400 text-sm">Sign Out</p>
              <p className="text-xs text-ink-subtle">You can always sign back in</p>
            </div>
            <button onClick={handleSignOut} className="bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-medium rounded-xl px-3 py-1.5 text-sm transition-colors">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
