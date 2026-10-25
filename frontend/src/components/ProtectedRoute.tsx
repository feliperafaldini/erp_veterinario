import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui/Spinner';

interface ProtectedRouteProps {
  children: ReactNode;
  requireTenant?: boolean;
}

export function ProtectedRoute({ children, requireTenant = true }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, selectionToken } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  // Not logged in at all
  if (!isAuthenticated && !selectionToken) {
    return <Navigate to="/login" replace />;
  }

  // Has selection token but not authenticated (no tenant selected)
  if (requireTenant && !isAuthenticated && selectionToken) {
    return <Navigate to="/select-tenant" replace />;
  }

  return <>{children}</>;
}
