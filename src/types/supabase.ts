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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      administrators: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          role: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      anticipations: {
        Row: {
          anticipation_number: string
          contract_id: number
          created_at: string | null
          discount_amount: number | null
          discount_percentage: number | null
          final_amount: number
          id: string
          installments_count: number
          notes: string | null
          original_amount: number
          payment_date: string | null
          payment_method: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          anticipation_number: string
          contract_id: number
          created_at?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          final_amount: number
          id?: string
          installments_count: number
          notes?: string | null
          original_amount: number
          payment_date?: string | null
          payment_method?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          anticipation_number?: string
          contract_id?: number
          created_at?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          final_amount?: number
          id?: string
          installments_count?: number
          notes?: string | null
          original_amount?: number
          payment_date?: string | null
          payment_method?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anticipations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          cpf_cnpj: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: number
          name: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: number
          name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: number
          name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      commission_tables: {
        Row: {
          commission_percentage: number
          created_at: string | null
          description: string | null
          id: number
          name: string
          payment_details: string | null
          payment_installments: number
        }
        Insert: {
          commission_percentage: number
          created_at?: string | null
          description?: string | null
          id?: number
          name: string
          payment_details?: string | null
          payment_installments: number
        }
        Update: {
          commission_percentage?: number
          created_at?: string | null
          description?: string | null
          id?: number
          name?: string
          payment_details?: string | null
          payment_installments?: number
        }
        Relationships: []
      }
      condicoes_antecipacao: {
        Row: {
          faixa_credito_id: number
          id: number
          percentual: number
          valor_calculado: number
        }
        Insert: {
          faixa_credito_id: number
          id?: number
          percentual: number
          valor_calculado: number
        }
        Update: {
          faixa_credito_id?: number
          id?: number
          percentual?: number
          valor_calculado?: number
        }
        Relationships: [
          {
            foreignKeyName: "condicoes_antecipacao_faixa_credito_id_fkey"
            columns: ["faixa_credito_id"]
            isOneToOne: false
            referencedRelation: "faixas_de_credito"
            referencedColumns: ["id"]
          },
        ]
      }
      condicoes_parcelas: {
        Row: {
          created_at: string | null
          faixa_credito_id: number
          id: number
          numero_parcela: number
          updated_at: string | null
          valor_parcela: number
        }
        Insert: {
          created_at?: string | null
          faixa_credito_id: number
          id?: number
          numero_parcela: number
          updated_at?: string | null
          valor_parcela: number
        }
        Update: {
          created_at?: string | null
          faixa_credito_id?: number
          id?: number
          numero_parcela?: number
          updated_at?: string | null
          valor_parcela?: number
        }
        Relationships: [
          {
            foreignKeyName: "condicoes_parcelas_faixa_credito_id_fkey"
            columns: ["faixa_credito_id"]
            isOneToOne: false
            referencedRelation: "faixas_de_credito"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_documents: {
        Row: {
          contract_id: number
          created_at: string | null
          document_type: string
          document_url: string
          id: number
          uploaded_at: string | null
        }
        Insert: {
          contract_id: number
          created_at?: string | null
          document_type: string
          document_url: string
          id?: number
          uploaded_at?: string | null
        }
        Update: {
          contract_id?: number
          created_at?: string | null
          document_type?: string
          document_url?: string
          id?: number
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_documents_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_signatures: {
        Row: {
          client_ip: string | null
          contract_id: number
          created_at: string | null
          id: number
          signature_image_url: string
          signed_at: string | null
          signer_cpf: string
          signer_name: string
        }
        Insert: {
          client_ip?: string | null
          contract_id: number
          created_at?: string | null
          id?: number
          signature_image_url: string
          signed_at?: string | null
          signer_cpf: string
          signer_name: string
        }
        Update: {
          client_ip?: string | null
          contract_id?: number
          created_at?: string | null
          id?: number
          signature_image_url?: string
          signed_at?: string | null
          signer_cpf?: string
          signer_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_signatures_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: number
          name: string
          updated_at: string | null
          visibility: string
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: number
          name: string
          updated_at?: string | null
          visibility?: string
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: number
          name?: string
          updated_at?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          client_id: number
          commission_table_id: number
          contract_code: string | null
          contract_content: string | null
          contract_number: string | null
          created_at: string | null
          credit_amount: string | null
          first_payment: string | null
          id: number
          paid_installments: number
          payment_term: string | null
          quota_id: string | null
          remaining_payments: string | null
          remaining_value: string | null
          representative_id: string
          status: Database["public"]["Enums"]["contract_status"]
          total_installments: number
          total_value: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: number
          commission_table_id: number
          contract_code?: string | null
          contract_content?: string | null
          contract_number?: string | null
          created_at?: string | null
          credit_amount?: string | null
          first_payment?: string | null
          id?: number
          paid_installments?: number
          payment_term?: string | null
          quota_id?: string | null
          remaining_payments?: string | null
          remaining_value?: string | null
          representative_id: string
          status?: Database["public"]["Enums"]["contract_status"]
          total_installments?: number
          total_value?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: number
          commission_table_id?: number
          contract_code?: string | null
          contract_content?: string | null
          contract_number?: string | null
          created_at?: string | null
          credit_amount?: string | null
          first_payment?: string | null
          id?: number
          paid_installments?: number
          payment_term?: string | null
          quota_id?: string | null
          remaining_payments?: string | null
          remaining_value?: string | null
          representative_id?: string
          status?: Database["public"]["Enums"]["contract_status"]
          total_installments?: number
          total_value?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_commission_table_id_fkey"
            columns: ["commission_table_id"]
            isOneToOne: false
            referencedRelation: "commission_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_installments: {
        Row: {
          created_at: string | null
          faixa_credito_id: number
          id: number
          numero_parcela: number
          updated_at: string | null
          valor_parcela: number
        }
        Insert: {
          created_at?: string | null
          faixa_credito_id: number
          id?: number
          numero_parcela: number
          updated_at?: string | null
          valor_parcela: number
        }
        Update: {
          created_at?: string | null
          faixa_credito_id?: number
          id?: number
          numero_parcela?: number
          updated_at?: string | null
          valor_parcela?: number
        }
        Relationships: [
          {
            foreignKeyName: "custom_installments_faixa_credito_id_fkey"
            columns: ["faixa_credito_id"]
            isOneToOne: false
            referencedRelation: "faixas_de_credito"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          file_url: string | null
          id: string
          name: string
          rejection_reason: string | null
          representative_id: string | null
          required: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string | null
          uploaded_at: string | null
        }
        Insert: {
          created_at?: string | null
          file_url?: string | null
          id?: string
          name: string
          rejection_reason?: string | null
          representative_id?: string | null
          required?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          uploaded_at?: string | null
        }
        Update: {
          created_at?: string | null
          file_url?: string | null
          id?: string
          name?: string
          rejection_reason?: string | null
          representative_id?: string | null
          required?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "representatives"
            referencedColumns: ["id"]
          },
        ]
      }
      electronic_signature_fields: {
        Row: {
          client_ip: string | null
          contract_id: number | null
          created_at: string | null
          id: number
          signature_id: string
          signature_url: string | null
          signed_at: string | null
          signer_cpf: string
          signer_name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          client_ip?: string | null
          contract_id?: number | null
          created_at?: string | null
          id?: number
          signature_id: string
          signature_url?: string | null
          signed_at?: string | null
          signer_cpf: string
          signer_name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          client_ip?: string | null
          contract_id?: number | null
          created_at?: string | null
          id?: number
          signature_id?: string
          signature_url?: string | null
          signed_at?: string | null
          signer_cpf?: string
          signer_name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "electronic_signature_fields_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      faixas_de_credito: {
        Row: {
          id: number
          numero_total_parcelas: number
          plano_id: number
          valor_credito: number
          valor_parcelas_restantes: number
          valor_primeira_parcela: number
        }
        Insert: {
          id?: number
          numero_total_parcelas?: number
          plano_id: number
          valor_credito: number
          valor_parcelas_restantes: number
          valor_primeira_parcela: number
        }
        Update: {
          id?: number
          numero_total_parcelas?: number
          plano_id?: number
          valor_credito?: number
          valor_parcelas_restantes?: number
          valor_primeira_parcela?: number
        }
        Relationships: [
          {
            foreignKeyName: "faixas_de_credito_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          available_quotas: number
          created_at: string | null
          description: string | null
          id: number
          name: string
          occupied_quotas: number
          total_quotas: number
          updated_at: string | null
        }
        Insert: {
          available_quotas?: number
          created_at?: string | null
          description?: string | null
          id?: number
          name: string
          occupied_quotas?: number
          total_quotas?: number
          updated_at?: string | null
        }
        Update: {
          available_quotas?: number
          created_at?: string | null
          description?: string | null
          id?: number
          name?: string
          occupied_quotas?: number
          total_quotas?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          contract_id: number
          due_date: string
          id: number
          installment_number: number
          invoice_code: string | null
          invoice_number: string | null
          notes: string | null
          paid_at: string | null
          payment_date: string | null
          payment_link_boleto: string | null
          payment_link_pix: string | null
          payment_method: string | null
          status: string
          value: number | null
        }
        Insert: {
          amount?: number
          contract_id: number
          due_date: string
          id?: number
          installment_number?: number
          invoice_code?: string | null
          invoice_number?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_date?: string | null
          payment_link_boleto?: string | null
          payment_link_pix?: string | null
          payment_method?: string | null
          status?: string
          value?: number | null
        }
        Update: {
          amount?: number
          contract_id?: number
          due_date?: string
          id?: number
          installment_number?: number
          invoice_code?: string | null
          invoice_number?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_date?: string | null
          payment_link_boleto?: string | null
          payment_link_pix?: string | null
          payment_method?: string | null
          status?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      planos: {
        Row: {
          ativo: boolean | null
          data_criacao: string | null
          descricao: string | null
          id: number
          nome: string
          visibility: string | null
        }
        Insert: {
          ativo?: boolean | null
          data_criacao?: string | null
          descricao?: string | null
          id?: number
          nome: string
          visibility?: string | null
        }
        Update: {
          ativo?: boolean | null
          data_criacao?: string | null
          descricao?: string | null
          id?: number
          nome?: string
          visibility?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          cnpj: string | null
          commission_code: string | null
          company_name: string | null
          created_at: string | null
          documents_approved: boolean | null
          documents_approved_at: string | null
          documents_approved_by: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          point_of_sale: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["user_status"]
        }
        Insert: {
          cnpj?: string | null
          commission_code?: string | null
          company_name?: string | null
          created_at?: string | null
          documents_approved?: boolean | null
          documents_approved_at?: string | null
          documents_approved_by?: string | null
          email: string
          full_name: string
          id: string
          phone?: string | null
          point_of_sale?: string | null
          role: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
        }
        Update: {
          cnpj?: string | null
          commission_code?: string | null
          company_name?: string | null
          created_at?: string | null
          documents_approved?: boolean | null
          documents_approved_at?: string | null
          documents_approved_by?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          point_of_sale?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_documents_approved_by_fkey"
            columns: ["documents_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quotas: {
        Row: {
          assigned_at: string | null
          contract_id: number | null
          created_at: string | null
          group_id: number
          id: number
          quota_number: number
          representative_id: string | null
          reserved_at: string | null
          reserved_by: string | null
          status: Database["public"]["Enums"]["quota_status"]
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          contract_id?: number | null
          created_at?: string | null
          group_id: number
          id?: number
          quota_number: number
          representative_id?: string | null
          reserved_at?: string | null
          reserved_by?: string | null
          status?: Database["public"]["Enums"]["quota_status"]
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          contract_id?: number | null
          created_at?: string | null
          group_id?: number
          id?: number
          quota_number?: number
          representative_id?: string | null
          reserved_at?: string | null
          reserved_by?: string | null
          status?: Database["public"]["Enums"]["quota_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotas_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotas_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotas_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotas_reserved_by_fkey"
            columns: ["reserved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      representative_documents: {
        Row: {
          document_type: string
          file_url: string
          id: number
          representative_id: string
          status: Database["public"]["Enums"]["document_status"]
          uploaded_at: string | null
        }
        Insert: {
          document_type: string
          file_url: string
          id?: number
          representative_id: string
          status?: Database["public"]["Enums"]["document_status"]
          uploaded_at?: string | null
        }
        Update: {
          document_type?: string
          file_url?: string
          id?: number
          representative_id?: string
          status?: Database["public"]["Enums"]["document_status"]
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "representative_documents_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      representatives: {
        Row: {
          cnpj: string | null
          commission_code: string | null
          commission_table: string | null
          contracts_count: number | null
          created_at: string
          email: string
          id: string
          name: string
          password_hash: string
          phone: string | null
          ponto_venda: string | null
          razao_social: string | null
          status: string | null
          total_sales: number | null
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          commission_code?: string | null
          commission_table?: string | null
          contracts_count?: number | null
          created_at?: string
          email: string
          id?: string
          name: string
          password_hash: string
          phone?: string | null
          ponto_venda?: string | null
          razao_social?: string | null
          status?: string | null
          total_sales?: number | null
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          commission_code?: string | null
          commission_table?: string | null
          contracts_count?: number | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          password_hash?: string
          phone?: string | null
          ponto_venda?: string | null
          razao_social?: string | null
          status?: string | null
          total_sales?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          id: number
          invoice_url: string
          processed_at: string | null
          rejection_reason: string | null
          representative_id: string
          request_code: string
          requested_at: string | null
          requested_value: number
          status: Database["public"]["Enums"]["withdrawal_status"]
        }
        Insert: {
          id?: number
          invoice_url: string
          processed_at?: string | null
          rejection_reason?: string | null
          representative_id: string
          request_code: string
          requested_at?: string | null
          requested_value: number
          status?: Database["public"]["Enums"]["withdrawal_status"]
        }
        Update: {
          id?: number
          invoice_url?: string
          processed_at?: string | null
          rejection_reason?: string | null
          representative_id?: string
          request_code?: string
          requested_at?: string | null
          requested_value?: number
          status?: Database["public"]["Enums"]["withdrawal_status"]
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_sample_contracts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_sample_contracts_for_rep: {
        Args: { rep_id: string }
        Returns: undefined
      }
      create_sample_invoices: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_anticipation_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_invoice_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      release_expired_reservations: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      contract_status:
        | "Ativo"
        | "Concluído"
        | "Faturado"
        | "Cancelado"
        | "Pendente"
        | "Em Análise"
        | "Em Atraso"
        | "Aprovado"
        | "Reprovado"
      document_status: "Pendente" | "Aprovado" | "Reprovado"
      quota_status: "Disponível" | "Reservada" | "Ocupada" | "Cancelada/Atraso"
      user_role: "Administrador" | "Suporte" | "Representante"
      user_status:
        | "Ativo"
        | "Inativo"
        | "Pendente de Aprovação"
        | "Documentos Pendentes"
        | "Pausado"
        | "Cancelado"
      withdrawal_status: "Pendente" | "Aprovado" | "Rejeitado"
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
      contract_status: [
        "Ativo",
        "Concluído",
        "Faturado",
        "Cancelado",
        "Pendente",
        "Em Análise",
        "Em Atraso",
        "Aprovado",
        "Reprovado",
      ],
      document_status: ["Pendente", "Aprovado", "Reprovado"],
      quota_status: ["Disponível", "Reservada", "Ocupada", "Cancelada/Atraso"],
      user_role: ["Administrador", "Suporte", "Representante"],
      user_status: [
        "Ativo",
        "Inativo",
        "Pendente de Aprovação",
        "Documentos Pendentes",
        "Pausado",
        "Cancelado",
      ],
      withdrawal_status: ["Pendente", "Aprovado", "Rejeitado"],
    },
  },
} as const
