export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      addiction_relapses: {
        Row: {
          addiction_id: string
          cause: string | null
          created_at: string
          id: string
          reflection: string | null
          relapsed_at: string
          streak_at_relapse: number
          user_id: string
        }
        Insert: {
          addiction_id: string
          cause?: string | null
          created_at?: string
          id?: string
          reflection?: string | null
          relapsed_at?: string
          streak_at_relapse?: number
          user_id: string
        }
        Update: {
          addiction_id?: string
          cause?: string | null
          created_at?: string
          id?: string
          reflection?: string | null
          relapsed_at?: string
          streak_at_relapse?: number
          user_id?: string
        }
        Relationships: []
      }
      addictions: {
        Row: {
          clean_streak: number
          created_at: string
          difficulty: string
          goal_days: number
          icon: string
          id: string
          last_relapse: string | null
          motivation: string | null
          relapse_history: string[]
          start_date: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          clean_streak?: number
          created_at?: string
          difficulty?: string
          goal_days?: number
          icon?: string
          id?: string
          last_relapse?: string | null
          motivation?: string | null
          relapse_history?: string[]
          start_date?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          clean_streak?: number
          created_at?: string
          difficulty?: string
          goal_days?: number
          icon?: string
          id?: string
          last_relapse?: string | null
          motivation?: string | null
          relapse_history?: string[]
          start_date?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      budget_goals: {
        Row: {
          category_id: string
          created_at: string
          id: string
          limit_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          limit_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          limit_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      financial_commitments: {
        Row: {
          amount: number
          category: string
          created_at: string
          due_day: number
          id: string
          reminder: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          due_day?: number
          id?: string
          reminder?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          due_day?: number
          id?: string
          reminder?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          completed_at: string
          duration: number
          id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          duration: number
          id?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          duration?: number
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      forest_trees: {
        Row: {
          completed_at: string
          duration: number
          id: string
          session_date: string
          stage: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          duration: number
          id?: string
          session_date: string
          stage?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          duration?: number
          id?: string
          session_date?: string
          stage?: string
          user_id?: string
        }
        Relationships: []
      }
      habits: {
        Row: {
          color: string
          completed_dates: string[]
          created_at: string
          description: string | null
          icon: string
          id: string
          streak: number
          title: string
          user_id: string
          weekly_goal: number
        }
        Insert: {
          color?: string
          completed_dates?: string[]
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          streak?: number
          title: string
          user_id: string
          weekly_goal?: number
        }
        Update: {
          color?: string
          completed_dates?: string[]
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          streak?: number
          title?: string
          user_id?: string
          weekly_goal?: number
        }
        Relationships: []
      }
      notes: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nutrition_daily_logs: {
        Row: {
          created_at: string
          goal_type: string
          id: string
          log_date: string
          updated_at: string
          user_id: string
          water_glasses: number
          weight: number | null
        }
        Insert: {
          created_at?: string
          goal_type?: string
          id?: string
          log_date?: string
          updated_at?: string
          user_id: string
          water_glasses?: number
          weight?: number | null
        }
        Update: {
          created_at?: string
          goal_type?: string
          id?: string
          log_date?: string
          updated_at?: string
          user_id?: string
          water_glasses?: number
          weight?: number | null
        }
        Relationships: []
      }
      nutrition_meals: {
        Row: {
          calories: number
          carbs: number
          category: string
          created_at: string
          fat: number
          fiber: number | null
          id: string
          meal_date: string
          meal_time: string
          name: string
          protein: number
          user_id: string
        }
        Insert: {
          calories?: number
          carbs?: number
          category?: string
          created_at?: string
          fat?: number
          fiber?: number | null
          id?: string
          meal_date?: string
          meal_time?: string
          name: string
          protein?: number
          user_id: string
        }
        Update: {
          calories?: number
          carbs?: number
          category?: string
          created_at?: string
          fat?: number
          fiber?: number | null
          id?: string
          meal_date?: string
          meal_time?: string
          name?: string
          protein?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          discipline_score: number
          id: string
          level: number
          name: string
          plan: string
          streak: number
          updated_at: string
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          discipline_score?: number
          id: string
          level?: number
          name?: string
          plan?: string
          streak?: number
          updated_at?: string
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          discipline_score?: number
          id?: string
          level?: number
          name?: string
          plan?: string
          streak?: number
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      reading_history: {
        Row: {
          ai_result: Json | null
          created_at: string
          id: string
          study_result: Json | null
          text: string
          title: string
          user_id: string
        }
        Insert: {
          ai_result?: Json | null
          created_at?: string
          id?: string
          study_result?: Json | null
          text?: string
          title?: string
          user_id: string
        }
        Update: {
          ai_result?: Json | null
          created_at?: string
          id?: string
          study_result?: Json | null
          text?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          category: string
          completed: boolean
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          subtasks: Json
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          subtasks?: Json
          title: string
          user_id: string
        }
        Update: {
          category?: string
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          subtasks?: Json
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string
          date: string
          id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string
          date: string
          id?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          date?: string
          id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
