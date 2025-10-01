/**
 * Home Page Segura
 * Versão com autenticação segura usando Supabase Auth
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, UserProfile } from '@/lib/auth.service';
import SecureLoginForm from './auth/SecureLoginForm';

const SecureHome: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    checkAuthStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Execute apenas uma vez no mount

  const checkAuthStatus = async () => {
    try {
      // SISTEMA HÍBRIDO: Verificar Supabase Auth E localStorage
      
      // PASSO 1: Tentar Supabase Auth (ADMINS)
      let currentUser = await authService.getCurrentUser();
      
      // PASSO 2: Se não encontrou, tentar localStorage (REPRESENTANTES/sistema antigo)
      if (!currentUser) {
        console.log('ℹ️ SecureHome: No Supabase session, checking localStorage...');
        const { authService: oldAuthService } = await import('../lib/supabase');
        const localUser = oldAuthService.getCurrentUser();
        
        if (localUser) {
          console.log('✅ SecureHome: User found in localStorage:', localUser.email, 'Role:', localUser.role);
          currentUser = localUser;
        }
      }
      
      if (currentUser) {
        console.log('✅ User already authenticated:', currentUser.email, 'Role:', currentUser.role);
        setUser(currentUser);
        
        // Redirecionar para dashboard apropriado
        redirectToDashboard(currentUser.role);
      } else {
        console.log('ℹ️ No user authenticated, showing login');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('❌ Error checking auth:', error);
      setIsLoading(false);
    }
  };

  const redirectToDashboard = (role: string) => {
    switch (role) {
      case 'Administrador':
      case 'Suporte':
        navigate('/admindashboard');
        break;
      case 'Representante':
        navigate('/representante');
        break;
      case 'Cliente':
        navigate('/cliente');
        break;
      default:
        setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return <SecureLoginForm />;
};

export default SecureHome;

