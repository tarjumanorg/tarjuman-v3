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
            order_files: {
                Row: {
                    file_path: string
                    file_type: string | null
                    id: string
                    order_id: string
                    page_count: number | null
                    uploaded_at: string | null
                }
                Insert: {
                    file_path: string
                    file_type?: string | null
                    id?: string
                    order_id: string
                    page_count?: number | null
                    uploaded_at?: string | null
                }
                Update: {
                    file_path?: string
                    file_type?: string | null
                    id?: string
                    order_id?: string
                    page_count?: number | null
                    uploaded_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "order_files_order_id_fkey"
                        columns: ["order_id"]
                        isOneToOne: false
                        referencedRelation: "orders"
                        referencedColumns: ["id"]
                    },
                ]
            }
            order_timeline: {
                Row: {
                    created_at: string | null
                    id: string
                    notes: string | null
                    order_id: string | null
                    status: string
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    notes?: string | null
                    order_id?: string | null
                    status: string
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    notes?: string | null
                    order_id?: string | null
                    status?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "order_timeline_order_id_fkey"
                        columns: ["order_id"]
                        isOneToOne: false
                        referencedRelation: "orders"
                        referencedColumns: ["id"]
                    },
                ]
            }
            orders: {
                Row: {
                    created_at: string
                    currency: string | null
                    final_price: number | null
                    hard_copy_address: string | null
                    id: string
                    original_filename: string | null
                    original_price: number | null
                    page_count_estimated: number | null
                    page_count_verified: number | null
                    payment_status: string | null
                    physical_copy: boolean | null
                    status: string | null
                    storage_path_final: string | null
                    storage_path_source: string | null
                    updated_at: string
                    urgency_days: number | null
                    user_id: string
                }
                Insert: {
                    created_at?: string
                    currency?: string | null
                    final_price?: number | null
                    hard_copy_address?: string | null
                    id?: string
                    original_filename?: string | null
                    original_price?: number | null
                    page_count_estimated?: number | null
                    page_count_verified?: number | null
                    payment_status?: string | null
                    physical_copy?: boolean | null
                    status?: string | null
                    storage_path_final?: string | null
                    storage_path_source?: string | null
                    updated_at?: string
                    urgency_days?: number | null
                    user_id: string
                }
                Update: {
                    created_at?: string
                    currency?: string | null
                    final_price?: number | null
                    hard_copy_address?: string | null
                    id?: string
                    original_filename?: string | null
                    original_price?: number | null
                    page_count_estimated?: number | null
                    page_count_verified?: number | null
                    payment_status?: string | null
                    physical_copy?: boolean | null
                    status?: string | null
                    storage_path_final?: string | null
                    storage_path_source?: string | null
                    updated_at?: string
                    urgency_days?: number | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "fk_orders_profiles"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            profiles: {
                Row: {
                    created_at: string
                    email: string | null
                    full_name: string | null
                    id: string
                    is_institution: boolean | null
                    is_underprivileged: boolean | null
                    role: string | null
                    whatsapp_number: string | null
                }
                Insert: {
                    created_at?: string
                    email?: string | null
                    full_name?: string | null
                    id: string
                    is_institution?: boolean | null
                    is_underprivileged?: boolean | null
                    role?: string | null
                    whatsapp_number?: string | null
                }
                Update: {
                    created_at?: string
                    email?: string | null
                    full_name?: string | null
                    id?: string
                    is_institution?: boolean | null
                    is_underprivileged?: boolean | null
                    role?: string | null
                    whatsapp_number?: string | null
                }
                Relationships: []
            }
            promo_codes: {
                Row: {
                    active: boolean
                    code: string
                    created_at: string | null
                    current_uses: number
                    discount_percent: number
                    id: string
                    max_uses: number
                    valid_from: string
                    valid_until: string
                }
                Insert: {
                    active?: boolean
                    code: string
                    created_at?: string | null
                    current_uses?: number
                    discount_percent: number
                    id?: string
                    max_uses?: number
                    valid_from?: string
                    valid_until: string
                }
                Update: {
                    active?: boolean
                    code?: string
                    created_at?: string | null
                    current_uses?: number
                    discount_percent?: number
                    id?: string
                    max_uses?: number
                    valid_from?: string
                    valid_until?: string
                }
                Relationships: []
            }
            scholarship_requirements: {
                Row: {
                    active: boolean
                    created_at: string | null
                    document_name: string
                    document_name_ar: string | null
                    id: string
                    is_required: boolean
                    notes: string | null
                    scholarship_name: string
                    sort_order: number
                    typical_pages: number
                    year: number
                }
                Insert: {
                    active?: boolean
                    created_at?: string | null
                    document_name: string
                    document_name_ar?: string | null
                    id?: string
                    is_required?: boolean
                    notes?: string | null
                    scholarship_name?: string
                    sort_order?: number
                    typical_pages?: number
                    year?: number
                }
                Update: {
                    active?: boolean
                    created_at?: string | null
                    document_name?: string
                    document_name_ar?: string | null
                    id?: string
                    is_required?: boolean
                    notes?: string | null
                    scholarship_name?: string
                    sort_order?: number
                    typical_pages?: number
                    year?: number
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            is_admin: { Args: never; Returns: boolean }
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
