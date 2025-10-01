/**
 * Formulário de Login Seguro
 * Utiliza Supabase Auth - Sem credenciais hardcoded
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/lib/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Lock, Mail, Eye, EyeOff } from 'lucide-react';

export const SecureLoginForm: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      console.log('🔐 Attempting login for:', email);

      // ============================================
      // ARQUITETURA DO SISTEMA:
      // - auth.users (Supabase Auth) = ADMIN
      // - profiles (tabela) = REPRESENTANTE
      // ============================================

      // PASSO 1: Tentar Supabase Auth PRIMEIRO (ADMINS)
      console.log('🔍 Trying Supabase Auth (Admin system)...');
      const response = await authService.login(email, password);

      if (response.user && !response.error) {
        console.log('✅ Supabase Auth SUCCESS! User is ADMIN');
        console.log('   Email:', response.user.email);
        console.log('   Role:', response.user.role);
        navigate('/admindashboard');
        return;
      }

      // PASSO 2: Tentar REPRESENTANTES (tabela profiles)
      console.log('ℹ️ Supabase Auth failed (expected for Representantes)');
      console.log('🔍 Trying profiles table (Representative system)...');
      
      const { representativeService } = await import("../../lib/supabase");
      const representative = await representativeService.authenticate(email, password);

      if (!representative) {
        console.log('❌ Authentication failed for:', email);
        setError('Email ou senha incorretos. Verifique suas credenciais.');
        setIsLoading(false);
        return;
      }

      console.log('✅ Representative found:', representative.name, 'Status:', representative.status);

      // IMPORTANTE: Salvar no localStorage (sistema antigo para representantes)
      const { authService: oldAuthService } = await import("../../lib/supabase");
      oldAuthService.setCurrentUser(representative);
      console.log('✅ Representative saved to localStorage');

      // Verificar status do representante
      switch (representative.status) {
        case 'Pendente de Aprovação':
          console.log('Redirecting to representative dashboard with notification');
          navigate('/representante');
          break;

        case 'Inativo':
        case 'Cancelado':
          setError('Sua conta está inativa. Entre em contato com o administrador.');
          await oldAuthService.logout(); // Limpar localStorage
          setIsLoading(false);
          return;

        case 'Ativo':
          console.log('Active representative, redirecting to dashboard');
          navigate('/representante');
          break;

        default:
          console.log('Unknown status, redirecting to dashboard');
          navigate('/representante');
          break;
      }

    } catch (error) {
      console.error('❌ Login error:', error);
      setError('Erro ao fazer login. Tente novamente.');
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Digite seu email para recuperar a senha');
      return;
    }

    setIsLoading(true);
    const { error } = await authService.resetPassword(email);
    
    if (error) {
      setError(error);
    } else {
      setError(null);
      alert('Email de recuperação enviado! Verifique sua caixa de entrada.');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            CredCar Finance
          </CardTitle>
          <CardDescription className="text-center">
            Faça login com suas credenciais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pl-10 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isLoading}
                className="text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
              >
                Esqueceu a senha?
              </button>
            </div>

            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Não tem uma conta?</p>
            <button
              onClick={() => navigate('/cadastro')}
              className="text-red-600 hover:text-red-700 font-medium"
            >
              Registrar como Representante
            </button>
          </div>

          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 font-medium text-center">
              🔒 Login Seguro e Criptografado
            </p>
            <p className="text-xs text-green-600 text-center mt-1">
              Sistema híbrido: Admins via Supabase Auth, Representantes via Profiles
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecureLoginForm;

