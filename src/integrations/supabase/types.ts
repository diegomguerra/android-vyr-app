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
          codigo: string
          condicoes_saude: string[] | null
          consumo_alcool: string | null
          consumo_cafeina: string | null
          created_at: string
          data_nascimento: string
          frequencia_exercicio: string | null
          horario_acordar: string | null
          horario_dormir: string | null
          horas_sono_media: number | null
          id: string
          medicamentos_uso: string | null
          nivel_estresse_geral: number | null
          nivel_experiencia_suplementos: string | null
          nome_publico: string
          objetivo_principal: string | null
          onboarding_completo: boolean | null
          onboarding_etapa: number | null
          perfil_atividade:
            | Database["public"]["Enums"]["perfil_atividade"]
            | null
          peso_kg: number | null
          pratica_exercicio: boolean | null
          qualidade_sono_geral: number | null
          rotina_trabalho: Database["public"]["Enums"]["rotina_trabalho"] | null
          sexo: Database["public"]["Enums"]["sexo_tipo"]
          updated_at: string
          user_id: string
        }
        Insert: {
          altura_cm?: number | null
          codigo: string
          condicoes_saude?: string[] | null
          consumo_alcool?: string | null
          consumo_cafeina?: string | null
          created_at?: string
          data_nascimento: string
          frequencia_exercicio?: string | null
          horario_acordar?: string | null
          horario_dormir?: string | null
          horas_sono_media?: number | null
          id?: string
          medicamentos_uso?: string | null
          nivel_estresse_geral?: number | null
          nivel_experiencia_suplementos?: string | null
          nome_publico: string
          objetivo_principal?: string | null
          onboarding_completo?: boolean | null
          onboarding_etapa?: number | null
          perfil_atividade?:
            | Database["public"]["Enums"]["perfil_atividade"]
            | null
          peso_kg?: number | null
          pratica_exercicio?: boolean | null
          qualidade_sono_geral?: number | null
          rotina_trabalho?:
            | Database["public"]["Enums"]["rotina_trabalho"]
            | null
          sexo?: Database["public"]["Enums"]["sexo_tipo"]
          updated_at?: string
          user_id: string
        }
        Update: {
          altura_cm?: number | null
          codigo?: string
          condicoes_saude?: string[] | null
          consumo_alcool?: string | null
          consumo_cafeina?: string | null
          created_at?: string
          data_nascimento?: string
          frequencia_exercicio?: string | null
          horario_acordar?: string | null
          horario_dormir?: string | null
          horas_sono_media?: number | null
          id?: string
          medicamentos_uso?: string | null
          nivel_estresse_geral?: number | null
          nivel_experiencia_suplementos?: string | null
          nome_publico?: string
          objetivo_principal?: string | null
          onboarding_completo?: boolean | null
          onboarding_etapa?: number | null
          perfil_atividade?:
            | Database["public"]["Enums"]["perfil_atividade"]
            | null
          peso_kg?: number | null
          pratica_exercicio?: boolean | null
          qualidade_sono_geral?: number | null
          rotina_trabalho?:
            | Database["public"]["Enums"]["rotina_trabalho"]
            | null
          sexo?: Database["public"]["Enums"]["sexo_tipo"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referencias_populacionais: {
        Row: {
          faixa_max: number
          faixa_min: number
          id: string
          idade_max: number | null
          idade_min: number | null
          metrica: string
          sexo: Database["public"]["Enums"]["sexo_tipo"] | null
        }
        Insert: {
          faixa_max: number
          faixa_min: number
          id?: string
          idade_max?: number | null
          idade_min?: number | null
          metrica: string
          sexo?: Database["public"]["Enums"]["sexo_tipo"] | null
        }
        Update: {
          faixa_max?: number
          faixa_min?: number
          id?: string
          idade_max?: number | null
          idade_min?: number | null
          metrica?: string
          sexo?: Database["public"]["Enums"]["sexo_tipo"] | null
        }
        Relationships: []
      }
      registros_dose: {
        Row: {
          created_at: string
          data: string
          efeito_indesejado: Database["public"]["Enums"]["severidade"]
          escala_1: number | null
          escala_2: number | null
          escala_3: number | null
          horario_tomada: string | null
          id: string
          janela: Database["public"]["Enums"]["janela_dose"]
          observacoes: string | null
          participante_id: string
          sintomas: string[] | null
          tomou: boolean
        }
        Insert: {
          created_at?: string
          data: string
          efeito_indesejado?: Database["public"]["Enums"]["severidade"]
          escala_1?: number | null
          escala_2?: number | null
          escala_3?: number | null
          horario_tomada?: string | null
          id?: string
          janela: Database["public"]["Enums"]["janela_dose"]
          observacoes?: string | null
          participante_id: string
          sintomas?: string[] | null
          tomou?: boolean
        }
        Update: {
          created_at?: string
          data?: string
          efeito_indesejado?: Database["public"]["Enums"]["severidade"]
          escala_1?: number | null
          escala_2?: number | null
          escala_3?: number | null
          horario_tomada?: string | null
          id?: string
          janela?: Database["public"]["Enums"]["janela_dose"]
          observacoes?: string | null
          participante_id?: string
          sintomas?: string[] | null
          tomou?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "registros_dose_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "participantes"
            referencedColumns: ["id"]
          },
        ]
      }
      resumos_diarios: {
        Row: {
          cafeina_doses: number | null
          created_at: string
          data: string
          despertares: number | null
          estresse_dia: number | null
          id: string
          latencia_sono_min: number | null
          participante_id: string
          qualidade_sono: number | null
          recuperacao_ao_acordar: number | null
          sonolencia_diurna: number | null
        }
        Insert: {
          cafeina_doses?: number | null
          created_at?: string
          data: string
          despertares?: number | null
          estresse_dia?: number | null
          id?: string
          latencia_sono_min?: number | null
          participante_id: string
          qualidade_sono?: number | null
          recuperacao_ao_acordar?: number | null
          sonolencia_diurna?: number | null
        }
        Update: {
          cafeina_doses?: number | null
          created_at?: string
          data?: string
          despertares?: number | null
          estresse_dia?: number | null
          id?: string
          latencia_sono_min?: number | null
          participante_id?: string
          qualidade_sono?: number | null
          recuperacao_ao_acordar?: number | null
          sonolencia_diurna?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "resumos_diarios_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "participantes"
            referencedColumns: ["id"]
          },
        ]
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
          accepted_privacy: boolean
          accepted_terms: boolean
          consent_version: string
          created_at: string
          id: string
          legal_basis: string
          scope: Json
          user_id: string
        }
        Insert: {
          accepted_privacy?: boolean
          accepted_terms?: boolean
          consent_version: string
          created_at?: string
          id?: string
          legal_basis?: string
          scope?: Json
          user_id: string
        }
        Update: {
          accepted_privacy?: boolean
          accepted_terms?: boolean
          consent_version?: string
          created_at?: string
          id?: string
          legal_basis?: string
          scope?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_integrations: {
        Row: {
          access_token: string | null
          created_at: string
          external_user_id: string | null
          id: string
          last_error: string | null
          last_sync_at: string | null
          meta: Json
          provider: string
          refresh_token: string | null
          scopes: string[]
          status: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          external_user_id?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          meta?: Json
          provider: string
          refresh_token?: string | null
          scopes?: string[]
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          external_user_id?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          meta?: Json
          provider?: string
          refresh_token?: string | null
          scopes?: string[]
          status?: string
          token_expires_at?: string | null
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
          error: string | null
          event_type: string | null
          id: string
          idempotency_key: string | null
          payload_hash: string | null
          provider: string
          signature_valid: boolean
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_type?: string | null
          id?: string
          idempotency_key?: string | null
          payload_hash?: string | null
          provider: string
          signature_valid?: boolean
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          event_type?: string | null
          id?: string
          idempotency_key?: string | null
          payload_hash?: string | null
          provider?: string
          signature_valid?: boolean
          status?: string
          user_id?: string | null
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
      janela_dose: "DIA" | "TARDE" | "NOITE"
      perfil_atividade:
        | "CONDUCAO"
        | "ANALISE"
        | "ENSINO"
        | "EXECUCAO"
        | "CRIACAO"
      rotina_trabalho: "REUNIOES" | "FOCO" | "MISTO"
      severidade: "NENHUM" | "LEVE" | "MODERADO" | "FORTE"
      sexo_tipo: "MASCULINO" | "FEMININO" | "OUTRO" | "NAO_INFORMAR"
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
      janela_dose: ["DIA", "TARDE", "NOITE"],
      perfil_atividade: [
        "CONDUCAO",
        "ANALISE",
        "ENSINO",
        "EXECUCAO",
        "CRIACAO",
      ],
      rotina_trabalho: ["REUNIOES", "FOCO", "MISTO"],
      severidade: ["NENHUM", "LEVE", "MODERADO", "FORTE"],
      sexo_tipo: ["MASCULINO", "FEMININO", "OUTRO", "NAO_INFORMAR"],
    },
  },
} as const
