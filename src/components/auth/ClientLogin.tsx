import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService, clientService } from "@/lib/supabase";
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

interface ClientLoginProps {
  onLogin?: () => void;
}

const ClientLogin = ({ onLogin = () => {} }: ClientLoginProps) => {
  const navigate = useNavigate();
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const formatCPF = (value: string) => {
    // Remove all non-numeric characters
    const numericValue = value.replace(/\D/g, "");

    // Apply CPF mask: 000.000.000-00
    if (numericValue.length <= 11) {
      return numericValue
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return value;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatCPF(e.target.value);
    setCpf(formattedValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Remove formatting from CPF for authentication
      const cleanCpf = cpf.replace(/\D/g, "");

      // Validar CPF básico
      if (cleanCpf.length !== 11) {
        setError("CPF inválido. Por favor, verifique o CPF informado.");
        setIsLoading(false);
        return;
      }

      // Validar senha
      if (!password || password.length < 4) {
        setError("Senha deve ter pelo menos 4 caracteres.");
        setIsLoading(false);
        return;
      }

      // Tentar autenticar cliente usando serviço real
      console.log("Attempting client login for CPF:", cleanCpf);
      const client = await clientService.authenticateWithCpf(cleanCpf, password);

      if (client) {
        // Criar objeto de usuário compatível com authService
        const clientUser = {
          id: client.id.toString(),
          name: client.full_name || client.name || "Cliente",
          full_name: client.full_name || client.name || "Cliente",
          email: client.email || `${cleanCpf}@cliente.com`,
          role: "Cliente",
          status: "Ativo" as const,
          phone: client.phone || "",
          cnpj: "",
          company_name: "",
          razao_social: "",
          point_of_sale: "",
          ponto_venda: "",
          commission_code: "",
          total_sales: 0,
          contracts_count: 0,
          created_at: client.created_at || new Date().toISOString(),
        };

        // Armazenar usuário no localStorage através do authService
        authService.setCurrentUser(clientUser);
        onLogin();
        console.log("Client login successful:", clientUser.name);
      } else {
        setError(
          "CPF ou senha incorretos. Verifique suas credenciais e tente novamente.",
        );
      }
    } catch (err) {
      console.error("Client login error:", err);
      setError("Erro interno do sistema. Tente novamente em alguns instantes.");
      await authService.logout();
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
          <p className="text-gray-600">Compra Programada</p>
        </div>

        {/* Login Card */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-xl font-semibold text-center text-gray-900">
              Acesse sua conta
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              Entre com seu CPF e senha para acessar seu painel
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

              {/* CPF Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="cpf"
                  className="text-sm font-medium text-gray-700"
                >
                  CPF
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="cpf"
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={handleCpfChange}
                    className="pl-10 h-11 border-gray-200 focus:border-red-500 focus:ring-red-500"
                    maxLength={14}
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

            {/* Back to Main Login */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-3">Não é cliente?</p>
                <Button
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                  onClick={() => navigate("/")}
                  type="button"
                >
                  Voltar ao login principal
                </Button>
              </div>
            </div>

            {/* Demo Credentials */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 text-center mb-2 font-medium">
                Credenciais de demonstração:
              </p>
              <div className="text-xs text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>CPF:</span>
                  <span className="font-mono">123.456.789-00</span>
                </div>
                <div className="flex justify-between">
                  <span>Senha:</span>
                  <span className="font-mono">cliente123</span>
                </div>
              </div>
            </div>
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

export default ClientLogin;
