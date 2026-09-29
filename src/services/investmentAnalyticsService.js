import { normalizeAssetSymbol, normalizeMovementType } from './investmentCalculations.js';

const getMonthKey = (dateString) => {
  if (!dateString) return null;
  const datePrefix = String(dateString).match(/^(\d{4})-(\d{2})/);
  if (datePrefix) return `${datePrefix[1]}-${datePrefix[2]}`;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthLabel = (monthKey) => {
  if (!monthKey) return '';
  const [year, month] = monthKey.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${monthNames[date.getMonth()]}/${year}`;
};

export function buildBuySellComparison(
  movements = [],
  {
    startDate = null,
    endDate = null,
    grouping = 'asset', // 'asset' | 'monthly'
    metric = 'value', // 'value' | 'quantity'
  } = {}
) {
  const startDateTime = startDate ? new Date(startDate + 'T00:00:00').getTime() : -Infinity;
  const endDateTime = endDate ? new Date(endDate + 'T23:59:59').getTime() : Infinity;

  const aggregatedData = movements.reduce((acc, mov) => {
    const movementDate = new Date(mov.data + 'T00:00:00').getTime();
    if (movementDate < startDateTime || movementDate > endDateTime) {
      return acc;
    }

    const codigo = normalizeAssetSymbol(mov.ativo);
    if (!codigo) return acc;

    const tipo = normalizeMovementType(mov.tipoMovimentacao);
    if (tipo !== 'COMPRA' && tipo !== 'VENDA') return acc;

    const quantidade = Number(mov.quantidade || 0);
    if (quantidade <= 0) return acc;
    const precoUnitario = Number(mov.precoUnitario || 0);
    if (precoUnitario <= 0) return acc;

    const key = grouping === 'asset' ? codigo : getMonthKey(mov.data);
    if (!key) return acc;

    if (!acc[key]) {
      acc[key] = {
        codigo: grouping === 'asset' ? key : null,
        periodo: grouping === 'monthly' ? key : null,
        label: grouping === 'monthly' ? getMonthLabel(key) : codigo,
        compras: 0,
        vendas: 0,
        quantidadeComprada: 0,
        quantidadeVendida: 0,
        taxasCompra: 0,
        taxasVenda: 0,
      };
    }

    const item = acc[key];
    const taxas = Number(mov.taxas || 0);
    const value = quantidade * precoUnitario;

    if (tipo === 'COMPRA') {
      item.compras += value + taxas;
      item.quantidadeComprada += quantidade;
      item.taxasCompra += taxas;
    } else if (tipo === 'VENDA') {
      item.vendas += value - taxas;
      item.quantidadeVendida += quantidade;
      item.taxasVenda += taxas;
    }
    return acc;
  }, {});

  const result = Object.values(aggregatedData).map((item) => {
    if (metric === 'value') {
      return { ...item, fluxoLiquido: item.vendas - item.compras };
    }
    // metric === 'quantity'
    return {
      ...item,
      compras: item.quantidadeComprada,
      vendas: item.quantidadeVendida,
      fluxoLiquido: 0,
      taxasCompra: 0,
      taxasVenda: 0,
    };
  });

  // Sort results
  if (grouping === 'asset') {
    result.sort((a, b) => (a.label || '').localeCompare(b.label || ''));
  } else { // monthly
    result.sort((a, b) => (a.periodo || '').localeCompare(b.periodo || ''));
  }

  return result;
}
