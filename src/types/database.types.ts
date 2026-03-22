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
      invitations: {
        Row: {
          code: string
          copropriete_id: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          is_used: boolean
          membre_id: string | null
          used_by: string | null
        }
        Insert: {
          code?: string
          copropriete_id: string
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          is_used?: boolean
          membre_id?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          copropriete_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          membre_id?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_copropriete_id_fkey"
            columns: ["copropriete_id"]
            isOneToOne: false
            referencedRelation: "coproprietes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_membre_id_fkey"
            columns: ["membre_id"]
            isOneToOne: false
            referencedRelation: "membres"
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
          invitation_id: string | null
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
          invitation_id?: string | null
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
          invitation_id?: string | null
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
            foreignKeyName: "membres_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
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
      is_gestionnaire_of: { Args: { copro_id: string }; Returns: boolean }
      is_member_of: { Args: { copro_id: string }; Returns: boolean }
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
