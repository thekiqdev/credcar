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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight, Users, UserCheck, SkipForward } from "lucide-react";
import { representativeService } from "@/lib/supabase";

interface Representative {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cnpj?: string;
  razao_social?: string;
  ponto_venda?: string;
  commission_code?: string;
  status: string;
}

interface RepresentativeSelectionProps {
  onRepresentativeSelect: (representative: Representative) => void;
  onSkip: () => void;
}

const RepresentativeSelection: React.FC<RepresentativeSelectionProps> = ({
  onRepresentativeSelect,
  onSkip,
}) => {
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [selectedRepresentative, setSelectedRepresentative] =
    useState<Representative | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRepresentatives();
  }, []);

  const fetchRepresentatives = async () => {
    try {
      const data = await representativeService.getAll();
      // Filter only active representatives
      const activeReps = data.filter((rep) => rep.status === "Ativo");
      setRepresentatives(activeReps);
    } catch (error) {
      console.error("Error fetching representatives:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRepresentativeSelect = (representative: Representative) => {
    setSelectedRepresentative(representative);
  };

  const handleContinue = () => {
    if (selectedRepresentative) {
      onRepresentativeSelect(selectedRepresentative);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando representantes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Seleção de Representante
          </h1>
          <p className="text-gray-600">
            Escolha um representante para associar ao contrato ou pule esta
            etapa para criar o contrato em seu nome
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {representatives.map((representative) => (
            <Card
              key={representative.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                selectedRepresentative?.id === representative.id
                  ? "ring-2 ring-red-500 bg-red-50"
                  : "hover:shadow-md"
              }`}
              onClick={() => handleRepresentativeSelect(representative)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      <User className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold">
                      {representative.name}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="bg-green-100 text-green-700 mt-1"
                    >
                      <UserCheck className="w-3 h-3 mr-1" />
                      {representative.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    <strong>Email:</strong> {representative.email}
                  </p>
                  {representative.phone && (
                    <p className="text-sm text-gray-600">
                      <strong>Telefone:</strong> {representative.phone}
                    </p>
                  )}
                  {representative.ponto_venda && (
                    <p className="text-sm text-gray-600">
                      <strong>Ponto de Venda:</strong>{" "}
                      {representative.ponto_venda}
                    </p>
                  )}
                  {representative.commission_code && (
                    <p className="text-sm text-gray-600">
                      <strong>Código:</strong> {representative.commission_code}
                    </p>
                  )}

                  <div className="pt-2">
                    {selectedRepresentative?.id === representative.id ? (
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

        {representatives.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 mb-4">
                Nenhum representante ativo encontrado
              </p>
              <p className="text-sm text-gray-400">
                Você pode prosseguir criando o contrato em seu nome
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between">
          <Button
            onClick={onSkip}
            variant="outline"
            size="lg"
            className="flex items-center"
          >
            <SkipForward className="mr-2 h-4 w-4" />
            Pular (Criar em meu nome)
          </Button>

          <Button
            onClick={handleContinue}
            disabled={!selectedRepresentative}
            className="bg-red-600 hover:bg-red-700 px-8"
            size="lg"
          >
            Continuar com Representante
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RepresentativeSelection;
