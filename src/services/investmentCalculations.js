﻿﻿﻿export const normalizeAssetSymbol = (value) => {
  return String(value || '')
    .trim()
    .toUpperCase();
};

export const formatCurrency = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const formatPercentage = (value) => {
  if (value == null || Number.isNaN(value)) return '0,00%';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2).replace('.', ',')}%`; // toFixed handles negative sign, replace . with , for pt-BR
};

export const parseDecimal = (value) => {
  if (value == null) return 0;
  const normalized = String(value).replace(',', '.').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const parseDate = (date) => {
  if (!date) return null;
  return date instanceof Date ? date : new Date(date);
};

export const toIsoDate = (date) => {
  const d = parseDate(date);
  return d.toISOString().split('T')[0];
};

export const normalizeMovementType = (type) => {
  switch ((type || '').toUpperCase()) {
    case 'COMPRA': return 'COMPRA';
    case 'VENDA': return 'VENDA';
    case 'BONIFICACAO':
    case 'DESDOBRAMENTO': return 'BONIFICACAO'; // Treat desdobramento as bonification for quantity increase
    case 'GRUPAMENTO': return 'AJUSTE_SAIDA'; // Treat grupamento as quantity decrease
    case 'AJUSTE_ENTRADA': return 'AJUSTE_ENTRADA';
    case 'AJUSTE_SAIDA': return 'AJUSTE_SAIDA';
    default: return 'OUTRO'; // Fallback for unknown types
  }
};

export const getAssetTypeFromTicker = (ticker, defaultType = 'Ação') => {
  if (ticker.endsWith('11')) return 'FII'; // Common pattern for FIIs
  // Add more complex logic here if needed, e.g., lookup in a predefined list
  return defaultType;
};

export const consolidarCarteira = (rawMovements = [], rawQuotes = [], rawProvents = []) => {
  // 1. Sort and Normalize Movements
  const movements = [...rawMovements].sort((a, b) => {
    const dateA = new Date(a.data);
    const dateB = new Date(b.data);
    if (dateA.getTime() !== dateB.getTime()) return dateA.getTime() - dateB.getTime();
    // Fallback to createdAt if data is same, then id
    const createdAtA = new Date(a.createdAt || 0);
    const createdAtB = new Date(b.createdAt || 0);
    if (createdAtA.getTime() !== createdAtB.getTime()) return createdAtA.getTime() - createdAtB.getTime();
    return (a.id || '').localeCompare(b.id || '');
  }).map(mov => ({
    ...mov,
    ativo: normalizeAssetSymbol(mov.ativo),
    tipoMovimentacao: normalizeMovementType(mov.tipoMovimentacao), // Normalize
    quantidade: Number(mov.quantidade || 0),
    precoUnitario: Number(mov.precoUnitario || 0),
    taxas: Number(mov.taxas || 0),
  }));

  // 2. Process Quotes
  const quoteMap = rawQuotes.reduce((acc, quote) => {
    const ticker = normalizeAssetSymbol(quote.ativo);
    if (!ticker) return acc;
    const quoteTimestamp = new Date(`${quote.data || '1970-01-01'}T${quote.horario || '00:00:00'}`).getTime();
  
    const existing = acc[ticker];
    const existingTimestamp = existing ? new Date(`${existing.data || '1970-01-01'}T${existing.horario || '00:00:00'}`).getTime() : 0;

    if (!existing || quoteTimestamp >= existingTimestamp) {
      acc[ticker] = quote;
    }
    acc[ticker] = {
      ...quote,
      cotacao: Number(quote.cotacao || 0),
    };
    return acc;
  }, {});

  const proventsByTicker = rawProvents.reduce((acc, item) => {
    const ticker = normalizeAssetSymbol(item.ativo);
    if (!ticker) return acc;
    const value = Number(item.valorTotal || 0);
    acc[ticker] = (acc[ticker] || 0) + value;
    return acc;
  }, {});

  const assets = {}; // This will store the consolidated data for each asset

  // 4. Iterate through sorted movements to build portfolio state
  movements.forEach((mov) => {
    const ticker = mov.ativo;
    if (!assets[ticker]) {
      assets[ticker] = {
        codigo: ticker,
        nome: mov.nomeAtivo || ticker,
        tipoAtivo: mov.tipoAtivo || getAssetTypeFromTicker(ticker),
        quantidadeAtual: 0,
        quantidadeComprada: 0,
        quantidadeVendida: 0,
        precoMedio: 0,
        capitalInvestidoAtual: 0,
        valorBrutoVendido: 0,
        valorLiquidoVendido: 0,
        resultadoRealizado: 0,
        proventosRecebidos: 0, // Initial sum, will be updated later
        ultimaMovimentacaoData: mov.data,
        corretora: mov.corretora || '',
      };
    }

    const asset = assets[ticker];

    switch (mov.tipoMovimentacao) {
      case 'COMPRA': {
        const valorBrutoCompra = mov.quantidade * mov.precoUnitario;
        const valorTotalCompra = valorBrutoCompra + mov.taxas;

        asset.quantidadeComprada += mov.quantidade;
        asset.capitalInvestidoAtual += valorTotalCompra;
        asset.quantidadeAtual += mov.quantidade;
        asset.precoMedio = asset.quantidadeAtual > 0 ? asset.capitalInvestidoAtual / asset.quantidadeAtual : 0;
        break;
      }
      case 'VENDA': {
        // Validate sale before processing
        if (mov.quantidade > asset.quantidadeAtual) {
          console.warn(`Venda não permitida para ${ticker}: quantidade ${mov.quantidade} excede disponível ${asset.quantidadeAtual}. Ignorando.`);
          return; // Skip this movement if invalid
        }

        const custoDasUnidadesVendidas = mov.quantidade * asset.precoMedio;
        const valorBrutoVenda = mov.quantidade * mov.precoUnitario;
        const valorLiquidoVenda = valorBrutoVenda - mov.taxas;

        asset.quantidadeVendida += mov.quantidade;
        asset.valorBrutoVendido += valorBrutoVenda;
        asset.valorLiquidoVendido += valorLiquidoVenda;
        asset.resultadoRealizado += (valorLiquidoVenda - custoDasUnidadesVendidas);

        asset.quantidadeAtual -= mov.quantidade;
        asset.capitalInvestidoAtual -= custoDasUnidadesVendidas; // Reduce invested capital by cost of sold units

        // If quantity becomes zero, reset cost and price
        if (asset.quantidadeAtual <= 0) {
          asset.quantidadeAtual = 0;
          asset.capitalInvestidoAtual = 0;
          asset.precoMedio = 0;
        }
        break;
      }
      case 'BONIFICACAO':
        asset.quantidadeAtual += mov.quantidade;
        // No change to capitalInvestidoAtual or precoMedio for bonification
        break;

      case 'AJUSTE_ENTRADA':
        asset.quantidadeAtual += mov.quantidade;
        // Adjust capitalInvestidoAtual if needed, but prompt doesn't specify for AJUSTE_ENTRADA
        // For now, assume no cost impact unless specified.
        break;

      case 'AJUSTE_SAIDA':
        asset.quantidadeAtual -= mov.quantidade;
        // Adjust capitalInvestidoAtual if needed.
        break;

      // Other types like TRANSFERENCIA_ENTRADA, TRANSFERENCIA_SAIDA would go here
      default:
        // For unknown types, log a warning or handle as appropriate
        console.warn(`Tipo de movimentação desconhecido: ${mov.tipoMovimentacao} para ${ticker}`);
        break;
    }
    asset.ultimaMovimentacaoData = mov.data; // Update last movement date
  });

  // 5. Finalize calculations for each asset
  const consolidatedPortfolio = Object.values(assets).map((asset) => {
    const cotacaoAtual = quoteMap[asset.codigo]?.cotacao || 0;
    const dataUltimaCotacao = quoteMap[asset.codigo]?.data || null;
    const horarioUltimaCotacao = quoteMap[asset.codigo]?.horario || null;
    const fonteCotacao = quoteMap[asset.codigo]?.fonte || 'Manual';

    const valorAtual = asset.quantidadeAtual * cotacaoAtual;
    const resultadoNaoRealizado = valorAtual - asset.capitalInvestidoAtual;
    const rentabilidadePosicao = asset.capitalInvestidoAtual > 0 ? (resultadoNaoRealizado / asset.capitalInvestidoAtual) * 100 : 0;

    asset.proventosRecebidos = proventsByTicker[asset.codigo] || 0; // Sum all provents for the asset

    const resultadoTotal = resultadoNaoRealizado + asset.resultadoRealizado + asset.proventosRecebidos;
    const capitalEfetivamenteAplicado = asset.capitalInvestidoAtual + asset.valorLiquidoVendido; // Sum of current invested capital and net proceeds from sales
    const rentabilidadeTotal = capitalEfetivamenteAplicado > 0 ? (resultadoTotal / capitalEfetivamenteAplicado) * 100 : 0;

    return {
      ...asset,
      cotacaoAtual,
      dataUltimaCotacao,
      horarioUltimaCotacao,
      fonteCotacao,
      valorAtual,
      resultadoNaoRealizado,
      rentabilidadePosicao,
      resultadoTotal,
      rentabilidadeTotal,
      participacao: 0, // Will be calculated after total portfolio value is known
    };
  });

  // Calculate total portfolio value for participation
  const valorAtualTotalDaCarteira = consolidatedPortfolio.reduce((sum, asset) => sum + asset.valorAtual, 0);

  return consolidatedPortfolio.map((asset) => ({
    ...asset,
    participacao: valorAtualTotalDaCarteira > 0 ? (asset.valorAtual / valorAtualTotalDaCarteira) * 100 : 0,
  }));
};

export const buildSummary = (portfolio = [], provents = [], movements = []) => {
  const totalInvestido = portfolio.reduce((sum, pos) => sum + pos.capitalInvestidoAtual, 0);
  const valorAtual = portfolio.reduce((sum, pos) => sum + pos.valorAtual, 0);
  const resultadoNaoRealizado = portfolio.reduce((sum, pos) => sum + pos.resultadoNaoRealizado, 0);
  const resultadoRealizado = portfolio.reduce((sum, pos) => sum + pos.resultadoRealizado, 0);
  const proventosRecebidos = portfolio.reduce((sum, pos) => sum + pos.proventosRecebidos, 0);
  const resultadoTotal = portfolio.reduce((sum, pos) => sum + pos.resultadoTotal, 0);
  const rentabilidadePosicao = totalInvestido > 0 ? (resultadoNaoRealizado / totalInvestido) * 100 : 0;
  const capitalEfetivamenteAplicadoTotal = portfolio.reduce((sum, pos) => sum + pos.capitalInvestidoAtual + pos.valorLiquidoVendido, 0);
  const rentabilidadeTotal = capitalEfetivamenteAplicadoTotal > 0 ? (resultadoTotal / capitalEfetivamenteAplicadoTotal) * 100 : 0;
  const today = new Date();
  const mesAtual = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const aportesNoMes = movements
    .filter((mov) => mov.tipoMovimentacao === 'Compra' && String(mov.data || '').startsWith(mesAtual))
    .reduce((sum, item) => sum + (Number(item.quantidade || 0) * Number(item.precoUnitario || 0) + Number(item.taxas || 0)), 0);
  return {
    totalInvestido,
    valorAtual,
    resultadoNaoRealizado,
    resultadoRealizado,
    rentabilidadePosicao,
    // resultado: resultadoNaoRealizado, // Keep old names for compatibility if needed, but prefer new ones
    // rentabilidade: rentabilidadePosicao,
    proventosRecebidos,
    resultadoTotal,
    rentabilidadeTotal,
    aportesNoMes,
  };
};

export function getMovementFinalValue(movement) {
  const quantity = Number(movement.quantidade) || 0;
  const price = Number(movement.precoUnitario) || 0;
  const fees = Number(movement.taxas) || 0;

  const gross = quantity * price;

  const type = normalizeMovementType(movement.tipoMovimentacao);

  if (type === 'COMPRA') {
    return gross + fees;
  }

  if (type === 'VENDA') {
    return gross - fees;
  }
  return gross;
}

export const buildBuySellComparison = (movements = [], options = {}) => {
  const {
    startDate = null,
    endDate = null,
    grouping = 'asset', // 'asset' or 'monthly'
    metric = 'value', // 'value' or 'quantity'
  } = options;

  const filteredMovements = movements.filter(mov => {
    if (!['COMPRA', 'VENDA'].includes(normalizeMovementType(mov.tipoMovimentacao))) {
      return false;
    }
    if (startDate && mov.data < startDate) return false;
    if (endDate && mov.data > endDate) return false;
    return true;
  });

  const aggregation = filteredMovements.reduce((acc, mov) => {
    const key = grouping === 'asset'
      ? normalizeAssetSymbol(mov.ativo)
      : mov.data.substring(0, 7); // YYYY-MM for monthly

    if (!acc[key]) {
      acc[key] = {
        codigo: grouping === 'asset' ? key : null,
        label: grouping === 'monthly' ? key : null,
        compras: 0,
        vendas: 0,
        quantidadeComprada: 0,
        quantidadeVendida: 0,
        taxasCompra: 0,
        taxasVenda: 0,
        fluxoLiquido: 0,
      };
    }

    const group = acc[key];
    const type = normalizeMovementType(mov.tipoMovimentacao);
    const value = mov.quantidade * mov.precoUnitario;
    const fees = mov.taxas || 0;

    if (type === 'COMPRA') {
      group.compras += (metric === 'value' ? value + fees : mov.quantidade);
      group.quantidadeComprada += mov.quantidade;
      group.taxasCompra += fees;
      group.fluxoLiquido -= (value + fees);
    } else if (type === 'VENDA') {
      group.vendas += (metric === 'value' ? value - fees : mov.quantidade);
      group.quantidadeVendida += mov.quantidade;
      group.taxasVenda += fees;
      group.fluxoLiquido += (value - fees);
    }

    return acc;
  }, {});

  return Object.values(aggregation).sort((a, b) => (a.label || a.codigo || '').localeCompare(b.label || b.codigo || ''));
};

export const generateFinancialTips = ({
  despesas = [],
  receitas = [],
  limites = [],
  reservas = [],
  dividas = [],
  portfolio = [],
  provents = [],
  quotes = [],
}) => {
  const tips = [];
  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

  const toMonthKey = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const despesasMesAtual = getMonthTotal(despesas, currentMonthKey);
  const receitasMesAtual = getMonthTotal(receitas, currentMonthKey);
  const despesasMesAnterior = getMonthTotal(despesas, lastMonthKey);

  if (despesasMesAtual > receitasMesAtual) {
    tips.push({
      id: `despesas-maiores-receitas-${currentMonthKey}`,
      title: 'Despesas maiores que receitas',
      description: 'Suas despesas ultrapassaram suas receitas neste mês. Revise os maiores gastos para evitar saldo negativo.',
      category: 'budget',
      severity: 'alert',
      priority: 1,
      actionLabel: 'Ver despesas',
      actionRoute: '/despesas',
      referenceDate: today.toISOString().split('T')[0],
      read: false,
      dismissed: false,
      rule: 'despesas-maiores-receitas',
    });
  }

  if (despesasMesAnterior > 0 && despesasMesAtual >= despesasMesAnterior * 1.15) {
    const aumento = ((despesasMesAtual - despesasMesAnterior) / despesasMesAnterior) * 100;
    tips.push({
      id: `crescimento-despesas-${currentMonthKey}`,
      title: 'Crescimento das despesas',
      description: `Suas despesas aumentaram ${aumento.toFixed(0)}% em comparação ao mês anterior.`,
      category: 'budget',
      severity: 'warning',
      priority: 2,
      actionLabel: 'Comparar períodos',
      actionRoute: '/despesas',
      referenceDate: today.toISOString().split('T')[0],
      read: false,
      dismissed: false,
      rule: 'crescimento-despesas',
    });
  }

  const expensesByCategory = despesas.reduce((map, item) => {
    if (!item.categoria) return map;
    const categoria = String(item.categoria);
    if (!map[categoria]) map[categoria] = [];
    map[categoria].push(item);
    return map;
  }, {});

  Object.entries(expensesByCategory).forEach(([categoria, items]) => {
    const currentValue = items
      .filter((item) => toMonthKey(item.data) === currentMonthKey)
      .reduce((sum, item) => sum + Number(item.valor || 0), 0);

    const lastThreeMonths = items
      .filter((item) => {
        const monthKey = toMonthKey(item.data);
        const [year, month] = monthKey.split('-').map(Number);
        const monthsAgo = (today.getFullYear() - year) * 12 + (today.getMonth() + 1 - month);
        return monthsAgo >= 1 && monthsAgo <= 3;
      })
      .reduce((sum, item) => sum + Number(item.valor || 0), 0);

    const average = lastThreeMonths / 3;
    if (average > 0 && currentValue >= average * 1.2) {
      const percentual = ((currentValue - average) / average) * 100;
      tips.push({
        id: `categoria-acima-media-${categoria}-${currentMonthKey}`,
        title: 'Categoria acima da média',
        description: `A categoria ${categoria} está ${percentual.toFixed(0)}% acima da média dos últimos três meses.`,
        category: 'budget',
        severity: 'warning',
        priority: 3,
        actionLabel: 'Ver categoria',
        actionRoute: `/limites?categoria=${encodeURIComponent(categoria)}`,
        referenceDate: today.toISOString().split('T')[0],
        read: false,
        dismissed: false,
        rule: 'categoria-acima-media',
      });
    }
  });

  limites.forEach((limite) => {
    const gasto = despesas
      .filter((item) => item.categoria === limite.categoria)
      .reduce((sum, item) => sum + Number(item.valor || 0), 0);
    const percentual = limite.valor > 0 ? (gasto / limite.valor) * 100 : 0;
    if (percentual >= 100) {
      tips.push({
        id: `limite-ultrapassado-${limite.categoria}-${currentMonthKey}`,
        title: 'Limite ultrapassado',
        description: `O limite de ${limite.categoria} foi ultrapassado em R$ ${(gasto - limite.valor).toFixed(2)}.`,
        category: 'budget',
        severity: 'critical',
        priority: 1,
        actionLabel: 'Ver limite',
        actionRoute: '/limites',
        referenceDate: today.toISOString().split('T')[0],
        read: false,
        dismissed: false,
        rule: 'limite-ultrapassado',
      });
    } else if (percentual >= 90) {
      tips.push({
        id: `limite-90-${limite.categoria}-${currentMonthKey}`,
        title: 'Limite próximo',
        description: `O limite da categoria ${limite.categoria} está próximo de ser atingido.`,
        category: 'budget',
        severity: 'alert',
        priority: 2,
        actionLabel: 'Ver limite',
        actionRoute: '/limites',
        referenceDate: today.toISOString().split('T')[0],
        read: false,
        dismissed: false,
        rule: 'limite-90',
      });
    }
  });

  if (dividas.length > 0) {
    const totalDividas = dividas.reduce((sum, item) => sum + Number(item.valor || 0), 0);
    tips.push({
      id: `dividas-totais-${currentMonthKey}`,
      title: 'Dívidas em controle',
      description: `Você possui R$ ${totalDividas.toFixed(2)} em dívidas registradas. Planeje o pagamento conforme sua meta.`,
      category: 'debt',
      severity: 'info',
      priority: 4,
      actionLabel: 'Ver dívidas',
      actionRoute: '/dividas',
      referenceDate: today.toISOString().split('T')[0],
      read: false,
      dismissed: false,
      rule: 'dividas-totais',
    });
  }

  return tips.sort((a, b) => a.priority - b.priority);
};
