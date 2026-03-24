export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      appel_repartitions: {
        Row: {
          appel_id: string
          id: string
          repartition_id: string
        }
        Insert: {
          appel_id: string
          id?: string
          repartition_id: string
        }
        Update: {
          appel_id?: string
          id?: string
          repartition_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appel_repartitions_appel_id_fkey"
            columns: ["appel_id"]
            isOneToOne: false
            referencedRelation: "appels_paiement"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appel_repartitions_repartition_id_fkey"
            columns: ["repartition_id"]
            isOneToOne: false
            referencedRelation: "repartitions"
            referencedColumns: ["id"]
          },
        ]
      }
      appels_paiement: {
        Row: {
          copropriete_id: string
          created_at: string
          created_by: string
          date_echeance: string | null
          id: string
          membre_id: string
          montant_total: number
          pdf_url: string | null
          reference: string
          statut: Database["public"]["Enums"]["statut_paiement"]
          updated_at: string
        }
        Insert: {
          copropriete_id: string
          created_at?: string
          created_by: string
          date_echeance?: string | null
          id?: string
          membre_id: string
          montant_total: number
          pdf_url?: string | null
          reference?: string
          statut?: Database["public"]["Enums"]["statut_paiement"]
          updated_at?: string
        }
        Update: {
          copropriete_id?: string
          created_at?: string
          created_by?: string
          date_echeance?: string | null
          id?: string
          membre_id?: string
          montant_total?: number
          pdf_url?: string | null
          reference?: string
          statut?: Database["public"]["Enums"]["statut_paiement"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appels_paiement_copropriete_id_fkey"
            columns: ["copropriete_id"]
            isOneToOne: false
            referencedRelation: "coproprietes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appels_paiement_membre_id_fkey"
            columns: ["membre_id"]
            isOneToOne: false
            referencedRelation: "membres"
            referencedColumns: ["id"]
          },
        ]
      }
      categories_depenses: {
        Row: {
          copropriete_id: string | null
          created_at: string
          id: string
          is_global: boolean
          nom: string
        }
        Insert: {
          copropriete_id?: string | null
          created_at?: string
          id?: string
          is_global?: boolean
          nom: string
        }
        Update: {
          copropriete_id?: string | null
          created_at?: string
          id?: string
          is_global?: boolean
          nom?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_depenses_copropriete_id_fkey"
            columns: ["copropriete_id"]
            isOneToOne: false
            referencedRelation: "coproprietes"
            referencedColumns: ["id"]
          },
        ]
      }
      depots: {
        Row: {
          id: string
          membre_id: string
          copropriete_id: string
          montant: number
          date_depot: string
          reference: string | null
          created_at: string
        }
        Insert: {
          id?: string
          membre_id: string
          copropriete_id: string
          montant: number
          date_depot?: string
          reference?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          membre_id?: string
          copropriete_id?: string
          montant?: number
          date_depot?: string
          reference?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "depots_membre_id_fkey"
            columns: ["membre_id"]
            isOneToOne: false
            referencedRelation: "membres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depots_copropriete_id_fkey"
            columns: ["copropriete_id"]
            isOneToOne: false
            referencedRelation: "coproprietes"
            referencedColumns: ["id"]
          },
        ]
      }
      coproprietes: {
        Row: {
          adresse: string
          bic: string | null
          created_at: string
          devise: string
          iban: string
          id: string
          nom: string
          numero_societe: string | null
          updated_at: string
        }
        Insert: {
          adresse: string
          bic?: string | null
          created_at?: string
          devise?: string
          iban?: string
          id?: string
          nom: string
          numero_societe?: string | null
          updated_at?: string
        }
        Update: {
          adresse?: string
          bic?: string | null
          created_at?: string
          devise?: string
          iban?: string
          id?: string
          nom?: string
          numero_societe?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      depenses: {
        Row: {
          categorie_id: string | null
          copropriete_id: string
          created_at: string
          created_by: string
          date_depense: string
          description: string | null
          exercice_id: string
          frequence: Database["public"]["Enums"]["frequence_recurrence"]
          id: string
          is_recurrence_active: boolean
          justificatif_urls: string[] | null
          libelle: string
          montant_total: number
          updated_at: string
        }
        Insert: {
          categorie_id?: string | null
          copropriete_id: string
          created_at?: string
          created_by: string
          date_depense?: string
          description?: string | null
          exercice_id: string
          frequence?: Database["public"]["Enums"]["frequence_recurrence"]
          id?: string
          is_recurrence_active?: boolean
          justificatif_urls?: string[] | null
          libelle: string
          montant_total: number
          updated_at?: string
        }
        Update: {
          categorie_id?: string | null
          copropriete_id?: string
          created_at?: string
          created_by?: string
          date_depense?: string
          description?: string | null
          exercice_id?: string
          frequence?: Database["public"]["Enums"]["frequence_recurrence"]
          id?: string
          is_recurrence_active?: boolean
          justificatif_urls?: string[] | null
          libelle?: string
          montant_total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "depenses_categorie_id_fkey"
            columns: ["categorie_id"]
            isOneToOne: false
            referencedRelation: "categories_depenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depenses_copropriete_id_fkey"
            columns: ["copropriete_id"]
            isOneToOne: false
            referencedRelation: "coproprietes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depenses_exercice_id_fkey"
            columns: ["exercice_id"]
            isOneToOne: false
            referencedRelation: "exercices"
            referencedColumns: ["id"]
          },
        ]
      }
      exercices: {
        Row: {
          annee: number
          copropriete_id: string
          created_at: string
          date_debut: string
          date_fin: string
          id: string
          statut: Database["public"]["Enums"]["statut_exercice"]
          updated_at: string
        }
        Insert: {
          annee: number
          copropriete_id: string
          created_at?: string
          date_debut: string
          date_fin: string
          id?: string
          statut?: Database["public"]["Enums"]["statut_exercice"]
          updated_at?: string
        }
        Update: {
          annee?: number
          copropriete_id?: string
          created_at?: string
          date_debut?: string
          date_fin?: string
          id?: string
          statut?: Database["public"]["Enums"]["statut_exercice"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercices_copropriete_id_fkey"
            columns: ["copropriete_id"]
            isOneToOne: false
            referencedRelation: "coproprietes"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_audit: {
        Row: {
          action: string
          copropriete_id: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          copropriete_id: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          copropriete_id?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_audit_copropriete_id_fkey"
            columns: ["copropriete_id"]
            isOneToOne: false
            referencedRelation: "coproprietes"
            referencedColumns: ["id"]
          },
        ]
      }
      membres: {
        Row: {
          alias: string | null
          copropriete_id: string
          created_at: string
          date_adhesion: string | null
          id: string
          invitation_code: string | null
          invitation_email: string | null
          invitation_expires_at: string | null
          invitation_used_by: string | null
          is_active: boolean
          milliemes: number
          role: Database["public"]["Enums"]["membre_role"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          alias?: string | null
          copropriete_id: string
          created_at?: string
          date_adhesion?: string | null
          id?: string
          invitation_code?: string | null
          invitation_expires_at?: string | null
          invitation_used_by?: string | null
          is_active?: boolean
          milliemes?: number
          role?: Database["public"]["Enums"]["membre_role"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          alias?: string | null
          copropriete_id?: string
          created_at?: string
          date_adhesion?: string | null
          id?: string
          invitation_code?: string | null
          invitation_expires_at?: string | null
          invitation_used_by?: string | null
          is_active?: boolean
          milliemes?: number
          role?: Database["public"]["Enums"]["membre_role"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membres_copropriete_id_fkey"
            columns: ["copropriete_id"]
            isOneToOne: false
            referencedRelation: "coproprietes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membres_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      paiements: {
        Row: {
          appel_id: string
          confirmed_by: string
          created_at: string
          date_paiement: string
          id: string
          methode: string
          montant_paye: number
          preuve_paiement_url: string | null
          reference: string | null
        }
        Insert: {
          appel_id: string
          confirmed_by: string
          created_at?: string
          date_paiement?: string
          id?: string
          methode?: string
          montant_paye: number
          preuve_paiement_url?: string | null
          reference?: string | null
        }
        Update: {
          appel_id?: string
          confirmed_by?: string
          created_at?: string
          date_paiement?: string
          id?: string
          methode?: string
          montant_paye?: number
          preuve_paiement_url?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paiements_appel_id_fkey"
            columns: ["appel_id"]
            isOneToOne: false
            referencedRelation: "appels_paiement"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          adresse: string
          created_at: string
          email: string
          id: string
          nom: string
          numero_societe: string | null
          prenom: string
          societe: string | null
          telephone: string | null
          updated_at: string
        }
        Insert: {
          adresse?: string
          created_at?: string
          email: string
          id: string
          nom?: string
          numero_societe?: string | null
          prenom?: string
          societe?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          adresse?: string
          created_at?: string
          email?: string
          id?: string
          nom?: string
          numero_societe?: string | null
          prenom?: string
          societe?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      repartitions: {
        Row: {
          created_at: string
          depense_id: string
          id: string
          membre_id: string
          montant_du: number
          montant_override: number | null
          motif_override: string | null
          statut: Database["public"]["Enums"]["statut_paiement"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          depense_id: string
          id?: string
          membre_id: string
          montant_du: number
          montant_override?: number | null
          motif_override?: string | null
          statut?: Database["public"]["Enums"]["statut_paiement"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          depense_id?: string
          id?: string
          membre_id?: string
          montant_du?: number
          montant_override?: number | null
          motif_override?: string | null
          statut?: Database["public"]["Enums"]["statut_paiement"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repartitions_depense_id_fkey"
            columns: ["depense_id"]
            isOneToOne: false
            referencedRelation: "depenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repartitions_membre_id_fkey"
            columns: ["membre_id"]
            isOneToOne: false
            referencedRelation: "membres"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_category: { Args: { p_copro_id: string; p_nom: string }; Returns: string }
      claim_invitation: { Args: { p_invitation_code: string; p_milliemes: number }; Returns: unknown }
      close_exercice: { Args: { p_copro_id: string; p_exercice_id: string }; Returns: string }
      create_exercice: { Args: { p_copro_id: string; p_annee: number }; Returns: string }
      create_deposit: { Args: { p_copro_id: string; p_montant: number; p_reference: string | null; p_date: string }; Returns: string }
      get_dashboard_stats: { Args: { p_copro_id: string }; Returns: unknown }
      create_copro_with_member: { Args: { p_nom: string; p_adresse: string; p_numero_societe: string; p_iban: string; p_bic: string | null; p_milliemes: number }; Returns: string }
      create_depense_with_repartitions: { Args: { p_copro_id: string; p_exercice_id: string; p_libelle: string; p_montant_total: number; p_date_depense: string; p_description: string | null; p_categorie_id: string | null; p_frequence: string; p_justificatif_urls: string[] | null }; Returns: string }
      create_invitation_with_repartitions: { Args: { p_copro_id: string; p_alias: string; p_email: string | null; p_date_adhesion: string }; Returns: string }
      delete_category: { Args: { p_category_id: string }; Returns: undefined }
      delete_depense: { Args: { p_depense_id: string }; Returns: undefined }
      generate_payment: { Args: { p_copro_id: string; p_membre_id: string; p_repartition_ids: string[] }; Returns: unknown }
      get_appels: { Args: { p_copro_id: string; p_membre_id: string | null }; Returns: unknown }
      get_exercices: { Args: { p_copro_id: string }; Returns: unknown }
      get_export_data: { Args: { p_copro_id: string; p_exercice_id: string }; Returns: unknown }
      get_member_emails: { Args: { p_copro_id: string }; Returns: unknown }
      get_repartitions_en_cours: { Args: { p_copro_id: string }; Returns: unknown }
      get_categories: { Args: { p_copro_id: string }; Returns: unknown }
      get_copro_detail: { Args: { p_copro_id: string }; Returns: unknown }
      get_depenses: { Args: { p_copro_id: string; p_exercice_id: string }; Returns: unknown }
      get_user_copros: { Args: Record<string, never>; Returns: unknown }
      is_gestionnaire_of: { Args: { copro_id: string }; Returns: boolean }
      is_member_of: { Args: { copro_id: string }; Returns: boolean }
      mark_payment_as_paid: { Args: { p_appel_id: string; p_date_paiement: string; p_reference: string | null; p_preuve_paiement_url: string | null }; Returns: string }
      override_repartition: { Args: { p_repartition_id: string; p_montant: number; p_motif: string | null }; Returns: undefined }
      regenerate_invitation_code: { Args: { p_membre_id: string }; Returns: string }
      revoke_membre: { Args: { p_membre_id: string }; Returns: undefined }
      transfer_role: { Args: { p_from_membre_id: string; p_to_membre_id: string }; Returns: undefined }
      update_depense: { Args: { p_depense_id: string; p_libelle: string; p_montant_total: number; p_date_depense: string; p_description: string | null; p_categorie_id: string | null; p_frequence: string }; Returns: string }
      update_membre_milliemes: { Args: { p_membre_id: string; p_milliemes: number }; Returns: undefined }
      upload_proof_url: { Args: { p_paiement_id: string; p_url: string }; Returns: undefined }
    }
    Enums: {
      frequence_recurrence:
        | "unique"
        | "mensuelle"
        | "trimestrielle"
        | "annuelle"
      membre_role: "gestionnaire" | "coproprietaire"
      statut_exercice: "ouvert" | "cloture"
      statut_paiement: "en_cours" | "en_cours_paiement" | "paye"
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
      frequence_recurrence: [
        "unique",
        "mensuelle",
        "trimestrielle",
        "annuelle",
      ],
      membre_role: ["gestionnaire", "coproprietaire"],
      statut_exercice: ["ouvert", "cloture"],
      statut_paiement: ["en_cours", "en_cours_paiement", "paye"],
    },
  },
} as const
