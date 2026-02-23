'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Camera, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Avatar } from '@/components/ui/Avatar'

export default function OnboardingPage() {
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const AVATAR_SEEDS = ['alice', 'bob', 'charlie', 'diana', 'evan', 'fiona', 'gary', 'hannah']

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = displayName.trim()
    if (!trimmedName || trimmedName.length < 2) {
      toast('Display name must be at least 2 characters', 'error')
      return
    }
    if (trimmedName.length > 30) {
      toast('Display name must be 30 characters or less', 'error')
      return
    }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        display_name: trimmedName,
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      toast(error.message, 'error')
      setLoading(false)
      return
    }

    toast('Profile created! Welcome to Pulse 🎉', 'success')
    router.push('/chat/global')
    router.refresh()
  }

  const previewId = 'preview-user'
  const previewName = displayName.trim() || 'You'

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-violet-500 mb-4 shadow-lg">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
            Set up your profile
          </h1>
          <p className="text-ink-muted mt-1.5">Tell everyone who you are</p>
        </div>

        <div className="bg-surface-1 border border-[hsl(var(--border))] rounded-2xl p-8 shadow-[0_8px_40px_rgba(0,0,0,0.12)]">
          {/* Avatar preview */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Avatar
                src={avatarUrl || null}
                name={previewName}
                userId={previewId}
                size="xl"
              />
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-accent rounded-full flex items-center justify-center shadow">
                <Camera className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Display Name *</label>
              <input
                type="text"
                placeholder="How should people know you?"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="input-base"
                maxLength={30}
                required
                autoFocus
              />
              <p className="text-xs text-ink-subtle mt-1">{displayName.length}/30</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Avatar URL <span className="text-ink-subtle font-normal">(optional)</span></label>
              <input
                type="url"
                placeholder="https://example.com/avatar.jpg"
                value={avatarUrl}
                onChange={e => setAvatarUrl(e.target.value)}
                className="input-base"
              />
              <p className="text-xs text-ink-subtle mt-1">Paste a link to your avatar image, or leave blank for a generated one.</p>
            </div>

            {/* Quick avatar presets */}
            <div>
              <p className="text-xs text-ink-subtle mb-2">Or pick a quick avatar:</p>
              <div className="flex gap-2 flex-wrap">
                {AVATAR_SEEDS.map(seed => {
                  const url = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`
                  return (
                    <button
                      key={seed}
                      type="button"
                      onClick={() => setAvatarUrl(url)}
                      className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all ${avatarUrl === url ? 'border-accent scale-110' : 'border-transparent hover:border-surface-3'}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={seed} className="w-full h-full object-cover" />
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !displayName.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Enter Pulse →
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
