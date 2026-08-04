import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { consolidarCarteira, buildSummary, normalizeMovementType, getAssetTypeFromTicker } from './investmentCalculations.js';
import { buildBuySellComparison } from './investmentAnalyticsService.js';

const buildDateString = (date) => date.toISOString().split('T')[0];

describe('consolidarCarteira', () => {
  it('buildPortfolio should aggregate buys and quotes correctly', () => {
    const movements = [
      { ativo: 'PETR4', tipoMovimentacao: 'Compra', quantidade: 10, precoUnitario: 20, taxas: 2, nomeAtivo: 'Petrobras', tipoAtivo: 'Ação' },
      { ativo: 'PETR4', tipoMovimentacao: 'Compra', quantidade: 5, precoUnitario: 22, taxas: 1, nomeAtivo: 'Petrobras' },
      { ativo: 'ITUB4', tipoMovimentacao: 'Compra', quantidade: 8, precoUnitario: 30, taxas: 0.5, nomeAtivo: 'Itaú', tipoAtivo: 'Ação' },
      { ativo: 'PETR4', tipoMovimentacao: 'Venda', quantidade: 3, precoUnitario: 24, taxas: 0.5, nomeAtivo: 'Petrobras' },
    ];

    const quotes = [
      { ativo: 'PETR4', cotacao: 23, data: '2026-07-01' },
      { ativo: 'ITUB4', cotacao: 31, data: '2026-07-01' },
    ];

    const portfolio = consolidarCarteira(movements, quotes);
    const petr = portfolio.find((pos) => pos.codigo === 'PETR4');
    const itub = portfolio.find((pos) => pos.codigo === 'ITUB4');

    assert.equal(portfolio.length, 2, 'Deve ter 2 ativos no portfólio');

    // PETR4: 10 @ 20 + 2 (compra) -> Custo 202, Qtd 10, PM 20.2
    //        5 @ 22 + 1 (compra) -> Custo 202 + 111 = 313, Qtd 15, PM 20.866
    //        3 @ 24 - 0.5 (venda) -> Custo Venda = 3 * 20.866 = 62.6, Qtd 12, Capital Investido 313 - 62.6 = 250.4, PM 20.866
    //        Cotação 23
    assert.equal(petr.quantidadeAtual, 12, 'PETR4: Quantidade atual deve ser 12');
    assert.equal(petr.quantidadeComprada, 15, 'PETR4: Quantidade comprada deve ser 15');
    assert.equal(petr.quantidadeVendida, 3, 'PETR4: Quantidade vendida deve ser 3');
    assert.equal(petr.precoMedio.toFixed(2), '20.87', 'PETR4: Preço médio deve ser 20.87');
    assert.equal(petr.capitalInvestidoAtual.toFixed(2), '250.40', 'PETR4: Capital investido atual deve ser 250.40');
    assert.equal(petr.valorAtual.toFixed(2), (12 * 23).toFixed(2), 'PETR4: Valor atual deve ser 12 * 23');
    assert.equal(petr.resultadoNaoRealizado.toFixed(2), (12 * 23 - 250.40).toFixed(2), 'PETR4: Resultado não realizado');
    assert.equal(petr.valorBrutoVendido.toFixed(2), (3 * 24).toFixed(2), 'PETR4: Valor bruto vendido');
    assert.equal(petr.valorLiquidoVendido.toFixed(2), (3 * 24 - 0.5).toFixed(2), 'PETR4: Valor líquido vendido');
    assert.equal(petr.resultadoRealizado.toFixed(2), (3 * 24 - 0.5 - 3 * 20.866666666666667).toFixed(2), 'PETR4: Resultado realizado');
    assert.equal(petr.cotacaoAtual, 23, 'PETR4: Cotação atual');

    // ITUB4: 8 @ 30 + 0.5 (compra) -> Custo 240.5, Qtd 8, PM 30.0625
    //        Cotação 31
    assert.equal(itub.quantidadeAtual, 8, 'ITUB4: Quantidade atual deve ser 8');
    assert.equal(itub.precoMedio.toFixed(2), '30.06', 'ITUB4: Preço médio deve ser 30.06');
    assert.equal(itub.capitalInvestidoAtual.toFixed(2), '240.50', 'ITUB4: Capital investido atual deve ser 240.50');
    assert.equal(itub.valorAtual.toFixed(2), (8 * 31).toFixed(2), 'ITUB4: Valor atual deve ser 8 * 31');
    assert.equal(itub.cotacaoAtual, 31, 'ITUB4: Cotação atual');

    assert.ok(petr.participacao > 0 && itub.participacao > 0, 'Participação deve ser calculada');
  });

  it('should handle multiple buys with different prices and calculate correct average price', () => {
    const movements = [
      { ativo: 'XPTO3', tipoMovimentacao: 'Compra', quantidade: 10, precoUnitario: 10, taxas: 1, data: '2026-01-01' },
      { ativo: 'XPTO3', tipoMovimentacao: 'Compra', quantidade: 20, precoUnitario: 11, taxas: 2, data: '2026-01-02' },
    ];
    const portfolio = consolidarCarteira(movements);
    const xpto = portfolio.find(p => p.codigo === 'XPTO3');

    assert.equal(xpto.quantidadeAtual, 30);
    assert.equal(xpto.capitalInvestidoAtual, (10 * 10 + 1) + (20 * 11 + 2)); // 101 + 222 = 323
    assert.equal(xpto.precoMedio.toFixed(2), (323 / 30).toFixed(2)); // 10.77
  });

  it('should handle partial sale and maintain average price for remaining units', () => {
    const movements = [
      { ativo: 'XPTO3', tipoMovimentacao: 'Compra', quantidade: 10, precoUnitario: 10, taxas: 1, data: '2026-01-01' }, // Cost 101, Qty 10, PM 10.1
      { ativo: 'XPTO3', tipoMovimentacao: 'Venda', quantidade: 4, precoUnitario: 12, taxas: 0.5, data: '2026-01-02' }, // Sell 4 units
    ];
    const quotes = [{ ativo: 'XPTO3', cotacao: 13, data: '2026-01-03' }];
    const portfolio = consolidarCarteira(movements, quotes);
    const xpto = portfolio.find(p => p.codigo === 'XPTO3');

    assert.equal(xpto.quantidadeAtual, 6, 'Remaining quantity should be 6');
    assert.equal(xpto.precoMedio.toFixed(2), '10.10', 'Average price should remain 10.10');
    assert.equal(xpto.capitalInvestidoAtual.toFixed(2), (6 * 10.10).toFixed(2), 'Remaining capital invested'); // 60.60

    // Sale details
    assert.equal(xpto.quantidadeVendida, 4);
    assert.equal(xpto.valorBrutoVendido, 4 * 12); // 48
    assert.equal(xpto.valorLiquidoVendido, 4 * 12 - 0.5); // 47.5
    assert.equal(xpto.resultadoRealizado.toFixed(2), (47.5 - (4 * 10.10)).toFixed(2)); // 47.5 - 40.4 = 7.1

    // Current value and unrealized result
    assert.equal(xpto.valorAtual.toFixed(2), (6 * 13).toFixed(2)); // 78
    assert.equal(xpto.resultadoNaoRealizado.toFixed(2), (78 - 60.60).toFixed(2)); // 17.40
  });

  it('should reset quantity, cost, and average price when position is fully closed', () => {
    const movements = [
      { ativo: 'XPTO3', tipoMovimentacao: 'Compra', quantidade: 10, precoUnitario: 10, taxas: 1, data: '2026-01-01' }, // Cost 101, Qty 10, PM 10.1
      { ativo: 'XPTO3', tipoMovimentacao: 'Venda', quantidade: 10, precoUnitario: 12, taxas: 0.5, data: '2026-01-02' }, // Sell all 10 units
    ];
    const portfolio = consolidarCarteira(movements);
    const xpto = portfolio.find(p => p.codigo === 'XPTO3');

    assert.equal(xpto.quantidadeAtual, 0, 'Quantity should be 0');
    assert.equal(xpto.capitalInvestidoAtual, 0, 'Capital invested should be 0');
    assert.equal(xpto.precoMedio, 0, 'Average price should be 0');
    assert.equal(xpto.quantidadeVendida, 10);
    assert.equal(xpto.resultadoRealizado.toFixed(2), (10 * 12 - 0.5 - 10 * 10.10).toFixed(2)); // 119.5 - 101 = 18.5
  });

  it('should handle new buy after position was fully closed', () => {
    const movements = [
      { ativo: 'XPTO3', tipoMovimentacao: 'Compra', quantidade: 10, precoUnitario: 10, taxas: 1, data: '2026-01-01' },
      { ativo: 'XPTO3', tipoMovimentacao: 'Venda', quantidade: 10, precoUnitario: 12, taxas: 0.5, data: '2026-01-02' },
      { ativo: 'XPTO3', tipoMovimentacao: 'Compra', quantidade: 5, precoUnitario: 13, taxas: 0.2, data: '2026-01-03' }, // New buy
    ];
    const portfolio = consolidarCarteira(movements);
    const xpto = portfolio.find(p => p.codigo === 'XPTO3');

    assert.equal(xpto.quantidadeAtual, 5, 'Quantity should be 5 after new buy');
    assert.equal(xpto.capitalInvestidoAtual.toFixed(2), (5 * 13 + 0.2).toFixed(2), 'Capital invested should be for new buy'); // 65.2
    assert.equal(xpto.precoMedio.toFixed(2), (65.2 / 5).toFixed(2), 'Average price should be for new buy'); // 13.04
  });

  it('should not allow sale exceeding available quantity', () => {
    const movements = [
      { ativo: 'XPTO3', tipoMovimentacao: 'Compra', quantidade: 10, precoUnitario: 10, taxas: 1, data: '2026-01-01' },
      { ativo: 'XPTO3', tipoMovimentacao: 'Venda', quantidade: 12, precoUnitario: 12, taxas: 0.5, data: '2026-01-02' }, // Invalid sale
    ];
    const portfolio = consolidarCarteira(movements);
    const xpto = portfolio.find(p => p.codigo === 'XPTO3');

    assert.equal(xpto.quantidadeAtual, 10, 'Quantity should remain 10 as sale was invalid');
    assert.equal(xpto.quantidadeVendida, 0, 'No units should be marked as sold');
  });

  it('should correctly calculate total results and rentability', () => {
    const movements = [
      { ativo: 'TEST4', tipoMovimentacao: 'Compra', quantidade: 10, precoUnitario: 10, taxas: 1, data: '2026-01-01' }, // Cost 101, Qty 10, PM 10.1
      { ativo: 'TEST4', tipoMovimentacao: 'Venda', quantidade: 5, precoUnitario: 12, taxas: 0.5, data: '2026-01-02' }, // Sell 5 units
    ];
    const quotes = [{ ativo: 'TEST4', cotacao: 13, data: '2026-01-03' }];
    const provents = [{ ativo: 'TEST4', valorTotal: 10, dataPagamento: '2026-01-04' }];
    const portfolio = consolidarCarteira(movements, quotes, provents);
    const test4 = portfolio.find(p => p.codigo === 'TEST4');

    // Remaining 5 units: Capital Investido = 5 * 10.1 = 50.5
    // Unrealized Result = (5 * 13) - 50.5 = 65 - 50.5 = 14.5
    assert.equal(test4.resultadoNaoRealizado.toFixed(2), '14.50');

    // Realized Result = (5 * 12 - 0.5) - (5 * 10.1) = 59.5 - 50.5 = 9
    assert.equal(test4.resultadoRealizado.toFixed(2), '9.00');

    // Proventos = 10
    assert.equal(test4.proventosRecebidos, 10);

    // Total Result = 14.5 + 9 + 10 = 33.5
    assert.equal(test4.resultadoTotal.toFixed(2), '33.50');

    // Rentabilidade Total = Total Result / (Capital Investido Atual + Valor Líquido Vendido) * 100
    // Capital Investido Atual = 50.5
    // Valor Líquido Vendido = 59.5
    // (50.5 + 59.5) = 110
    // Rentabilidade Total = 33.5 / 110 * 100 = 30.45%
    assert.equal(test4.rentabilidadeTotal.toFixed(2), '30.45');
  });

  it('should use the latest quote by date and time', () => {
    const quotes = [
      { ativo: 'LATEST', cotacao: 10, data: '2026-01-01', horario: '10:00' },
      { ativo: 'LATEST', cotacao: 12, data: '2026-01-01', horario: '11:00' },
      { ativo: 'LATEST', cotacao: 11, data: '2026-01-02', horario: '09:00' },
    ];
    const portfolio = consolidarCarteira([], quotes);
    const latest = portfolio.find(p => p.codigo === 'LATEST');
    assert.equal(latest.cotacaoAtual, 11);
    assert.equal(latest.dataUltimaCotacao, '2026-01-02');
    assert.equal(latest.horarioUltimaCotacao, '09:00');
  });

  it('should infer FII type for codes ending in 11', () => {
    const movements = [{ ativo: 'MXRF11', tipoMovimentacao: 'Compra', quantidade: 10, precoUnitario: 10, taxas: 0, data: '2026-01-01' }];
    const portfolio = consolidarCarteira(movements);
    const mxrf = portfolio.find(p => p.codigo === 'MXRF11');
    assert.equal(mxrf.tipoAtivo, 'FII');
  });

  it('should normalize movement types', () => {
    assert.equal(normalizeMovementType('compra'), 'COMPRA');
    assert.equal(normalizeMovementType('Venda'), 'VENDA');
    assert.equal(normalizeMovementType('Bonificação'), 'BONIFICACAO');
    assert.equal(normalizeMovementType('Desdobramento'), 'BONIFICACAO');
    assert.equal(normalizeMovementType('Grupamento'), 'AJUSTE_SAIDA');
    assert.equal(normalizeMovementType('ajuste_entrada'), 'AJUSTE_ENTRADA');
    assert.equal(normalizeMovementType('unknown'), 'OUTRO');
  });

  it('should get asset type from ticker', () => {
    assert.equal(getAssetTypeFromTicker('PETR4'), 'Ação');
    assert.equal(getAssetTypeFromTicker('MXRF11'), 'FII');
    assert.equal(getAssetTypeFromTicker('IVVB11'), 'FII');
    assert.equal(getAssetTypeFromTicker('BBSD11', 'Ação'), 'FII'); // Even if default is Ação
  });

  it('buildSummary should compute totals and monthly aportes', () => {
    const portfolio = [
      { codigo: 'A', capitalInvestidoAtual: 500, valorAtual: 550, resultadoNaoRealizado: 50, resultadoRealizado: 10, proventosRecebidos: 5, resultadoTotal: 65, valorLiquidoVendido: 0 },
      { codigo: 'B', capitalInvestidoAtual: 300, valorAtual: 330, resultadoNaoRealizado: 30, resultadoRealizado: 20, proventosRecebidos: 10, resultadoTotal: 60, valorLiquidoVendido: 0 },
    ];
    const provents = [{ valorTotal: 20 }, { valorTotal: 15 }];
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const movements = [
      { tipoMovimentacao: 'COMPRA', data: `${currentMonth}-05`, quantidade: 2, precoUnitario: 10, taxas: 1 },
      { tipoMovimentacao: 'COMPRA', data: `${currentMonth}-10`, quantidade: 3, precoUnitario: 15, taxas: 2 },
      { tipoMovimentacao: 'VENDA', data: `${currentMonth}-12`, quantidade: 1, precoUnitario: 20, taxas: 0 },
    ];

    const summary = buildSummary(portfolio, provents, movements);
    assert.equal(summary.totalInvestido, 800, 'Total Investido');
    assert.equal(summary.valorAtual, 880, 'Valor Atual');
    assert.equal(summary.resultadoNaoRealizado, 80, 'Resultado Não Realizado');
    assert.equal(summary.resultadoRealizado, 30, 'Resultado Realizado');
    assert.equal(summary.proventosRecebidos, 15, 'Proventos Recebidos');
    assert.equal(summary.resultadoTotal, 125, 'Resultado Total');
    assert.equal(summary.rentabilidadePosicao.toFixed(2), (80 / 800 * 100).toFixed(2), 'Rentabilidade Posição');
    assert.equal(summary.rentabilidadeTotal.toFixed(2), (125 / 800 * 100).toFixed(2), 'Rentabilidade Total');
    assert.equal(summary.aportesNoMes, 68, 'Aportes no Mês'); // 2*10 + 1 + 3*15 + 2 = 68
  });

  describe('buildBuySellComparison', () => {
    const movements = [
      { id: 'm1', ativo: 'PETR4', tipoMovimentacao: 'Compra', quantidade: 10, precoUnitario: 30.5, taxas: 1, data: '2026-01-10' },
      { id: 'm2', ativo: 'PETR4', tipoMovimentacao: 'Venda', quantidade: 4, precoUnitario: 31.2, taxas: 1.2, data: '2026-01-15' },
      { id: 'm3', ativo: 'VALE3', tipoMovimentacao: 'Compra', quantidade: 5, precoUnitario: 50, taxas: 0.5, data: '2026-01-12' },
      { id: 'm4', ativo: 'PETR4', tipoMovimentacao: 'Compra', quantidade: 2, precoUnitario: 32, taxas: 0.8, data: '2026-02-01' },
      { id: 'm5', ativo: 'VALE3', tipoMovimentacao: 'Venda', quantidade: 2, precoUnitario: 55, taxas: 0.7, data: '2026-02-10' },
      { id: 'm6', ativo: 'ITUB4', tipoMovimentacao: 'Compra', quantidade: 10, precoUnitario: 25, taxas: 1.0, data: '2026-03-05' },
      { id: 'm7', ativo: 'ITUB4', tipoMovimentacao: 'Venda', quantidade: 10, precoUnitario: 26, taxas: 1.0, data: '2026-03-10' }, // Full close
      { id: 'm8', ativo: 'PETR4', tipoMovimentacao: 'Bonificação', quantidade: 1, precoUnitario: 0, taxas: 0, data: '2026-01-20' }, // Should be ignored
    ];

    it('should aggregate by asset and value correctly for all period', () => {
      const result = buildBuySellComparison(movements, { grouping: 'asset', metric: 'value', buySellPeriod: 'all' });

      assert.equal(result.length, 3);

      const petr4 = result.find(item => item.codigo === 'PETR4');
      assert.equal(petr4.compras.toFixed(2), (10 * 30.5 + 1 + 2 * 32 + 0.8).toFixed(2)); // 306 + 64.8 = 370.8
      assert.equal(petr4.vendas.toFixed(2), (4 * 31.2 - 1.2).toFixed(2)); // 124.8 - 1.2 = 123.6
      assert.equal(petr4.fluxoLiquido.toFixed(2), (123.6 - 370.8).toFixed(2)); // -247.2
      assert.equal(petr4.quantidadeComprada, 12);
      assert.equal(petr4.quantidadeVendida, 4);
      assert.equal(petr4.taxasCompra.toFixed(2), (1 + 0.8).toFixed(2));
      assert.equal(petr4.taxasVenda.toFixed(2), '1.20');

      const vale3 = result.find(item => item.codigo === 'VALE3');
      assert.equal(vale3.compras.toFixed(2), (5 * 50 + 0.5).toFixed(2)); // 250.5
      assert.equal(vale3.vendas.toFixed(2), (2 * 55 - 0.7).toFixed(2)); // 110 - 0.7 = 109.3
      assert.equal(vale3.fluxoLiquido.toFixed(2), (109.3 - 250.5).toFixed(2)); // -141.2

      const itub4 = result.find(item => item.codigo === 'ITUB4');
      assert.equal(itub4.compras.toFixed(2), (10 * 25 + 1.0).toFixed(2)); // 251.0
      assert.equal(itub4.vendas.toFixed(2), (10 * 26 - 1.0).toFixed(2)); // 259.0
      assert.equal(itub4.fluxoLiquido.toFixed(2), (259.0 - 251.0).toFixed(2)); // 8.0
    });

    it('should aggregate by asset and quantity correctly for all period', () => {
      const result = buildBuySellComparison(movements, { grouping: 'asset', metric: 'quantity', buySellPeriod: 'all' });

      assert.equal(result.length, 3);

      const petr4 = result.find(item => item.codigo === 'PETR4');
      assert.equal(petr4.compras, 12);
      assert.equal(petr4.vendas, 4);
      assert.equal(petr4.quantidadeComprada, 12);
      assert.equal(petr4.quantidadeVendida, 4);
      assert.equal(petr4.fluxoLiquido, 0); // Not applicable for quantity metric
      assert.equal(petr4.taxasCompra, 0); // Not applicable for quantity metric
      assert.equal(petr4.taxasVenda, 0); // Not applicable for quantity metric
    });

    it('should aggregate monthly and value correctly', () => {
      const result = buildBuySellComparison(movements, { grouping: 'monthly', metric: 'value', buySellPeriod: 'all' });

      assert.equal(result.length, 3);

      const jan = result.find(item => item.periodo === '2026-01');
      assert.equal(jan.label, 'Jan/2026');
      assert.equal(jan.compras.toFixed(2), (10 * 30.5 + 1 + 5 * 50 + 0.5).toFixed(2)); // 306 + 250.5 = 556.5
      assert.equal(jan.vendas.toFixed(2), (4 * 31.2 - 1.2).toFixed(2)); // 123.6
      assert.equal(jan.fluxoLiquido.toFixed(2), (123.6 - 556.5).toFixed(2)); // -432.9

      const feb = result.find(item => item.periodo === '2026-02');
      assert.equal(feb.label, 'Fev/2026');
      assert.equal(feb.compras.toFixed(2), (2 * 32 + 0.8).toFixed(2)); // 64.8
      assert.equal(feb.vendas.toFixed(2), (2 * 55 - 0.7).toFixed(2)); // 109.3
      assert.equal(feb.fluxoLiquido.toFixed(2), (109.3 - 64.8).toFixed(2)); // 44.5

      const mar = result.find(item => item.periodo === '2026-03');
      assert.equal(mar.label, 'Mar/2026');
      assert.equal(mar.compras.toFixed(2), (10 * 25 + 1.0).toFixed(2)); // 251.0
      assert.equal(mar.vendas.toFixed(2), (10 * 26 - 1.0).toFixed(2)); // 259.0
      assert.equal(mar.fluxoLiquido.toFixed(2), (259.0 - 251.0).toFixed(2)); // 8.0
    });

    it('should filter by custom date range (inclusive)', () => {
      const result = buildBuySellComparison(movements, {
        startDate: '2026-01-10',
        endDate: '2026-01-15',
        grouping: 'asset',
        metric: 'value',
      });

      assert.equal(result.length, 2);
      const petr4 = result.find(item => item.codigo === 'PETR4');
      assert.equal(petr4.compras.toFixed(2), (10 * 30.5 + 1).toFixed(2)); // 306
      assert.equal(petr4.vendas.toFixed(2), (4 * 31.2 - 1.2).toFixed(2)); // 123.6

      const vale3 = result.find(item => item.codigo === 'VALE3');
      assert.equal(vale3.compras.toFixed(2), (5 * 50 + 0.5).toFixed(2)); // 250.5
      assert.equal(vale3.vendas.toFixed(2), '0.00');
    });

    it('should return empty array if no movements match filters', () => {
      const result = buildBuySellComparison(movements, {
        startDate: '2027-01-01',
        endDate: '2027-01-31',
        grouping: 'asset',
        metric: 'value',
      });
      assert.equal(result.length, 0);
    });

    it('should ignore non-buy/sell movements', () => {
      const result = buildBuySellComparison(movements, { grouping: 'asset', metric: 'value', buySellPeriod: 'all' });
      const petr4 = result.find(item => item.codigo === 'PETR4');
      // Bonificação (m8) should not affect purchases or sales
      assert.equal(petr4.quantidadeComprada, 12);
    });

    it('should handle movements with zero quantity/price/fees safely', () => {
      const zeroMovements = [
        { ativo: 'ZERO1', tipoMovimentacao: 'Compra', quantidade: 0, precoUnitario: 10, taxas: 0, data: '2026-01-01' },
        { ativo: 'ZERO2', tipoMovimentacao: 'Venda', quantidade: 5, precoUnitario: 0, taxas: 0, data: '2026-01-01' },
        { ativo: 'ZERO3', tipoMovimentacao: 'Compra', quantidade: 10, precoUnitario: 10, taxas: 0, data: '2026-01-01' },
      ];
      const result = buildBuySellComparison(zeroMovements, { grouping: 'asset', metric: 'value', buySellPeriod: 'all' });

      assert.equal(result.length, 1); // Only ZERO3 should be included
      const zero3 = result.find(item => item.codigo === 'ZERO3');
      assert.equal(zero3.compras, 100);
    });

    it('should handle case-insensitive asset codes', () => {
      const mixedCaseMovements = [
        { ativo: 'petr4', tipoMovimentacao: 'Compra', quantidade: 1, precoUnitario: 10, taxas: 0, data: '2026-01-01' },
        { ativo: 'PETR4', tipoMovimentacao: 'Venda', quantidade: 1, precoUnitario: 10, taxas: 0, data: '2026-01-02' },
      ];
      const result = buildBuySellComparison(mixedCaseMovements, { grouping: 'asset', metric: 'value', buySellPeriod: 'all' });
      assert.equal(result.length, 1);
      assert.equal(result[0].codigo, 'PETR4');
      assert.equal(result[0].compras, 10);
      assert.equal(result[0].vendas, 10);
    });

    it('should not modify the original movements array', () => {
      const originalMovements = [...movements];
      buildBuySellComparison(movements, { grouping: 'asset', metric: 'value', buySellPeriod: 'all' });
      assert.deepStrictEqual(movements, originalMovements);
    });
  });
});
