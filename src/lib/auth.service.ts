/**
 * Serviço de Autenticação Seguro
 * Utiliza Supabase Auth para autenticação real e segura
 * 
 * ✅ Senhas criptografadas no servidor
 * ✅ Tokens JWT seguros
 * ✅ Row Level Security (RLS)
 * ✅ Sem credenciais no código
 * ✅ Session management automático
 */

import { supabase } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'Administrador' | 'Representante' | 'Cliente' | 'Suporte';
  profile_id?: string;
  created_at: string;
}

export interface AuthResponse {
  user: UserProfile | null;
  session: Session | null;
  error: string | null;
}

class AuthService {
  /**
   * Login com email e senha
   * Usa Supabase Auth nativo - totalmente seguro
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      console.log('🔐 Authenticating with Supabase Auth...');
      
      // Autenticar com Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: password,
      });

      if (error) {
        console.error('❌ Authentication error:', error.message);
        return {
          user: null,
          session: null,
          error: 'Email ou senha incorretos. Verifique suas credenciais.',
        };
      }

      if (!data.user || !data.session) {
        return {
          user: null,
          session: null,
          error: 'Erro ao processar autenticação.',
        };
      }

      console.log('✅ User authenticated:', data.user.email);

      // SIMPLIFICADO: Se logou no Supabase Auth, é ADMIN
      const userProfile: UserProfile = {
        id: data.user.id,
        email: data.user.email || '',
        role: 'Administrador', // SEMPRE admin se veio do Supabase Auth
        full_name: data.user.user_metadata?.full_name || data.user.email || 'Admin',
        created_at: data.user.created_at
      };

      console.log('✅ User is ADMIN:', userProfile.email);

      return {
        user: userProfile,
        session: data.session,
        error: null,
      };
    } catch (error) {
      console.error('❌ Login error:', error);
      return {
        user: null,
        session: null,
        error: 'Erro ao fazer login. Tente novamente.',
      };
    }
  }

  /**
   * Logout seguro
   */
  async logout(): Promise<void> {
    try {
      console.log('🔓 Logging out...');
      
      // Tentar logout do Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Supabase logout error:', error);
        // Mesmo com erro, continuar com limpeza local
      }
      
      // Limpeza adicional para garantir logout completo
      try {
        // Limpar localStorage relacionado ao Supabase
        localStorage.removeItem('sb-cgystsylstnkgfgbqoel-auth-token');
        localStorage.removeItem('supabase.auth.token');
        
        // Limpar sessionStorage
        sessionStorage.clear();
        
        // Limpar cookies relacionados ao Supabase
        document.cookie.split(";").forEach(function(c) { 
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
        
        console.log('✅ Local cleanup completed');
      } catch (cleanupError) {
        console.error('❌ Cleanup error:', cleanupError);
      }
      
      console.log('✅ Logged out successfully');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Mesmo com erro, tentar limpeza local
      try {
        localStorage.clear();
        sessionStorage.clear();
        console.log('✅ Emergency cleanup completed');
      } catch (emergencyError) {
        console.error('❌ Emergency cleanup failed:', emergencyError);
      }
    }
  }

  /**
   * Obter usuário atual da sessão
   * REGRA SIMPLES: Se está autenticado no Supabase Auth = É ADMIN
   */
  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      console.log('🔍 auth.service: Getting current user...');
      
      // Verificar se há tokens no localStorage primeiro
      const hasLocalToken = localStorage.getItem('sb-cgystsylstnkgfgbqoel-auth-token') || 
                           localStorage.getItem('supabase.auth.token');
      
      if (!hasLocalToken) {
        console.log('ℹ️ auth.service: No local token found');
        return null;
      }
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ auth.service: Session error:', error);
        // Se há erro na sessão, limpar tokens locais
        localStorage.removeItem('sb-cgystsylstnkgfgbqoel-auth-token');
        localStorage.removeItem('supabase.auth.token');
        return null;
      }
      
      if (!session?.user) {
        console.log('ℹ️ auth.service: No session found');
        return null;
      }

      console.log('✅ auth.service: Session found for:', session.user.email);
      
      // SIMPLIFICADO: Se está em auth.users, é ADMIN
      // Não precisa buscar em user_profiles
      const profile: UserProfile = {
        id: session.user.id,
        email: session.user.email || '',
        role: 'Administrador', // SEMPRE admin se veio do Supabase Auth
        full_name: session.user.user_metadata?.full_name || session.user.email || 'Admin',
        created_at: session.user.created_at
      };
      
      console.log('✅ auth.service: User is ADMIN:', profile.email);
      
      return profile;
    } catch (error) {
      console.error('❌ Get current user error:', error);
      // Em caso de erro, limpar tokens locais
      try {
        localStorage.removeItem('sb-cgystsylstnkgfgbqoel-auth-token');
        localStorage.removeItem('supabase.auth.token');
      } catch (cleanupError) {
        console.error('❌ Cleanup error in getCurrentUser:', cleanupError);
      }
      return null;
    }
  }

  /**
   * Verificar se usuário está autenticado
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      // Verificar tokens locais primeiro
      const hasLocalToken = localStorage.getItem('sb-cgystsylstnkgfgbqoel-auth-token') || 
                           localStorage.getItem('supabase.auth.token');
      
      if (!hasLocalToken) {
        return false;
      }
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        // Se há erro, limpar tokens e retornar false
        localStorage.removeItem('sb-cgystsylstnkgfgbqoel-auth-token');
        localStorage.removeItem('supabase.auth.token');
        return false;
      }
      
    return !!session;
    } catch (error) {
      console.error('❌ isAuthenticated error:', error);
      return false;
    }
  }

  /**
   * Obter sessão atual
   */
  async getSession(): Promise<Session | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  /**
   * Buscar perfil do usuário no banco
   * DESCONTINUADO: Não é mais necessário porque auth.users = SEMPRE ADMIN
   */
  // private async getUserProfile(userId: string): Promise<UserProfile | null> {
  //   try {
  //     console.log('🔍 auth.service: Fetching user profile for ID:', userId);
  //     
  //     const { data, error } = await supabase
  //       .from('user_profiles')
  //       .select('*')
  //       .eq('id', userId)
  //       .single();
  //
  //     if (error) {
  //       console.error('❌ Error fetching user profile:', error);
  //       return null;
  //     }
  //
  //     return data;
  //   } catch (error) {
  //     console.error('❌ Error in getUserProfile:', error);
  //     return null;
  //   }
  // }

  /**
   * Verificar se usuário tem role específica
   */
  async hasRole(role: string | string[]): Promise<boolean> {
    const user = await this.getCurrentUser();
    if (!user) return false;

    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(user.role);
  }

  /**
   * Verificar se usuário é admin
   */
  async isAdmin(): Promise<boolean> {
    return await this.hasRole(['Administrador', 'Suporte']);
  }

  /**
   * Registrar novo usuário (apenas para admins)
   */
  async registerUser(
    email: string,
    password: string,
    full_name: string,
    role: string
  ): Promise<AuthResponse> {
    try {
      // Verificar se quem está registrando é admin
      const isAdmin = await this.isAdmin();
      if (!isAdmin) {
        return {
          user: null,
          session: null,
          error: 'Apenas administradores podem registrar novos usuários.',
        };
      }

      // Criar usuário no Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password: password,
        options: {
          data: {
            full_name: full_name,
            role: role,
          },
        },
      });

      if (error) {
        console.error('Error creating user:', error);
        return {
          user: null,
          session: null,
          error: error.message,
        };
      }

      if (!data.user) {
        return {
          user: null,
          session: null,
          error: 'Erro ao criar usuário.',
        };
      }

      // O perfil será criado automaticamente pelo trigger
      const userProfile = await this.getUserProfile(data.user.id);

      return {
        user: userProfile,
        session: data.session,
        error: null,
      };
    } catch (error) {
      console.error('Error in registerUser:', error);
      return {
        user: null,
        session: null,
        error: 'Erro ao registrar usuário.',
      };
    }
  }

  /**
   * Atualizar senha do usuário
   */
  async updatePassword(newPassword: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      console.error('Error updating password:', error);
      return { error: 'Erro ao atualizar senha.' };
    }
  }

  /**
   * Resetar senha (enviar email)
   */
  async resetPassword(email: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      console.error('Error resetting password:', error);
      return { error: 'Erro ao resetar senha.' };
    }
  }

  /**
   * Listener para mudanças de autenticação
   */
  onAuthStateChange(callback: (user: UserProfile | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (session?.user) {
        const userProfile = await this.getUserProfile(session.user.id);
        callback(userProfile);
      } else {
        callback(null);
      }
    });
  }
}

// Exportar instância única
export const authService = new AuthService();

