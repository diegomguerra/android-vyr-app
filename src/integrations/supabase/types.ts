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
      action_logs: {
        Row: {
          action_type: string
          created_at: string
          day: string
          id: string
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          day: string
          id?: string
          payload?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          day?: string
          id?: string
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      biomarker_samples: {
        Row: {
          device_id: string
          end_ts: string | null
          id: string
          payload_json: Json | null
          raw_hash: string
          source: string | null
          ts: string
          type: string
          user_id: string
          value: number | null
        }
        Insert: {
          device_id: string
          end_ts?: string | null
          id?: string
          payload_json?: Json | null
          raw_hash: string
          source?: string | null
          ts: string
          type: string
          user_id: string
          value?: number | null
        }
        Update: {
          device_id?: string
          end_ts?: string | null
          id?: string
          payload_json?: Json | null
          raw_hash?: string
          source?: string | null
          ts?: string
          type?: string
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "biomarker_samples_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      checkpoints: {
        Row: {
          checkpoint_type: string
          created_at: string
          data: Json
          day: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          checkpoint_type: string
          created_at?: string
          data?: Json
          day: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          checkpoint_type?: string
          created_at?: string
          data?: Json
          day?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      computed_states: {
        Row: {
          created_at: string
          day: string
          id: string
          level: string | null
          phase: string | null
          pillars: Json
          raw_input: Json
          score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          id?: string
          level?: string | null
          phase?: string | null
          pillars?: Json
          raw_input?: Json
          score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          level?: string | null
          phase?: string | null
          pillars?: Json
          raw_input?: Json
          score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_reviews: {
        Row: {
          clarity_score: number | null
          created_at: string
          day: string
          energy_score: number | null
          focus_score: number | null
          id: string
          mood_score: number | null
          notes: string | null
          stress_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          clarity_score?: number | null
          created_at?: string
          day: string
          energy_score?: number | null
          focus_score?: number | null
          id?: string
          mood_score?: number | null
          notes?: string | null
          stress_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          clarity_score?: number | null
          created_at?: string
          day?: string
          energy_score?: number | null
          focus_score?: number | null
          id?: string
          mood_score?: number | null
          notes?: string | null
          stress_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      device_sync_state: {
        Row: {
          cursor_by_type: Json | null
          device_id: string
          last_error: string | null
          last_success_at: string | null
          last_sync_at: string | null
          user_id: string
        }
        Insert: {
          cursor_by_type?: Json | null
          device_id: string
          last_error?: string | null
          last_success_at?: string | null
          last_sync_at?: string | null
          user_id: string
        }
        Update: {
          cursor_by_type?: Json | null
          device_id?: string
          last_error?: string | null
          last_success_at?: string | null
          last_sync_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_sync_state_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          device_uid: string
          fw_version: string | null
          id: string
          last_seen_at: string | null
          model: string
          paired_at: string | null
          user_id: string
          vendor: string
        }
        Insert: {
          device_uid: string
          fw_version?: string | null
          id?: string
          last_seen_at?: string | null
          model: string
          paired_at?: string | null
          user_id: string
          vendor: string
        }
        Update: {
          device_uid?: string
          fw_version?: string | null
          id?: string
          last_seen_at?: string | null
          model?: string
          paired_at?: string | null
          user_id?: string
          vendor?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          daily_summary: boolean
          email_enabled: boolean
          id: string
          insight_alerts: boolean
          push_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_summary?: boolean
          email_enabled?: boolean
          id?: string
          insight_alerts?: boolean
          push_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_summary?: boolean
          email_enabled?: boolean
          id?: string
          insight_alerts?: boolean
          push_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          id: string
          read: boolean
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          read?: boolean
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          read?: boolean
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      participantes: {
        Row: {
          altura_cm: number | null
          codigo: string | null
          created_at: string
          data_nascimento: string | null
          email: string | null
          id: string
          nome: string | null
          nome_publico: string | null
          objetivo_principal: string | null
          peso_kg: number | null
          sexo: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          altura_cm?: number | null
          codigo?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          id?: string
          nome?: string | null
          nome_publico?: string | null
          objetivo_principal?: string | null
          peso_kg?: number | null
          sexo?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          altura_cm?: number | null
          codigo?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          id?: string
          nome?: string | null
          nome_publico?: string | null
          objetivo_principal?: string | null
          peso_kg?: number | null
          sexo?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referencias_populacionais: {
        Row: {
          created_at: string
          faixa_max: number | null
          faixa_min: number | null
          id: string
          mean: number | null
          metric: string
          metrica: string | null
          source: string | null
          stddev: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          faixa_max?: number | null
          faixa_min?: number | null
          id?: string
          mean?: number | null
          metric: string
          metrica?: string | null
          source?: string | null
          stddev?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          faixa_max?: number | null
          faixa_min?: number | null
          id?: string
          mean?: number | null
          metric?: string
          metrica?: string | null
          source?: string | null
          stddev?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      registros_dose: {
        Row: {
          created_at: string
          dose: string | null
          id: string
          participante_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dose?: string | null
          id?: string
          participante_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dose?: string | null
          id?: string
          participante_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      resumos_diarios: {
        Row: {
          created_at: string
          day: string | null
          id: string
          participante_id: string
          resumo: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          day?: string | null
          id?: string
          participante_id: string
          resumo?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          day?: string | null
          id?: string
          participante_id?: string
          resumo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ring_daily_data: {
        Row: {
          created_at: string
          day: string
          id: string
          metrics: Json
          source_provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          id?: string
          metrics?: Json
          source_provider?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          metrics?: Json
          source_provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_baselines: {
        Row: {
          created_at: string
          id: string
          mean: number
          metric: string
          sample_count: number
          stddev: number
          updated_at: string
          user_id: string
          window_end: string | null
          window_start: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mean: number
          metric: string
          sample_count?: number
          stddev: number
          updated_at?: string
          user_id: string
          window_end?: string | null
          window_start?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mean?: number
          metric?: string
          sample_count?: number
          stddev?: number
          updated_at?: string
          user_id?: string
          window_end?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      user_consents: {
        Row: {
          consent_type: string
          created_at: string
          granted: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          consent_type: string
          created_at?: string
          granted?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          consent_type?: string
          created_at?: string
          granted?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_integrations: {
        Row: {
          config: Json
          created_at: string
          enabled: boolean
          id: string
          last_sync_at: string | null
          provider: string
          scopes: string[] | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          last_sync_at?: string | null
          provider: string
          scopes?: string[] | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          last_sync_at?: string | null
          provider?: string
          scopes?: string[] | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string
          event: string | null
          id: string
          payload: Json | null
        }
        Insert: {
          created_at?: string
          event?: string | null
          id?: string
          payload?: Json | null
        }
        Update: {
          created_at?: string
          event?: string | null
          id?: string
          payload?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "participant" | "researcher"
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
    Enums: {
      app_role: ["admin", "participant", "researcher"],
    },
  },
} as const
