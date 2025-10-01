import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../lib/supabase";
import LoginForm from "./auth/LoginForm";

const Home = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Check for existing session on component mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const user = authService.getCurrentUser();
        if (user) {
          console.log(
            "Existing user found:",
            user.name,
            "Role:",
            user.role,
            "Status:",
            user.status,
          );

          // User is logged in, redirect to appropriate dashboard
          const adminEmails = ["admin@credicar.com", "admin@credcar.com"];
          if (
            user.role === "Administrador" ||
            adminEmails.includes(user.email?.toLowerCase() || "")
          ) {
            console.log("Redirecting admin to dashboard");
            navigate("/admindashboard");
            return;
          }

          // Handle representative users based on status
          switch (user.status) {
            case "Pendente de Aprovação":
              console.log("Redirecting to representative dashboard with notification");
              navigate("/representante");
              break;

            case "Documentos Pendentes":
              console.log("Checking document approval status...");
              // Check if documents are actually approved
              try {
                const documentsApproved =
                  await authService.checkDocumentsApproved(user.id);
                if (documentsApproved) {
                  console.log("Documents approved, redirecting to dashboard");
                  // Refresh user data to get updated status
                  const updatedUser = await authService.refreshUserData(
                    user.id,
                  );
                  if (updatedUser && updatedUser.status === "Ativo") {
                    navigate("/representante");
                  } else {
                    navigate("/documentos");
                  }
                } else {
                  console.log(
                    "Documents still pending, redirecting to document upload",
                  );
                  navigate("/documentos");
                }
              } catch (docError) {
                console.error("Error checking documents:", docError);
                navigate("/documentos");
              }
              break;

            case "Ativo":
              console.log("Active user, redirecting to dashboard");
              navigate("/representante");
              break;

            case "Inativo":
            case "Cancelado":
              console.log("Inactive user, clearing session");
              await authService.logout();
              setAuthError(
                "Sua conta está inativa. Entre em contato com o administrador.",
              );
              break;

            default:
              console.log("Unknown status, redirecting to dashboard");
              navigate("/representante");
              break;
          }
        } else {
          console.log("No existing user session found");
        }
      } catch (error) {
        console.error("Error checking auth status:", error);
        await authService.logout();
        setAuthError(
          "Erro ao verificar status de autenticação. Por favor, tente novamente.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    // Add a small delay to prevent flash
    const timer = setTimeout(() => {
      checkAuthStatus();
    }, 300); // Increased delay to ensure proper initialization

    return () => clearTimeout(timer);
  }, [navigate]);

  const handleLoginSuccess = (
    email: string,
    password: string,
    userType: string,
  ) => {
    console.log("Login successful:", email, "Type:", userType);
    // Navigation is handled by the LoginForm component
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Carregando sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-gray-50">
      <LoginForm onLogin={handleLoginSuccess} />
    </div>
  );
};

export default Home;
