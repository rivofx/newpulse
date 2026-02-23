export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          avatar_url: string | null
          status: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_url?: string | null
          status?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          display_name?: string
          avatar_url?: string | null
          status?: string | null
          updated_at?: string
        }
      }
      global_messages: {
        Row: {
          id: string
          user_id: string
          content: string
          image_url: string | null
          created_at: string
          profiles?: Database['public']['Tables']['profiles']['Row']
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          image_url?: string | null
          created_at?: string
        }
        Update: {
          content?: string
          image_url?: string | null
        }
      }
      friendships: {
        Row: {
          id: string
          requester_id: string
          addressee_id: string
          status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          requester_id: string
          addressee_id: string
          status?: 'pending' | 'accepted' | 'rejected' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: 'pending' | 'accepted' | 'rejected' | 'cancelled'
          updated_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          created_at: string
        }
        Insert: {
          id?: string
          created_at?: string
        }
        Update: {
          id?: string
        }
      }
      conversation_members: {
        Row: {
          conversation_id: string
          user_id: string
          last_read_at: string | null
          joined_at: string
        }
        Insert: {
          conversation_id: string
          user_id: string
          last_read_at?: string | null
          joined_at?: string
        }
        Update: {
          last_read_at?: string | null
          joined_at?: string
        }
      }
      private_messages: {
        Row: {
          id: string
          conversation_id: string
          user_id: string
          content: string
          created_at: string
          profiles?: Database['public']['Tables']['profiles']['Row']
        }
        Insert: {
          id?: string
          conversation_id: string
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          content?: string
        }
      }
      message_reports: {
        Row: {
          id: string
          reporter_id: string
          message_id: string
          message_type: 'global' | 'private'
          reason: string
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          message_id: string
          message_type: 'global' | 'private'
          reason: string
          created_at?: string
        }
        Update: {
          reason?: string
        }
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type GlobalMessage = Database['public']['Tables']['global_messages']['Row']
export type Friendship = Database['public']['Tables']['friendships']['Row']
export type Conversation = Database['public']['Tables']['conversations']['Row']
export type ConversationMember = Database['public']['Tables']['conversation_members']['Row']
export type PrivateMessage = Database['public']['Tables']['private_messages']['Row']

export interface GlobalMessageWithProfile extends GlobalMessage {
  profiles: Profile
}

export interface PrivateMessageWithProfile extends PrivateMessage {
  profiles: Profile
}

export interface ConversationWithDetails {
  id: string
  created_at: string
  other_user: Profile
  last_message?: {
    content: string
    created_at: string
    user_id: string
  }
  unread_count: number
  last_read_at: string | null
}

export interface FriendshipWithProfile extends Friendship {
  requester?: Profile
  addressee?: Profile
}
