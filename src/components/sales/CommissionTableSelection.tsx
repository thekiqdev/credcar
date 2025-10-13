import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, Percent, CreditCard } from "lucide-react";
import { commissionPlansService, authService } from "@/lib/supabase";

interface CommissionPlan {
  id: number;
  nome: string;
  descricao: string;
  ativo: boolean;
}

interface CommissionTableSelectionProps {
  onTableSelect: (plan: CommissionPlan) => void;
  onBack?: () => void;
}

const CommissionTableSelection: React.FC<CommissionTableSelectionProps> = ({
  onTableSelect,
  onBack,
}) => {
  const [plans, setPlans] = useState<CommissionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<CommissionPlan | null>(null);
  const [loading, setLoading] = useState(true);

  // Get current user to check role
  const currentUser = authService.getCurrentUser();
  const adminEmails = ["admin@credicar.com", "admin@credcar.com", "admin@agenciadev.com"];
  const isAdmin =
    currentUser?.role === "Administrador" ||
    currentUser?.role === "admin" ||
    adminEmails.includes(currentUser?.email?.toLowerCase() || "") ||
    (currentUser?.email && currentUser.email.toLowerCase().includes("admin"));

  useEffect(() => {
    fetchCommissionPlans();
  }, []);

  const fetchCommissionPlans = async () => {
    try {
      const data = await commissionPlansService.getAll();
      console.log("All plans fetched:", data);
      console.log("Current user:", currentUser);
      console.log("Is admin:", isAdmin);
      
      // Filter active plans and apply visibility rules
      let filteredPlans = data.filter((plan) => plan.ativo !== false);
      console.log("Active plans:", filteredPlans);

      // If user is not admin, only show public plans
      if (!isAdmin) {
        filteredPlans = filteredPlans.filter(
          (plan) => plan.visibility !== "privado",
        );
        console.log("Filtered plans for non-admin:", filteredPlans);
      } else {
        console.log("Admin user - showing all plans including private ones");
      }

      setPlans(filteredPlans);
    } catch (error) {
      console.error("Error fetching commission plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (plan: CommissionPlan) => {
    setSelectedPlan(plan);
  };

  const handleContinue = () => {
    if (selectedPlan) {
      onTableSelect(selectedPlan);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando planos de comissão...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Seleção do Plano de Comissão
          </h1>
          <p className="text-gray-600">
            Escolha o plano de comissão que será aplicado a este contrato
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                selectedPlan?.id === plan.id
                  ? "ring-2 ring-red-500 bg-red-50"
                  : "hover:shadow-md"
              }`}
              onClick={() => handlePlanSelect(plan)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">
                    {plan.nome}
                  </CardTitle>
                  {plan.ativo && (
                    <Badge
                      variant="outline"
                      className="bg-green-100 text-green-700"
                    >
                      Ativo
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <CreditCard className="w-4 h-4 text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {plan.descricao ||
                        "Plano de comissão disponível para contratos"}
                    </p>
                  </div>

                  <div className="pt-2">
                    {selectedPlan?.id === plan.id ? (
                      <div className="flex items-center text-red-600 text-sm font-medium">
                        <div className="w-2 h-2 bg-red-600 rounded-full mr-2"></div>
                        Selecionado
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm">
                        Clique para selecionar
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {plans.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-gray-500 mb-4">
                Nenhum plano de comissão encontrado
              </p>
              <p className="text-sm text-gray-400">
                Entre em contato com o administrador para configurar os planos
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between">
          {onBack && (
            <Button onClick={onBack} variant="outline" size="lg">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          )}
          {!onBack && <div></div>}
          <Button
            onClick={handleContinue}
            disabled={!selectedPlan}
            className="bg-red-600 hover:bg-red-700 px-8"
            size="lg"
          >
            Continuar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CommissionTableSelection;
