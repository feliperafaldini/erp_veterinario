import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/Layout';
import { LoginPage } from './pages/Login';
import { SelectTenantPage } from './pages/SelectTenant';
import { DashboardPage } from './pages/Dashboard';
import { TutorsPage } from './pages/Tutores';
import { TutorFormPage } from './pages/TutoresForm';
import { AnimalsPage } from './pages/Animais';
import { AnimalFormPage } from './pages/AnimaisForm';
import { AnimalDetailPage } from './pages/AnimalDetail';
import { AppointmentsPage } from './pages/Agendamentos';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/select-tenant" element={<SelectTenantPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Navigate to="/dashboard" replace />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <DashboardPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tutores"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <TutorsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tutores/novo"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <TutorFormPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tutores/:id/editar"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <TutorFormPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/animais"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <AnimalsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/animais/novo"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <AnimalFormPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/animais/:id/editar"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <AnimalFormPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/animais/:id"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <AnimalDetailPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/agendamentos"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <AppointmentsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
