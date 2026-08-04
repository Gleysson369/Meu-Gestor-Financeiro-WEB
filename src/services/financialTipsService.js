const toIsoDate = (date) => date.toISOString().split('T')[0];

export const parseMonthKey = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const sumByPeriod = (items, periodKey, field) => items
  .filter((item) => parseMonthKey(item.data || item.dataPagamento || item.updatedAt?.toDate().toISOString() || item.createdAt?.toDate().toISOString()) === periodKey)
  .reduce((sum, item) => sum + Number(item[field] || 0), 0);

const round = (value, digits = 2) => Number(value.toFixed(digits));

const makeTip = ({
  id,
  ruleKey,
  category,
  title,
  description,
  reason,
  estimatedBenefit,
  estimatedBenefitLabel,
  impact,
  difficulty,
  actionLabel,
  actionRoute,
  referenceDate,
  sourceMetrics,
  expiresAt,
}) => ({
  id,
  ruleKey,
  category,
  title,
  description,
  reason,
  estimatedBenefit,
  estimatedBenefitLabel,
  impact,
  difficulty,
  actionLabel,
  actionRoute,
  referenceDate,
  sourceMetrics,
  read: false,
  dismissed: false,
  expiresAt,
});

export const buildHomeTips = ({ despesas = [], receitas = [], limites = [], reservas = [], dividas = [], portfolio = [], provents = [], quotes = [] }) => {
  const tips = [];
  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const expiresAt = toIsoDate(new Date(today.getTime() + 1000 * 60 * 60 * 24 * 30));

  const totalExpenses = despesas.reduce((sum, item) => sum + Number(item.valor || 0), 0);
  const totalIncome = receitas.reduce((sum, item) => sum + Number(item.valor || 0), 0);
  const expensesThisMonth = sumByPeriod(despesas, currentMonthKey, 'valor');
  const incomeThisMonth = sumByPeriod(receitas, currentMonthKey, 'valor');
  const topCategory = Object.entries(despesas.reduce((acc, item) => {
    const key = item.categoria || 'Outros';
    acc[key] = (acc[key] || 0) + Number(item.valor || 0);
    return acc;
  }, {})).sort((a, b) => b[1] - a[1])[0] || [null, 0];

  const debtTotal = dividas.reduce((sum, item) => {
    const outstanding = Number(item.total || 0) - Number(item.valor || 0);
    return sum + Math.max(outstanding, 0);
  }, 0);

  const reserveSaved = reservas.reduce((sum, item) => sum + Number(item.valor || 0), 0);
  const reserveTarget = reservas.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const openIncomeSources = new Set(receitas.map((item) => item.categoria || item.tipo || 'Renda')).size;
  const savingsRate = totalIncome > 0 ? totalIncome > totalExpenses ? (totalIncome - totalExpenses) / totalIncome : 0 : 0;

  const topCategoryPercent = totalExpenses > 0 ? (topCategory[1] / totalExpenses) * 100 : 0;
  const topCategoryLabel = topCategory[0] || 'Categoria principal';

  const availableSurplus = incomeThisMonth - expensesThisMonth;
  const suggestedDebtPayment = availableSurplus > 0 ? round(Math.min(availableSurplus, debtTotal * 0.2)) : 0;

  if (totalIncome > 0 && totalExpenses > totalIncome) {
    tips.push(makeTip({
      id: `smarttip-overspend:${currentMonthKey}`,
      ruleKey: 'overspend',
      category: 'expenses',
      title: 'Reduza despesas para equilibrar seu orçamento',
      description: `As suas despesas totais superam suas receitas. Priorize cortes em gastos variáveis para recuperar liquidez rapidamente.`,
      reason: 'O gasto mensal excede a receita disponível, reduzindo sua capacidade de poupança.',
      estimatedBenefit: round(totalExpenses - totalIncome),
      estimatedBenefitLabel: `Economia estimada de R$ ${round(totalExpenses - totalIncome)}`,
      impact: 'high',
      difficulty: 'moderate',
      actionLabel: 'Rever despesas',
      actionRoute: '/despesas',
      referenceDate: currentMonthKey,
      sourceMetrics: {
        totalExpenses,
        totalIncome,
        monthlyGap: round(totalExpenses - totalIncome),
      },
      expiresAt,
    }));
  }

  if (totalIncome > 0 && totalExpenses > 0 && topCategoryPercent >= 30) {
    tips.push(makeTip({
      id: `smarttip-top-category:${currentMonthKey}`,
      ruleKey: 'top-category-spend',
      category: 'saving',
      title: `Revise gastos em ${topCategoryLabel}`,
      description: `A categoria ${topCategoryLabel} concentra ${round(topCategoryPercent)}% dos seus gastos. Corte 5-10% dessa categoria para liberar caixa.`,
      reason: 'Uma categoria representa uma parte muito grande da despesa total.',
      estimatedBenefit: round(topCategory[1] * 0.05),
      estimatedBenefitLabel: `Meta de economia: R$ ${round(topCategory[1] * 0.05)}`,
      impact: 'medium',
      difficulty: 'easy',
      actionLabel: 'Ajustar orçamento',
      actionRoute: '/despesas',
      referenceDate: currentMonthKey,
      sourceMetrics: {
        topCategory: topCategoryLabel,
        topCategoryValue: round(topCategory[1]),
        topCategoryShare: round(topCategoryPercent),
      },
      expiresAt,
    }));
  }

  if (totalIncome > 0 && totalExpenses > 0 && savingsRate < 0.15) {
    tips.push(makeTip({
      id: `smarttip-save-rate:${currentMonthKey}`,
      ruleKey: 'low-savings-rate',
      category: 'reserve',
      title: 'Aumente sua taxa de poupança',
      description: `Seu saldo mensal disponível é pequeno. Direcione pelo menos 10% da receita para reservas ou investimentos.`,
      reason: 'Uma taxa de poupança baixa reduz sua capacidade de formar reserva de emergência.',
      estimatedBenefit: round((incomeThisMonth - expensesThisMonth) * 0.3),
      estimatedBenefitLabel: `Potencial de economia: R$ ${round((incomeThisMonth - expensesThisMonth) * 0.3)}`,
      impact: 'medium',
      difficulty: 'easy',
      actionLabel: 'Planejar poupança',
      actionRoute: '/reserva',
      referenceDate: currentMonthKey,
      sourceMetrics: {
        savingsRate: round(savingsRate * 100),
        surplus: round(Math.max(0, availableSurplus)),
      },
      expiresAt,
    }));
  }

  if (limites.length === 0 && totalExpenses > 0) {
    tips.push(makeTip({
      id: `smarttip-budget-planning:${currentMonthKey}`,
      ruleKey: 'budget-planning',
      category: 'planning',
      title: 'Defina orçamentos por categoria',
      description: 'Sem metas de gasto, é difícil controlar despesas. Crie limites para as categorias que mais consomem seu dinheiro.',
      reason: 'A falta de orçamentos claros dificulta o controle e a redução de gastos.',
      impact: 'medium',
      difficulty: 'easy',
      actionLabel: 'Configurar limites',
      actionRoute: '/limites',
      referenceDate: currentMonthKey,
      sourceMetrics: {
        categoriesTracked: Object.keys(despesas.reduce((acc, item) => { acc[item.categoria || 'Outros'] = true; return acc; }, {})).length,
      },
      expiresAt,
    }));
  }

  if (reserveSaved === 0 && totalExpenses > 0) {
    tips.push(makeTip({
      id: `smarttip-start-reserve:${currentMonthKey}`,
      ruleKey: 'start-reserve',
      category: 'reserve',
      title: 'Comece sua reserva de emergência',
      description: 'Uma reserva financeira protege você de imprevistos. Economize um valor pequeno e constante a cada mês.',
      reason: 'Não há reservas registradas para suportar despesas inesperadas.',
      estimatedBenefit: round(totalExpenses * 0.05),
      estimatedBenefitLabel: `Meta inicial: economize R$ ${round(totalExpenses * 0.05)} por mês.`,
      impact: 'high',
      difficulty: 'easy',
      actionLabel: 'Criar reserva',
      actionRoute: '/reserva',
      referenceDate: currentMonthKey,
      sourceMetrics: {
        reserveSaved,
        reserveTarget,
      },
      expiresAt,
    }));
  } else if (reserveTarget > 0) {
    const reserveRatio = reserveSaved / reserveTarget;
    if (reserveRatio < 0.5) {
      tips.push(makeTip({
        id: `smarttip-improve-reserve:${currentMonthKey}`,
        ruleKey: 'improve-reserve',
        category: 'reserve',
        title: 'Fortaleça sua reserva financeira',
        description: `Você já acumulou R$ ${round(reserveSaved)}, mas ainda faltam R$ ${round(reserveTarget - reserveSaved)} para o objetivo.`,
        reason: 'Reservas incompletas deixam você exposto a despesas inesperadas.',
        estimatedBenefit: round(reserveTarget - reserveSaved),
        estimatedBenefitLabel: `Falta economizar: R$ ${round(reserveTarget - reserveSaved)}`,
        impact: 'medium',
        difficulty: 'moderate',
        actionLabel: 'Aumentar aporte',
        actionRoute: '/reserva',
        referenceDate: currentMonthKey,
        sourceMetrics: {
          reserveSaved,
          reserveTarget,
          reserveRatio: round(reserveRatio * 100),
        },
        expiresAt,
      }));
    }
  }

  if (debtTotal > 0) {
    const benefit = suggestedDebtPayment > 0 ? suggestedDebtPayment : round(debtTotal * 0.05);
    tips.push(makeTip({
      id: `smarttip-reduce-debt:${currentMonthKey}`,
      ruleKey: 'reduce-debt',
      category: 'debts',
      title: 'Use sobra para amortizar dívidas',
      description: `Dívidas totais de R$ ${round(debtTotal)} podem ser reduzidas com pagamentos extras de quando houver superávit.`,
      reason: 'Reduzir dívida diminui juros futuros e aumenta a saúde financeira.',
      estimatedBenefit: benefit,
      estimatedBenefitLabel: `Pagamento extra sugerido: R$ ${benefit}`,
      impact: 'high',
      difficulty: 'moderate',
      actionLabel: 'Rever dívidas',
      actionRoute: '/dividas',
      referenceDate: currentMonthKey,
      sourceMetrics: {
        totalDebt: round(debtTotal),
        availableSurplus: round(Math.max(0, availableSurplus)),
      },
      expiresAt,
    }));
  }

  if (openIncomeSources < 2 && totalIncome > 0) {
    tips.push(makeTip({
      id: `smarttip-income-diversify:${currentMonthKey}`,
      ruleKey: 'income-diversify',
      category: 'income',
      title: 'Diversifique suas fontes de renda',
      description: 'Ter mais de uma fonte de renda aumenta sua segurança financeira e sua capacidade de poupar.',
      reason: 'Renda concentrada em poucos canais deixa seu orçamento vulnerável.',
      impact: 'medium',
      difficulty: 'advanced',
      actionLabel: 'Registrar nova renda',
      actionRoute: '/receita',
      referenceDate: currentMonthKey,
      sourceMetrics: {
        incomeSources: openIncomeSources,
        totalIncome: round(totalIncome),
      },
      expiresAt,
    }));
  }

  if (availableSurplus > 0 && totalIncome > 0 && totalExpenses / totalIncome >= 0.8) {
    tips.push(makeTip({
      id: `smarttip-use-surplus:${currentMonthKey}`,
      ruleKey: 'use-surplus',
      category: 'planning',
      title: 'Transforme sobra em próxima ação prática',
      description: 'Já existe um pequeno superávit. Direcione parte dele para reserva ou amortização de dívida a cada mês.',
      reason: 'Aproveitar superávit evita que ele seja consumido por gastos não planejados.',
      estimatedBenefit: round(availableSurplus * 0.5),
      estimatedBenefitLabel: `Valor disponível recomendado: R$ ${round(availableSurplus * 0.5)}`,
      impact: 'medium',
      difficulty: 'easy',
      actionLabel: 'Definir aporte',
      actionRoute: '/reservas',
      referenceDate: currentMonthKey,
      sourceMetrics: {
        availableSurplus: round(availableSurplus),
      },
      expiresAt,
    }));
  }

  const uniqueTips = Array.from(new Map(tips.map((tip) => [tip.id, tip])).values());
  const impactOrder = { high: 0, medium: 1, low: 2 };

  return uniqueTips
    .sort((a, b) => (impactOrder[a.impact] ?? 3) - (impactOrder[b.impact] ?? 3))
    .slice(0, 5);
};
