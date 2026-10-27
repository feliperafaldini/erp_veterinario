import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { homePath } from '../lib/roles';
import { Spinner } from './ui/Spinner';

interface ProtectedRouteProps {
  children: ReactNode;
  requireTenant?: boolean;
  /** Papéis aceitos nesta rota; vazio/omitido = qualquer autenticado. */
  roles?: string[];
}

export function ProtectedRoute({ children, requireTenant = true, roles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, selectionToken, roles: userRoles } = useAuth();

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

  if (roles && roles.length > 0 && !roles.some((role) => userRoles.includes(role))) {
    return <Navigate to={homePath(userRoles)} replace />;
  }

  return <>{children}</>;
}
