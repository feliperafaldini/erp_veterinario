import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/Layout';
import { LoginPage } from './pages/Login';
import { SelectTenantPage } from './pages/SelectTenant';
import { DashboardPage } from './pages/Dashboard';
import { HomePage } from './pages/Home';
import { ReceptionPage } from './pages/Reception';
import { TutorsPage } from './pages/Tutores';
import { TutorFormPage } from './pages/TutoresForm';
import { AnimalsPage } from './pages/Animais';
import { AnimalFormPage } from './pages/AnimaisForm';
import { AnimalDetailPage } from './pages/AnimalDetail';
import { AppointmentsPage } from './pages/Agendamentos';
import { AdminDashboardPage } from './pages/admin/AdminDashboard';
import { AdminTeamPage } from './pages/admin/AdminTeam';
import { AdminStockPage } from './pages/admin/AdminStock';
import { AdminCostsPage } from './pages/admin/AdminCosts';
import { homePath } from './lib/roles';

function Page({ children, roles }: { children: ReactNode; roles?: string[] }) {
  return (
    <ProtectedRoute roles={roles}>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

function RoleHome() {
  const { roles } = useAuth();
  return <Navigate to={homePath(roles)} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/select-tenant" element={<SelectTenantPage />} />

            <Route path="/" element={<Page><RoleHome /></Page>} />

            <Route path="/inicio" element={<Page><HomePage /></Page>} />

            <Route
              path="/dashboard"
              element={
                <Page roles={['VETERINARIAN', 'ADMIN']}>
                  <DashboardPage />
                </Page>
              }
            />

            <Route
              path="/recepcao"
              element={
                <Page roles={['RECEPTIONIST', 'ADMIN']}>
                  <ReceptionPage />
                </Page>
              }
            />

            <Route
              path="/admin"
              element={
                <Page roles={['ADMIN']}>
                  <AdminDashboardPage />
                </Page>
              }
            />
            <Route
              path="/admin/equipe"
              element={
                <Page roles={['ADMIN']}>
                  <AdminTeamPage />
                </Page>
              }
            />
            <Route
              path="/admin/estoque"
              element={
                <Page roles={['ADMIN']}>
                  <AdminStockPage />
                </Page>
              }
            />
            <Route
              path="/admin/custos"
              element={
                <Page roles={['ADMIN']}>
                  <AdminCostsPage />
                </Page>
              }
            />

            <Route path="/tutores" element={<Page><TutorsPage /></Page>} />
            <Route path="/tutores/novo" element={<Page><TutorFormPage /></Page>} />
            <Route path="/tutores/:id/editar" element={<Page><TutorFormPage /></Page>} />

            <Route path="/animais" element={<Page><AnimalsPage /></Page>} />
            <Route path="/animais/novo" element={<Page><AnimalFormPage /></Page>} />
            <Route path="/animais/:id/editar" element={<Page><AnimalFormPage /></Page>} />
            <Route path="/animais/:id" element={<Page><AnimalDetailPage /></Page>} />

            <Route path="/agendamentos" element={<Page><AppointmentsPage /></Page>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
