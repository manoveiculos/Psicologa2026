

export type TipoReceita = 'particular' | 'convenio';
export type StatusRecebimento = 'pendente' | 'pago' | 'atrasado' | 'glosado';

export interface Transacao {
  id: string;
  valor_bruto: number;
  tipo_receita: TipoReceita;
  status_recebimento: StatusRecebimento;
  data_prevista?: string;
  data_realizada: string;
}

export interface Despesa {
  id: string;
  valor: number;
  categoria: string;
  data: string;
}

export interface ResumoFinanceiro {
  faturamentoBruto: number;
  faturamentoParticular: number;
  faturamentoConvenio: number;
  impostosEstimados: number;
  totalDespesas: number;
  receitaLiquidaReal: number;
}

/**
 * Calcula o resumo financeiro com base nas transações e despesas.
 * @param transacoes Lista de transações (receitas)
 * @param despesas Lista de despesas
 * @param aliquotaImposto Alíquota de imposto (padrão 6%)
 */
export function calcularResumoFinanceiro(
  transacoes: Transacao[],
  despesas: Despesa[],
  aliquotaImposto: number = 6
): ResumoFinanceiro {
  const faturamentoParticular = transacoes
    .filter(t => t.tipo_receita === 'particular')
    .reduce((acc, t) => acc + t.valor_bruto, 0);

  const faturamentoConvenio = transacoes
    .filter(t => t.tipo_receita === 'convenio')
    .reduce((acc, t) => acc + t.valor_bruto, 0);

  const faturamentoBruto = faturamentoParticular + faturamentoConvenio;
  
  const impostosEstimados = faturamentoBruto * (aliquotaImposto / 100);
  
  const totalDespesas = despesas.reduce((acc, d) => acc + d.valor, 0);

  // Receita Líquida = Faturamento Bruto - Impostos - Despesas
  const receitaLiquidaReal = faturamentoBruto - impostosEstimados - totalDespesas;

  return {
    faturamentoBruto,
    faturamentoParticular,
    faturamentoConvenio,
    impostosEstimados,
    totalDespesas,
    receitaLiquidaReal,
  };
}

