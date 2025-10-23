import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService, representativeService } from "../../lib/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertCircle, Eye, EyeOff, User, Lock, LogIn } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LoginFormProps {
  onLogin?: (email: string, password: string, userType: string) => void;
}

const LoginForm = ({ onLogin = () => {} }: LoginFormProps) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      console.log('🔐 Login attempt for:', email);

      // ============================================
      // ARQUITETURA DO SISTEMA:
      // - auth.users (Supabase Authentication) = ADMIN
      // - profiles (tabela) = REPRESENTANTE  
      // - clients (tabela) = CLIENTE
      // ============================================

      // PASSO 1: Tentar Supabase Auth PRIMEIRO (ADMINS)
      try {
        const { authService: secureAuthService } = await import("../../lib/auth.service");
        console.log('🔍 Trying Supabase Auth (Admin system)...');
        
        const authResponse = await secureAuthService.login(email, password);
        
        if (authResponse.user && !authResponse.error) {
          console.log('✅ Supabase Auth SUCCESS! User is ADMIN');
          console.log('   Email:', authResponse.user.email);
          console.log('   Role:', authResponse.user.role);
          
          // Converter para formato compatível
          const user = {
            id: authResponse.user.id,
            name: authResponse.user.full_name,
            full_name: authResponse.user.full_name,
            email: authResponse.user.email,
            role: 'Administrador', // Sempre admin se veio do auth.users
            status: "Ativo" as const,
            phone: "",
            cnpj: "",
            company_name: "",
            razao_social: "",
            point_of_sale: "",
            ponto_venda: "",
            commission_code: "",
            total_sales: 0,
            contracts_count: 0,
            created_at: authResponse.user.created_at,
          };

          authService.setCurrentUser(user);
          onLogin(email, password, 'Administrador');
          navigate("/admindashboard");
          return;
        }
      } catch (authError) {
        console.log('ℹ️ Supabase Auth failed (expected for Representantes/Clientes)');
        console.log('   Trying profiles table...');
      }

      // PASSO 2: Tentar REPRESENTANTES (tabela profiles)
      console.log("🔍 Trying profiles table (Representative system)...");

      // Try to authenticate as representative
      console.log("Attempting representative login for:", email);
      const representative = await representativeService.authenticate(
        email,
        password,
      );

      if (!representative) {
        console.log("Authentication failed for:", email);
        setError(
          "Email ou senha incorretos. Verifique suas credenciais e tente novamente. Se você acabou de se cadastrar, aguarde alguns minutos e tente novamente.",
        );
        setIsLoading(false);
        return;
      }

      console.log(
        "Representative found:",
        representative.name,
        "Status:",
        representative.status,
      );

      // Set user in localStorage first
      authService.setCurrentUser(representative);

      // Handle different user statuses
      switch (representative.status) {
        case "Pendente de Aprovação":
          console.log("Redirecting to representative dashboard with notification");
          navigate("/representante");
          break;

        case "Inativo":
        case "Cancelado":
          setError(
            "Sua conta está inativa. Entre em contato com o administrador.",
          );
          await authService.logout(); // Clear the user data
          setIsLoading(false);
          return;

        case "Documentos Pendentes":
          // Check if documents are actually approved in the database
          console.log("Checking document approval status...");
          const documentsApproved = await authService.checkDocumentsApproved(
            representative.id,
          );

          if (documentsApproved) {
            console.log("Documents approved, refreshing user data...");
            // Documents are approved, refresh user data and go to dashboard
            const updatedUser = await authService.refreshUserData(
              representative.id,
            );
            if (updatedUser && updatedUser.status === "Ativo") {
              console.log(
                "User status updated to active, redirecting to dashboard",
              );
              navigate("/representante");
            } else {
              console.log("User status not updated, redirecting to documents");
              navigate("/documentos");
            }
          } else {
            console.log(
              "Documents still pending, redirecting to document upload",
            );
            navigate("/documentos");
          }
          break;

        case "Ativo":
          console.log("Active user, redirecting to dashboard");
          navigate("/representante");
          break;

        default:
          console.log("Unknown status, redirecting to dashboard");
          navigate("/representante");
          break;
      }

      // Call the onLogin prop if provided
      onLogin(email, password, "representative");
    } catch (err) {
      console.error("Login error:", err);
      setError("Erro interno do sistema. Tente novamente em alguns instantes.");
      await authService.logout(); // Clear any partial user data
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg">
              <div className="h-6 w-6 bg-white rounded-md"></div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Cred Car Multimarcas</h1>
          <p className="text-gray-600">
            Compra Programada
          </p>
        </div>

        {/* Login Card */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-xl font-semibold text-center text-gray-900">
              Acesse sua conta
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              Entre com suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert
                  variant="destructive"
                  className="border-red-200 bg-red-50"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-700"
                >
                  Email
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu.email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 border-gray-200 focus:border-red-500 focus:ring-red-500"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-700"
                >
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 border-gray-200 focus:border-red-500 focus:ring-red-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Entrando...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    Entrar
                  </div>
                )}
              </Button>
            </form>
            {/* Registration Link */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-3">
                  Novo representante?
                </p>
                <Button
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                  onClick={() => navigate("/cadastro")}
                  type="button"
                >
                  Cadastre-se aqui
                </Button>
              </div>
            </div>
            {/* Demo Credentials */}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            © 2024 CredCar. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
