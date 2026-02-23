# 💬 Pulse — Beautiful Real-Time Chat App

A gorgeous, mobile-first messaging web app built with Next.js 15, Supabase, and Tailwind CSS. Features a global public chat room and private 1:1 messaging with friends.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js 15 App                        │
│  ┌──────────────┐  ┌─────────────────┐  ┌───────────────┐   │
│  │  Auth Pages  │  │  Chat Pages     │  │  Onboarding   │   │
│  │  /auth/login │  │  /chat/global   │  │  /onboarding  │   │
│  │  /auth/signup│  │  /chat/friends  │  └───────────────┘   │
│  └──────────────┘  │  /chat/conv/[id]│                       │
│                    └─────────────────┘                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                 Shared Components                       │  │
│  │  Sidebar | MobileNav | MessageBubble | ChatInput       │  │
│  │  Avatar | Toast | Skeleton | TypingIndicator           │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                    Supabase SSR Client
                              │
┌─────────────────────────────────────────────────────────────┐
│                        Supabase                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │
│  │  Auth      │  │ PostgreSQL │  │  Realtime              │ │
│  │  Email     │  │  profiles  │  │  global_messages       │ │
│  │  OAuth     │  │  global_msg│  │  private_messages      │ │
│  │            │  │  friendshp │  │  friendships           │ │
│  │            │  │  conv/msgs │  │  Broadcast (typing)    │ │
│  └────────────┘  └────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## File Tree

```
pulse-chat/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (fonts, providers)
│   │   ├── globals.css             # Design system, CSS variables, utilities
│   │   ├── auth/
│   │   │   ├── login/page.tsx      # Email + Google login
│   │   │   ├── signup/page.tsx     # Email registration
│   │   │   └── callback/route.ts   # OAuth callback handler
│   │   ├── onboarding/page.tsx     # Profile setup (name + avatar)
│   │   └── chat/
│   │       ├── layout.tsx          # Chat shell with sidebar (auth-protected)
│   │       ├── global/page.tsx     # Global chat room
│   │       ├── friends/
│   │       │   ├── page.tsx        # Friends hub (requests + friends list)
│   │       │   └── find/page.tsx   # Search & add people
│   │       ├── conversation/[id]/page.tsx   # Private 1:1 chat
│   │       └── profile/page.tsx    # User profile editor
│   ├── components/
│   │   ├── chat/
│   │   │   ├── MessageBubble.tsx   # Message rendering with report
│   │   │   ├── ChatInput.tsx       # Input bar with emoji picker
│   │   │   ├── TypingIndicator.tsx # Animated typing dots
│   │   │   └── ConversationsList.tsx # DM list in sidebar
│   │   ├── friends/
│   │   │   └── FriendRequestsBadge.tsx  # Live request count badge
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx         # Desktop sidebar
│   │   │   └── MobileNav.tsx       # Mobile bottom nav
│   │   └── ui/
│   │       ├── Avatar.tsx          # User avatar with fallback initials
│   │       ├── Skeleton.tsx        # Loading skeletons
│   │       ├── Toast.tsx           # Toast notification system
│   │       └── ThemeProvider.tsx   # Dark/light mode
│   ├── lib/
│   │   ├── utils.ts                # cn(), formatTime, profanity filter, etc.
│   │   └── supabase/
│   │       ├── client.ts           # Browser client
│   │       ├── server.ts           # Server component client
│   │       └── middleware.ts       # Session refresh + route protection
│   ├── types/
│   │   └── database.ts             # Full TypeScript types for all tables
│   └── middleware.ts               # Route protection middleware
├── supabase-schema.sql             # Complete SQL (tables + RLS + triggers)
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Local Setup

### 1. Clone & Install

```bash
git clone <your-repo-url> pulse-chat
cd pulse-chat
npm install
```

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (choose a region close to you)
3. Wait for it to finish provisioning (~2 minutes)

### 3. Run the SQL Schema

1. In Supabase Dashboard → **SQL Editor** → **New Query**
2. Paste the entire contents of `supabase-schema.sql`
3. Click **Run**

> If you get an error about `pg_trgm`, run this first:
> ```sql
> CREATE EXTENSION IF NOT EXISTS pg_trgm;
> ```
> Then re-run the schema.

### 4. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
```

Find these in: **Supabase Dashboard → Settings → API**

### 5. Enable Supabase Realtime

In Supabase Dashboard:
1. Go to **Database → Replication**
2. Under "Tables", enable realtime for:
   - `public.global_messages`
   - `public.private_messages`
   - `public.friendships`
   - `public.conversation_members`

### 6. Configure Authentication

In Supabase Dashboard → **Authentication → URL Configuration**:

```
Site URL: http://localhost:3000
Redirect URLs: http://localhost:3000/auth/callback
```

#### Optional: Enable Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth credentials (Web application)
3. Add `https://your-project.supabase.co/auth/v1/callback` as authorized redirect URI
4. In Supabase: **Authentication → Providers → Google** → enable and add Client ID + Secret

### 7. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## Vercel Deployment

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit - Pulse Chat"
git remote add origin https://github.com/your-username/pulse-chat.git
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Add Environment Variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |

4. Click **Deploy**

### 3. Update Supabase Redirect URLs

After deployment, go to **Supabase → Authentication → URL Configuration**:

```
Site URL: https://your-app.vercel.app
Redirect URLs:
  https://your-app.vercel.app/auth/callback
  http://localhost:3000/auth/callback
```

---

## Polish Checklist ✨

To elevate from MVP to premium:

### Performance
- [ ] Add `loading.tsx` files alongside each page for instant skeleton UI
- [ ] Implement infinite scroll / pagination (load older messages on scroll up)
- [ ] Use `React.memo` on `MessageBubble` to prevent unnecessary re-renders
- [ ] Add `SWR` or `TanStack Query` for data caching

### Features
- [ ] Image upload support (Supabase Storage)
- [ ] Message reactions (emoji reactions stored in a `reactions` table)
- [ ] Read receipts ("Seen by X" under messages)
- [ ] Message search within conversations
- [ ] Notification sounds (Web Audio API)
- [ ] Push notifications (Web Push API + service worker)
- [ ] Group chats (extend `conversation_members` beyond 2)
- [ ] Message threading / replies
- [ ] Link preview cards (og:image scraping)

### UX
- [ ] Haptic feedback on mobile (Vibration API)
- [ ] Swipe to reply on mobile
- [ ] Drag-and-drop file upload to chat
- [ ] Keyboard shortcuts (Cmd+K to jump to conversation)
- [ ] Message edit history
- [ ] Customizable notification preferences per conversation

### Quality
- [ ] E2E tests with Playwright for auth flow
- [ ] Unit tests for utility functions
- [ ] Accessibility audit (axe-core)
- [ ] Rate limiting on server (Supabase Edge Functions)
- [ ] Spam detection (pattern matching on content)
- [ ] Admin panel for moderating reported messages

### Design
- [ ] Custom emoji picker (full emoji set)
- [ ] Message bubble tail variation (first vs. grouped)
- [ ] Animated presence indicators
- [ ] Profile card hover popover on avatar click
- [ ] Sounds and haptic patterns per notification type

---

## Data Model Reference

```sql
profiles              -- User profile (extends auth.users)
global_messages       -- Public chat room messages  
friendships           -- Friend requests & accepted friendships
conversations         -- 1:1 private chat containers
conversation_members  -- Who's in each conversation + last_read_at
private_messages      -- Messages within conversations
message_reports       -- User-reported messages
```

## Security Model

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| profiles | Any auth user | Own only | Own only | — |
| global_messages | Any auth user | Own only | — | Own only |
| friendships | Involved users | As requester | Involved users | — |
| conversations | Members | Auth users | — | — |
| conversation_members | Fellow members | Auth users | Own only | — |
| private_messages | Members only | Members only | — | — |
| message_reports | Own reports | Own only | — | — |
