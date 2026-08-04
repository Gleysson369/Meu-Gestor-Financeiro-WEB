import { normalizeAssetSymbol, normalizeMovementType, toIsoDate } from './investmentCalculations';

const getMonthKey = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthLabel = (monthKey) => {
  if (!monthKey) return '';
  const [year, month] = monthKey.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleString('pt-BR', { month: 'short', year: 'numeric' });
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
  const aggregatedData = {};

  const startDateTime = startDate ? new Date(startDate + 'T00:00:00').getTime() : -Infinity;
  const endDateTime = endDate ? new Date(endDate + 'T23:59:59').getTime() : Infinity;

  movements.forEach((mov) => {
    const movementDate = new Date(mov.data + 'T00:00:00').getTime();
    if (movementDate < startDateTime || movementDate > endDateTime) {
      return; // Skip movements outside the selected period
    }

    const codigo = normalizeAssetSymbol(mov.ativo);
    if (!codigo) return;

    const tipo = normalizeMovementType(mov.tipoMovimentacao);
    if (tipo !== 'COMPRA' && tipo !== 'VENDA') return; // Only consider buys and sells

    const quantidade = Number(mov.quantidade || 0);
    const precoUnitario = Number(mov.precoUnitario || 0);
    const taxas = Number(mov.taxas || 0);

    if (quantidade <= 0 && precoUnitario <= 0 && taxas <= 0) return; // Ignore invalid movements

    const key = grouping === 'asset' ? codigo : getMonthKey(mov.data);
    if (!aggregatedData[key]) {
      aggregatedData[key] = {
        codigo: codigo, // For asset grouping
        periodo: key, // For monthly grouping
        label: grouping === 'monthly' ? getMonthLabel(key) : codigo,
        compras: 0,
        vendas: 0,
        quantidadeComprada: 0,
        quantidadeVendida: 0,
        taxasCompra: 0,
        taxasVenda: 0,
        fluxoLiquido: 0,
      };
    }

    const item = aggregatedData[key];

    if (tipo === 'COMPRA') {
      item.compras += (quantidade * precoUnitario) + taxas;
      item.quantidadeComprada += quantidade;
      item.taxasCompra += taxas;
    } else if (tipo === 'VENDA') {
      item.vendas += (quantidade * precoUnitario) - taxas;
      item.quantidadeVendida += quantidade;
      item.taxasVenda += taxas;
    }
  });

  const result = Object.values(aggregatedData).map((item) => {
    item.fluxoLiquido = item.vendas - item.compras;
    return item;
  });

  // Sort results
  if (grouping === 'asset') {
    result.sort((a, b) => a.codigo.localeCompare(b.codigo));
  } else { // monthly
    result.sort((a, b) => {
      const dateA = new Date(a.periodo + '-01');
      const dateB = new Date(b.periodo + '-01');
      return dateA.getTime() - dateB.getTime();
    });
  }

  // Apply metric
  return result.map(item => ({
    ...item,
    compras: metric === 'value' ? item.compras : item.quantidadeComprada,
    vendas: metric === 'value' ? item.vendas : item.quantidadeVendida,
    // For quantity metric, fluxoLiquido, taxasCompra, taxasVenda are not directly applicable in the same way,
    // but we keep them for consistency in the data structure, they will be 0 or not used in display.
    fluxoLiquido: metric === 'value' ? item.fluxoLiquido : 0,
    taxasCompra: metric === 'value' ? item.taxasCompra : 0,
    taxasVenda: metric === 'value' ? item.taxasVenda : 0,
  }));
}