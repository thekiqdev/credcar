// Teste temporário para debug dos planos privados
// Este arquivo pode ser removido após resolver o problema

import React, { useState, useEffect } from "react";
import { authService } from "@/lib/supabase";

const PlanDebugTest: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    const adminEmails = ["admin@credicar.com", "admin@credcar.com"];
    const isAdmin =
      currentUser?.role === "Administrador" ||
      adminEmails.includes(currentUser?.email?.toLowerCase() || "");

    setDebugInfo({
      currentUser,
      isAdmin,
      adminEmails,
      userRole: currentUser?.role,
      userEmail: currentUser?.email,
      localStorage: localStorage.getItem("currentUser")
    });
  }, []);

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-bold mb-4">Debug - Planos Privados</h3>
      <pre className="bg-white p-4 rounded border overflow-auto">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
};

export default PlanDebugTest;
