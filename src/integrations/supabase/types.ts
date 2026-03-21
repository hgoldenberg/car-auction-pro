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
      activity_log: {
        Row: {
          action: string
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      auction_group_publications: {
        Row: {
          auction_id: string
          created_at: string
          error_message: string | null
          external_message_id: string | null
          group_id: string
          id: string
          message_id: string | null
          publication_type: string
          published_at: string | null
          status: Database["public"]["Enums"]["publication_status"]
        }
        Insert: {
          auction_id: string
          created_at?: string
          error_message?: string | null
          external_message_id?: string | null
          group_id: string
          id?: string
          message_id?: string | null
          publication_type?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["publication_status"]
        }
        Update: {
          auction_id?: string
          created_at?: string
          error_message?: string | null
          external_message_id?: string | null
          group_id?: string
          id?: string
          message_id?: string | null
          publication_type?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["publication_status"]
        }
        Relationships: [
          {
            foreignKeyName: "auction_group_publications_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_group_publications_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "telegram_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      auctions: {
        Row: {
          bid_count: number | null
          created_at: string
          current_high_bid: number | null
          end_date: string | null
          id: string
          reserve_price: number | null
          start_date: string | null
          starting_price: number | null
          status: Database["public"]["Enums"]["auction_status"]
          title: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          bid_count?: number | null
          created_at?: string
          current_high_bid?: number | null
          end_date?: string | null
          id?: string
          reserve_price?: number | null
          start_date?: string | null
          starting_price?: number | null
          status?: Database["public"]["Enums"]["auction_status"]
          title: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          bid_count?: number | null
          created_at?: string
          current_high_bid?: number | null
          end_date?: string | null
          id?: string
          reserve_price?: number | null
          start_date?: string | null
          starting_price?: number | null
          status?: Database["public"]["Enums"]["auction_status"]
          title?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auctions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          amount: number
          auction_id: string
          created_at: string
          id: string
          lead_id: string
          notes: string | null
          status: Database["public"]["Enums"]["bid_status"]
        }
        Insert: {
          amount: number
          auction_id: string
          created_at?: string
          id?: string
          lead_id: string
          notes?: string | null
          status?: Database["public"]["Enums"]["bid_status"]
        }
        Update: {
          amount?: number
          auction_id?: string
          created_at?: string
          id?: string
          lead_id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["bid_status"]
        }
        Relationships: [
          {
            foreignKeyName: "bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          lead_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          city: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          last_activity_at: string | null
          latest_bid_amount: number | null
          origin_group_id: string | null
          phone: string | null
          status: Database["public"]["Enums"]["lead_status"]
          telegram_username: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          last_activity_at?: string | null
          latest_bid_amount?: number | null
          origin_group_id?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          telegram_username?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          last_activity_at?: string | null
          latest_bid_amount?: number | null
          origin_group_id?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          telegram_username?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_origin_group_id_fkey"
            columns: ["origin_group_id"]
            isOneToOne: false
            referencedRelation: "telegram_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_bot_state: {
        Row: {
          id: number
          update_offset: number
          updated_at: string
        }
        Insert: {
          id: number
          update_offset?: number
          updated_at?: string
        }
        Update: {
          id?: number
          update_offset?: number
          updated_at?: string
        }
        Relationships: []
      }
      telegram_chat_context: {
        Row: {
          auction_id: string
          chat_id: number
          created_at: string
          telegram_first_name: string | null
          telegram_user_id: number | null
          telegram_username: string | null
          updated_at: string
        }
        Insert: {
          auction_id: string
          chat_id: number
          created_at?: string
          telegram_first_name?: string | null
          telegram_user_id?: number | null
          telegram_username?: string | null
          updated_at?: string
        }
        Update: {
          auction_id?: string
          chat_id?: number
          created_at?: string
          telegram_first_name?: string | null
          telegram_user_id?: number | null
          telegram_username?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      telegram_groups: {
        Row: {
          chat_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_real_group: boolean
          member_count: number | null
          name: string
          notes: string | null
        }
        Insert: {
          chat_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_real_group?: boolean
          member_count?: number | null
          name: string
          notes?: string | null
        }
        Update: {
          chat_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_real_group?: boolean
          member_count?: number | null
          name?: string
          notes?: string | null
        }
        Relationships: []
      }
      vehicle_images: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_main: boolean
          storage_path: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_main?: boolean
          storage_path: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_main?: boolean
          storage_path?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_images_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          doors: number | null
          fuel_type: string | null
          id: string
          km: number | null
          make: string
          model: string
          reserve_price: number | null
          status: Database["public"]["Enums"]["vehicle_status"]
          transmission: string | null
          trim: string | null
          updated_at: string
          vin: string | null
          year: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          doors?: number | null
          fuel_type?: string | null
          id?: string
          km?: number | null
          make: string
          model: string
          reserve_price?: number | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          transmission?: string | null
          trim?: string | null
          updated_at?: string
          vin?: string | null
          year: number
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          doors?: number | null
          fuel_type?: string | null
          id?: string
          km?: number | null
          make?: string
          model?: string
          reserve_price?: number | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          transmission?: string | null
          trim?: string | null
          updated_at?: string
          vin?: string | null
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      auction_status:
        | "draft"
        | "scheduled"
        | "active"
        | "paused"
        | "closed"
        | "awarded"
        | "cancelled"
      bid_status:
        | "submitted"
        | "valid"
        | "rejected"
        | "leading"
        | "outbid"
        | "winning"
        | "cancelled"
      lead_status:
        | "new"
        | "interested"
        | "bid_once"
        | "active_bidder"
        | "finalist"
        | "winner"
        | "lost"
        | "follow_up"
        | "closed"
      publication_status: "pending" | "posted" | "failed"
      vehicle_status: "draft" | "ready" | "published" | "sold" | "archived"
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
      auction_status: [
        "draft",
        "scheduled",
        "active",
        "paused",
        "closed",
        "awarded",
        "cancelled",
      ],
      bid_status: [
        "submitted",
        "valid",
        "rejected",
        "leading",
        "outbid",
        "winning",
        "cancelled",
      ],
      lead_status: [
        "new",
        "interested",
        "bid_once",
        "active_bidder",
        "finalist",
        "winner",
        "lost",
        "follow_up",
        "closed",
      ],
      publication_status: ["pending", "posted", "failed"],
      vehicle_status: ["draft", "ready", "published", "sold", "archived"],
    },
  },
} as const
