export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          grade: number
          language: string
          xp: number
          streak: number
          last_active: string
          created_at: string
        }
        Insert: {
          id: string
          name: string
          grade: number
          language?: string
          xp?: number
          streak?: number
          last_active?: string
          created_at?: string
        }
        Update: {
          name?: string
          grade?: number
          language?: string
          xp?: number
          streak?: number
          last_active?: string
        }
      }
      lesson_progress: {
        Row: {
          id: string
          user_id: string
          lesson_id: string
          subject_id: string
          stars: number
          xp_earned: number
          completed_at: string
        }
        Insert: {
          user_id: string
          lesson_id: string
          subject_id: string
          stars: number
          xp_earned: number
          completed_at?: string
        }
        Update: {
          stars?: number
          xp_earned?: number
        }
      }
    }
  }
}
