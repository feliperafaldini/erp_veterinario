import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/ui/Card';
import { homePath } from '../lib/roles';
import type { AuthTenant } from '../types';

export function SelectTenantPage() {
  const [loading, setLoading] = useState(false);
  const { tenants, selectTenant, isAuthenticated, selectionToken, roles } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  // Já escolheu clínica (sessão ativa) ou nem fez login ainda.
  if (isAuthenticated) return <Navigate to={homePath(roles)} replace />;
  if (!selectionToken) return <Navigate to="/login" replace />;

  const handleSelect = async (tenant: AuthTenant) => {
    setLoading(true);
    try {
      const selectedRoles = await selectTenant(tenant.id);
      success(`Clínica "${tenant.name}" selecionada`);
      navigate(homePath(selectedRoles));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao selecionar clínica';
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fbfbfc] px-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <h1 className="text-page font-semibold text-ink">Selecione a Clínica</h1>
          <p className="text-body text-ink-3 mt-2">Escolha qual clínica deseja acessar</p>
        </div>
        <div className="space-y-2">
          {tenants.map((tenant) => (
            <button
              key={tenant.id}
              onClick={() => handleSelect(tenant)}
              disabled={loading}
              className="w-full px-4 py-3 text-left rounded-md border border-line hover:border-accent-ring hover:bg-accent-soft transition-colors disabled:opacity-50"
            >
              <span className="font-medium text-ink">{tenant.name}</span>
            </button>
          ))}
          {tenants.length === 0 && (
            <p className="text-body text-ink-3 text-center py-4">Este usuário não tem clínica ativa.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
