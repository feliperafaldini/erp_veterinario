import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';

interface StockItem {
  nome: string;
  categoria: string;
  quantidade: number;
  minimo: number;
  custoUnitario: number;
}

// Prévia visual: o backend ainda não tem módulo de estoque. Os números são
// fictícios e existem só para validar a tela com o grupo.
const ITENS: StockItem[] = [
  { nome: 'Vacina V10', categoria: 'Vacinas', quantidade: 12, minimo: 10, custoUnitario: 38.9 },
  { nome: 'Vermífugo (comprimidos)', categoria: 'Medicamentos', quantidade: 4, minimo: 8, custoUnitario: 6.5 },
  { nome: 'Antibiótico injetável', categoria: 'Medicamentos', quantidade: 2, minimo: 5, custoUnitario: 24 },
  { nome: 'Seringa 3 ml', categoria: 'Materiais', quantidade: 120, minimo: 50, custoUnitario: 0.8 },
  { nome: 'Luva descartável (caixa)', categoria: 'Materiais', quantidade: 8, minimo: 5, custoUnitario: 19.9 },
];

const brl = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function AdminStockPage() {
  const abaixoDoMinimo = ITENS.filter((item) => item.quantidade < item.minimo).length;
  const valorEmEstoque = ITENS.reduce((total, item) => total + item.quantidade * item.custoUnitario, 0);

  return (
    <div>
      <PageHeader title="Estoque" subtitle="Itens da clínica e nível mínimo" />

      <div className="mb-4 rounded-md border border-[#e6d3b8] bg-[#fdf3e3] px-4 py-3 text-meta text-state-progress">
        Prévia visual — o backend ainda não tem módulo de estoque. Os itens e valores abaixo são de
        demonstração; nenhum dado é gravado.
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Card className="px-4 py-3.5">
          <p className="micro-label">Itens cadastrados</p>
          <p className="num text-page font-semibold text-ink mt-1">{ITENS.length}</p>
        </Card>
        <Card className="px-4 py-3.5">
          <p className="micro-label">Abaixo do mínimo</p>
          <p className="num text-page font-semibold text-state-progress mt-1">{abaixoDoMinimo}</p>
        </Card>
        <Card className="px-4 py-3.5">
          <p className="micro-label">Valor em estoque</p>
          <p className="num text-page font-semibold text-ink mt-1">{brl(valorEmEstoque)}</p>
        </Card>
      </div>

      <Card>
        <table className="w-full">
          <thead className="bg-[#fbfbfc] border-b border-line">
            <tr>
              <th className="text-left px-5 py-2.5 micro-label">Item</th>
              <th className="text-left px-5 py-2.5 micro-label">Categoria</th>
              <th className="text-right px-5 py-2.5 micro-label">Quantidade</th>
              <th className="text-right px-5 py-2.5 micro-label">Mínimo</th>
              <th className="text-right px-5 py-2.5 micro-label">Custo unitário</th>
              <th className="text-left px-5 py-2.5 micro-label">Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {ITENS.map((item) => {
              const baixo = item.quantidade < item.minimo;
              return (
                <tr key={item.nome} className="hover:bg-[#fbfbfc]">
                  <td className="px-5 py-3 text-body font-medium text-ink">{item.nome}</td>
                  <td className="px-5 py-3 text-body text-ink-2">{item.categoria}</td>
                  <td className="px-5 py-3 num text-body text-ink-2 text-right">{item.quantidade}</td>
                  <td className="px-5 py-3 num text-body text-ink-3 text-right">{item.minimo}</td>
                  <td className="px-5 py-3 num text-body text-ink-2 text-right">
                    {brl(item.custoUnitario)}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={baixo ? 'warning' : 'success'}>
                      {baixo ? 'Abaixo do mínimo' : 'OK'}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
