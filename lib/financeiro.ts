

export type TipoReceita = 'particular' | 'convenio' | 'misto';
export type StatusRecebimento = 'pendente' | 'pago' | 'atrasado' | 'glosado';
export type StatusFinanceiro = 'pago' | 'pendente' | 'aguardando_convenio';

export interface Transacao {
  id: string;
  valor_bruto: number;
  tipo_receita: TipoReceita;
  status_recebimento: StatusRecebimento;
  status_financeiro?: StatusFinanceiro;
  data_prevista?: string;
  data_realizada: string;
  porcentagem_repasse?: number;
  id_profissional?: string;
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
  totalRepasses: number;
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
    .filter(t => t.tipo_receita === 'convenio' || t.tipo_receita === 'misto')
    .reduce((acc, t) => acc + t.valor_bruto, 0);

  const faturamentoBruto = faturamentoParticular + faturamentoConvenio;
  
  const totalRepasses = transacoes.reduce((acc, t) => {
    if (t.porcentagem_repasse && t.porcentagem_repasse > 0) {
      return acc + (t.valor_bruto * (t.porcentagem_repasse / 100));
    }
    return acc;
  }, 0);

  const impostosEstimados = faturamentoBruto * (aliquotaImposto / 100);
  const totalDespesas = despesas.reduce((acc, d) => acc + d.valor, 0);

  // Receita Líquida Real = Bruto - Repasses - Impostos - Despesas
  const receitaLiquidaReal = faturamentoBruto - totalRepasses - impostosEstimados - totalDespesas;

  return {
    faturamentoBruto,
    faturamentoParticular,
    faturamentoConvenio,
    totalRepasses,
    impostosEstimados,
    totalDespesas,
    receitaLiquidaReal,
  };
}

