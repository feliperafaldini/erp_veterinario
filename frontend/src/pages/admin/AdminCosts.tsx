import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';

interface CostItem {
  categoria: string;
  valor: number;
}

// Prévia visual: módulo financeiro ainda não existe no backend.
const CUSTOS: CostItem[] = [
  { categoria: 'Folha de pagamento', valor: 12800 },
  { categoria: 'Aluguel', valor: 4200 },
  { categoria: 'Insumos e medicamentos', valor: 3450 },
  { categoria: 'Energia e água', valor: 680 },
  { categoria: 'Software e sistemas', valor: 390 },
];

const brl = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function AdminCostsPage() {
  const total = CUSTOS.reduce((sum, item) => sum + item.valor, 0);
  const maior = Math.max(...CUSTOS.map((item) => item.valor));

  return (
    <div>
      <PageHeader title="Custos" subtitle="Despesas mensais da clínica" />

      <div className="mb-4 rounded-md border border-[#e6d3b8] bg-[#fdf3e3] px-4 py-3 text-meta text-state-progress">
        Prévia visual — o módulo financeiro ainda não tem backend. Os valores abaixo são de
        demonstração e não são gravados.
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <Card className="px-4 py-3.5">
          <p className="micro-label">Custo mensal</p>
          <p className="num text-page font-semibold text-ink mt-1">{brl(total)}</p>
        </Card>
        <Card className="px-4 py-3.5">
          <p className="micro-label">Maior categoria</p>
          <p className="text-title font-semibold text-ink mt-1">
            {CUSTOS.reduce((a, b) => (a.valor > b.valor ? a : b)).categoria}
          </p>
        </Card>
      </div>

      <Card>
        <div className="px-5 py-3 border-b border-line">
          <h2 className="text-micro uppercase tracking-[0.06em] text-ink-4 font-medium">
            Por categoria
          </h2>
        </div>
        <ul className="px-5 py-4 space-y-4">
          {CUSTOS.map((item) => (
            <li key={item.categoria}>
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <span className="text-body text-ink-2">{item.categoria}</span>
                <span className="num text-body text-ink">{brl(item.valor)}</span>
              </div>
              <div className="h-2 rounded-full bg-[#f0f0f2]">
                <div
                  className="h-2 rounded-full bg-accent"
                  style={{ width: `${Math.max(4, (item.valor / maior) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
