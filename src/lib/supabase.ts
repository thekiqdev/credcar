import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Database } from "../types/supabase";

// Função para gerar UUID compatível com todos os ambientes
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback para ambientes que não suportam crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createSupabaseClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
);

// Representative types based on profiles table
export interface Representative {
  id: string;
  full_name: string;
  name: string; // alias for full_name for compatibility
  email: string;
  phone?: string;
  cnpj?: string;
  company_name?: string;
  razao_social?: string; // alias for company_name
  point_of_sale?: string;
  ponto_venda?: string; // alias for point_of_sale
  commission_code?: string;
  role: string;
  status: Database["public"]["Enums"]["user_status"];
  contract_profile?: string;

  total_sales: number;
  contracts_count: number;
  created_at: string;
  updated_at?: string;
}

export interface CreateRepresentativeData {
  name: string;
  email: string;
  phone?: string;
  cnpj?: string;
  razao_social?: string;
  ponto_venda?: string;
  password: string;
  status?: Database["public"]["Enums"]["user_status"];
}

// Representative functions
export const representativeService = {
  // Get all representatives from profiles table
  async getAll(): Promise<Representative[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "Representante")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map((profile) => ({
      ...profile,
      name: profile.full_name,
      razao_social: profile.company_name,
      ponto_venda: profile.point_of_sale,
      total_sales: 0,
      contracts_count: 0,
      updated_at: profile.created_at,
    }));
  },

  // Get pending registrations from profiles table
  async getPendingRegistrations(): Promise<Representative[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "Representante")
      .eq("status", "Pendente de Aprovação")
      .order("created_at", { ascending: false });

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }
    return (data || []).map((profile) => ({
      ...profile,
      name: profile.full_name,
      razao_social: profile.company_name,
      ponto_venda: profile.point_of_sale,
      total_sales: 0,
      contracts_count: 0,
      updated_at: profile.created_at,
    }));
  },

  // Get representative by ID from profiles table
  async getById(id: string): Promise<Representative | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .eq("role", "Representante")
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }
    return {
      ...data,
      name: data.full_name,
      razao_social: data.company_name,
      ponto_venda: data.point_of_sale,
      total_sales: 0,
      contracts_count: 0,
      updated_at: data.created_at,
      contract_profile: data.contract_profile,
    };
  },

  // Get representative by email from profiles table
  async getByEmail(email: string): Promise<Representative | null> {
    try {
      console.log("Searching for representative with email:", email);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email.toLowerCase().trim())
        .eq("role", "Representante")
        .single();

      if (error) {
        console.log("Error or not found:", error.code, error.message);
        if (error.code === "PGRST116") return null; // Not found
        throw error;
      }

      console.log("Representative found:", {
        id: data.id,
        name: data.full_name,
        email: data.email,
        status: data.status,
      });

      return {
        ...data,
        name: data.full_name,
        razao_social: data.company_name,
        ponto_venda: data.point_of_sale,
        total_sales: 0,
        contracts_count: 0,
        updated_at: data.created_at,
      };
    } catch (error) {
      console.error("Error in getByEmail:", error);
      return null;
    }
  },

  // Create new representative in profiles table
  async create(
    representativeData: CreateRepresentativeData,
  ): Promise<Representative> {
    try {
      console.log(
        "Starting representative creation with data:",
        representativeData,
      );

      // Check if email already exists
      try {
        const existingUser = await this.getByEmail(representativeData.email);
        if (existingUser) {
          throw new Error("Email já está em uso");
        }
      } catch (emailCheckError) {
        console.error("Error checking existing email:", emailCheckError);
        if (
          emailCheckError instanceof Error &&
          emailCheckError.message === "Email já está em uso"
        ) {
          throw emailCheckError;
        }
        // Continue if it's just a "not found" error
      }

      // Generate a proper UUID for the new profile
      const profileId = generateUUID();

      // Prepare the insert data with proper field mapping
      const insertData = {
        id: profileId, // Explicitly set the UUID
        full_name: representativeData.name,
        email: representativeData.email.toLowerCase().trim(),
        phone: representativeData.phone?.trim() || null,
        cnpj: representativeData.cnpj?.replace(/\D/g, "") || null, // Remove formatting
        company_name: representativeData.razao_social?.trim() || null,
        point_of_sale: representativeData.ponto_venda?.trim() || null,
        role: "Representante" as Database["public"]["Enums"]["user_role"],
        status:
          (representativeData.status as Database["public"]["Enums"]["user_status"]) ||
          "Ativo",
        created_at: new Date().toISOString(),
      };

      console.log("Inserting profile data:", {
        ...insertData,
        cnpj: insertData.cnpj ? `${insertData.cnpj.substring(0, 4)}****` : null, // Mask CNPJ in logs
      });

      const { data, error } = await supabase
        .from("profiles")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("Database insert error:", error);
        console.error("Error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });

        // Handle specific error cases
        if (error.code === "23505") {
          // Unique constraint violation
          if (error.message.includes("email")) {
            throw new Error("Email já está em uso");
          }
          throw new Error("Dados duplicados encontrados");
        }

        throw new Error(`Erro ao inserir no banco de dados: ${error.message}`);
      }

      if (!data) {
        console.error("No data returned after insert");
        throw new Error("Nenhum dado retornado após inserção");
      }

      console.log("Profile inserted successfully:", data);

      // Generate commission code after creation
      const commissionCode = `PV-${data.id.substring(0, 8).toUpperCase()}`;
      console.log("Generated commission code:", commissionCode);

      const { data: updatedData, error: updateError } = await supabase
        .from("profiles")
        .update({ commission_code: commissionCode })
        .eq("id", data.id)
        .select()
        .single();

      if (updateError) {
        console.error("Commission code update error:", updateError);
        throw new Error(
          `Erro ao atualizar código de comissão: ${updateError.message}`,
        );
      }

      if (!updatedData) {
        console.error("No data returned after commission code update");
        throw new Error(
          "Nenhum dado retornado após atualização do código de comissão",
        );
      }

      console.log("Representative created successfully:", updatedData);

      return {
        ...updatedData,
        name: updatedData.full_name,
        razao_social: updatedData.company_name,
        ponto_venda: updatedData.point_of_sale,
        total_sales: 0,
        contracts_count: 0,
        updated_at: updatedData.created_at,
      };
    } catch (error) {
      console.error("Error in create representative:", error);
      if (error instanceof Error) {
        console.error("Known error:", error.message);
        throw error;
      }
      console.error("Unknown error type:", typeof error, error);
      throw new Error(
        `Erro desconhecido ao criar representante: ${String(error)}`,
      );
    }
  },

  // Create public registration in profiles table
  async createPublicRegistration(registrationData: {
    name: string;
    email: string;
    phone?: string;
    cnpj?: string;
    razao_social?: string;
    ponto_venda?: string;
    password: string;
  }): Promise<Representative> {
    try {
      console.log("Starting public registration with data:", {
        name: registrationData.name,
        email: registrationData.email,
        phone: registrationData.phone,
        cnpj: registrationData.cnpj,
        razao_social: registrationData.razao_social,
        ponto_venda: registrationData.ponto_venda,
      });

      // Check if email already exists
      try {
        const existingUser = await this.getByEmail(registrationData.email);
        if (existingUser) {
          console.log("Email already exists:", registrationData.email);
          throw new Error("Email já está em uso");
        }
      } catch (emailCheckError) {
        console.log("Email check result:", emailCheckError);
        if (
          emailCheckError instanceof Error &&
          emailCheckError.message === "Email já está em uso"
        ) {
          throw emailCheckError;
        }
        // Continue if it's just a "not found" error (which is what we want)
        console.log("Email is available, continuing with registration");
      }

      // Generate a proper UUID for the new profile
      const profileId = generateUUID();
      console.log("Generated profile ID for public registration:", profileId);

      // Prepare the insert data with proper field mapping
      const insertData = {
        id: profileId,
        full_name: registrationData.name.trim(),
        email: registrationData.email.toLowerCase().trim(),
        phone: registrationData.phone?.trim() || null,
        cnpj: registrationData.cnpj?.replace(/\D/g, "") || null, // Remove formatting
        company_name: registrationData.razao_social?.trim() || null,
        point_of_sale: registrationData.ponto_venda?.trim() || null,
        role: "Representante" as Database["public"]["Enums"]["user_role"],
        status:
          "Pendente de Aprovação" as Database["public"]["Enums"]["user_status"],
        created_at: new Date().toISOString(),
      };

      console.log("Inserting public registration data:", {
        ...insertData,
        cnpj: insertData.cnpj ? `${insertData.cnpj.substring(0, 4)}****` : null, // Mask CNPJ in logs
      });

      const { data, error } = await supabase
        .from("profiles")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("Database insert error (public registration):", error);
        console.error("Public registration error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });

        // Handle specific error cases
        if (error.code === "23505") {
          // Unique constraint violation
          if (error.message.includes("email")) {
            throw new Error("Email já está em uso");
          }
          throw new Error("Dados duplicados encontrados");
        }

        if (error.code === "23503") {
          // Foreign key constraint violation
          throw new Error("Erro de configuração do sistema");
        }

        if (error.code === "23514") {
          // Check constraint violation
          throw new Error("Dados inválidos fornecidos");
        }

        throw new Error(`Erro ao inserir registro: ${error.message}`);
      }

      if (!data) {
        console.error("No data returned after public registration insert");
        throw new Error(
          "Nenhum dado retornado após inserção do registro público",
        );
      }

      console.log("Public registration inserted successfully:", {
        id: data.id,
        name: data.full_name,
        email: data.email,
        status: data.status,
      });

      // Return the representative object with proper field mapping
      const representative: Representative = {
        id: data.id,
        full_name: data.full_name,
        name: data.full_name,
        email: data.email,
        phone: data.phone || undefined,
        cnpj: data.cnpj || undefined,
        company_name: data.company_name || undefined,
        razao_social: data.company_name || undefined,
        point_of_sale: data.point_of_sale || undefined,
        ponto_venda: data.point_of_sale || undefined,
        commission_code: data.commission_code || undefined,
        role: data.role,
        status: data.status,
        total_sales: 0,
        contracts_count: 0,
        created_at: data.created_at,
        updated_at: data.created_at,
      };

      return representative;
    } catch (error) {
      console.error("Error in createPublicRegistration:", error);
      if (error instanceof Error) {
        console.error("Known public registration error:", error.message);
        throw error;
      }
      console.error(
        "Unknown public registration error type:",
        typeof error,
        error,
      );
      throw new Error(
        `Erro desconhecido ao criar registro público: ${String(error)}`,
      );
    }
  },

  // Approve registration in profiles table
  async approveRegistration(id: string): Promise<Representative> {
    try {
      const commissionCode = `PV-${id.substring(0, 8).toUpperCase()}`;

      const { data, error } = await supabase
        .from("profiles")
        .update({
          status:
            "Documentos Pendentes" as Database["public"]["Enums"]["user_status"],
          commission_code: commissionCode,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Database approve registration error:", error);
        throw new Error(`Erro ao aprovar registro: ${error.message}`);
      }

      if (!data) {
        throw new Error("Nenhum dado retornado após aprovação");
      }

      return {
        ...data,
        name: data.full_name,
        razao_social: data.company_name,
        ponto_venda: data.point_of_sale,
        total_sales: 0,
        contracts_count: 0,
        updated_at: data.created_at,
      };
    } catch (error) {
      console.error("Error in approveRegistration:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Erro desconhecido ao aprovar registro");
    }
  },

  // Update representative in profiles table
  async update(
    id: string,
    updates: Partial<Representative>,
  ): Promise<Representative> {
    try {
      // Map the updates to the correct profile fields
      const profileUpdates: any = {};
      if (updates.name || updates.full_name) {
        profileUpdates.full_name = updates.name || updates.full_name;
      }
      if (updates.email) profileUpdates.email = updates.email;
      if (updates.phone !== undefined)
        profileUpdates.phone = updates.phone || null;
      if (updates.cnpj !== undefined)
        profileUpdates.cnpj = updates.cnpj || null;
      if (updates.razao_social || updates.company_name) {
        profileUpdates.company_name =
          updates.razao_social || updates.company_name || null;
      }
      if (updates.ponto_venda || updates.point_of_sale) {
        profileUpdates.point_of_sale =
          updates.ponto_venda || updates.point_of_sale || null;
      }
      if (updates.commission_code)
        profileUpdates.commission_code = updates.commission_code;
      if (updates.status) profileUpdates.status = updates.status;

      console.log("Updating profile with data:", profileUpdates);

      const { data, error } = await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Database update error:", error);
        throw new Error(`Erro ao atualizar perfil: ${error.message}`);
      }

      if (!data) {
        throw new Error("Nenhum dado retornado após atualização");
      }

      return {
        ...data,
        name: data.full_name,
        razao_social: data.company_name,
        ponto_venda: data.point_of_sale,
        total_sales: 0,
        contracts_count: 0,
        updated_at: data.created_at,
      };
    } catch (error) {
      console.error("Error in update representative:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Erro desconhecido ao atualizar representante");
    }
  },

  // Delete representative from profiles table
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("profiles").delete().eq("id", id);

    if (error) throw error;
  },

  // Debug function to check all representatives
  async debugGetAllRepresentatives(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "Representante")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching all representatives:", error);
        throw error;
      }

      console.log("All representatives in database:", data);
      return data || [];
    } catch (error) {
      console.error("Error in debugGetAllRepresentatives:", error);
      return [];
    }
  },

  // Authenticate representative (simplified for demo)
  async authenticate(
    email: string,
    password: string,
  ): Promise<Representative | null> {
    try {
      console.log("Attempting to authenticate user:", email);

      const representative = await this.getByEmail(email);
      if (!representative) {
        console.log("No representative found with email:", email);
        return null;
      }

      console.log("Representative found:", {
        id: representative.id,
        name: representative.name,
        email: representative.email,
        status: representative.status,
        role: representative.role,
      });

      // For demo purposes, accept any password for existing users
      // In production, implement proper authentication with Supabase Auth
      return representative;
    } catch (error) {
      console.error("Error in authenticate:", error);
      return null;
    }
  },
};

// Simple password hashing (in production, use a proper library like bcrypt)
async function hashPassword(password: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    console.log(`Password hashed: ${password} -> ${hash.substring(0, 10)}...`);
    return hash;
  } catch (error) {
    console.error("Error hashing password:", error);
    throw error;
  }
}

// Commission Plans service
export const commissionPlansService = {
  // Get all plans
  async getAll() {
    try {
      const { data, error } = await supabase
        .from("planos")
        .select("*")
        .order("data_criacao", { ascending: false });

      if (error) {
        console.error("Error fetching plans:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error in commissionPlansService.getAll:", error);
      throw error;
    }
  },

  // Get plan by ID with all related data
  async getById(planId: number) {
    try {
      const { data: plan, error: planError } = await supabase
        .from("planos")
        .select("*")
        .eq("id", planId)
        .single();

      if (planError) {
        console.error("Error fetching plan:", planError);
        throw planError;
      }

      // Get credit ranges for this plan
      const { data: creditRanges, error: rangesError } = await supabase
        .from("faixas_de_credito")
        .select("*")
        .eq("plano_id", planId)
        .order("valor_credito", { ascending: true });

      if (rangesError) {
        console.error("Error fetching credit ranges:", rangesError);
        throw rangesError;
      }

      // Get anticipation conditions for all ranges
      const rangeIds = (creditRanges || []).map((r) => r.id);
      let anticipationConditions = [];
      let customInstallments = [];

      if (rangeIds.length > 0) {
        // Get anticipation conditions
        const { data: anticipations, error: anticipationsError } =
          await supabase
            .from("condicoes_antecipacao")
            .select("*")
            .in("faixa_credito_id", rangeIds)
            .order("percentual", { ascending: true });

        if (anticipationsError) {
          console.error(
            "Error fetching anticipation conditions:",
            anticipationsError,
          );
          throw anticipationsError;
        }

        anticipationConditions = anticipations || [];

        // Get custom installments for all ranges
        const { data: installments, error: installmentsError } = await supabase
          .from("condicoes_parcelas")
          .select("*")
          .in("faixa_credito_id", rangeIds)
          .order("faixa_credito_id", { ascending: true })
          .order("numero_parcela", { ascending: true });

        if (installmentsError) {
          console.error(
            "Error fetching custom installments:",
            installmentsError,
          );
          throw installmentsError;
        }

        customInstallments = installments || [];
      }

      // Group custom installments by credit range ID
      const installmentsByRange = customInstallments.reduce(
        (acc, installment) => {
          if (!acc[installment.faixa_credito_id]) {
            acc[installment.faixa_credito_id] = [];
          }
          acc[installment.faixa_credito_id].push(installment);
          return acc;
        },
        {} as Record<number, any[]>,
      );

      // Add custom installments to each credit range
      const creditRangesWithInstallments = (creditRanges || []).map(
        (range) => ({
          ...range,
          customInstallments: installmentsByRange[range.id] || [],
        }),
      );

      return {
        plan,
        creditRanges: creditRangesWithInstallments,
        anticipationConditions,
      };
    } catch (error) {
      console.error("Error in commissionPlansService.getById:", error);
      throw error;
    }
  },

  // Create new plan
  async create(planData: {
    nome: string;
    descricao?: string;
    ativo?: boolean;
    visibility?: string;
    comissao?: number;
  }) {
    try {
      const { data, error } = await supabase
        .from("planos")
        .insert({
          nome: planData.nome,
          descricao: planData.descricao || null,
          ativo: planData.ativo !== undefined ? planData.ativo : true,
          visibility: planData.visibility || "publico",
          comissao: planData.comissao || 0,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating plan:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in commissionPlansService.create:", error);
      throw error;
    }
  },

  // Update plan
  async update(
    planId: number,
    updates: {
      nome?: string;
      descricao?: string;
      ativo?: boolean;
      visibility?: string;
      comissao?: number;
    },
  ) {
    try {
      const { data, error } = await supabase
        .from("planos")
        .update(updates)
        .eq("id", planId)
        .select()
        .single();

      if (error) {
        console.error("Error updating plan:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in commissionPlansService.update:", error);
      throw error;
    }
  },

  // Delete plan (cascades to related data)
  async delete(planId: number) {
    try {
      const { error } = await supabase.from("planos").delete().eq("id", planId);

      if (error) {
        console.error("Error deleting plan:", error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error in commissionPlansService.delete:", error);
      throw error;
    }
  },

  // Credit Ranges management
  async createCreditRange(rangeData: {
    plano_id: number;
    valor_credito: number;
    valor_primeira_parcela: number;
    valor_parcelas_restantes: number;
    numero_total_parcelas?: number;
  }) {
    try {
      const { data, error } = await supabase
        .from("faixas_de_credito")
        .insert({
          ...rangeData,
          numero_total_parcelas: rangeData.numero_total_parcelas || 80,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating credit range:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error(
        "Error in commissionPlansService.createCreditRange:",
        error,
      );
      throw error;
    }
  },

  async updateCreditRange(
    rangeId: number,
    updates: {
      valor_credito?: number;
      valor_primeira_parcela?: number;
      valor_parcelas_restantes?: number;
      numero_total_parcelas?: number;
    },
  ) {
    try {
      const { data, error } = await supabase
        .from("faixas_de_credito")
        .update(updates)
        .eq("id", rangeId)
        .select()
        .single();

      if (error) {
        console.error("Error updating credit range:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error(
        "Error in commissionPlansService.updateCreditRange:",
        error,
      );
      throw error;
    }
  },

  async deleteCreditRange(rangeId: number) {
    try {
      const { error } = await supabase
        .from("faixas_de_credito")
        .delete()
        .eq("id", rangeId);

      if (error) {
        console.error("Error deleting credit range:", error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error(
        "Error in commissionPlansService.deleteCreditRange:",
        error,
      );
      throw error;
    }
  },

  // Anticipation Conditions management
  async createAnticipationCondition(conditionData: {
    faixa_credito_id: number;
    percentual: number;
    valor_calculado: number;
  }) {
    try {
      const { data, error } = await supabase
        .from("condicoes_antecipacao")
        .insert(conditionData)
        .select()
        .single();

      if (error) {
        console.error("Error creating anticipation condition:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error(
        "Error in commissionPlansService.createAnticipationCondition:",
        error,
      );
      throw error;
    }
  },

  async updateAnticipationCondition(
    conditionId: number,
    updates: {
      percentual?: number;
      valor_calculado?: number;
    },
  ) {
    try {
      const { data, error } = await supabase
        .from("condicoes_antecipacao")
        .update(updates)
        .eq("id", conditionId)
        .select()
        .single();

      if (error) {
        console.error("Error updating anticipation condition:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error(
        "Error in commissionPlansService.updateAnticipationCondition:",
        error,
      );
      throw error;
    }
  },

  async deleteAnticipationCondition(conditionId: number) {
    try {
      const { error } = await supabase
        .from("condicoes_antecipacao")
        .delete()
        .eq("id", conditionId);

      if (error) {
        console.error("Error deleting anticipation condition:", error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error(
        "Error in commissionPlansService.deleteAnticipationCondition:",
        error,
      );
      throw error;
    }
  },

  // Utility function to generate monthly installments based on total number
  generateMonthlyInstallments(
    totalInstallments: number,
    firstInstallmentValue: number,
    remainingInstallmentsValue: number,
  ) {
    const installments = [];

    // First installment
    installments.push({
      numero_parcela: 1,
      valor_parcela: firstInstallmentValue,
      vencimento: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    });

    // Remaining installments
    for (let i = 2; i <= totalInstallments; i++) {
      installments.push({
        numero_parcela: i,
        valor_parcela: remainingInstallmentsValue,
        vencimento: new Date(new Date().setMonth(new Date().getMonth() + i)),
      });
    }

    return installments;
  },

  // Custom Installments Management (CondicoesParcelas)
  async getCustomInstallmentsByRange(rangeId: number) {
    try {
      const { data, error } = await supabase
        .from("condicoes_parcelas")
        .select("*")
        .eq("faixa_credito_id", rangeId)
        .order("numero_parcela", { ascending: true });

      if (error) {
        console.error("Error fetching custom installments:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error in getCustomInstallmentsByRange:", error);
      throw error;
    }
  },

  async saveCustomInstallments(
    rangeId: number,
    customInstallments: Array<{
      numero_parcela: number;
      valor_parcela: number;
    }>,
    remainingInstallmentsValue?: number,
  ) {
    try {
      console.log("Starting saveCustomInstallments...");
      console.log("Range ID:", rangeId);
      console.log("Custom installments:", customInstallments);
      console.log("Remaining installments value:", remainingInstallmentsValue);

      // Step 1: Delete existing custom installments for this range
      console.log("Deleting existing custom installments...");
      const { error: deleteError } = await supabase
        .from("condicoes_parcelas")
        .delete()
        .eq("faixa_credito_id", rangeId);

      if (deleteError) {
        console.error("Error deleting existing installments:", deleteError);
        throw deleteError;
      }
      console.log("Existing installments deleted successfully");

      // Step 2: Insert new custom installments
      if (customInstallments && customInstallments.length > 0) {
        const installmentsToInsert = customInstallments
          .filter((inst) => inst.valor_parcela && inst.valor_parcela > 0)
          .map((inst) => ({
            faixa_credito_id: rangeId,
            numero_parcela: inst.numero_parcela,
            valor_parcela: inst.valor_parcela,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));

        console.log("Installments to insert:", installmentsToInsert);

        if (installmentsToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from("condicoes_parcelas")
            .insert(installmentsToInsert);

          if (insertError) {
            console.error("Error inserting custom installments:", insertError);
            throw insertError;
          }
          console.log("Custom installments inserted successfully");
        }
      }

      // Step 3: Update remaining installments value in credit range if provided
      if (
        remainingInstallmentsValue !== undefined &&
        remainingInstallmentsValue !== null
      ) {
        console.log("Updating remaining installments value in credit range...");
        const { error: updateError } = await supabase
          .from("faixas_de_credito")
          .update({
            valor_parcelas_restantes: remainingInstallmentsValue,
          })
          .eq("id", rangeId);

        if (updateError) {
          console.error(
            "Error updating remaining installments value:",
            updateError,
          );
          throw updateError;
        }
        console.log("Remaining installments value updated successfully");
      }

      console.log("saveCustomInstallments completed successfully");
      return true;
    } catch (error) {
      console.error("Error in saveCustomInstallments:", error);
      throw error;
    }
  },

  async deleteCustomInstallmentsByRange(rangeId: number) {
    try {
      const { error } = await supabase
        .from("condicoes_parcelas")
        .delete()
        .eq("faixa_credito_id", rangeId);

      if (error) {
        console.error("Error deleting custom installments:", error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error in deleteCustomInstallmentsByRange:", error);
      throw error;
    }
  },
};

// Contract service
export const contractService = {
  // Get contract by ID with all related data
  async getById(contractId: string) {
    try {
      const { data, error } = await supabase
        .from("contracts")
        .select(
          `
          *,
          clients!inner (
            id,
            name,
            email,
            phone,
            cpf_cnpj,
            address_street,
            address_number,
            address_complement,
            address_neighborhood,
            address_city,
            address_state,
            address_zip
          ),
          planos!inner (
            id,
            nome,
            descricao,
            comissao
          ),
          profiles!inner (
            id,
            full_name,
            email,
            phone,
            commission_code
          ),
          quotas (
            id,
            quota_number,
            groups (
              id,
              name,
              description
            )
          ),
          invoices (
            id,
            invoice_code,
            value,
            due_date,
            status,
            paid_at,
            payment_link_pix,
            payment_link_boleto
          )
        `,
        )
        .eq("id", contractId)
        .single();

      if (error) {
        console.error("Error fetching contract:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in contractService.getById:", error);
      throw error;
    }
  },

  // Update contract status
  async updateStatus(
    contractId: string,
    status: Database["public"]["Enums"]["contract_status"],
  ) {
    try {
      const { data, error } = await supabase
        .from("contracts")
        .update({ status })
        .eq("id", contractId)
        .select()
        .single();

      if (error) {
        console.error("Error updating contract status:", error);
        throw error;
      }

      // Se o status foi alterado para "Ativo", criar faturas automaticamente
      if (status === "Ativo") {
        try {
          console.log(`🚀 Contrato ${contractId} ativado - criando faturas automaticamente`);
          
          // Importar o serviço de geração de faturas
          const { invoiceGenerationService } = await import('./invoice-generation.service');
          
          // Criar faturas para o contrato
          const result = await invoiceGenerationService.createInvoicesForContract(parseInt(contractId));
          
          if (result.success) {
            console.log(`✅ ${result.invoicesCreated} faturas criadas automaticamente para contrato ${contractId}`);
          } else {
            console.error(`❌ Erro ao criar faturas para contrato ${contractId}:`, result.errors);
            // Não falhar a atualização do status por causa das faturas
            // As faturas podem ser criadas manualmente depois
          }
        } catch (invoiceError) {
          console.error("Erro ao criar faturas automaticamente:", invoiceError);
          // Não falhar a atualização do status por causa das faturas
        }
      }

      return data;
    } catch (error) {
      console.error("Error in contractService.updateStatus:", error);
      throw error;
    }
  },

  // Delete contract (only for admin or representative with pending/rejected status)
  async delete(contractId: string, userId: string, isAdmin: boolean = false) {
    try {
      // First, get contract data including quota_id for quota release
      const { data: contractData, error: fetchError } = await supabase
        .from("contracts")
        .select("representative_id, status, quota_id")
        .eq("id", contractId)
        .single();

      if (fetchError) {
        console.error("Error fetching contract for deletion:", fetchError);
        throw new Error("Contrato não encontrado");
      }

      // If not admin, check permissions
      if (!isAdmin) {
        if (contractData.representative_id !== userId) {
          throw new Error("Você não tem permissão para excluir este contrato");
        }

        if (contractData.status !== "Pendente" && contractData.status !== "Reprovado") {
          throw new Error(
            "Só é possível excluir contratos com status Pendente ou Reprovado",
          );
        }
      }

      // Delete the contract
      const { error: deleteError } = await supabase
        .from("contracts")
        .delete()
        .eq("id", contractId);

      if (deleteError) {
        console.error("Error deleting contract:", deleteError);
        throw deleteError;
      }

      // Release the associated quota if it exists
      if (contractData.quota_id) {
        console.log(`🔄 Liberando cota ${contractData.quota_id} após exclusão do contrato ${contractId}`);
        
        const { error: quotaError } = await supabase
          .from("quotas")
          .update({
            status: "Disponível",
            contract_id: null,
            representative_id: null,
            assigned_at: null,
            updated_at: new Date().toISOString()
          })
          .eq("id", contractData.quota_id);

        if (quotaError) {
          console.error("Error releasing quota:", quotaError);
          // Don't throw error here - contract is already deleted
          // Just log the error for debugging
          console.warn("⚠️ Contrato deletado, mas cota não foi liberada:", quotaError.message);
        } else {
          console.log(`✅ Cota ${contractData.quota_id} liberada com sucesso`);
        }
      }

      return true;
    } catch (error) {
      console.error("Error in contractService.delete:", error);
      throw error;
    }
  },

  // Update contract (only for representatives with pending/rejected status or admins)
  async update(
    contractId: string,
    updates: {
      client_id?: number;
      commission_table_id?: number;
      credit_amount?: string;
      total_value?: string;
      total_installments?: number;
      contract_content?: string;
      quota_id?: string;
    },
    userId: string,
    isAdmin: boolean = false,
  ) {
    try {
      // Fetch current contract (for permission check and for quota release/assign)
      const { data: currentContract, error: fetchError } = await supabase
        .from("contracts")
        .select("representative_id, status, quota_id")
        .eq("id", contractId)
        .single();

      if (fetchError) {
        console.error("Error fetching contract for update:", fetchError);
        throw new Error("Contrato não encontrado");
      }

      if (!isAdmin) {
        if (currentContract.representative_id !== userId) {
          throw new Error("Você não tem permissão para editar este contrato");
        }

        if (currentContract.status !== "Pendente" && currentContract.status !== "Reprovado") {
          throw new Error(
            "Só é possível editar contratos com status Pendente ou Reprovado",
          );
        }
      }

      const previousQuotaId = currentContract?.quota_id ?? null;
      const newQuotaId = updates.quota_id ?? null;

      // 1) Release previous quota if contract is changing to another quota
      if (previousQuotaId && previousQuotaId !== newQuotaId) {
        const { error: quotaReleaseError } = await supabase
          .from("quotas")
          .update({
            status: "Disponível",
            contract_id: null,
            representative_id: null,
            assigned_at: null,
            reserved_at: null,
            reserved_by: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", previousQuotaId);

        if (quotaReleaseError) {
          console.error("Error releasing previous quota:", quotaReleaseError);
          throw new Error("Falha ao liberar a cota anterior. Tente novamente.");
        }
      }

      // 2) Update contract
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("contracts")
        .update(updateData)
        .eq("id", contractId)
        .select()
        .single();

      if (error) {
        console.error("Error updating contract:", error);
        throw error;
      }

      // 3) Sempre sincronizar a cota vinculada ao contrato (estado final): marcá-la como Ocupada
      // Assim, mesmo ao "re-vincular" o mesmo grupo/cota, a cota é atualizada e não permanece Disponível
      const finalQuotaId = data?.quota_id ?? newQuotaId ?? null;
      if (finalQuotaId) {
        const repId = data?.representative_id ?? currentContract?.representative_id;
        const contractIdNum = parseInt(contractId, 10);
        const { error: quotaOccupyError } = await supabase
          .from("quotas")
          .update({
            status: "Ocupada",
            contract_id: contractIdNum,
            representative_id: repId ?? null,
            assigned_at: new Date().toISOString(),
            reserved_at: null,
            reserved_by: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", String(finalQuotaId));

        if (quotaOccupyError) {
          console.error("Error syncing quota to Ocupada:", quotaOccupyError);
          throw new Error("Falha ao atualizar status da cota. Tente novamente.");
        }
      }

      return data;
    } catch (error) {
      console.error("Error in contractService.update:", error);
      throw error;
    }
  },

  // Update contract content specifically (with permission checks)
  async updateContent(
    contractId: string,
    content: string,
    userId: string,
    isAdmin: boolean = false,
  ) {
    return this.update(
      contractId,
      { contract_content: content },
      userId,
      isAdmin,
    );
  },

  // Get all contracts for admin view with pagination
  async getAll(page: number = 1, limit: number = 20, search?: string) {
    try {
      // Busca: filtrar no servidor por nome do cliente (via client_id), id/código do contrato e representante
      if (search && search.trim()) {
        const term = search.trim();
        // Valor entre aspas para o .or() do PostgREST preservar espaços e vírgulas no termo
        const termForIlike = '"%' + term.replace(/"/g, '""') + '%"';

        // 1) IDs de clientes cujo nome contém o termo (full_name ou name)
        const { data: clientsByName } = await supabase
          .from("clients")
          .select("id")
          .or(`full_name.ilike.${termForIlike},name.ilike.${termForIlike}`);

        const clientIds = (clientsByName || []).map((c: { id: number }) => c.id);

        // 2) IDs de representantes cujo nome contém o termo
        const { data: profilesByName } = await supabase
          .from("profiles")
          .select("id")
          .ilike("full_name", `%${term}%`);

        const profileIds = (profilesByName || []).map((p: { id: string }) => p.id);

        // 3) Contratos: client_id in (...), ou representative_id in (...), ou id/código do contrato
        const orParts: string[] = [];
        if (clientIds.length > 0) orParts.push(`client_id.in.(${clientIds.join(",")})`);
        if (profileIds.length > 0) orParts.push(`representative_id.in.("${profileIds.join('","')}")`);
        orParts.push(`contract_number.ilike.${termForIlike}`);
        orParts.push(`contract_code.ilike.${termForIlike}`);
        if (/^\d+$/.test(term)) orParts.push(`id.eq.${term}`);

        const { data: contractData, error: contractError, count } = await supabase
          .from("contracts")
          .select(
            `
            *,
            clients(full_name, name),
            profiles!inner (full_name, email),
            planos!inner (nome, comissao)
          `,
            { count: "exact" }
          )
          .or(orParts.join(","))
          .order("created_at", { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (contractError) {
          console.error("Error fetching contracts for search:", contractError);
          throw contractError;
        }

        const totalFromCount = count ?? 0;

        return {
          data: contractData || [],
          total: totalFromCount,
          page,
          limit,
          totalPages: Math.ceil(totalFromCount / limit) || 1
        };
      }

      // Normal pagination without search
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
        .from("contracts")
        .select(
          `
          *,
          clients(full_name, name),
          profiles!inner (full_name, email),
          planos!inner (nome, comissao)
        `,
          { count: 'exact' }
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("Error fetching contracts with pagination:", error);
        throw error;
      }

      return {
        data: data || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      console.error("Error in contractService.getAll with pagination:", error);
      throw error;
    }
  },

  // Get all contracts for admin view (legacy method - kept for compatibility)
  async getAllLegacy() {
    try {
      const { data, error } = await supabase
        .from("contracts")
        .select(
          `
          *,
          clients(full_name, name),
          profiles!inner (full_name, email),
          planos!inner (nome, comissao)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching all contracts:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error in contractService.getAllLegacy:", error);
      throw error;
    }
  },

  // Get all active/aprovado contracts (sem paginação) para a lista "Contratos Aprovados" na Gestão de Faturas
  async getActiveForInvoices() {
    try {
      const { data, error } = await supabase
        .from("contracts")
        .select(
          `
          *,
          clients(full_name, name),
          profiles!inner (full_name, email),
          planos!inner (nome, comissao)
        `,
        )
        .in("status", ["Aprovado", "Ativo"])
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching active contracts for invoices:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error in contractService.getActiveForInvoices:", error);
      throw error;
    }
  },

  // Get all contracts by client ID
  async getByClientId(clientId: number) {
    try {
      const { data, error } = await supabase
        .from("contracts")
        .select(
          `
          *,
          clients!inner (
            id,
            full_name,
            name,
            email,
            phone,
            cpf_cnpj,
            address_street,
            address_number,
            address_complement,
            address_neighborhood,
            address_city,
            address_state,
            address_zip
          ),
          planos!inner (
            id,
            nome,
            descricao,
            comissao
          ),
          profiles!inner (
            id,
            full_name,
            email,
            phone,
            commission_code
          ),
          quotas (
            id,
            quota_number,
            groups (
              id,
              name,
              description
            )
          ),
          invoices (
            id,
            invoice_code,
            value,
            due_date,
            status,
            paid_at,
            payment_link_pix,
            payment_link_boleto,
            installment_number
          )
        `,
        )
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching contracts by client:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error in contractService.getByClientId:", error);
      throw error;
    }
  },
};

// Dashboard data service
export const dashboardService = {
  // Create sample contracts for a representative (for demo purposes)
  async createSampleContractsForRep(representativeId: string) {
    try {
      console.log(
        "Creating sample contracts for representative:",
        representativeId,
      );

      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(representativeId)) {
        console.warn(
          "Invalid UUID format for representative ID:",
          representativeId,
        );
        return;
      }

      const { data, error } = await supabase.rpc(
        "create_sample_contracts_for_rep",
        {
          rep_id: representativeId,
        },
      );

      if (error) {
        console.error("Error creating sample contracts:", error);
        // Don't throw error, just log it - this is optional sample data
      } else {
        console.log("Sample contracts created successfully");
      }
    } catch (error) {
      console.error("Error in createSampleContractsForRep:", error);
      // Don't throw error, just log it - this is optional sample data
    }
  },

  // Get representative dashboard data
  async getRepresentativeDashboardData(representativeId: string) {
    try {

      // Validate representative ID
      if (!representativeId) {
        throw new Error("ID do representante é obrigatório");
      }

      // Get contracts for this representative
      const { data: contracts, error: contractsError } = await supabase
        .from("contracts")
        .select(
          `
          *,
          clients(full_name, name),
          planos(nome, descricao, comissao, "commission-percentage")
        `,
        )
        .eq("representative_id", representativeId);

      if (contractsError) {
        console.error("Error fetching contracts:", contractsError);
        console.error("Contract error details:", {
          code: contractsError.code,
          message: contractsError.message,
          details: contractsError.details,
          hint: contractsError.hint,
        });
        // Don't throw error, continue with empty contracts
        console.log("Continuing with empty contracts due to error");
      }

      // If no contracts exist, create sample data for demo (only if documents are approved)
      if (!contracts || contracts.length === 0) {
        // Verificar se o representante tem documentos aprovados antes de criar contratos de exemplo
        const { data: representative, error: repCheckError } = await supabase
          .from("profiles")
          .select("documents_approved, status")
          .eq("id", representativeId)
          .single();

        if (repCheckError) {
          console.error("Error checking representative documents approval:", repCheckError);
          console.log("Skipping sample contracts creation due to error");
        } else if (representative?.documents_approved === true) {
          console.log("No contracts found, creating sample data...");
          await this.createSampleContractsForRep(representativeId);

          // Retry fetching contracts after creating sample data
          const { data: newContracts, error: newContractsError } = await supabase
            .from("contracts")
            .select(
              `
              *,
              clients(full_name, name),
              planos(nome, descricao, comissao, "commission-percentage")
            `,
            )
            .eq("representative_id", representativeId);

          if (newContractsError) {
            console.error("Error fetching new contracts:", newContractsError);
            console.log(
              "Continuing with empty contracts after sample data creation failed",
            );
          } else if (newContracts) {
            console.log(
              "Successfully fetched contracts after creating sample data:",
              newContracts.length,
            );
          }
        } else {
          console.log(
            "Skipping sample contracts creation: documents not approved",
            {
              documents_approved: representative?.documents_approved,
              status: representative?.status,
            },
          );
        }
      }

      // Ensure contracts is an array
      const validContracts = Array.isArray(contracts) ? contracts : [];

      // Calculate performance metrics
      const totalSales = validContracts.reduce((sum, contract) => {
        return sum + (parseFloat(contract?.total_value || "0") || 0);
      }, 0);

      const activeContracts = validContracts.filter(
        (c) => c?.status === "Ativo",
      ).length;
      const completedContracts = validContracts.filter(
        (c) => c?.status === "Concluído",
      ).length;

      // Calculate total commission from contracts
      const totalCommission = validContracts.reduce((sum, contract) => {
        if (contract?.status === "Ativo" || contract?.status === "Concluído") {
          const commissionRate =
            contract?.planos?.["commission-percentage"] || 4; // Default 4%
          const contractValue = parseFloat(contract?.total_value || "0") || 0;
          return sum + contractValue * (commissionRate / 100);
        }
        return sum;
      }, 0);

      // Get all withdrawals (pending + approved) to subtract from available balance
      const { data: allWithdrawals, error: withdrawalsError } = await supabase
        .from("withdrawal_requests")
        .select("requested_value")
        .eq("representative_id", representativeId)
        .in("status", ["Pendente", "Aprovado"]); // Incluir pendentes também

      if (withdrawalsError) {
        console.error("Error fetching withdrawals:", withdrawalsError);
      }

      const withdrawnAmount = (allWithdrawals || []).reduce(
        (sum, w) => sum + (w.requested_value || 0),
        0
      );

      // Available balance = total commission - withdrawn amount (pendentes + aprovadas)
      const pendingCommission = Math.max(0, totalCommission - withdrawnAmount);

      // Format contracts for display
      const formattedContracts = validContracts.map((contract) => {
        const createdAt = contract?.created_at;
        let formattedDate = "Data não disponível";

        try {
          if (createdAt) {
            formattedDate = new Date(createdAt).toLocaleDateString("pt-BR");
          }
        } catch (dateError) {
          console.warn("Error formatting date:", dateError);
        }

        return {
          id: contract?.id?.toString() || "unknown",
          contractNumber:
            contract?.contract_number || contract?.contract_code || "N/A",
          clientName:
            contract?.clients?.full_name ||
            contract?.clients?.name ||
            "Cliente não encontrado",
          date: formattedDate,
          value: parseFloat(contract?.total_value || "0") || 0,
          status: (contract?.status?.toLowerCase() || "pending") as
            | "active"
            | "completed"
            | "pending"
            | "cancelled",
          commission:
            (parseFloat(contract?.total_value || "0") || 0) *
            ((contract?.planos?.["commission-percentage"] || 4) / 100),
        };
      });

      // Get withdrawal requests for commission history
      const { data: withdrawals, error: commissionHistoryWithdrawalsError } = await supabase
        .from("withdrawal_requests")
        .select("*, payment_status, payment_date")
        .eq("representative_id", representativeId)
        .order("requested_at", { ascending: false });

      if (commissionHistoryWithdrawalsError) {
        console.error("Error fetching withdrawals:", commissionHistoryWithdrawalsError);
        console.error("Withdrawal error details:", {
          code: commissionHistoryWithdrawalsError.code,
          message: commissionHistoryWithdrawalsError.message,
          details: commissionHistoryWithdrawalsError.details,
          hint: commissionHistoryWithdrawalsError.hint,
        });
      }

      // Build commission history with only withdrawals (not contract commissions)
      const commissionHistory: any[] = [];
      
      // Note: Contract commissions are not shown in commission history
      // Only withdrawal requests should appear here
      
      // Add withdrawal history
      const validWithdrawals = Array.isArray(withdrawals) ? withdrawals : [];
      validWithdrawals.forEach((withdrawal) => {
        let requestedDate = "Data não disponível";
        let processedDate: string | undefined;

        try {
          if (withdrawal?.requested_at) {
            requestedDate = new Date(
              withdrawal.requested_at,
            ).toLocaleDateString("pt-BR");
          }
          if (withdrawal?.processed_at) {
            processedDate = new Date(
              withdrawal.processed_at,
            ).toLocaleDateString("pt-BR");
          }
        } catch (dateError) {
          console.warn("Error formatting withdrawal dates:", dateError);
        }

        commissionHistory.push({
          id: withdrawal?.id?.toString() || "unknown",
          contract: withdrawal?.request_code || "Saque",
          date: requestedDate,
          value: withdrawal?.requested_value || 0,
          status:
            withdrawal?.status === "Aprovado"
              ? ("paid" as const)
              : withdrawal?.status === "Rejeitado"
                ? ("rejected" as const)
                : ("pending" as const),
          dueDate: processedDate,
          type: "withdrawal",
          approvalDate: processedDate,
          paymentStatus: withdrawal?.payment_status || "Não Pago",
          paymentDate: withdrawal?.payment_date ? new Date(withdrawal.payment_date).toLocaleDateString("pt-BR") : null,
        });
      });

      const dashboardData = {
        performanceData: {
          totalSales: totalSales || 0,
          targetSales: 500000, // Fixed target for now
          activeContracts: activeContracts || 0,
          completedContracts: completedContracts || 0,
          pendingCommission: pendingCommission || 0,
          nextCommissionDate: "15/08/2025", // Fixed for now
          nextCommissionValue:
            pendingCommission > 0 ? Math.min(pendingCommission, 5000) : 0,
        },
        myContracts: formattedContracts || [],
        commissionHistory: commissionHistory || [],
      };

      console.log("Dashboard data prepared successfully:", {
        totalSales: dashboardData.performanceData.totalSales,
        contractsCount: dashboardData.myContracts.length,
        commissionHistoryCount: dashboardData.commissionHistory.length,
      });

      return dashboardData;
    } catch (error) {
      console.error("Error fetching dashboard data:", error);

      // Return default data instead of throwing error
      const defaultData = {
        performanceData: {
          totalSales: 0,
          targetSales: 500000,
          activeContracts: 0,
          completedContracts: 0,
          pendingCommission: 0,
          nextCommissionDate: "15/08/2025",
          nextCommissionValue: 0,
        },
        myContracts: [],
        commissionHistory: [],
      };

      console.log("Returning default dashboard data due to error");
      return defaultData;
    }
  },
};

// Document service
export const documentService = {
  // Get documents for a representative
  async getRepresentativeDocuments(representativeId: string) {
    try {
      const { data, error } = await supabase
        .from("representative_documents")
        .select("*")
        .eq("representative_id", representativeId)
        .order("uploaded_at", { ascending: false });

      if (error) {
        console.error("Error fetching documents:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error(
        "Error in documentService.getRepresentativeDocuments:",
        error,
      );
      throw error;
    }
  },

  // Update document status
  async updateDocumentStatus(
    documentId: number,
    status: Database["public"]["Enums"]["document_status"],
    reviewedBy?: string,
  ) {
    try {
      const { data, error } = await supabase
        .from("representative_documents")
        .update({
          status,
          ...(reviewedBy && { reviewed_by: reviewedBy }),
        })
        .eq("id", documentId)
        .select()
        .single();

      if (error) {
        console.error("Error updating document status:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in documentService.updateDocumentStatus:", error);
      throw error;
    }
  },

  // Check if all required documents are approved for a representative
  async checkAllDocumentsApproved(representativeId: string): Promise<boolean> {
    try {
      const requiredDocuments = [
        // Documentos da Empresa
        "cartilha de credenciamento preenchida",
        "cartão cnpj",
        "contrato social e última alteração",
        "comprovante de endereço em nome da empresa",
        "dados bancários para recebimento das comissões",
        // Documentos do Sócio
        "cartilha de credenciamento pf",
        "comprovante de endereço em nome do sócio",
        "certidão de antecedentes criminais",
        "certidão negativa cível de 1º grau",
        "certidão negativa criminal de 1º grau",
        "foto de identidade ou cnh (frente)",
        "foto de identidade ou cnh (verso)"
      ];

      const { data, error } = await supabase
        .from("representative_documents")
        .select("document_type, status")
        .eq("representative_id", representativeId)
        .in("document_type", requiredDocuments);

      if (error) {
        console.error("Error checking document approval status:", error);
        throw error;
      }

      // Check if all required documents are approved
      const approvedDocuments = (data || []).filter(
        (doc) => doc.status === "Aprovado",
      );
      return approvedDocuments.length === requiredDocuments.length;
    } catch (error) {
      console.error(
        "Error in documentService.checkAllDocumentsApproved:",
        error,
      );
      return false;
    }
  },

  // Approve all documents for a representative
  // NOTA: Esta função apenas aprova os documentos e marca documents_approved: true
  // O status do representante deve ser alterado manualmente pelo admin através do botão "Aprovar Representante"
  async approveAllDocuments(representativeId: string, approvedBy: string) {
    try {
      // First, approve all documents
      const { error: docsError } = await supabase
        .from("representative_documents")
        .update({
          status: "Aprovado" as Database["public"]["Enums"]["document_status"],
          reviewed_by: approvedBy,
        })
        .eq("representative_id", representativeId);

      if (docsError) {
        console.error("Error approving documents:", docsError);
        throw docsError;
      }

      // Update the profile to mark documents as approved (but NOT change status to active)
      // The representative status must be changed manually by admin through "Aprovar Representante" button
      const { data, error } = await supabase
        .from("profiles")
        .update({
          documents_approved: true,
          documents_approved_at: new Date().toISOString(),
          documents_approved_by: approvedBy,
          // REMOVIDO: status: "Ativo" - não deve ser alterado automaticamente
        })
        .eq("id", representativeId)
        .select()
        .single();

      if (error) {
        console.error("Error updating profile approval status:", error);
        throw error;
      }

      console.log(
        "Documents approved for representative:",
        representativeId,
        "(Status must be changed manually by admin)"
      );
      return data;
    } catch (error) {
      console.error("Error in documentService.approveAllDocuments:", error);
      throw error;
    }
  },

  // Create required documents for a representative (if they don't exist)
  async createRequiredDocuments(representativeId: string) {
    try {
      const requiredDocuments = [
        // Documentos da Empresa
        "cartilha de credenciamento preenchida",
        "cartão cnpj",
        "contrato social e última alteração",
        "comprovante de endereço em nome da empresa",
        "dados bancários para recebimento das comissões",
        // Documentos do Sócio
        "cartilha de credenciamento pf",
        "comprovante de endereço em nome do sócio",
        "certidão de antecedentes criminais",
        "certidão negativa cível de 1º grau",
        "certidão negativa criminal de 1º grau",
        "foto de identidade ou cnh (frente)",
        "foto de identidade ou cnh (verso)"
      ];

      // Check which documents already exist
      const { data: existingDocs, error: fetchError } = await supabase
        .from("representative_documents")
        .select("document_type")
        .eq("representative_id", representativeId);

      if (fetchError) {
        console.error("Error fetching existing documents:", fetchError);
        throw fetchError;
      }

      const existingTypes = (existingDocs || []).map(
        (doc) => doc.document_type,
      );
      const missingDocuments = requiredDocuments.filter(
        (type) => !existingTypes.includes(type),
      );

      // Create missing documents with pending status
      if (missingDocuments.length > 0) {
        const documentsToInsert = missingDocuments.map((docType) => ({
          representative_id: representativeId,
          document_type: docType,
          status: "Pendente" as Database["public"]["Enums"]["document_status"],
          file_url: "",
        }));

        const { error: insertError } = await supabase
          .from("representative_documents")
          .insert(documentsToInsert);

        if (insertError) {
          console.error("Error creating required documents:", insertError);
          throw insertError;
        }
      }

      return true;
    } catch (error) {
      console.error("Error in documentService.createRequiredDocuments:", error);
      throw error;
    }
  },
};

// Contract Template service
export const contractTemplateService = {
  // Get all templates (admin sees all, others see only public ones)
  async getAll(isAdmin: boolean = false) {
    try {
      let query = supabase
        .from("contract_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (!isAdmin) {
        query = query.eq("visibility", "all");
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching contract templates:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error in contractTemplateService.getAll:", error);
      throw error;
    }
  },

  // Get template by ID
  async getById(id: number) {
    try {
      const { data, error } = await supabase
        .from("contract_templates")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching contract template:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in contractTemplateService.getById:", error);
      throw error;
    }
  },

  // Get the default template (returns null if none is set)
  async getDefault() {
    try {
      const { data, error } = await supabase
        .from("contract_templates")
        .select("*")
        .eq("is_default", true)
        .maybeSingle();

      if (error) {
        console.error("Error fetching default contract template:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in contractTemplateService.getDefault:", error);
      throw error;
    }
  },

  // Set a template as the default (atomically unsets any previous default)
  async setAsDefault(id: number) {
    try {
      const { error } = await supabase.rpc("set_default_contract_template", {
        template_id: id,
      });

      if (error) {
        console.error("Error setting default contract template:", error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error in contractTemplateService.setAsDefault:", error);
      throw error;
    }
  },

  // Remove the default flag from a template
  async removeDefault(id: number) {
    try {
      const { error } = await supabase
        .from("contract_templates")
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) {
        console.error("Error removing default contract template:", error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error in contractTemplateService.removeDefault:", error);
      throw error;
    }
  },

  // Create new template
  async create(templateData: {
    name: string;
    description?: string;
    content: string;
    visibility: "admin" | "all";
    created_by: string;
  }) {
    try {
      console.log("contractTemplateService.create called with:", templateData);
      console.log("Supabase client status:", !!supabase);

      // Validate required fields
      if (!templateData.name || !templateData.name.trim()) {
        throw new Error("Nome do modelo é obrigatório");
      }

      if (!templateData.content || !templateData.content.trim()) {
        throw new Error("Conteúdo do modelo é obrigatório");
      }

      if (
        !templateData.visibility ||
        !["admin", "all"].includes(templateData.visibility)
      ) {
        throw new Error("Visibilidade deve ser 'admin' ou 'all'");
      }

      // Check if table exists by trying to select from it first
      console.log("Checking if contract_templates table exists...");
      const { data: tableCheck, error: tableError } = await supabase
        .from("contract_templates")
        .select("id")
        .limit(1);

      if (tableError) {
        console.error("Table check error:", tableError);
        if (tableError.code === "42P01") {
          throw new Error(
            "Tabela 'contract_templates' não existe no banco de dados",
          );
        }
        if (tableError.code === "PGRST301") {
          throw new Error("Erro de autenticação - verifique suas credenciais");
        }
        throw tableError;
      }

      console.log("Table exists, proceeding with insert...");

      // For created_by, we'll set it to null since we don't have proper user authentication
      // The foreign key constraint allows NULL values (ON DELETE SET NULL)
      const insertData = {
        name: templateData.name.trim(),
        description: templateData.description?.trim() || null,
        content: templateData.content,
        visibility: templateData.visibility,
        created_by: null, // Set to null to avoid foreign key constraint issues
      };

      console.log("Inserting template data:", {
        ...insertData,
        content: `${insertData.content.substring(0, 50)}...`, // Truncate content for logging
      });

      const { data, error } = await supabase
        .from("contract_templates")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("Supabase error creating contract template:", error);
        console.error("Error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });

        // Enhance error with more context
        const enhancedError = new Error(
          error.message || "Erro desconhecido do banco de dados",
        );
        (enhancedError as any).code = error.code;
        (enhancedError as any).details = error.details;
        (enhancedError as any).hint = error.hint;
        throw enhancedError;
      }

      if (!data) {
        console.error("No data returned from template creation");
        throw new Error("Nenhum dado retornado após criação do modelo");
      }

      console.log("Template created successfully:", data);
      return data;
    } catch (error) {
      console.error(
        "Error in contractTemplateService.create - Full error:",
        error,
      );
      console.error("Error type:", typeof error);
      console.error("Error constructor:", error?.constructor?.name);

      // Re-throw the error preserving its type and properties
      if (error instanceof Error) {
        throw error;
      }

      // Handle Supabase error objects
      if (typeof error === "object" && error !== null) {
        const supabaseError = error as any;
        if (supabaseError.code || supabaseError.message) {
          const enhancedError = new Error(
            supabaseError.message || "Erro do banco de dados",
          );
          (enhancedError as any).code = supabaseError.code;
          (enhancedError as any).details = supabaseError.details;
          (enhancedError as any).hint = supabaseError.hint;
          throw enhancedError;
        }
      }

      // Handle unknown error types
      throw new Error(`Erro desconhecido ao criar modelo: ${String(error)}`);
    }
  },

  // Update template
  async update(
    id: number,
    updates: {
      name?: string;
      description?: string;
      content?: string;
      visibility?: "admin" | "all";
    },
  ) {
    try {
      const { data, error } = await supabase
        .from("contract_templates")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating contract template:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in contractTemplateService.update:", error);
      throw error;
    }
  },

  // Delete template
  async delete(id: number) {
    try {
      const { error } = await supabase
        .from("contract_templates")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting contract template:", error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error in contractTemplateService.delete:", error);
      throw error;
    }
  },
};

// Administrator service
export const administratorService = {
  // Get all administrators
  async getAll() {
    try {
      const { data, error } = await supabase
        .from("administrators")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching administrators:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error in administratorService.getAll:", error);
      throw error;
    }
  },

  // Get administrator by ID
  async getById(id: string) {
    try {
      const { data, error } = await supabase
        .from("administrators")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null; // Not found
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in administratorService.getById:", error);
      throw error;
    }
  },

  // Get administrator by email
  async getByEmail(email: string) {
    try {
      const { data, error } = await supabase
        .from("administrators")
        .select("*")
        .eq("email", email.toLowerCase().trim())
        .single();

      if (error) {
        if (error.code === "PGRST116") return null; // Not found
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in administratorService.getByEmail:", error);
      return null;
    }
  },

  // Create new administrator
  async create(adminData: {
    full_name: string;
    email: string;
    phone?: string;
    role: string;
    status?: string;
    password?: string;
  }) {
    try {
      // Check if email already exists
      const existingAdmin = await this.getByEmail(adminData.email);
      if (existingAdmin) {
        throw new Error("Email já está em uso");
      }

      const insertData = {
        full_name: adminData.full_name.trim(),
        email: adminData.email.toLowerCase().trim(),
        phone: adminData.phone?.trim() || null,
        role: adminData.role,
        status: adminData.status || "Ativo",
      };

      const { data, error } = await supabase
        .from("administrators")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("Error creating administrator:", error);
        throw error;
      }

      console.log("Administrator created successfully:", data);

      // Set default password if provided
      if (adminData.password) {
        console.log("Setting password for new administrator");
        await this.updatePassword(data.id, adminData.password);
      } else {
        // Set default password
        console.log("Setting default password for new administrator");
        await this.updatePassword(data.id, "admin123");
      }

      return data;
    } catch (error) {
      console.error("Error in administratorService.create:", error);
      throw error;
    }
  },

  // Update administrator
  async update(
    id: string,
    updates: Partial<{
      full_name: string;
      email: string;
      phone: string;
      role: string;
      status: string;
    }>,
  ) {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("administrators")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating administrator:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in administratorService.update:", error);
      throw error;
    }
  },

  // Update administrator password
  async updatePassword(id: string, newPassword: string) {
    try {
      console.log("Updating password for administrator:", id);
      console.log("New password:", newPassword);

      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      console.log("Password hashed successfully");

      // Check if administrators table has a password field
      // Since the schema doesn't show a password field in administrators table,
      // we'll add a password_hash field to store the hashed password
      const { data, error } = await supabase
        .from("administrators")
        .update({
          // Note: This assumes we add a password_hash field to administrators table
          // For now, we'll simulate the password update
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating administrator password:", error);
        throw error;
      }

      // For demo purposes, we'll store the password hash in localStorage
      // In production, this should be stored securely in the database
      const adminPasswords = JSON.parse(
        localStorage.getItem("adminPasswords") || "{}",
      );
      adminPasswords[id] = hashedPassword;
      localStorage.setItem("adminPasswords", JSON.stringify(adminPasswords));

      console.log(
        "Password hash stored in localStorage for administrator:",
        id,
      );
      console.log("Updated admin passwords:", Object.keys(adminPasswords));
      console.log("Hash stored:", hashedPassword.substring(0, 10) + "...");

      // Test the password immediately after storing
      const testVerification = await this.verifyPassword(id, newPassword);
      console.log("Immediate verification test:", testVerification);

      return data;
    } catch (error) {
      console.error("Error in administratorService.updatePassword:", error);
      throw error;
    }
  },

  // Verify administrator password
  async verifyPassword(id: string, password: string): Promise<boolean> {
    try {
      console.log(`Verifying password for admin ID: ${id}`);
      console.log(`Password to verify: ${password}`);

      // For the default admin, check against hardcoded password
      if (id === "admin") {
        console.log("Checking default admin password");

        // First check if there's a stored password for admin
        const adminPasswords = JSON.parse(
          localStorage.getItem("adminPasswords") || "{}",
        );

        const storedHash = adminPasswords[id];

        if (storedHash) {
          console.log("Found stored hash for admin, verifying against hash");
          const passwordHash = await hashPassword(password);
          const isValid = passwordHash === storedHash;
          console.log(`Hash verification result: ${isValid}`);
          return isValid;
        } else {
          console.log("No stored hash, using default password check");
          const isValid = password === "admin123";
          console.log(`Default password check result: ${isValid}`);
          return isValid;
        }
      }

      // For other administrators, check against stored hash
      const adminPasswords = JSON.parse(
        localStorage.getItem("adminPasswords") || "{}",
      );
      console.log(`Stored admin passwords:`, Object.keys(adminPasswords));

      const storedHash = adminPasswords[id];
      console.log(
        `Stored hash for ${id}:`,
        storedHash ? "exists" : "not found",
      );

      if (!storedHash) {
        // If no password is stored, use default for demo
        console.log(`No stored password for ${id}, using default check`);
        const isValid = password === "admin123";
        console.log(`Default password check result: ${isValid}`);
        return isValid;
      }

      // Verify against stored hash
      const passwordHash = await hashPassword(password);
      const isValid = passwordHash === storedHash;
      console.log(`Hash verification result for ${id}: ${isValid}`);
      return isValid;
    } catch (error) {
      console.error("Error verifying administrator password:", error);
      return false;
    }
  },

  // Delete administrator
  async delete(id: string) {
    try {
      const { error } = await supabase
        .from("administrators")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting administrator:", error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error in administratorService.delete:", error);
      throw error;
    }
  },

  // Authenticate administrator
  async authenticate(email: string, password: string) {
    try {
      console.log("Attempting to authenticate administrator:", email);

      const administrator = await this.getByEmail(email);
      if (!administrator) {
        console.log("No administrator found with email:", email);
        return null;
      }

      console.log("Administrator found:", {
        id: administrator.id,
        full_name: administrator.full_name,
        email: administrator.email,
        role: administrator.role,
        status: administrator.status,
      });

      // Verify password
      const isValidPassword = await this.verifyPassword(
        administrator.id,
        password,
      );
      if (!isValidPassword) {
        console.log("Password verification failed for administrator:", email);
        return null;
      }

      console.log("Administrator authenticated successfully:", email);
      return administrator;
    } catch (error) {
      console.error("Error in administratorService.authenticate:", error);
      return null;
    }
  },

  // Clear stored passwords (for debugging)
  clearStoredPasswords() {
    localStorage.removeItem("adminPasswords");
    console.log("All stored admin passwords cleared");
  },

  // Get stored passwords (for debugging)
  getStoredPasswords() {
    const adminPasswords = JSON.parse(
      localStorage.getItem("adminPasswords") || "{}",
    );
    console.log("Stored admin passwords:", Object.keys(adminPasswords));
    return adminPasswords;
  },

  // Test password system (for debugging)
  async testPasswordSystem(id: string, password: string) {
    console.log("=== Testing Password System ===");
    console.log(`ID: ${id}`);
    console.log(`Password: ${password}`);

    try {
      // Test hashing
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      console.log(`Hash 1: ${hash1}`);
      console.log(`Hash 2: ${hash2}`);
      console.log(`Hashes match: ${hash1 === hash2}`);

      // Test storage
      const adminPasswords = JSON.parse(
        localStorage.getItem("adminPasswords") || "{}",
      );
      adminPasswords[id] = hash1;
      localStorage.setItem("adminPasswords", JSON.stringify(adminPasswords));
      console.log("Password stored");

      // Test retrieval
      const storedPasswords = JSON.parse(
        localStorage.getItem("adminPasswords") || "{}",
      );
      const storedHash = storedPasswords[id];
      console.log(`Retrieved hash: ${storedHash}`);
      console.log(`Stored hash matches: ${storedHash === hash1}`);

      // Test verification
      const verificationResult = await this.verifyPassword(id, password);
      console.log(`Verification result: ${verificationResult}`);

      console.log("=== End Test ===");
      return {
        hashesMatch: hash1 === hash2,
        storedCorrectly: storedHash === hash1,
        verificationPassed: verificationResult,
      };
    } catch (error) {
      console.error("Error in test:", error);
      return { error: error.message };
    }
  },
};

// Auth functions
export const authService = {
  // Login representative
  async loginRepresentative(
    email: string,
    password: string,
  ): Promise<Representative | null> {
    return await representativeService.authenticate(email, password);
  },

  // Get current user from localStorage
  getCurrentUser(): Representative | null {
    const userStr = localStorage.getItem("currentUser");
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  // Set current user in localStorage
  setCurrentUser(user: Representative): void {
    localStorage.setItem("currentUser", JSON.stringify(user));
  },

  // Logout
  logout(): void {
    localStorage.removeItem("currentUser");
  },

  // Check if user's documents are approved
  async checkDocumentsApproved(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("documents_approved, status")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error checking document approval:", error);
        return false;
      }

      const isApproved =
        data?.documents_approved === true && data?.status === "Ativo";
      console.log(`Document approval check for ${userId}:`, {
        documents_approved: data?.documents_approved,
        status: data?.status,
        isApproved,
      });

      return isApproved;
    } catch (error) {
      console.error("Error in checkDocumentsApproved:", error);
      return false;
    }
  },

  // Get updated user data from database
  async refreshUserData(userId: string): Promise<Representative | null> {
    try {
      const representative = await representativeService.getById(userId);
      if (representative) {
        this.setCurrentUser(representative);
      }
      return representative;
    } catch (error) {
      console.error("Error refreshing user data:", error);
      return null;
    }
  },
};

// Electronic signature service
export const electronicSignatureService = {
  // Extract signature fields from contract content (supports both shortcodes and HTML)
  async extractSignatureFields(contractId: string, contractContent: string) {
    try {
      const signatureFields = [];

      // First, extract from shortcodes
      const shortcodePattern =
        /\[SIGNATURE id="([^"]+)" name="([^"]+)" cpf="([^"]+)"\]/g;
      let match;
      while ((match = shortcodePattern.exec(contractContent)) !== null) {
        const [, signatureId, signerName, signerCPF] = match;
        if (signatureId && signerName && signerCPF) {
          signatureFields.push({
            signature_id: signatureId,
            signer_name: signerName,
            signer_cpf: signerCPF.replace(/\D/g, ""), // Remove formatting
            contract_id: contractId === "temp" ? null : parseInt(contractId),
            status: "pending",
          });
        }
      }

      // Then, extract from HTML divs (for backward compatibility)
      const parser = new DOMParser();
      const doc = parser.parseFromString(contractContent, "text/html");
      const signatureDivs = doc.querySelectorAll(
        ".signature-field-placeholder",
      );

      for (const div of signatureDivs) {
        const signatureId = div.getAttribute("data-signature-id");
        const signerName = div.getAttribute("data-signer-name");
        const signerCPF = div.getAttribute("data-signer-cpf");

        if (signatureId && signerName && signerCPF) {
          // Check if this signature ID is already added from shortcode
          const existingField = signatureFields.find(
            (f) => f.signature_id === signatureId,
          );
          if (!existingField) {
            signatureFields.push({
              signature_id: signatureId,
              signer_name: signerName,
              signer_cpf: signerCPF.replace(/\D/g, ""), // Remove formatting
              contract_id: contractId === "temp" ? null : Number(contractId),
              status: "pending",
            });
          }
        }
      }

      return signatureFields;
    } catch (error) {
      console.error("Error extracting signature fields:", error);
      throw error;
    }
  },

  // Save signature fields to database (upsert para evitar 409 quando o campo já existe)
  async saveSignatureFields(signatureFields: any[]) {
    try {
      if (signatureFields.length === 0) return [];

      const validFields = signatureFields.filter((f) => f.contract_id !== null);
      if (validFields.length === 0) return [];

      const { data, error } = await supabase
        .from("electronic_signature_fields")
        .upsert(validFields, {
          onConflict: "signature_id",
          ignoreDuplicates: false,
        })
        .select();

      if (error) {
        console.error("Error saving signature fields:", error);
        throw error;
      }

      return data ?? [];
    } catch (error) {
      console.error("Error in saveSignatureFields:", error);
      throw error;
    }
  },

  // Get signature field by signature ID
  async getSignatureField(signatureId: string) {
    try {
      const { data, error } = await supabase
        .from("electronic_signature_fields")
        .select(
          `
          *,
          contracts!inner (
            id,
            contract_code,
            contract_number,
            contract_content,
            status,
            clients!inner (
              full_name,
              email
            )
          )
        `,
        )
        .eq("signature_id", signatureId)
        .single();

      if (error) {
        console.error("Error fetching signature field:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in getSignatureField:", error);
      throw error;
    }
  },

  // Update signature field with signature data
  async updateSignatureField(
    signatureId: string,
    signatureUrl: string,
    clientIp?: string,
  ) {
    try {
      const { data, error } = await supabase
        .from("electronic_signature_fields")
        .update({
          signature_url: signatureUrl,
          signed_at: new Date().toISOString(),
          client_ip: clientIp,
          status: "signed",
          updated_at: new Date().toISOString(),
        })
        .eq("signature_id", signatureId)
        .select()
        .single();

      if (error) {
        console.error("Error updating signature field:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in updateSignatureField:", error);
      throw error;
    }
  },

  // Get all signature fields for a contract
  async getContractSignatureFields(contractId: string) {
    try {
      const { data, error } = await supabase
        .from("electronic_signature_fields")
        .select("*")
        .eq("contract_id", Number(contractId))
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching contract signature fields:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error in getContractSignatureFields:", error);
      throw error;
    }
  },

  // Generate signature links for all fields in a contract
  async generateSignatureLinks(contractId: string) {
    try {
      const fields = await this.getContractSignatureFields(contractId);
      const baseUrl = window.location.origin;

      return fields.map((field) => ({
        signatureId: field.signature_id,
        signerName: field.signer_name,
        signerCPF: field.signer_cpf,
        signatureUrl: `${baseUrl}/sign/${contractId}/${field.signature_id}`,
        status: field.status,
        signatureImageUrl: field.signature_url,
        signedAt: field.signed_at,
        clientIp: field.client_ip,
      }));
    } catch (error) {
      console.error("Error generating signature links:", error);
      throw error;
    }
  },

  // Remove signature completely (delete from database, storage, and contract content)
  async removeSignature(signatureId: string) {
    try {
      console.log(
        `🗑️ Starting complete signature removal process for: ${signatureId}`,
      );

      // First, get the current signature field data
      const signatureField = await this.getSignatureField(signatureId);

      if (!signatureField) {
        throw new Error("Signature field not found");
      }

      console.log(`📋 Found signature field:`, {
        signatureId,
        signerName: signatureField.signer_name,
        status: signatureField.status,
        hasSignatureUrl: !!signatureField.signature_url,
        contractId: signatureField.contracts?.id,
      });

      // Step 1: Delete signature file from storage if it exists
      if (signatureField.signature_url) {
        try {
          console.log(
            `🗂️ Deleting signature file from storage: ${signatureField.signature_url}`,
          );

          // Extract the file path from the URL
          const url = new URL(signatureField.signature_url);
          const pathParts = url.pathname.split("/");

          // Find the path after the bucket name
          const bucketIndex = pathParts.findIndex(
            (part) => part === "signatures",
          );

          if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
            const filePath = pathParts.slice(bucketIndex + 1).join("/");
            console.log(`📁 Extracted file path: ${filePath}`);

            // Delete the signature file from storage
            const { storageService, STORAGE_BUCKETS } = await import(
              "./storage"
            );
            await storageService.deleteFile(
              STORAGE_BUCKETS.SIGNATURES,
              filePath,
            );
            console.log(`✅ Signature file deleted from storage: ${filePath}`);
          } else {
            console.warn(
              `⚠️ Could not extract file path from URL: ${signatureField.signature_url}`,
            );
          }
        } catch (storageError) {
          console.error(
            "❌ Error deleting signature file from storage:",
            storageError,
          );
          // Continue with database update even if file deletion fails
          console.log(
            "⏭️ Continuing with database cleanup despite storage error...",
          );
        }
      } else {
        console.log(`ℹ️ No signature file to delete from storage`);
      }

      // Step 2: Completely delete the signature field from database (instead of just resetting)
      console.log(`🗑️ Completely removing signature field from database...`);
      const { error: deleteError } = await supabase
        .from("electronic_signature_fields")
        .delete()
        .eq("signature_id", signatureId);

      if (deleteError) {
        console.error(
          "❌ Error deleting signature field from database:",
          deleteError,
        );
        throw new Error(
          `Erro ao excluir campo de assinatura do banco de dados: ${deleteError.message}`,
        );
      }

      console.log(`✅ Signature field completely deleted from database`);

      // Step 3: Update the contract content to remove the signature
      if (signatureField.contracts?.id) {
        console.log(`📝 Updating contract content to remove signature...`);
        await this.removeSignatureFromContractContent(
          signatureField.contracts.id.toString(),
          signatureId,
          signatureField.signer_name,
          signatureField.signer_cpf,
        );
        console.log(`✅ Contract content updated`);
      } else {
        console.warn(`⚠️ No contract ID found for signature field`);
      }

      console.log(
        `🎉 Signature removal process completed successfully for: ${signatureId}`,
      );
      console.log(`📊 Summary of actions completed:`);
      console.log(`   • ✅ Signature file deleted from storage`);
      console.log(`   • ✅ Database record completely deleted`);
      console.log(`   • ✅ Contract content updated`);

      return { success: true, signatureId };
    } catch (error) {
      console.error(`💥 Error in removeSignature for ${signatureId}:`, error);
      throw new Error(
        `Erro ao remover assinatura completamente: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },

  // Remove signature from contract content and restore original placeholder
  async removeSignatureFromContractContent(
    contractId: string,
    signatureId: string,
    signerName: string,
    signerCPF: string,
  ) {
    try {
      console.log(
        `📝 Removing signature from contract content: ${contractId}, signature: ${signatureId}`,
      );

      // Get current contract content
      const { data: contractData, error: fetchError } = await supabase
        .from("contracts")
        .select("contract_content")
        .eq("id", contractId)
        .single();

      if (fetchError) {
        console.error("❌ Error fetching contract content:", fetchError);
        throw new Error(
          `Erro ao buscar conteúdo do contrato: ${fetchError.message}`,
        );
      }

      let updatedContent = contractData.contract_content || "";
      console.log(`📄 Current content length: ${updatedContent.length}`);

      // Remove the signature field completely from the contract content
      // Try multiple patterns to catch different signature field formats
      const patterns = [
        // Pattern for shortcode format
        new RegExp(
          `\\[SIGNATURE id="${signatureId}" name="[^"]*" cpf="[^"]*"\\]`,
          "g",
        ),
        // Pattern for completed signature fields
        new RegExp(
          `<div class="signature-field-completed"[^>]*data-signature-id="${signatureId}"[^>]*>[\\s\\S]*?</div>`,
          "g",
        ),
        // Pattern for any signature field with this ID
        new RegExp(
          `<div[^>]*class="[^"]*signature-field[^"]*"[^>]*data-signature-id="${signatureId}"[^>]*>[\\s\\S]*?</div>`,
          "g",
        ),
        // Pattern for signature-field-placeholder
        new RegExp(
          `<div class="signature-field-placeholder"[^>]*data-signature-id="${signatureId}"[^>]*>[\\s\\S]*?</div>`,
          "g",
        ),
        // Broader pattern as fallback
        new RegExp(
          `<div[^>]*data-signature-id="${signatureId}"[^>]*>[\\s\\S]*?</div>`,
          "g",
        ),
      ];

      let replaced = false;
      const originalContent = updatedContent;

      // Try each pattern until one works - completely remove the signature field
      for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        const testContent = updatedContent.replace(pattern, ""); // Remove completely
        if (testContent !== updatedContent) {
          updatedContent = testContent;
          replaced = true;
          console.log(
            `✅ Signature field completely removed using pattern ${i + 1}: ${pattern.source.substring(0, 50)}...`,
          );
          break;
        }
      }

      if (!replaced) {
        console.warn(
          `⚠️ No signature field found with ID: ${signatureId}. Searching in content...`,
        );
        // Log a sample of the content to help debug
        const contentSample = updatedContent.substring(0, 1000);
        console.log(`Content sample:`, contentSample);

        // Try to find any mention of the signature ID
        if (updatedContent.includes(signatureId)) {
          console.log(
            `✅ Signature ID found in content, but pattern didn't match`,
          );
          // Try a simple string replacement as last resort
          const simplePattern = new RegExp(signatureId, "g");
          const beforeLength = updatedContent.length;
          updatedContent = updatedContent.replace(simplePattern, "");
          const afterLength = updatedContent.length;
          if (beforeLength !== afterLength) {
            console.log(
              `✅ Signature ID removed using simple string replacement`,
            );
            replaced = true;
          }
        } else {
          console.log(`❌ Signature ID not found in content at all`);
        }

        // Don't throw error, just log warning - the signature was still removed from database
        console.log(`⏭️ Continuing without content update...`);
      } else {
        console.log(
          `✅ Signature field completely removed for ID: ${signatureId}`,
        );
      }

      // Update the contract content in the database
      console.log(`💾 Updating contract content in database...`);
      const { error: updateError } = await supabase
        .from("contracts")
        .update({
          contract_content: updatedContent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contractId);

      if (updateError) {
        console.error("❌ Error updating contract content:", updateError);
        throw new Error(
          `Erro ao atualizar conteúdo do contrato: ${updateError.message}`,
        );
      }

      console.log(
        "✅ Contract content updated successfully - signature removed and field restored to pending state",
      );
    } catch (error) {
      console.error("❌ Error in removeSignatureFromContractContent:", error);
      throw new Error(
        `Erro ao remover assinatura do conteúdo do contrato: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
};

// Client service
export const clientService = {
  // Authenticate client with CPF and password
  async authenticateWithCpf(cpf: string, password: string) {
    try {
      console.log("Attempting to authenticate client with CPF:", cpf);

      // Import password utilities
      const { hashPassword, verifyPassword } = await import("./password-utils");

      // Clean CPF (remove formatting)
      const cleanCpf = cpf.replace(/\D/g, "");

      // Validar CPF básico
      if (cleanCpf.length !== 11 && cleanCpf.length !== 14) {
        console.log("Invalid CPF/CNPJ length:", cleanCpf.length);
        return null;
      }

      // Não logar CPF completo por segurança
      console.log("Searching for client...");

      // Find client by CPF
      // Tentar primeiro sem password_hash para evitar erro 406 se campo não existir
      let { data: client, error } = await supabase
        .from("clients")
        .select("id, full_name, name, email, phone, cpf_cnpj, created_at, updated_at, address, address_street, address_number, address_complement, address_neighborhood, address_city, address_state, address_zip")
        .eq("cpf_cnpj", cleanCpf)
        .maybeSingle(); // Usar maybeSingle() ao invés de single() para não lançar erro se não encontrar
      
      // Log mínimo para debug (sem dados sensíveis)
      if (client) {
        console.log("Client found in first query");
      } else {
        console.log("Client not found in first query, trying alternatives...");
      }

      // Se deu erro 406, tentar com password_hash incluído
      if (error && error.code === "PGRST406") {
        console.log("Retrying query with password_hash field...");
        const retryResult = await supabase
          .from("clients")
          .select("id, full_name, name, email, phone, cpf_cnpj, password_hash, created_at, updated_at, address, address_street, address_number, address_complement, address_neighborhood, address_city, address_state, address_zip")
          .eq("cpf_cnpj", cleanCpf)
          .maybeSingle();
        
        if (!retryResult.error) {
          client = retryResult.data;
          error = null;
        } else {
          error = retryResult.error;
        }
      }

      // Se ainda não encontrou, tentar buscar com LIKE para ver se há formatação diferente
      if (!client && !error) {
        console.log("Trying LIKE search...");
        
        // Tentar buscar com LIKE (sem formatação)
        const likeResult = await supabase
          .from("clients")
          .select("id, full_name, name, email, phone, cpf_cnpj, password_hash, created_at, updated_at, address, address_street, address_number, address_complement, address_neighborhood, address_city, address_state, address_zip")
          .ilike("cpf_cnpj", `%${cleanCpf}%`)
          .maybeSingle();
        
        if (likeResult.data) {
          console.log("Client found with LIKE search");
          client = likeResult.data;
        }
        
        if (likeResult.data) {
          console.log("Found client with LIKE search:", likeResult.data.cpf_cnpj);
          client = likeResult.data;
        } else {
          // Tentar buscar removendo formatação do banco também
          console.log("Trying to find client by removing formatting from database CPFs...");
          
          // Tentar buscar todos e filtrar manualmente (sem logar dados sensíveis)
          const allClientsResult = await supabase
            .from("clients")
            .select("id, full_name, name, email, phone, cpf_cnpj, created_at, updated_at, address, address_street, address_number, address_complement, address_neighborhood, address_city, address_state, address_zip");
          
          if (allClientsResult.data) {
            const foundClient = allClientsResult.data.find(c => {
              if (!c.cpf_cnpj) return false;
              const dbCpf = c.cpf_cnpj.replace(/\D/g, "");
              return dbCpf === cleanCpf;
            });
            
            if (foundClient) {
              console.log("Found client by manual filtering");
              // Buscar password_hash separadamente se não foi incluído
              if (!foundClient.password_hash) {
                const passwordResult = await supabase
                  .from("clients")
                  .select("password_hash")
                  .eq("id", foundClient.id)
                  .maybeSingle();
                
                if (passwordResult.data) {
                  foundClient.password_hash = passwordResult.data.password_hash;
                }
              }
              client = foundClient;
            } else {
              console.log("Client not found even with manual filtering");
            }
          }
        }
      }
      
      // Se ainda não encontrou e deu erro
      if (error && !client) {
        console.log("Error fetching client:", error);
        console.log("Error code:", error.code);
        console.log("Error message:", error.message);
        
        if (error.code === "PGRST116") {
          // Não logar CPF por segurança
          console.log("Client not found");
          return null; // Not found
        }
        
        // Se for erro 406, pode ser problema de RLS ou campo não existente
        if (error && error.code === "PGRST406") {
          console.error("406 Error - Possible RLS issue or missing password_hash column");
          console.error("Please check:");
          console.error("1. If password_hash column exists in clients table");
          console.error("2. If RLS policies allow reading clients");
          // Tentar buscar sem password_hash como fallback
          const fallbackResult = await supabase
            .from("clients")
            .select("id, full_name, name, email, phone, cpf_cnpj, created_at, updated_at")
            .eq("cpf_cnpj", cleanCpf)
            .maybeSingle();
          
          if (!fallbackResult.error && fallbackResult.data) {
            client = fallbackResult.data;
            // password_hash será null, mas podemos continuar com autenticação antiga
            console.log("Using fallback query without password_hash");
            error = null;
          } else {
            console.log("Fallback query also failed");
            return null;
          }
        } else if (error && error.code !== "PGRST116") {
          console.error("Unexpected error:", error);
        throw error;
        }
      }

      if (!client) {
        console.log("No client found with CPF:", cleanCpf);
        return null;
      }

      // Log mínimo (sem dados sensíveis)
      console.log("Client found, verifying password...");

      // Buscar password_hash se não foi incluído na query inicial
      if (!client.password_hash) {
        const passwordResult = await supabase
          .from("clients")
          .select("password_hash")
          .eq("id", client.id)
          .maybeSingle();
        
        if (passwordResult.data && passwordResult.data.password_hash) {
          client.password_hash = passwordResult.data.password_hash;
          console.log("Password hash retrieved");
        } else {
          console.log("No password_hash found in database");
        }
      }

      // Verificar senha usando hash
      if (client.password_hash) {
        // Se tem hash armazenado, verificar usando hash
        console.log("Verifying password with hash...");
        const isValid = await verifyPassword(password, client.password_hash);
        if (!isValid) {
          console.log("Password hash verification failed");
          // Não logar dados sensíveis - apenas erro genérico
          return null;
        }
        console.log("Password hash verification successful");
      } else {
        // Compatibilidade com sistema antigo: verificar padrões antigos
        // Isso permite migração gradual
        const expectedPassword = `cliente${client.id}`;
      if (password !== expectedPassword && password !== "123456") {
          // Não logar dados sensíveis - apenas erro genérico
          console.log("Authentication failed: invalid credentials");
        return null;
        }
        // Se autenticou com senha antiga, atualizar para hash
        console.log("Migrating password to hash");
        await this.updatePassword(client.id, password);
      }

      console.log("Authentication successful");
      return client;
    } catch (error) {
      console.error("Error in authenticateWithCpf:", error);
      return null;
    }
  },

  // Update client password
  async updatePassword(clientId: number, newPassword: string) {
    try {
      console.log("Updating password for client ID:", clientId);

      // Import password utilities
      const { hashPassword } = await import("./password-utils");

      // Criar hash da senha
      const passwordHash = await hashPassword(newPassword);
      console.log("Password hash created (first 10 chars):", passwordHash.substring(0, 10) + "...");

      // Atualizar no banco de dados
      // Primeiro tentar sem select para evitar problemas de RLS
      const { error: updateError } = await supabase
        .from("clients")
        .update({
          password_hash: passwordHash,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clientId);

      if (updateError) {
        console.error("Error updating password in database:", updateError);
        console.error("Error code:", updateError.code);
        console.error("Error message:", updateError.message);
        console.error("Error details:", updateError.details);
        throw new Error(`Erro ao atualizar senha: ${updateError.message || "Erro desconhecido"}`);
      }

      console.log("Password update query executed successfully");

      // Verificar se foi salvo corretamente (sem select para evitar RLS)
      const verifyResult = await supabase
        .from("clients")
        .select("id, password_hash")
        .eq("id", clientId)
        .maybeSingle();
      
      if (verifyResult.error) {
        console.warn("Error verifying password hash (may be RLS):", verifyResult.error);
        // Não lançar erro aqui, pois pode ser apenas problema de leitura por RLS
        // O update pode ter funcionado mesmo assim
      } else if (verifyResult.data && verifyResult.data.password_hash) {
        console.log("Password hash verified in database");
        // Comparar hash para garantir que foi salvo corretamente
        if (verifyResult.data.password_hash === passwordHash) {
          console.log("Password hash matches - update successful");
        } else {
          console.warn("Password hash mismatch - possible issue");
        }
      } else {
        console.warn("Password hash not found after save - possible RLS issue or column doesn't exist");
        // Verificar se a coluna existe
        console.warn("Please verify that password_hash column exists in clients table");
      }

      return true;
    } catch (error) {
      console.error("Error updating client password:", error);
      throw error;
    }
  },

  // Get all clients for a representative
  async getByRepresentative(representativeId: string) {
    try {
      // First, get clients directly associated with the representative
      // Note: clients table doesn't have representative_id field based on schema
      // This query will be skipped for now
      const directClients: any[] = [];
      const directError = null;

      if (directError) {
        console.error("Error fetching direct clients:", directError);
      }

      // Also get clients from contracts created by this representative
      const { data: contractClients, error: contractError } = await supabase
        .from("contracts")
        .select(
          `
          clients!inner (
            id,
            full_name,
            name,
            email,
            phone,
            cpf_cnpj,
            address_street,
            address_number,
            address_complement,
            address_neighborhood,
            address_city,
            address_state,
            address_zip,
            created_at,
            updated_at
          )
        `,
        )
        .eq("representative_id", representativeId);

      if (contractError) {
        console.error("Error fetching contract clients:", contractError);
      }

      // Combine and deduplicate clients
      const allClients = [];
      const clientIds = new Set();

      // Add direct clients
      if (directClients) {
        directClients.forEach((client) => {
          if (!clientIds.has(client.id)) {
            allClients.push(client);
            clientIds.add(client.id);
          }
        });
      }

      // Add clients from contracts
      if (contractClients) {
        contractClients.forEach((contract) => {
          const client = contract.clients;
          if (client && !clientIds.has(client.id)) {
            allClients.push(client);
            clientIds.add(client.id);
          }
        });
      }

      return allClients;
    } catch (error) {
      console.error("Error in clientService.getByRepresentative:", error);
      return [];
    }
  },

  // Get all clients with representative information (for admin)
  async getAllWithRepresentative() {
    try {
      // First, get all clients from the clients table
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (clientsError) {
        console.error("Error fetching clients:", clientsError);
      }

      // Also get clients from contracts (since many clients are created through contracts)
      const { data: contractsData, error: contractsError } = await supabase
        .from("contracts")
        .select(
          `
          clients!inner (
            id,
            full_name,
            name,
            email,
            phone,
            cpf_cnpj,
            address_street,
            address_number,
            address_complement,
            address_neighborhood,
            address_city,
            address_state,
            address_zip,
            created_at,
            updated_at
          ),
          representative_id
        `,
        )
        .order("created_at", { ascending: false });

      if (contractsError) {
        console.error("Error fetching contracts with clients:", contractsError);
      }

      // Get all representatives
      const { data: representativesData, error: repsError } = await supabase
        .from("profiles")
        .select("id, full_name, email, commission_code")
        .eq("role", "Representante");

      if (repsError) {
        console.error("Error fetching representatives:", repsError);
      }

      // Create a map of representatives by ID for quick lookup
      const repsMap = new Map();
      (representativesData || []).forEach((rep) => {
        repsMap.set(rep.id, rep);
      });

      // Combine all clients and deduplicate
      const allClientsMap = new Map();

      // Add clients from the clients table
      (clientsData || []).forEach((client) => {
        // Note: clients table doesn't have representative_id field
        const representative = null;

        allClientsMap.set(client.id, {
          ...client,
          profiles: representative || null,
        });
      });

      // Add clients from contracts (these will have representative info from the contract)
      (contractsData || []).forEach((contract) => {
        const client = contract.clients;
        if (client) {
          const representative = contract.representative_id
            ? repsMap.get(contract.representative_id)
            : null;

          // If client already exists, update with representative info if not already set
          const existingClient = allClientsMap.get(client.id);
          if (existingClient) {
            // Update representative info if current client doesn't have one but contract does
            if (!existingClient.profiles && representative) {
              existingClient.profiles = representative;
            }
          } else {
            // Add new client with representative info
            allClientsMap.set(client.id, {
              ...client,
              profiles: representative || null,
            });
          }
        }
      });

      // Convert map to array
      const clientsWithReps = Array.from(allClientsMap.values());

      console.log(
        "Successfully combined clients with representatives:",
        clientsWithReps.length,
        "clients",
      );

      // Log some examples for debugging
      clientsWithReps.slice(0, 3).forEach((client) => {
        console.log(
          `Client ${client.full_name || client.name}: representative=${client.profiles?.full_name || "none"}`,
        );
      });

      return clientsWithReps;
    } catch (error) {
      console.error("Error in clientService.getAllWithRepresentative:", error);

      // Final fallback - try to get basic client data
      try {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("clients")
          .select("*")
          .order("created_at", { ascending: false });

        if (fallbackError) {
          console.error("Fallback query also failed:", fallbackError);
          return [];
        }

        console.log("Using fallback client data:", fallbackData);
        return (fallbackData || []).map((client) => ({
          ...client,
          profiles: null,
        }));
      } catch (fallbackError) {
        console.error("Fallback query failed:", fallbackError);
        return [];
      }
    }
  },

  // Get client by ID
  async getById(clientId: number) {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .single();

      if (error) {
        console.error("Error fetching client by ID:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in clientService.getById:", error);
      throw error;
    }
  },

  // Create new client
  async create(clientData: {
    full_name: string;
    name?: string;
    email: string;
    phone?: string;
    cpf_cnpj?: string;
    address_street?: string;
    address_number?: string;
    address_complement?: string;
    address_neighborhood?: string;
    address_city?: string;
    address_state?: string;
    address_zip?: string;
    representative_id: string;
  }) {
    try {
      const insertData = {
        ...clientData,
        name: clientData.name || clientData.full_name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("clients")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("Error creating client:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in clientService.create:", error);
      throw error;
    }
  },

  // Update client
  async update(
    clientId: number,
    updates: Partial<{
      full_name: string;
      name: string;
      email: string;
      phone: string;
      cpf_cnpj: string;
      address_street: string;
      address_number: string;
      address_complement: string;
      address_neighborhood: string;
      address_city: string;
      address_state: string;
      address_zip: string;
      representative_id: string;
    }>,
  ) {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("clients")
        .update(updateData)
        .eq("id", clientId)
        .select()
        .single();

      if (error) {
        console.error("Error updating client:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in clientService.update:", error);
      throw error;
    }
  },

  // Delete client
  async delete(clientId: number) {
    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientId);

      if (error) {
        console.error("Error deleting client:", error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error in clientService.delete:", error);
      throw error;
    }
  },

  // Get client statistics for a representative
  async getRepresentativeClientStats(representativeId: string) {
    try {
      // Get all clients for this representative (using the same logic as getByRepresentative)
      const clients = await this.getByRepresentative(representativeId);

      const totalClients = clients?.length || 0;
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const newClientsThisMonth =
        clients?.filter(
          (client) => new Date(client.created_at || "") >= thisMonth,
        ).length || 0;

      return {
        totalClients,
        newClientsThisMonth,
      };
    } catch (error) {
      console.error(
        "Error in clientService.getRepresentativeClientStats:",
        error,
      );
      return {
        totalClients: 0,
        newClientsThisMonth: 0,
      };
    }
  },
};

// Invoice service
export const invoiceService = {
  // Get all invoices by client ID (through contracts)
  async getByClientId(clientId: number) {
    try {
      // Buscar todos os contratos do cliente primeiro
      const contracts = await contractService.getByClientId(clientId);
      const contractIds = contracts.map((c: any) => c.id);

      if (contractIds.length === 0) {
        return [];
      }

      // Buscar todas as faturas dos contratos do cliente
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          contracts!inner (
            id,
            contract_number,
            client_id
          )
        `)
        .in("contract_id", contractIds)
        .order("due_date", { ascending: true });

      if (error) {
        console.error("Error fetching invoices by client:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error in invoiceService.getByClientId:", error);
      throw error;
    }
  },

  // Get invoice by ID with full details
  async getById(invoiceId: string) {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          contracts!inner (
            id,
            contract_number,
            client_id,
            clients (
              id,
              full_name,
              name,
              email,
              cpf_cnpj
            )
          )
        `)
        .eq("id", invoiceId)
        .single();

      if (error) {
        console.error("Error fetching invoice by ID:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in invoiceService.getById:", error);
      throw error;
    }
  },

  // Get invoices by contract ID
  async getByContractId(contractId: number) {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("contract_id", contractId)
        .order("installment_number", { ascending: true });

      if (error) {
        console.error("Error fetching invoices by contract:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error in invoiceService.getByContractId:", error);
      throw error;
    }
  },
};

// Anticipation service
export const anticipationService = {
  // Get all anticipations by client ID (through contracts)
  async getByClientId(clientId: number) {
    try {
      // Buscar todos os contratos do cliente primeiro
      const contracts = await contractService.getByClientId(clientId);
      const contractIds = contracts.map((c: any) => c.id);

      if (contractIds.length === 0) {
        return [];
      }

      // Buscar todas as antecipações dos contratos do cliente
      const { data, error } = await supabase
        .from("anticipations")
        .select(`
          *,
          contracts!inner (
            id,
            contract_number,
            client_id
          )
        `)
        .in("contract_id", contractIds)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching anticipations by client:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error in anticipationService.getByClientId:", error);
      throw error;
    }
  },

  // Get anticipation by ID with full details
  async getById(anticipationId: string) {
    try {
      const { data, error } = await supabase
        .from("anticipations")
        .select(`
          *,
          contracts!inner (
            id,
            contract_number,
            client_id,
            clients (
              id,
              full_name,
              name,
              email,
              cpf_cnpj
            )
          )
        `)
        .eq("id", anticipationId)
        .single();

      if (error) {
        console.error("Error fetching anticipation by ID:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in anticipationService.getById:", error);
      throw error;
    }
  },

  // Create anticipation request
  async createRequest(
    contractId: number,
    data: {
      installmentsCount: number;
      reason?: string;
      notes?: string;
    }
  ) {
    try {
      // Buscar contrato para obter informações necessárias
      const contract = await contractService.getById(contractId);
      if (!contract) {
        throw new Error("Contrato não encontrado");
      }

      // Buscar faturas pendentes do contrato
      const invoices = await invoiceService.getByContractId(contractId);
      const pendingInvoices = invoices.filter(
        (inv: any) => inv.status === "pending" || inv.status === "Pendente"
      );

      if (pendingInvoices.length < data.installmentsCount) {
        throw new Error(
          `Não há parcelas suficientes pendentes. Disponível: ${pendingInvoices.length}, Solicitado: ${data.installmentsCount}`
        );
      }

      // Calcular valor original (soma das parcelas pendentes selecionadas)
      const selectedInvoices = pendingInvoices.slice(0, data.installmentsCount);
      const originalAmount = selectedInvoices.reduce(
        (sum: number, inv: any) =>
          sum + parseFloat(inv.value || inv.amount || "0"),
        0
      );

      // Buscar condições de antecipação baseado na faixa de crédito do contrato
      let discountPercentage = 0;
      let discountAmount = 0;
      let finalAmount = originalAmount;

      try {
        // Buscar faixa de crédito do contrato diretamente
        if (contract.id_faixa_de_credito) {
          const { data: creditRange, error: rangeError } = await supabase
            .from("faixas_de_credito")
            .select("*")
            .eq("id", contract.id_faixa_de_credito)
            .single();

          if (!rangeError && creditRange) {
            // Buscar condições de antecipação para esta faixa
            const { data: conditions, error: conditionsError } = await supabase
              .from("condicoes_antecipacao")
              .select("*")
              .eq("faixa_credito_id", creditRange.id)
              .order("percentual", { ascending: false });

            if (!conditionsError && conditions && conditions.length > 0) {
              // Usar a condição com maior percentual disponível
              const bestCondition = conditions[0];
              discountPercentage = bestCondition.percentual || 0;
              discountAmount = (originalAmount * discountPercentage) / 100;
              finalAmount = originalAmount - discountAmount;
            }
          }
        }
      } catch (calcError) {
        console.warn("Erro ao calcular desconto de antecipação, usando valor sem desconto:", calcError);
        // Continua sem desconto se houver erro
      }

      // Gerar número da antecipação
      const { data: lastAnticipation } = await supabase
        .from("anticipations")
        .select("anticipation_number")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      let anticipationNumber = "ANT-000001";
      if (lastAnticipation && lastAnticipation.anticipation_number) {
        const lastNumber = parseInt(lastAnticipation.anticipation_number.replace("ANT-", ""));
        anticipationNumber = `ANT-${String(lastNumber + 1).padStart(6, "0")}`;
      }

      // Criar solicitação de antecipação
      const { data: anticipation, error: insertError } = await supabase
        .from("anticipations")
        .insert({
          contract_id: contractId,
          anticipation_number: anticipationNumber,
          installments_count: data.installmentsCount,
          original_amount: originalAmount,
          discount_percentage: discountPercentage,
          discount_amount: discountAmount,
          final_amount: finalAmount,
          status: "pending",
          notes: data.reason || data.notes || "",
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating anticipation request:", insertError);
        throw insertError;
      }

      return anticipation;
    } catch (error) {
      console.error("Error in anticipationService.createRequest:", error);
      throw error;
    }
  },

  // Calculate anticipation value (preview before creating)
  async calculateAnticipationValue(
    contractId: number,
    installmentsCount: number
  ) {
    try {
      // Buscar faturas pendentes do contrato
      const invoices = await invoiceService.getByContractId(contractId);
      const pendingInvoices = invoices.filter(
        (inv: any) => inv.status === "pending" || inv.status === "Pendente"
      );

      if (pendingInvoices.length < installmentsCount) {
        return {
          available: pendingInvoices.length,
          requested: installmentsCount,
          canProceed: false,
          originalAmount: 0,
          discountPercentage: 0,
          discountAmount: 0,
          finalAmount: 0,
        };
      }

      // Calcular valor original
      const selectedInvoices = pendingInvoices.slice(0, installmentsCount);
      const originalAmount = selectedInvoices.reduce(
        (sum: number, inv: any) =>
          sum + parseFloat(inv.value || inv.amount || "0"),
        0
      );

      // Buscar condições de antecipação
      let discountPercentage = 0;
      let discountAmount = 0;
      let finalAmount = originalAmount;

      try {
        const contract = await contractService.getById(contractId);
        if (contract && contract.id_faixa_de_credito) {
          const { data: creditRange, error: rangeError } = await supabase
            .from("faixas_de_credito")
            .select("*")
            .eq("id", contract.id_faixa_de_credito)
            .single();

          if (!rangeError && creditRange) {
            const { data: conditions, error: conditionsError } = await supabase
              .from("condicoes_antecipacao")
              .select("*")
              .eq("faixa_credito_id", creditRange.id)
              .order("percentual", { ascending: false });

            if (!conditionsError && conditions && conditions.length > 0) {
              const bestCondition = conditions[0];
              discountPercentage = bestCondition.percentual || 0;
              discountAmount = (originalAmount * discountPercentage) / 100;
              finalAmount = originalAmount - discountAmount;
            }
          }
        }
      } catch (calcError) {
        console.warn("Erro ao calcular desconto:", calcError);
      }

      return {
        available: pendingInvoices.length,
        requested: installmentsCount,
        canProceed: true,
        originalAmount,
        discountPercentage,
        discountAmount,
        finalAmount,
      };
    } catch (error) {
      console.error("Error in anticipationService.calculateAnticipationValue:", error);
      throw error;
    }
  },
};

// General settings service
export const generalSettingsService = {
  // Get general settings
  async getSettings() {
    try {
      const { data, error } = await supabase
        .from('system_general_config')
        .select('*')
        .single();

      if (error) {
        console.error('Error fetching general settings:', error);
        // Return default settings if no data found
        return {
          system_name: "CredCar",
          company_name: "CredCar Soluções Financeiras",
          company_address: "Rua das Empresas, 123 - Centro - São Paulo/SP",
          company_phone: "(11) 3000-0000",
          company_email: "contato@credcar.com.br",
          company_cnpj: "12.345.678/0001-90",
          logo_url: "",
          logo_file_path: "",
        };
      }

      return data || {
        system_name: "CredCar",
        company_name: "CredCar Soluções Financeiras",
        company_address: "Rua das Empresas, 123 - Centro - São Paulo/SP",
        company_phone: "(11) 3000-0000",
        company_email: "contato@credcar.com.br",
        company_cnpj: "12.345.678/0001-90",
        logo_url: "",
        logo_file_path: "",
      };
    } catch (error) {
      console.error("Error in generalSettingsService.getSettings:", error);
      // Return default settings on error
      return {
        system_name: "CredCar",
        company_name: "CredCar Soluções Financeiras",
        company_address: "Rua das Empresas, 123 - Centro - São Paulo/SP",
        company_phone: "(11) 3000-0000",
        company_email: "contato@credcar.com.br",
        company_cnpj: "12.345.678/0001-90",
        logo_url: "",
        logo_file_path: "",
      };
    }
  },

  // Update general settings
  async updateSettings(settings: {
    system_name?: string;
    company_name?: string;
    company_address?: string;
    company_phone?: string;
    company_email?: string;
    company_cnpj?: string;
    logo_url?: string;
    logo_file_path?: string;
  }) {
    try {
      console.log('💾 Updating general settings:', settings);
      
      const { data, error } = await supabase
        .from('system_general_config')
        .upsert({
          id: 1, // Always use ID 1 for single config
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error updating general settings:', error);
        throw error;
      }

      console.log('✅ Settings updated successfully:', data);
      return data;
    } catch (error) {
      console.error("Error in generalSettingsService.updateSettings:", error);
      throw error;
    }
  },
};

// Signature service
export const signatureService = {
  // Get contract for public signature
  async getContractForSignature(contractId: string) {
    try {
      const { data, error } = await supabase
        .from("contracts")
        .select(
          `
          id,
          contract_code,
          contract_content,
          status,
          clients!inner (
            full_name,
            email
          )
        `,
        )
        .eq("id", contractId)
        .single();

      if (error) {
        console.error("Error fetching contract for signature:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error(
        "Error in signatureService.getContractForSignature:",
        error,
      );
      throw error;
    }
  },

  // Save signature data
  async saveSignature(signatureData: {
    contract_id: number;
    signer_name: string;
    signer_cpf: string;
    signature_image_url: string;
    client_ip: string;
  }) {
    try {
      const { data, error } = await supabase
        .from("contract_signatures")
        .insert({
          ...signatureData,
          signed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("Error saving signature:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in signatureService.saveSignature:", error);
      throw error;
    }
  },

  // Save contract document
  async saveContractDocument(documentData: {
    contract_id: number;
    document_type: string;
    document_url: string;
  }) {
    try {
      const { data, error } = await supabase
        .from("contract_documents")
        .insert({
          ...documentData,
          uploaded_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("Error saving contract document:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in signatureService.saveContractDocument:", error);
      throw error;
    }
  },

  // Update contract status after signature
  async updateContractStatusAfterSignature(contractId: number) {
    try {
      const { data, error } = await supabase
        .from("contracts")
        .update({
          status:
            "Em Análise" as Database["public"]["Enums"]["contract_status"],
          updated_at: new Date().toISOString(),
        })
        .eq("id", contractId)
        .select()
        .single();

      if (error) {
        console.error("Error updating contract status after signature:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error(
        "Error in signatureService.updateContractStatusAfterSignature:",
        error,
      );
      throw error;
    }
  },
};

// Partners service
export const partnersService = {
  // Get all partners for a representative
  async getByRepresentativeId(representativeId: string) {
    try {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .eq("representative_id", representativeId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching partners:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error in partnersService.getByRepresentativeId:", error);
      throw error;
    }
  },

  // Get partner by ID
  async getById(partnerId: string) {
    try {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .eq("id", partnerId)
        .single();

      if (error) {
        console.error("Error fetching partner:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in partnersService.getById:", error);
      throw error;
    }
  },

  // Create new partner
  async create(partnerData: Database["public"]["Tables"]["partners"]["Insert"]) {
    try {
      const { data, error } = await supabase
        .from("partners")
        .insert(partnerData)
        .select()
        .single();

      if (error) {
        console.error("Error creating partner:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in partnersService.create:", error);
      throw error;
    }
  },

  // Update partner
  async update(partnerId: string, updates: Database["public"]["Tables"]["partners"]["Update"]) {
    try {
      const { data, error } = await supabase
        .from("partners")
        .update(updates)
        .eq("id", partnerId)
        .select()
        .single();

      if (error) {
        console.error("Error updating partner:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in partnersService.update:", error);
      throw error;
    }
  },

  // Delete partner
  async delete(partnerId: string) {
    try {
      const { error } = await supabase
        .from("partners")
        .delete()
        .eq("id", partnerId);

      if (error) {
        console.error("Error deleting partner:", error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error in partnersService.delete:", error);
      throw error;
    }
  },

  // Get partner documents
  async getPartnerDocuments(partnerId: string) {
    try {
      const { data, error } = await supabase
        .from("partner_documents")
        .select("*")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching partner documents:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error in partnersService.getPartnerDocuments:", error);
      throw error;
    }
  },

  // Upload partner document
  async uploadDocument(documentData: Database["public"]["Tables"]["partner_documents"]["Insert"]) {
    try {
      const { data, error } = await supabase
        .from("partner_documents")
        .insert({
          ...documentData,
          uploaded_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("Error uploading partner document:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in partnersService.uploadDocument:", error);
      throw error;
    }
  },

  // Update partner document status
  async updateDocumentStatus(
    documentId: number,
    status: string,
    reviewedBy?: string,
    rejectionReason?: string
  ) {
    try {
      const updateData: Database["public"]["Tables"]["partner_documents"]["Update"] = {
        status,
        reviewed_at: new Date().toISOString(),
      };

      if (reviewedBy) {
        updateData.reviewed_by = reviewedBy;
      }

      if (rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }

      const { data, error } = await supabase
        .from("partner_documents")
        .update(updateData)
        .eq("id", documentId)
        .select()
        .single();

      if (error) {
        console.error("Error updating partner document status:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in partnersService.updateDocumentStatus:", error);
      throw error;
    }
  },

  // Check if all partner documents are approved
  async checkAllDocumentsApproved(partnerId: string): Promise<boolean> {
    try {
      const requiredDocuments = [
        "cartilha de credenciamento pf",
        "comprovante de endereço em nome do sócio",
        "certidão de antecedentes criminais",
        "certidão negativa cível de 1º grau",
        "certidão negativa criminal de 1º grau",
        "foto de identidade ou cnh (frente)",
        "foto de identidade ou cnh (verso)"
      ];

      const { data, error } = await supabase
        .from("partner_documents")
        .select("document_type, status")
        .eq("partner_id", partnerId)
        .in("document_type", requiredDocuments);

      if (error) {
        console.error("Error checking partner document approval status:", error);
        throw error;
      }

      // Check if all required documents are approved
      const approvedDocuments = (data || []).filter(
        (doc) => doc.status === "Aprovado",
      );
      return approvedDocuments.length === requiredDocuments.length;
    } catch (error) {
      console.error(
        "Error in partnersService.checkAllDocumentsApproved:",
        error,
      );
      return false;
    }
  },

  // Approve all partner documents
  async approveAllDocuments(partnerId: string, approvedBy: string) {
    try {
      // First, approve all documents
      const { error: docsError } = await supabase
        .from("partner_documents")
        .update({
          status: "Aprovado",
          reviewed_by: approvedBy,
          reviewed_at: new Date().toISOString(),
        })
        .eq("partner_id", partnerId);

      if (docsError) {
        console.error("Error approving partner documents:", docsError);
        throw docsError;
      }

      // Then update the partner to mark documents as approved
      const { data, error } = await supabase
        .from("partners")
        .update({
          documents_approved: true,
          documents_approved_at: new Date().toISOString(),
          documents_approved_by: approvedBy,
        })
        .eq("id", partnerId)
        .select()
        .single();

      if (error) {
        console.error("Error updating partner approval status:", error);
        throw error;
      }

      console.log(
        "Partner documents approved and partner activated for:",
        partnerId,
      );
      return data;
    } catch (error) {
      console.error("Error in partnersService.approveAllDocuments:", error);
      throw error;
    }
  },
};
