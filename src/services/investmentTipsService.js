const formatBRL = (value) => Number(value || 0).toLocaleString('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export const buildInvestmentTips = ({ portfolio = [], summary = {}, provents = [] } = {}) => {
  const openPositions = portfolio.filter((asset) => Number(asset.quantidadeAtual) > 0);
  const tips = [];

  if (openPositions.length === 0) {
    tips.push({
      id: 'investment-start-portfolio',
      title: 'Comece registrando uma posição',
      description: 'Registre uma compra na aba Movimentações para acompanhar quantidade, preço médio e evolução da sua carteira.',
    });
    tips.push({
      id: 'investment-add-first-quote',
      title: 'Mantenha os valores atualizados',
      description: 'Depois de cadastrar um ativo, informe sua cotação atual para ver uma estimativa de valor e resultado.',
    });
    return tips;
  }

  const currentValue = openPositions.reduce((total, asset) => total + Number(asset.valorAtual || 0), 0);
  const missingQuotes = openPositions.filter((asset) => Number(asset.cotacaoAtual) <= 0);

  if (missingQuotes.length > 0) {
    const symbols = missingQuotes.slice(0, 3).map((asset) => asset.codigo).join(', ');
    const extra = missingQuotes.length > 3 ? ` e mais ${missingQuotes.length - 3}` : '';
    tips.push({
      id: 'investment-update-quotes',
      title: 'Atualize as cotações da carteira',
      description: `${symbols}${extra} ${missingQuotes.length === 1 ? 'está sem cotação' : 'estão sem cotação'}. Informe o preço atual na aba Rendimentos para acompanhar o valor estimado dessas posições.`,
    });
  }

  const topPosition = [...openPositions].sort((a, b) => Number(b.valorAtual || 0) - Number(a.valorAtual || 0))[0];
  const topShare = currentValue > 0 ? (Number(topPosition?.valorAtual || 0) / currentValue) * 100 : 0;
  if (topPosition && topShare >= 50) {
    tips.push({
      id: `investment-concentration-${topPosition.codigo}`,
      title: 'Observe a distribuição da carteira',
      description: `${topPosition.codigo} representa ${topShare.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do valor estimado. Acompanhe essa participação no gráfico de distribuição.`,
    });
  }

  const positionsWithQuote = openPositions.filter((asset) => Number(asset.cotacaoAtual) > 0);
  const result = positionsWithQuote.reduce((total, asset) => total + Number(asset.resultadoNaoRealizado || 0), 0);
  if (positionsWithQuote.length > 0) {
    tips.push({
      id: 'investment-review-position-result',
      title: result < 0 ? 'Revise o resultado das posições' : 'Acompanhe o resultado das posições',
      description: `Nas posições com cotação informada, o resultado estimado é ${formatBRL(result)}. Compare o valor atual com seu preço médio e confira se as cotações estão recentes.`,
    });
  }

  const dividendsTotal = Number(summary.proventosRecebidos || 0);
  if (provents.length === 0) {
    tips.push({
      id: 'investment-record-income',
      title: 'Registre os rendimentos recebidos',
      description: 'Lance dividendos, juros e outros pagamentos conforme o extrato da instituição para acompanhar a renda gerada pelos ativos.',
    });
  } else {
    tips.push({
      id: 'investment-income-summary',
      title: 'Acompanhe os rendimentos recebidos',
      description: `Você registrou ${formatBRL(dividendsTotal)} em rendimentos. Confira os lançamentos e datas na aba Rendimentos.`,
    });
  }

  return tips.slice(0, 3);
};
