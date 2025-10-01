import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Calculator, Check, ChevronRight } from "lucide-react";
import ContractCreationFlow from "./ContractCreationFlow";
import { authService } from "@/lib/supabase";

interface PaymentPlan {
  firstPayment: number;
  remainingPayments: number;
  term: number;
  totalValue: number;
}

interface SalesSimulatorProps {
  onComplete?: () => void;
}

const SalesSimulator: React.FC<SalesSimulatorProps> = ({ onComplete }) => {
  const [selectedTable, setSelectedTable] = useState<string>("a");
  const [creditAmount, setCreditAmount] = useState<string>("");
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [showContractFlow, setShowContractFlow] = useState<boolean>(false);

  // Get current user to check role
  const currentUser = authService.getCurrentUser();
  const adminEmails = ["admin@credicar.com", "admin@credcar.com"];
  const isAdmin =
    currentUser?.role === "Administrador" ||
    adminEmails.includes(currentUser?.email?.toLowerCase() || "");

  // Mock commission tables data
  const commissionTables = {
    a: { name: "Tabela A", description: "Pagamento integral (1 parcela)" },
    b: { name: "Tabela B", description: "Pagamento dividido em 2 parcelas" },
    c: { name: "Tabela C", description: "Pagamento dividido em 3 parcelas" },
    d: { name: "Tabela D", description: "Pagamento dividido em 4 parcelas" },
  };

  const handleCreditAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setCreditAmount(value);
  };

  const calculatePaymentPlans = () => {
    if (!creditAmount || parseFloat(creditAmount) <= 0) return;

    const amount = parseFloat(creditAmount);
    const term = 80; // Fixed 80-month term

    // Generate mock payment plans based on the credit amount
    // In a real application, this would use actual calculation formulas
    const plans: PaymentPlan[] = [
      {
        firstPayment: amount * 0.02,
        remainingPayments: amount * 0.015,
        term: term,
        totalValue: amount,
      },
      {
        firstPayment: amount * 0.025,
        remainingPayments: amount * 0.0145,
        term: term,
        totalValue: amount,
      },
      {
        firstPayment: amount * 0.03,
        remainingPayments: amount * 0.014,
        term: term,
        totalValue: amount,
      },
    ];

    setPaymentPlans(plans);
    setShowResults(true);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handlePlanSelection = (plan: PaymentPlan) => {
    setSelectedPlan(plan);
  };

  const handleInitiateContract = () => {
    setShowContractFlow(true);
  };

  const handleContractFlowComplete = () => {
    setShowContractFlow(false);
    // Reset simulator state
    setSelectedTable("a");
    setCreditAmount("");
    setPaymentPlans([]);
    setShowResults(false);
    setSelectedPlan(null);

    if (onComplete) {
      onComplete();
    }
  };

  if (showContractFlow) {
    return <ContractCreationFlow onComplete={handleContractFlowComplete} />;
  }

  return (
    <div className="container mx-auto p-4 bg-white">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">
        Simulador de Vendas
      </h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Configuração da Simulação</CardTitle>
          <CardDescription>
            Selecione a tabela de comissão e insira o valor do crédito desejado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <Label htmlFor="table-selection" className="mb-2 block">
                Tabela de Comissão
              </Label>
              <Tabs
                defaultValue="a"
                value={selectedTable}
                onValueChange={setSelectedTable}
                className="w-full"
              >
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="a">Tabela A</TabsTrigger>
                  <TabsTrigger value="b">Tabela B</TabsTrigger>
                  <TabsTrigger value="c">Tabela C</TabsTrigger>
                  <TabsTrigger value="d">Tabela D</TabsTrigger>
                </TabsList>
                <div className="mt-2 text-sm text-gray-500">
                  {
                    commissionTables[
                      selectedTable as keyof typeof commissionTables
                    ].description
                  }
                </div>
              </Tabs>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="credit-amount" className="mb-2 block">
                  Valor do Crédito (R$)
                </Label>
                <div className="flex items-center">
                  <Input
                    id="credit-amount"
                    type="text"
                    placeholder="0,00"
                    value={
                      creditAmount
                        ? parseInt(creditAmount).toLocaleString("pt-BR")
                        : ""
                    }
                    onChange={handleCreditAmountChange}
                    className="text-right"
                  />
                  <Button
                    onClick={calculatePaymentPlans}
                    className="ml-2 bg-red-600 hover:bg-red-700"
                  >
                    <Calculator className="mr-2 h-4 w-4" /> Calcular
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {showResults && (
        <Card>
          <CardHeader>
            <CardTitle>Planos de Pagamento</CardTitle>
            <CardDescription>
              Selecione um plano para visualizar os detalhes e iniciar um
              contrato.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opção</TableHead>
                  <TableHead>Primeira Parcela</TableHead>
                  <TableHead>Demais Parcelas</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentPlans.map((plan, index) => (
                  <TableRow
                    key={index}
                    className={selectedPlan === plan ? "bg-gray-100" : ""}
                    onClick={() => handlePlanSelection(plan)}
                  >
                    <TableCell>Plano {index + 1}</TableCell>
                    <TableCell>{formatCurrency(plan.firstPayment)}</TableCell>
                    <TableCell>
                      {formatCurrency(plan.remainingPayments)}
                    </TableCell>
                    <TableCell>{plan.term} meses</TableCell>
                    <TableCell>{formatCurrency(plan.totalValue)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePlanSelection(plan)}
                        className={
                          selectedPlan === plan
                            ? "bg-green-100 border-green-500"
                            : ""
                        }
                      >
                        {selectedPlan === plan ? (
                          <>
                            <Check className="mr-1 h-4 w-4" /> Selecionado
                          </>
                        ) : (
                          "Selecionar"
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={!selectedPlan}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Iniciar Criação de Contrato{" "}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Iniciar Criação de Contrato
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Você será direcionado para o fluxo de criação de contrato
                    onde poderá selecionar a tabela de comissão, escolher uma
                    cota e cadastrar o cliente. Deseja prosseguir?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleInitiateContract}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Prosseguir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default SalesSimulator;
