-- ============================================================
-- PULSE CHAT - COMPLETE SUPABASE SCHEMA
-- Run this in your Supabase SQL editor (Dashboard > SQL Editor)
-- ============================================================


-- ============================================================
-- SECTION 1: TABLES
-- ============================================================

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 30),
  avatar_url    TEXT CHECK (char_length(avatar_url) <= 500),
  status        TEXT CHECK (char_length(status) <= 100),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Global messages
CREATE TABLE IF NOT EXISTS public.global_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  image_url   TEXT CHECK (char_length(image_url) <= 500),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Friendships / friend requests
CREATE TABLE IF NOT EXISTS public.friendships (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Prevent duplicate requests in same direction
  UNIQUE (requester_id, addressee_id),
  -- Prevent self-friending
  CHECK (requester_id <> addressee_id)
);

-- Conversations (1:1 private chats)
CREATE TABLE IF NOT EXISTS public.conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conversation members
CREATE TABLE IF NOT EXISTS public.conversation_members (
  conversation_id  UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at     TIMESTAMPTZ,
  joined_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- Private messages
CREATE TABLE IF NOT EXISTS public.private_messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content          TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Message reports
CREATE TABLE IF NOT EXISTS public.message_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_id    UUID NOT NULL,
  message_type  TEXT NOT NULL CHECK (message_type IN ('global', 'private')),
  reason        TEXT NOT NULL DEFAULT 'User report' CHECK (char_length(reason) <= 500),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One report per user per message
  UNIQUE (reporter_id, message_id)
);


-- ============================================================
-- SECTION 2: INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_global_messages_created_at
  ON public.global_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_global_messages_user_id
  ON public.global_messages(user_id);

CREATE INDEX IF NOT EXISTS idx_friendships_requester
  ON public.friendships(requester_id, status);

CREATE INDEX IF NOT EXISTS idx_friendships_addressee
  ON public.friendships(addressee_id, status);

CREATE INDEX IF NOT EXISTS idx_conversation_members_user
  ON public.conversation_members(user_id);

CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation
  ON public.conversation_members(conversation_id);

CREATE INDEX IF NOT EXISTS idx_private_messages_conversation
  ON public.private_messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_display_name
  ON public.profiles(display_name);


-- ============================================================
-- SECTION 3: ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reports     ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- SECTION 4: RLS POLICIES
-- ============================================================

-- ---- PROFILES ----

CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- ---- GLOBAL MESSAGES ----

CREATE POLICY "global_messages_select_authenticated"
  ON public.global_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "global_messages_insert_own"
  ON public.global_messages FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Authors can delete their own messages only
CREATE POLICY "global_messages_delete_own"
  ON public.global_messages FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


-- ---- FRIENDSHIPS ----

CREATE POLICY "friendships_select_involved"
  ON public.friendships FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE POLICY "friendships_insert_as_requester"
  ON public.friendships FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "friendships_update_involved"
  ON public.friendships FOR UPDATE
  TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());


-- ---- CONVERSATIONS ----

CREATE POLICY "conversations_select_member"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT conversation_id FROM public.conversation_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "conversations_insert_authenticated"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- ---- CONVERSATION MEMBERS ----

CREATE POLICY "conv_members_select_own_conv"
  ON public.conversation_members FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_members cm2
      WHERE cm2.user_id = auth.uid()
    )
  );

CREATE POLICY "conv_members_insert_authenticated"
  ON public.conversation_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "conv_members_update_own"
  ON public.conversation_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());


-- ---- PRIVATE MESSAGES ----

CREATE POLICY "private_messages_select_member"
  ON public.private_messages FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "private_messages_insert_member"
  ON public.private_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND conversation_id IN (
      SELECT conversation_id FROM public.conversation_members
      WHERE user_id = auth.uid()
    )
  );


-- ---- MESSAGE REPORTS ----

CREATE POLICY "reports_insert_own"
  ON public.message_reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "reports_select_own"
  ON public.message_reports FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());


-- ============================================================
-- SECTION 5: TRIGGER — AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert if display_name metadata exists (set during OAuth)
  IF NEW.raw_user_meta_data->>'full_name' IS NOT NULL THEN
    INSERT INTO public.profiles (id, display_name, avatar_url)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
      NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- SECTION 6: REALTIME SETUP
-- ============================================================
-- Enable realtime on these tables in your Supabase dashboard:
-- Dashboard > Database > Replication > Tables
-- Or run:

BEGIN;
  -- publication already created by supabase, just add tables
  ALTER PUBLICATION supabase_realtime ADD TABLE public.global_messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.private_messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
COMMIT;


-- ============================================================
-- SECTION 7: EXTENSIONS (run these first if needed)
-- ============================================================
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- usually already enabled
