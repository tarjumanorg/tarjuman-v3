export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
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
                    }
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
                    }
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
                    }
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
