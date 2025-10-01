/**
 * App.tsx SEGURO
 * Versão com autenticação real usando Supabase Auth
 * 
 * PARA USAR ESTA VERSÃO:
 * 1. Execute o script supabase-auth-setup.sql no Supabase
 * 2. Crie o usuário admin no Authentication do Supabase
 * 3. Renomeie src/App.tsx para src/App.old.tsx
 * 4. Renomeie src/App.secure.tsx para src/App.tsx
 * 5. Reinicie o servidor: npm run dev
 */

import { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import SecureHome from './components/SecureHome';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminDashboard from './components/dashboard/AdminDashboard';
import RepresentativeDashboard from './components/dashboard/RepresentativeDashboard';
import ClientDashboard from './components/dashboard/ClientDashboard';
import RepresentativeProfile from './components/dashboard/RepresentativeProfile';
import PublicRegistration from './components/auth/PublicRegistration';
import DocumentUpload from './components/auth/DocumentUpload';
import SalesSimulator from './components/sales/SalesSimulator';
import ContractDetails from './components/sales/ContractDetails';
import SignaturePage from './components/sales/SignaturePage';
import ContractViewOnly from './components/sales/ContractViewOnly';

function App() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando...</p>
          </div>
        </div>
      }
    >
      <Routes>
        {/* Home - Login Seguro */}
        <Route path="/" element={<SecureHome />} />

        {/* Rotas Protegidas para Administradores */}
        <Route
          path="/admindashboard"
          element={
            <ProtectedRoute allowedRoles={['Administrador', 'Suporte']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Rotas Protegidas para Representantes */}
        <Route
          path="/representante"
          element={
            <ProtectedRoute allowedRoles={['Representante']}>
              <RepresentativeDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/representative/:id"
          element={
            <ProtectedRoute allowedRoles={['Administrador', 'Suporte', 'Representante']}>
              <RepresentativeProfile />
            </ProtectedRoute>
          }
        />

        {/* Rotas Protegidas para Clientes */}
        <Route
          path="/cliente"
          element={
            <ProtectedRoute allowedRoles={['Cliente']}>
              <ClientDashboard />
            </ProtectedRoute>
          }
        />

        {/* Rotas de Vendas (Protegidas) */}
        <Route
          path="/simulador"
          element={
            <ProtectedRoute allowedRoles={['Administrador', 'Suporte', 'Representante']}>
              <SalesSimulator />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contract/:id"
          element={
            <ProtectedRoute>
              <ContractDetails />
            </ProtectedRoute>
          }
        />

        {/* Rotas Públicas */}
        <Route path="/cadastro" element={<PublicRegistration />} />
        <Route path="/documentos" element={<DocumentUpload />} />
        <Route path="/sign/:id" element={<SignaturePage />} />
        <Route path="/sign/:id/:signatureId" element={<SignaturePage />} />
        <Route path="/view/:id" element={<ContractViewOnly />} />
      </Routes>
    </Suspense>
  );
}

export default App;

