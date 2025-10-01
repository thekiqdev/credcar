/**
 * Componente de Rota Protegida
 * Garante que apenas usuários autenticados acessem rotas específicas
 */

import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { authService, UserProfile } from '@/lib/auth.service';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectTo = '/',
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Execute apenas uma vez no mount

  const checkAuth = async () => {
    try {
      console.log('🔍 ProtectedRoute: Checking authentication...');
      
      // SISTEMA HÍBRIDO: Tentar Supabase Auth primeiro, depois localStorage
      
      // PASSO 1: Tentar Supabase Auth (ADMINS)
      let currentUser = await authService.getCurrentUser();
      
      // PASSO 2: Se não encontrou, tentar localStorage (REPRESENTANTES/sistema antigo)
      if (!currentUser) {
        console.log('ℹ️ ProtectedRoute: No Supabase session, checking localStorage...');
        const { authService: oldAuthService } = await import('../../lib/supabase');
        const localUser = oldAuthService.getCurrentUser();
        
        if (localUser) {
          console.log('✅ ProtectedRoute: User found in localStorage:', localUser.email, 'Role:', localUser.role);
          currentUser = localUser;
        }
      }
      
      if (!currentUser) {
        console.log('❌ ProtectedRoute: No user authenticated');
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      console.log('✅ ProtectedRoute: User authenticated:', currentUser.email, 'Role:', currentUser.role);

      // Se não há roles específicas, qualquer usuário autenticado pode acessar
      if (!allowedRoles || allowedRoles.length === 0) {
        console.log('✅ ProtectedRoute: No role restriction, access granted');
        setUser(currentUser);
        setIsAuthorized(true);
        setIsLoading(false);
        return;
      }

      // Verificar se o usuário tem uma das roles permitidas
      const hasRole = allowedRoles.includes(currentUser.role);
      
      if (hasRole) {
        console.log('✅ ProtectedRoute: User has required role:', currentUser.role);
        setUser(currentUser);
        setIsAuthorized(true);
      } else {
        console.log('❌ ProtectedRoute: User does not have required role. Has:', currentUser.role, 'Needs:', allowedRoles);
        setIsAuthorized(false);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('❌ ProtectedRoute: Error checking auth:', error);
      setIsAuthorized(false);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized || !user) {
    console.log('🔒 Redirecting to:', redirectTo);
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

