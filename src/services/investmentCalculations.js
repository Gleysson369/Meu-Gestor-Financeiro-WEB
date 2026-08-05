﻿﻿﻿﻿﻿export const normalizeAssetSymbol = (value) => {
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
