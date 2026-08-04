import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../services/firebase';
import { collection, addDoc, getDocs, query, where, doc, deleteDoc, updateDoc, getDoc, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Chart from 'chart.js/auto';
import { useNotification } from '../components/NotificationProvider.jsx';
import { consolidarCarteira, buildSummary, formatCurrency, formatPercentage, toIsoDate, normalizeAssetSymbol, normalizeMovementType, getMovementFinalValue, buildBuySellComparison } from '../services/investmentCalculations';
import { buildHomeTips } from '../services/financialTipsService';

const ASSET_TYPES = ['Ação', 'FII', 'ETF'];
const MOVEMENT_TYPES = ['Compra', 'Venda', 'Dividendo', 'Juros sobre capital próprio', 'Rendimento', 'Bonificação', 'Desdobramento', 'Grupamento'];
const PROVENT_TYPES = ['Dividendo', 'Juros sobre capital próprio', 'Rendimento', 'Amortização', 'Outro'];
const QUOTE_LABELS = ['Ativo', 'Cotação informada manualmente', 'Última atualização'];

const tabs = [
  { id: 'overview', label: 'Visão Geral' },
  { id: 'carteira', label: 'Carteira' },
  { id: 'movimentacoes', label: 'Movimentações' },
  { id: 'proventos', label: 'Proventos' },
];

const tabDescriptions = {
  overview: 'A aba Visão Geral mostra os principais indicadores da sua carteira, cotações manuais registradas e o comportamento dos ativos ao longo dos últimos meses.',
  carteira: 'A aba Carteira detalha cada ativo, mostrando posição, cotação atual, rentabilidade e participação. Use-a para monitorar seu portfólio e decidir compras ou vendas.',
  movimentacoes: 'A aba Movimentações registra compras, vendas e ajustes. É aqui que você cadastra suas operações e acompanha o histórico financeiro por ativo.',
  proventos: 'A aba Proventos controla dividendos, juros e rendimentos recebidos. Registre cada pagamento para calcular a rentabilidade real dos seus ativos.',
};

const Investimentos = () => {
  const navigate = useNavigate();
  const { notify, confirm } = useNotification();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [movements, setMovements] = useState([]);
  const [provents, setProvents] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [summary, setSummary] = useState({
    totalInvestido: 0,
    valorAtual: 0,
    resultado: 0,
    rentabilidade: 0,
    proventosRecebidos: 0,
    resultadoTotal: 0,
    rentabilidadeTotal: 0,
    aportesNoMes: 0,
  });
  const [tips, setTips] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [receitas, setReceitas] = useState([]);
  const [limites, setLimites] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [dividas, setDividas] = useState([]);
  const [loading, setLoading] = useState(false);

  const [movementForm, setMovementForm] = useState({
    tipoAtivo: 'Ação',
    ativo: '',
    nomeAtivo: '',
    tipoMovimentacao: 'Compra',
    data: toIsoDate(new Date()),
    quantidade: '',
    precoUnitario: '',
    taxas: '0',
    corretora: '',
    observacao: '',
  });
  const [proventoForm, setProventoForm] = useState({
    ativo: '',
    tipoProvento: 'Dividendo',
    dataPagamento: toIsoDate(new Date()),
    valorPorUnidade: '',
    quantidadeReferencia: '',
    valorTotal: '',
    observacao: '',
    manualValorTotal: false,
  });
  const [quoteForm, setQuoteForm] = useState({
    ativo: '',
    cotacao: '',
    data: toIsoDate(new Date()),
    horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    fonte: '',
    observacao: '',
  });

  const [movementErrors, setMovementErrors] = useState({});
  const [proventoErrors, setProventoErrors] = useState({});
  const [quoteErrors, setQuoteErrors] = useState({});

  const [editingMovementId, setEditingMovementId] = useState(null);
  const [editingProventoId, setEditingProventoId] = useState(null);
  const [editingQuoteId, setEditingQuoteId] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [dataDe, setDataDe] = useState('');
  const [dataAte, setDataAte] = useState('');
  const [proventDataDe, setProventDataDe] = useState('');
  const [proventDataAte, setProventDataAte] = useState('');
  const [resultChartMetric, setResultChartMetric] = useState('resultadoTotal'); // New state for chart metric
  const [buySellView, setBuySellView] = useState('asset'); // 'asset' | 'monthly'
  const [buySellMetric, setBuySellMetric] = useState('value'); // 'value' | 'quantity'
  const [buySellPeriod, setBuySellPeriod] = useState('all'); // 'thisMonth' | 'last3Months' | 'last6Months' | 'thisYear' | 'all' | 'custom'
  const [buySellStartDate, setBuySellStartDate] = useState('');
  const [buySellEndDate, setBuySellEndDate] = useState('');

  const distributionChartRef = useRef(null);
  const distributionChartInstance = useRef(null);
  const profitChartRef = useRef(null);
  const profitChartInstance = useRef(null);

  const resetForms = () => {
    setEditingMovementId(null);
    setEditingProventoId(null);
    setMovementForm({
      tipoAtivo: 'Ação',
      ativo: '',
      nomeAtivo: '',
      tipoMovimentacao: 'Compra',
      data: toIsoDate(new Date()),
      quantidade: '',
      precoUnitario: '',
      taxas: '0',
      corretora: '',
      observacao: '',
    });

    setProventoForm({
      ativo: '',
      tipoProvento: 'Dividendo',
      dataPagamento: toIsoDate(new Date()),
      valorPorUnidade: '',
      quantidadeReferencia: '',
      valorTotal: '',
      observacao: '',
      manualValorTotal: false,
    });

    setQuoteForm({
      ativo: '',
      cotacao: '',
      data: toIsoDate(new Date()),
      horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      fonte: '',
      observacao: '',
    });
  };

  const getPartnerIds = async (userId) => {
    const userDoc = await getDoc(doc(db, 'usuarios', userId));
    const partnerId = userDoc.data()?.parceiroId;
    return partnerId ? [userId, partnerId] : [userId];
  };

  const fetchFullData = async (userId) => {
    setLoading(true);
    try {
      const ids = await getPartnerIds(userId);
      const [movSnap, provSnap, quoteSnap, despSnap, recSnap, divSnap] = await Promise.all([
        getDocs(query(collection(db, 'investimentos_movimentacoes'), where('userId', 'in', ids), orderBy('data', 'desc'))),
        getDocs(query(collection(db, 'investimentos_proventos'), where('userId', 'in', ids), orderBy('dataPagamento', 'desc'))),
        getDocs(query(collection(db, 'investimentos_cotacoes'), where('userId', 'in', ids), orderBy('data', 'desc'))),
        getDocs(query(collection(db, 'despesas'), where('userId', 'in', ids), orderBy('data', 'desc'))),
        getDocs(query(collection(db, 'rendas'), where('userId', 'in', ids), orderBy('data', 'desc'))),
        getDocs(query(collection(db, 'dividas'), where('userId', 'in', ids), orderBy('createdAt', 'desc'))),
      ]);

      const collectedMovements = movSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const collectedProvents = provSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const collectedQuotes = quoteSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const collectedDespesas = despSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const collectedReceitas = recSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const collectedDividas = divSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      const limiteDocs = await Promise.all(ids.map(async (id) => {
        const limiteSnap = await getDoc(doc(db, 'limites', id));
        return limiteSnap.exists() ? limiteSnap.data().categorias || {} : {};
      }));
      const combinedLimits = limiteDocs.reduce((acc, next) => {
        Object.entries(next).forEach(([categoria, valor]) => {
          acc.push({ categoria, valor: Number(valor) });
        });
        return acc;
      }, []);

      const combinedQuotes = [...collectedQuotes];

      setMovements(collectedMovements);
      setProvents(collectedProvents);
      setQuotes(collectedQuotes);
      setDespesas(collectedDespesas);
      setReceitas(collectedReceitas);
      setLimites(combinedLimits);
      setDividas(collectedDividas);
      
      const newPortfolio = consolidarCarteira(collectedMovements, combinedQuotes, collectedProvents);
      setPortfolio(newPortfolio);
      setSelectedAsset((current) => {
        if (!current?.codigo) return null;
        return newPortfolio.find((item) => normalizeAssetSymbol(item.codigo) === normalizeAssetSymbol(current.codigo)) || null;
      });
      setSummary(buildSummary(newPortfolio, collectedProvents, collectedMovements));
      setTips(buildHomeTips({
        despesas: collectedDespesas,
        receitas: collectedReceitas,
        limites: combinedLimits,
        reservas: [],
        dividas: collectedDividas,
        portfolio: newPortfolio,
        provents: collectedProvents,
        quotes: combinedQuotes,
      }));
    } catch (error) {
      console.error('Erro ao carregar investimentos:', error);
      notify('Não foi possível carregar os dados de investimentos.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) fetchFullData(currentUser.uid);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (proventoForm.manualValorTotal) return;

    const valor = Number(proventoForm.valorPorUnidade) || 0;
    const qtd = Number(proventoForm.quantidadeReferencia) || 0;
    const total = valor * qtd;

    // Usando toFixed(2) para garantir duas casas decimais como string
    setProventoForm(prev => ({ ...prev, valorTotal: total > 0 ? total.toFixed(2) : '' }));
  }, [proventoForm.valorPorUnidade, proventoForm.quantidadeReferencia, proventoForm.manualValorTotal]);

  // Efeito para o Gráfico de Distribuição (Rosca)
  useEffect(() => {
    if (activeTab !== 'overview' || !distributionChartRef.current || portfolio.length === 0) return;

    distributionChartInstance.current?.destroy();

    const labels = portfolio.map((item) => item.codigo);
    const data = portfolio.map((item) => item.valorAtual);
    const themeIsDark = document.documentElement.classList.contains('dark');
    
    const ctx = distributionChartRef.current.getContext('2d');
    distributionChartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'],
          borderColor: themeIsDark ? '#12171D' : '#FFFFFF',
          borderWidth: 4,
          hoverOffset: 12,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const asset = portfolio[context.dataIndex];
                if (!asset) return '';
                return [ // Updated tooltip to use consolidated properties
                  `${asset.codigo}: ${formatCurrency(asset.valorAtual)} (${asset.participacao.toFixed(1)}%)`,
                  `Quantidade: ${asset.quantidadeAtual.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}`,
                  `Resultado: ${formatCurrency(asset.resultadoNaoRealizado)}`,
                  `Rentabilidade: ${formatPercentage(asset.rentabilidadePosicao)}`,
                ];
              },
            },
          },
        },
      },
    });

    return () => distributionChartInstance.current?.destroy();
  }, [portfolio, activeTab]);

  // Efeito para o Gráfico de Resultado por Ativo
  useEffect(() => {
    if (activeTab !== 'overview' || !profitChartRef.current || portfolio.length === 0) return;

    profitChartInstance.current?.destroy();

    const sortedAssets = [...portfolio].sort((a, b) => b[resultChartMetric] - a[resultChartMetric]);

    const labels = sortedAssets.map((item) => item.codigo);
    const data = sortedAssets.map((item) => item[resultChartMetric]);
    const backgroundColors = data.map((value) =>
      value > 0 ? 'rgba(0, 200, 83, 0.6)' : value < 0 ? 'rgba(255, 38, 56, 0.6)' : 'rgba(150, 150, 150, 0.6)'
    );
    const borderColors = data.map((value) =>
      value > 0 ? '#00C853' : value < 0 ? '#FF2638' : '#969696'
    );

    const ctx = profitChartRef.current.getContext('2d');
    profitChartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Resultado',
          data,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: {
        indexAxis: 'y', // Horizontal bar chart
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const asset = sortedAssets[context.dataIndex];
                if (!asset) return '';
                const metricValue = asset[resultChartMetric];
                let labelText = `${asset.codigo}: `;

                if (resultChartMetric.includes('rentabilidade')) {
                  labelText += formatPercentage(metricValue);
                } else {
                  labelText += formatCurrency(metricValue);
                }

                // Add more details to tooltip based on resultChartMetric
                if (resultChartMetric === 'resultadoTotal') {
                  return [
                    `${asset.codigo}`,
                    `Resultado da posição: ${formatCurrency(asset.resultadoNaoRealizado)}`,
                    `Resultado realizado: ${formatCurrency(asset.resultadoRealizado)}`,
                    `Proventos: ${formatCurrency(asset.proventosRecebidos)}`,
                    `Resultado total: ${formatCurrency(asset.resultadoTotal)}`,
                    `Rentabilidade total: ${formatPercentage(asset.rentabilidadeTotal)}`,
                  ];
                }
                return labelText;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: 'var(--text-secondary)' },
            grid: { color: 'var(--border)' },
          },
          y: {
            ticks: { color: 'var(--text-secondary)' },
            grid: { display: false },
          },
        },
      },
    });

    return () => profitChartInstance.current?.destroy();
  }, [portfolio, activeTab, resultChartMetric]);

  // Efeito para o Gráfico de Compras x Vendas
  const buySellChartRef = useRef(null);
  const buySellChartInstance = useRef(null);

  const buySellChartData = useMemo(() => {
    let startDate = null;
    let endDate = null;
    const today = new Date();

    switch (buySellPeriod) {
      case 'thisMonth':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'last3Months':
        startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'last6Months':
        startDate = new Date(today.getFullYear(), today.getMonth() - 5, 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'thisYear':
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        break;
      case 'custom':
        startDate = buySellStartDate ? new Date(buySellStartDate + 'T00:00:00') : null;
        endDate = buySellEndDate ? new Date(buySellEndDate + 'T23:59:59') : null;
        break;
      case 'all':
      default:
        break;
    }

    return buildBuySellComparison(movements, {
      startDate: startDate ? toIsoDate(startDate) : null,
      endDate: endDate ? toIsoDate(endDate) : null,
      grouping: buySellView,
      metric: buySellMetric,
    });
  }, [movements, buySellView, buySellMetric, buySellPeriod, buySellStartDate, buySellEndDate]);

  useEffect(() => {
    if (activeTab !== 'overview' || !buySellChartRef.current || buySellChartData.length === 0) {
      buySellChartInstance.current?.destroy();
      return;
    }

    buySellChartInstance.current?.destroy();

    const labels = buySellChartData.map(item => item.label || item.codigo);
    const purchases = buySellChartData.map(item => item.compras);
    const sales = buySellChartData.map(item => item.vendas);

    const ctx = buySellChartRef.current.getContext('2d');
    buySellChartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: buySellMetric === 'value' ? 'Compras (R$)' : 'Compras (Qtd)',
            data: purchases,
            backgroundColor: 'rgba(0, 159, 71, 0.7)', // Green for purchases
            borderColor: '#009F47',
            borderWidth: 1,
          },
          {
            label: buySellMetric === 'value' ? 'Vendas (R$)' : 'Vendas (Qtd)',
            data: sales,
            backgroundColor: 'rgba(217, 45, 58, 0.7)', // Red for sales
            borderColor: '#D92D3A',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: 'var(--text-secondary)' },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const item = buySellChartData[context.dataIndex];
                if (!item) return '';
                if (buySellView === 'asset') {
                  return [
                    `${item.codigo}`,
                    `Compras: ${buySellMetric === 'value' ? formatCurrency(item.compras) : item.quantidadeComprada}`,
                    `Vendas: ${buySellMetric === 'value' ? formatCurrency(item.vendas) : item.quantidadeVendida}`,
                    `Fluxo Líquido: ${formatCurrency(item.fluxoLiquido)}`,
                    `Taxas: ${formatCurrency(item.taxasCompra + item.taxasVenda)}`,
                  ];
                } else { // monthly view
                  return [
                    `Período: ${item.label}`,
                    `Compras: ${buySellMetric === 'value' ? formatCurrency(item.compras) : item.quantidadeComprada}`,
                    `Vendas: ${buySellMetric === 'value' ? formatCurrency(item.vendas) : item.quantidadeVendida}`,
                    `Fluxo Líquido: ${formatCurrency(item.fluxoLiquido)}`,
                    `Taxas: ${formatCurrency(item.taxasCompra + item.taxasVenda)}`,
                  ];
                }
              },
            },
          },
        },
        scales: {
          x: { ticks: { color: 'var(--text-secondary)' }, grid: { color: 'var(--border)' } },
          y: { ticks: { color: 'var(--text-secondary)' }, grid: { color: 'var(--border)' } },
        },
      },
    });

    return () => buySellChartInstance.current?.destroy();
  }, [buySellChartData, activeTab, buySellView, buySellMetric]);

  const validateMovement = () => {
    const errors = {};
    if (!movementForm.ativo.trim()) errors.ativo = 'Código do ativo é obrigatório.';
    if (!movementForm.data) errors.data = 'Data é obrigatória.';
    if (!movementForm.quantidade || Number(movementForm.quantidade) <= 0) errors.quantidade = 'Quantidade deve ser maior que zero.';
    if (['Compra', 'Venda'].includes(movementForm.tipoMovimentacao) && (!movementForm.precoUnitario || Number(movementForm.precoUnitario) <= 0)) {
      errors.precoUnitario = 'Preço unitário deve ser maior que zero para compra e venda.';
    }
    if (Number(movementForm.taxas) < 0) errors.taxas = 'Taxas não podem ser negativas.';

    const codigoInformado = normalizeAssetSymbol(movementForm.ativo);
    const movementsForValidation = editingMovementId
      ? movements.filter((item) => item.id !== editingMovementId)
      : movements;
    const portfolioForValidation = consolidarCarteira(movementsForValidation, quotes, provents);

    const assetForValidation = portfolioForValidation.find(
      (item) => normalizeAssetSymbol(item.codigo) === codigoInformado
    );

    const quantidadeDisponivel = Number(assetForValidation?.quantidadeAtual) || 0;
    const quantidadeSolicitada = Number(movementForm.quantidade) || 0;

    if (movementForm.tipoMovimentacao === 'Venda') {
      if (quantidadeSolicitada > quantidadeDisponivel) {
        errors.quantidade = `Venda não permitida. Quantidade solicitada: ${quantidadeSolicitada}. Quantidade disponível: ${quantidadeDisponivel.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}.`;
      }
    }
    setMovementErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateProvento = () => {
    const errors = {};
    if (!proventoForm.ativo.trim()) errors.ativo = 'Ativo é obrigatório.';
    if (!proventoForm.dataPagamento) errors.dataPagamento = 'Data de pagamento é obrigatória.';
    if (!proventoForm.valorPorUnidade || Number(proventoForm.valorPorUnidade) <= 0) errors.valorPorUnidade = 'Valor por unidade deve ser maior que zero.';
    if (!proventoForm.quantidadeReferencia || Number(proventoForm.quantidadeReferencia) <= 0) errors.quantidadeReferencia = 'Quantidade de referência deve ser maior que zero.';
    if (Number(proventoForm.valorTotal) < 0) errors.valorTotal = 'Valor total deve ser um número válido.';
    setProventoErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateQuote = () => {
    const errors = {};
    if (!quoteForm.ativo.trim()) errors.ativo = 'Ativo é obrigatório.';
    if (!quoteForm.cotacao || Number(quoteForm.cotacao) <= 0) errors.cotacao = 'Cotação deve ser maior que zero.';
    if (!quoteForm.data) errors.data = 'Data é obrigatória.';
    setQuoteErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveMovement = async (e) => {
    e.preventDefault();
    if (!validateMovement()) return;
    try {
      const payload = {
        ...movementForm,
        ativo: normalizeAssetSymbol(movementForm.ativo),
        quantidade: Number(movementForm.quantidade),
        precoUnitario: Number(movementForm.precoUnitario) || 0,
        taxas: Number(movementForm.taxas) || 0,
        userId: user.uid,
        updatedAt: new Date().toISOString(),
      };
      if (editingMovementId) {
        await updateDoc(doc(db, 'investimentos_movimentacoes', editingMovementId), payload);
        notify('Movimentação de investimento atualizada.', 'success');
      } else {
        await addDoc(collection(db, 'investimentos_movimentacoes'), { ...payload, createdAt: new Date().toISOString() });
        notify('Movimentação de investimento registrada.', 'success');
      }
      resetForms();
      fetchFullData(user.uid);
      setActiveTab('movimentacoes');
    } catch (error) {
      console.error('Erro ao salvar movimentação:', error);
      notify('Não foi possível salvar a movimentação.', 'danger');
    }
  };

  const saveProvento = async (e) => {
    e.preventDefault();
    if (!validateProvento()) return;
    try {
      const payload = {
        ...proventoForm,
        ativo: normalizeAssetSymbol(proventoForm.ativo),
        valorPorUnidade: Number(proventoForm.valorPorUnidade),
        quantidadeReferencia: Number(proventoForm.quantidadeReferencia),
        valorTotal: Number(proventoForm.valorTotal),
        userId: user.uid,
        updatedAt: new Date().toISOString(),
      };
      if (editingProventoId) {
        await updateDoc(doc(db, 'investimentos_proventos', editingProventoId), payload);
        notify('Provento atualizado com sucesso.', 'success');
      } else {
        await addDoc(collection(db, 'investimentos_proventos'), { ...payload, createdAt: new Date().toISOString() });
        notify('Provento registrado com sucesso.', 'success');
      }
      resetForms();
      await fetchFullData(user.uid);
      setActiveTab('carteira');
    } catch (error) {
      console.error('Erro ao salvar provento:', error);
      notify('Não foi possível salvar o provento.', 'danger');
    }
  };

  const saveQuote = async (e) => {
    e.preventDefault();
    if (!validateQuote()) return;
    try {
      const payload = {
        ...quoteForm,
        ativo: normalizeAssetSymbol(quoteForm.ativo),
        cotacao: Number(quoteForm.cotacao),
        userId: user.uid,
        updatedAt: new Date().toISOString(),
      };
      if (editingQuoteId) {
        await updateDoc(doc(db, 'investimentos_cotacoes', editingQuoteId), payload);
        notify('Cotação atualizada com sucesso.', 'success');
      } else {
        await addDoc(collection(db, 'investimentos_cotacoes'), { ...payload, createdAt: new Date().toISOString() });
        notify('Cotação registrada com sucesso.', 'success');
      }
      resetForms();
      await fetchFullData(user.uid);
      setActiveTab('carteira');
    } catch (error) {
      console.error('Erro ao salvar cotação:', error);
      notify('Não foi possível salvar a cotação.', 'danger');
    }
  };

  const editMovement = (item) => {
    setEditingMovementId(item.id); // Use item.id from the raw movement
    setMovementForm({
      tipoAtivo: item.tipoAtivo || 'Ação',
      ativo: item.codigo,
      nomeAtivo: item.nomeAtivo || '',
      tipoMovimentacao: item.tipoMovimentacao,
      data: item.data || toIsoDate(new Date()),
      quantidade: String(item.quantidade || ''),
      precoUnitario: String(item.precoUnitario || ''),
      taxas: String(item.taxas || '0'),
      corretora: item.corretora || '',
      observacao: item.observacao || '',
    });
    setActiveTab('movimentacoes');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const editProvento = (item) => {
    setEditingProventoId(item.id); // Use item.id from the raw provent
    setProventoForm({ // Use item.codigo and item.nome from consolidated asset
      ativo: item.ativo,
      tipoProvento: item.tipoProvento || 'Dividendo',
      dataPagamento: item.dataPagamento || toIsoDate(new Date()),
      valorPorUnidade: String(item.valorPorUnidade || ''),
      quantidadeReferencia: String(item.quantidadeReferencia || ''),
      valorTotal: String(item.valorTotal || ''),
      observacao: item.observacao || '',
      manualValorTotal: true,
    });
    setActiveTab('proventos');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const editQuote = (item) => {
    setEditingQuoteId(item.id); // Use item.id from the raw quote
    setQuoteForm({ // Use item.codigo from consolidated asset
      ativo: item.ativo,
      cotacao: String(item.cotacao || ''),
      data: item.data || toIsoDate(new Date()),
      horario: item.horario || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      fonte: item.fonte || '',
      observacao: item.observacao || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeMovement = async (item) => {
    const confirmed = await confirm({
      title: 'Excluir Movimentação',
      message: 'Deseja excluir esta movimentação de investimentos?',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
    });
    if (!confirmed) return;
    await deleteDoc(doc(db, 'investimentos_movimentacoes', item.id));
    fetchFullData(user.uid);
  };

  const removeProvento = async (item) => {
    const confirmed = await confirm({
      title: 'Excluir Provento',
      message: 'Deseja excluir este registro de provento?',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
    });
    if (!confirmed) return;
    await deleteDoc(doc(db, 'investimentos_proventos', item.id));
    fetchFullData(user.uid);
  };

  const removeQuote = async (item) => {
    const confirmed = await confirm({
      title: 'Excluir Cotação',
      message: 'Deseja excluir esta cotação manual?',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
    });
    if (!confirmed) return;
    await deleteDoc(doc(db, 'investimentos_cotacoes', item.id));
    fetchFullData(user.uid);
  };

  const assetActions = (item) => {
    return (
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setSelectedAsset(item)} className="px-3 py-2 rounded-2xl bg-surface-elevated text-text-primary text-xs font-semibold">Detalhes</button>
        <button type="button" onClick={() => {
          setMovementForm({
            ...movementForm,
            tipoAtivo: item.tipoAtivo || 'Ação',
            ativo: item.codigo,
            nomeAtivo: item.nome || '',
            tipoMovimentacao: 'Compra',
            precoUnitario: '',
            quantidade: '',
          });
          setActiveTab('movimentacoes');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }} className="px-3 py-2 rounded-2xl bg-green-600/10 text-green-400 text-xs font-semibold">Registrar compra</button>
        <button type="button" onClick={() => {
          setMovementForm({
            ...movementForm,
            tipoAtivo: item.tipoAtivo || 'Ação',
            ativo: item.codigo,
            nomeAtivo: item.nome || '',
            tipoMovimentacao: 'Venda',
            precoUnitario: '',
            quantidade: '',
          });
          setActiveTab('movimentacoes');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }} className="px-3 py-2 rounded-2xl bg-red-600/10 text-red-400 text-xs font-semibold">Registrar venda</button>
        <button type="button" onClick={() => {
          setProventoForm({
            ...proventoForm,
            ativo: item.codigo,
            tipoProvento: 'Dividendo',
            dataPagamento: toIsoDate(new Date()),
            valorPorUnidade: '',
            quantidadeReferencia: '',
            valorTotal: '',
            manualValorTotal: false,
          });
          setActiveTab('proventos');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }} className="px-3 py-2 rounded-2xl bg-indigo-600/10 text-indigo-400 text-xs font-semibold">Registrar provento</button>
      </div>
    );
  };

  // Filter states for each tab
  const [portfolioFilters, setPortfolioFilters] = useState({
    search: '',
    type: 'all',
    status: 'all', // 'all' | 'open' | 'closed'
    resultStatus: 'all', // 'all' | 'profit' | 'loss' | 'neutral'
    quoteStatus: 'all', // 'all' | 'hasQuote' | 'noQuote'
    sortBy: 'codigo', // 'codigo' | 'valorAtualDesc' | 'valorAtualAsc' | 'participacaoDesc' | 'resultadoDesc' | 'resultadoAsc' | 'rentabilidadeDesc' | 'rentabilidadeAsc' | 'quantidadeDesc'
  });

  const [movementFilters, setMovementFilters] = useState({
    search: '', // for asset code
    type: 'all', // for asset type
    movementType: 'all',
    broker: 'all',
    minAmount: '',
    maxAmount: '',
    sortBy: 'recent', // 'recent' | 'oldest' | 'valueDesc' | 'valueAsc' | 'codeAsc' | 'codeDesc' | 'qtyDesc' | 'qtyAsc'
  });

  const [proventFilters, setProventFilters] = useState({
    search: '', // for asset code
    type: 'all', // for provent type
    minAmount: '',
    maxAmount: '',
    sortBy: 'recent', // 'recent' | 'oldest' | 'valueDesc' | 'valueAsc' | 'codeAsc' | 'codeDesc' | 'qtyDesc'
  });

  // Memoized filtered data for each tab
  const filteredPortfolio = useMemo(() => {
    let filtered = [...portfolio];

    if (portfolioFilters.search) {
      const searchTerm = normalizeAssetSymbol(portfolioFilters.search);
      filtered = filtered.filter(item =>
        normalizeAssetSymbol(item.codigo).includes(searchTerm) ||
        normalizeAssetSymbol(item.nome).includes(searchTerm)
      );
    }
    if (portfolioFilters.type !== 'all') {
      filtered = filtered.filter(item => item.tipoAtivo === portfolioFilters.type);
    }
    if (portfolioFilters.status === 'open') {
      filtered = filtered.filter(item => item.quantidadeAtual > 0);
    } else if (portfolioFilters.status === 'closed') {
      filtered = filtered.filter(item => item.quantidadeAtual === 0 && item.quantidadeComprada > 0);
    }
    if (portfolioFilters.resultStatus === 'profit') {
      filtered = filtered.filter(item => item.resultadoTotal > 0);
    } else if (portfolioFilters.resultStatus === 'loss') {
      filtered = filtered.filter(item => item.resultadoTotal < 0);
    } else if (portfolioFilters.resultStatus === 'neutral') {
      filtered = filtered.filter(item => item.resultadoTotal === 0);
    }
    if (portfolioFilters.quoteStatus === 'hasQuote') {
      filtered = filtered.filter(item => item.cotacaoAtual > 0);
    } else if (portfolioFilters.quoteStatus === 'noQuote') {
      filtered = filtered.filter(item => item.cotacaoAtual === 0);
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (portfolioFilters.sortBy) {
        case 'valorAtualDesc': return b.valorAtual - a.valorAtual;
        case 'valorAtualAsc': return a.valorAtual - b.valorAtual;
        case 'participacaoDesc': return b.participacao - a.participacao;
        case 'resultadoDesc': return b.resultadoTotal - a.resultadoTotal;
        case 'resultadoAsc': return a.resultadoTotal - b.resultadoTotal;
        case 'rentabilidadeDesc': return b.rentabilidadeTotal - a.rentabilidadeTotal;
        case 'rentabilidadeAsc': return a.rentabilidadeTotal - b.rentabilidadeTotal;
        case 'quantidadeDesc': return b.quantidadeAtual - a.quantidadeAtual;
        case 'quantidadeAsc': return a.quantidadeAtual - b.quantidadeAtual;
        case 'codigo': return a.codigo.localeCompare(b.codigo);
        default: return 0;
      }
    });

    return filtered;
  }, [portfolio, portfolioFilters]);

  const filteredMovements = useMemo(() => {
    let filtered = [...movements].filter(mov => {
      // Date filter
      if (dataDe || dataAte) {
        const movDate = new Date(mov.data + 'T00:00:00');
        const startDate = dataDe ? new Date(dataDe + 'T00:00:00') : null;
        const endDate = dataAte ? new Date(dataAte + 'T23:59:59') : null;
        if (startDate && movDate < startDate) return false;
        if (endDate && movDate > endDate) return false;
      }
      return true;
    });

    if (movementFilters.search) {
      const searchTerm = normalizeAssetSymbol(movementFilters.search);
      filtered = filtered.filter(mov => normalizeAssetSymbol(mov.ativo).includes(searchTerm));
    }
    if (movementFilters.type !== 'all') {
      filtered = filtered.filter(mov => mov.tipoAtivo === movementFilters.type);
    }
    if (movementFilters.movementType !== 'all') {
      filtered = filtered.filter(mov => mov.tipoMovimentacao === movementFilters.movementType);
    }
    if (movementFilters.broker !== 'all') {
      filtered = filtered.filter(mov => mov.corretora === movementFilters.broker);
    }
    if (movementFilters.minAmount) {
      const min = Number(movementFilters.minAmount);
      if (!isNaN(min)) {
        filtered = filtered.filter(mov => getMovementFinalValue(mov) >= min);
      }
    }
    if (movementFilters.maxAmount) {
      const max = Number(movementFilters.maxAmount);
      if (!isNaN(max)) {
        filtered = filtered.filter(mov => getMovementFinalValue(mov) <= max);
      }
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (movementFilters.sortBy) {
        case 'oldest':
          return new Date(a.data) - new Date(b.data);
        case 'valueDesc':
          return getMovementFinalValue(b) - getMovementFinalValue(a);
        case 'valueAsc':
          return getMovementFinalValue(a) - getMovementFinalValue(b);
        case 'codeAsc':
          return a.ativo.localeCompare(b.ativo);
        case 'codeDesc':
          return b.ativo.localeCompare(a.ativo);
        case 'qtyDesc':
          return b.quantidade - a.quantidade;
        case 'qtyAsc':
          return a.quantidade - b.quantidade;
        case 'recent':
        default:
          return new Date(b.data) - new Date(a.data);
      }
    });

    return filtered;
  }, [movements, dataDe, dataAte, movementFilters]);

  const filteredProvents = useMemo(() => {
    let filtered = [...provents].filter(prov => {
      if (proventDataDe || proventDataAte) {
        const provDate = new Date(prov.dataPagamento + 'T00:00:00');
        const startDate = proventDataDe ? new Date(proventDataDe + 'T00:00:00') : null;
        const endDate = proventDataAte ? new Date(proventDataAte + 'T23:59:59') : null;
        if (startDate && provDate < startDate) return false;
        if (endDate && provDate > endDate) return false;
      }
      return true;
    });

    return filtered;
  }, [provents, proventDataDe, proventDataAte, proventFilters]);

  const filteredQuotes = useMemo(() => {
    // Basic implementation, can be expanded with filters later
    return [...quotes];
  }, [quotes]);

  // Summaries for filtered data
  const filteredPortfolioSummary = useMemo(() => {
    const assets = filteredPortfolio.length;
    const invested = filteredPortfolio.reduce((sum, item) => sum + Number(item.capitalInvestidoAtual || 0), 0);
    const currentValue = filteredPortfolio.reduce((sum, item) => sum + Number(item.valorAtual || 0), 0);
    const totalResult = filteredPortfolio.reduce((sum, item) => sum + Number(item.resultadoTotal || 0), 0);
    return { assets, invested, currentValue, totalResult };
  }, [filteredPortfolio]);

  const filteredMovementSummary = useMemo(() => {
    const totalCompras = filteredMovements
      .filter(mov => normalizeMovementType(mov.tipoMovimentacao) === 'COMPRA')
      .reduce((sum, mov) => sum + getMovementFinalValue(mov), 0);
    const totalVendas = filteredMovements
      .filter(mov => normalizeMovementType(mov.tipoMovimentacao) === 'VENDA')
      .reduce((sum, mov) => sum + getMovementFinalValue(mov), 0);
    const totalTaxas = filteredMovements.reduce((sum, mov) => sum + Number(mov.taxas || 0), 0);
    const fluxoLiquido = totalVendas - totalCompras;
    return {
      count: filteredMovements.length,
      totalCompras,
      totalVendas,
      totalTaxas,
      fluxoLiquido,
    };
  }, [filteredMovements]);

  const filteredProventSummary = useMemo(() => {
    const total = filteredProvents.reduce((sum, item) => sum + Number(item.valorTotal || 0), 0);
    const assets = new Set(filteredProvents.map(item => normalizeAssetSymbol(item.ativo)));
    return {
      count: filteredProvents.length,
      total,
      average: filteredProvents.length > 0 ? total / filteredProvents.length : 0,
      assetCount: assets.size,
      highest: filteredProvents.reduce((highest, item) => Math.max(highest, Number(item.valorTotal || 0)), 0),
    };
  }, [filteredProvents]);

  const brokerOptions = useMemo(
    () => Array.from(
      new Set(
        movements
          .map(item => String(item.corretora || '').trim())
          .filter(Boolean)
      )
    ).sort(),
    [movements]
  );

  const overviewCards = [
    { label: 'Total investido', value: formatCurrency(summary.totalInvestido), color: 'text-sky-400', icon: '💼' },
    { label: 'Valor atual', value: formatCurrency(summary.valorAtual), color: 'text-blue-400', icon: '💰' },
    { label: 'Resultado da posição', value: formatCurrency(summary.resultadoNaoRealizado), color: summary.resultadoNaoRealizado >= 0 ? 'text-green-400' : 'text-red-400', icon: summary.resultadoNaoRealizado >= 0 ? '📊' : '📉' },
    { label: 'Rentabilidade da posição', value: formatPercentage(summary.rentabilidadePosicao), color: summary.rentabilidadePosicao >= 0 ? 'text-green-400' : 'text-red-400', icon: '⚡' },
    { label: 'Proventos recebidos', value: formatCurrency(summary.proventosRecebidos), color: 'text-violet-400', icon: '🟣' },
    { label: 'Resultado Total', value: formatCurrency(summary.resultadoTotal), color: summary.resultadoTotal >= 0 ? 'text-green-400' : 'text-red-400', icon: summary.resultadoTotal >= 0 ? '✅' : '❌' },
    { label: 'Rentabilidade Total', value: formatPercentage(summary.rentabilidadeTotal), color: summary.rentabilidadeTotal >= 0 ? 'text-green-400' : 'text-red-400', icon: '🚀' },
    { label: 'Aportes no mês', value: formatCurrency(summary.aportesNoMes), color: 'text-cyan-400', icon: '💧' },
  ];

  const profitAssets = portfolio.filter((item) => item.resultadoNaoRealizado >= 0);
  const lossAssets = portfolio.filter((item) => item.resultadoNaoRealizado < 0);
  const missingQuoteAssets = portfolio.filter((item) => item.cotacaoAtual === 0 && item.quantidadeAtual > 0);
  const movementAssets = useMemo(() => Array.from(new Set(movements.filter((mov) => mov.ativo).map((mov) => normalizeAssetSymbol(mov.ativo)))), [movements]);

  // Reusable variables for available quantity display
  const codigoMovimentacao = normalizeAssetSymbol(movementForm.ativo);
  const ativoDisponivel = portfolio.find(
    (item) => normalizeAssetSymbol(item.codigo) === codigoMovimentacao
  );
  const quantidadeDisponivelVenda = Number(ativoDisponivel?.quantidadeAtual) || 0;
  const showAvailableQuantity =
    movementForm.tipoMovimentacao === 'Venda' &&
    codigoMovimentacao &&
    (ativoDisponivel || quantidadeDisponivelVenda === 0);
    
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="border-l-4 border-blue-500 pl-4">
        <h2 className="text-white font-bold text-2xl">Investimentos</h2>
        <p className="text-gray-400 text-sm">Acompanhe sua carteira e suas movimentações.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-3xl border px-4 py-3 text-left text-sm font-semibold transition ${activeTab === tab.id ? 'border-primary bg-primary/10 text-white' : 'border-border bg-background-secondary text-text-secondary hover:border-white/20 hover:bg-surface'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="rounded-3xl border border-border bg-background-secondary p-4 text-sm text-text-secondary">
        <p>{tabDescriptions[activeTab]}</p>
      </div>

      {activeTab === 'overview' && (
        <section className="space-y-6">
          {/* Linha 1: Indicadores Principais */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {overviewCards.map((card) => (
              <div key={card.label} className="bg-surface border border-border rounded-3xl p-4 shadow-lg">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">{card.label}</p>
                <p className={`mt-2 text-2xl font-bold ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Linha 1.5: Resumos dos Filtros */}
          <div className="bg-surface border border-border rounded-3xl p-6 shadow-lg">
            <h3 className="text-base font-bold text-text-primary">Resumo Dinâmico</h3>
            <p className="text-sm text-text-muted mb-4">
              Estes cards refletem os totais baseados nos filtros aplicados em cada aba (Carteira, Movimentações e Proventos).
            </p>

            {/* Resumo da Carteira */}
            <div className="mt-4">
              <h4 className="text-sm font-bold text-text-primary mb-3">Filtro da Carteira</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-surface-elevated border border-border rounded-2xl p-3">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Ativos</p>
                  <p className="mt-1 text-xl font-bold text-text-primary">{filteredPortfolioSummary.assets}</p>
                </div>
                <div className="bg-surface-elevated border border-border rounded-2xl p-3">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Capital investido</p>
                  <p className="mt-1 text-xl font-bold text-text-primary">{formatCurrency(filteredPortfolioSummary.invested)}</p>
                </div>
                <div className="bg-surface-elevated border border-border rounded-2xl p-3">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Valor atual</p>
                  <p className="mt-1 text-xl font-bold text-text-primary">{formatCurrency(filteredPortfolioSummary.currentValue)}</p>
                </div>
                <div className="bg-surface-elevated border border-border rounded-2xl p-3">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Resultado total</p>
                  <p className={`mt-1 text-xl font-bold ${filteredPortfolioSummary.totalResult >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(filteredPortfolioSummary.totalResult)}</p>
                </div>
              </div>
            </div>

            {/* Resumo de Movimentações */}
            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="text-sm font-bold text-text-primary mb-3">Filtro de Movimentações</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-surface-elevated border border-border rounded-2xl p-3">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Registros</p>
                  <p className="mt-1 text-xl font-bold text-text-primary">{filteredMovementSummary.count}</p>
                </div>
                <div className="bg-surface-elevated border border-border rounded-2xl p-3">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Total compras</p>
                  <p className="mt-1 text-xl font-bold text-text-primary">{formatCurrency(filteredMovementSummary.totalCompras)}</p>
                </div>
                <div className="bg-surface-elevated border border-border rounded-2xl p-3">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Total vendas</p>
                  <p className="mt-1 text-xl font-bold text-text-primary">{formatCurrency(filteredMovementSummary.totalVendas)}</p>
                </div>
                <div className="bg-surface-elevated border border-border rounded-2xl p-3">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Fluxo líquido</p>
                  <p className={`mt-1 text-xl font-bold ${filteredMovementSummary.fluxoLiquido >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(filteredMovementSummary.fluxoLiquido)}</p>
                </div>
              </div>
            </div>

            {/* Resumo de Proventos */}
            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="text-sm font-bold text-text-primary mb-3">Filtro de Proventos</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-surface-elevated border border-border rounded-2xl p-3">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Registros</p>
                  <p className="mt-1 text-xl font-bold text-text-primary">{filteredProventSummary.count}</p>
                </div>
                <div className="bg-surface-elevated border border-border rounded-2xl p-3">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Total recebido</p>
                  <p className="mt-1 text-xl font-bold text-text-primary">{formatCurrency(filteredProventSummary.total)}</p>
                </div>
                <div className="bg-surface-elevated border border-border rounded-2xl p-3">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Média / pagto</p>
                  <p className="mt-1 text-xl font-bold text-text-primary">{formatCurrency(filteredProventSummary.average)}</p>
                </div>
                <div className="bg-surface-elevated border border-border rounded-2xl p-3">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Ativos pagadores</p>
                  <p className="mt-1 text-xl font-bold text-text-primary">{filteredProventSummary.assetCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Linha 2: Gráficos de Distribuição e Desempenho */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card do Gráfico de Rosca */}
            <div className="bg-surface border border-border rounded-3xl p-6 shadow-lg">
              <h3 className="text-base font-bold text-text-primary">Distribuição da Carteira</h3>
              <p className="text-sm text-text-muted">Participação de cada ativo no valor total.</p>
              {portfolio.length > 0 ? (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="relative h-64">
                    <canvas ref={distributionChartRef}></canvas>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                      <span className="text-xs text-text-muted">Valor Total</span>
                      <span className="text-2xl font-bold text-text-primary">{formatCurrency(summary.valorAtual)}</span>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto custom-scrollbar pr-2">
                    <ul className="space-y-2">
                      {portfolio.map((item, index) => (
                        <li key={item.codigo} className="flex items-center gap-3 text-sm">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: distributionChartInstance.current?.data.datasets[0].backgroundColor[index] || '#ccc' }}></span>
                          <span className="font-semibold text-text-primary flex-1">{item.ativo}</span>
                          <span className="text-text-secondary">{item.participacao.toFixed(1)}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-text-muted">Cadastre movimentações para ver a distribuição.</div>
              )}
            </div>

            {/* Card do Gráfico de Resultado por Ativo */}
            <div className="bg-surface border border-border rounded-3xl p-6 shadow-lg">
              <h3 className="text-base font-bold text-text-primary">Resultado por Ativo</h3>
              <p className="text-sm text-text-muted mb-4">Lucro ou prejuízo de cada ativo na carteira.</p>
              <div className="flex flex-wrap gap-2 mb-4">
                <select
                  value={resultChartMetric}
                  onChange={(e) => setResultChartMetric(e.target.value)}
                  className="rounded-2xl border border-border bg-background-secondary px-3 py-2 text-xs text-text-primary outline-none transition"
                >
                  <option value="resultadoTotal">Resultado Total</option>
                  <option value="resultadoNaoRealizado">Resultado da Posição</option>
                  <option value="resultadoRealizado">Resultado Realizado</option>
                  <option value="proventosRecebidos">Proventos Recebidos</option>
                  <option value="rentabilidadeTotal">Rentabilidade Total</option>
                </select>
              </div>
              {portfolio.length > 0 ? (
                <div className="h-64">
                    <canvas ref={profitChartRef}></canvas>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-text-muted">Sem ativos para exibir resultados.</div>
              )}
            </div>
          </div>

          {/* Linha 3: Cotações Manuais */}
          <div className="bg-surface border border-border rounded-3xl p-6 shadow-lg">
            <h3 className="text-base font-bold text-text-primary">Cotações Manuais</h3>
            <p className="text-sm text-text-muted mb-4">Suas cotações mais recentes registradas no sistema.</p>
            {quotes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {quotes.slice(0, 6).map((quote) => (
                  <div key={quote.id} className="bg-surface-elevated border border-border p-4 rounded-2xl">
                    <p className="font-bold text-text-primary">{quote.ativo}</p>
                    <p className="text-lg font-semibold text-info">{formatCurrency(quote.cotacao)}</p>
                    <p className="text-xs text-text-muted">{new Date(quote.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-text-muted">Nenhuma cotação manual encontrada.</div>
            )}
          </div>

          {/* Linha 4: Dicas Rápidas (mantido para fins de contexto, mas será removido ou substituído) */}
          <div className="bg-surface border border-border rounded-3xl p-6 shadow-lg">
            <h3 className="text-base font-bold text-text-primary">Dicas Rápidas</h3>
            <p className="text-sm text-text-muted mb-4">Sugestões baseadas na sua carteira.</p>
            {tips.length > 0 ? (
              <div className="space-y-3">
                {tips.slice(0, 2).map(tip => (
                  <div key={tip.id} className="bg-primary/10 border border-primary/20 p-3 rounded-xl">
                    <p className="font-semibold text-sm text-primary">{tip.title}</p>
                    <p className="text-xs text-text-secondary mt-1">{tip.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-text-muted">Sem dicas disponíveis.</div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'carteira' && (
        <section className="space-y-6"> {/* Filters for Carteira */}
          <div className="bg-surface border border-border rounded-3xl p-5 shadow-lg">
            <h3 className="text-lg font-bold text-text-primary">Filtros da carteira</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="space-y-2 text-sm text-text-secondary">
                Buscar por código ou nome
                <input
                  type="text"
                  value={portfolioFilters.search}
                  onChange={(e) => setPortfolioFilters({ ...portfolioFilters, search: e.target.value })}
                  placeholder="Ex: PETR4 ou Petrobras"
                  className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition"
                />
              </label>
              <label className="space-y-2 text-sm text-text-secondary">
                Tipo de ativo
                <select
                  value={portfolioFilters.type}
                  onChange={(e) => setPortfolioFilters({ ...portfolioFilters, type: e.target.value })}
                  className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition"
                >
                  <option value="all">Todos</option>
                  {ASSET_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <label className="space-y-2 text-sm text-text-secondary">
                Status da posição
                <select
                  value={portfolioFilters.status}
                  onChange={(e) => setPortfolioFilters({ ...portfolioFilters, status: e.target.value })}
                  className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition"
                >
                  <option value="all">Todas</option>
                  <option value="open">Posições abertas</option>
                  <option value="closed">Posições encerradas</option>
                </select>
              </label>
              <label className="space-y-2 text-sm text-text-secondary">
                Situação do resultado
                <select
                  value={portfolioFilters.resultStatus}
                  onChange={(e) => setPortfolioFilters({ ...portfolioFilters, resultStatus: e.target.value })}
                  className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition"
                >
                  <option value="all">Todos</option>
                  <option value="profit">Com lucro</option>
                  <option value="loss">Com prejuízo</option>
                  <option value="neutral">Sem resultado</option>
                </select>
              </label>
              <label className="space-y-2 text-sm text-text-secondary">
                Situação da cotação
                <select
                  value={portfolioFilters.quoteStatus}
                  onChange={(e) => setPortfolioFilters({ ...portfolioFilters, quoteStatus: e.target.value })}
                  className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition"
                >
                  <option value="all">Todas</option>
                  <option value="hasQuote">Com cotação</option>
                  <option value="noQuote">Sem cotação</option>
                </select>
              </label>
              <label className="space-y-2 text-sm text-text-secondary">
                Ordenar por
                <select
                  value={portfolioFilters.sortBy}
                  onChange={(e) => setPortfolioFilters({ ...portfolioFilters, sortBy: e.target.value })}
                  className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition"
                >
                  <option value="codigo">Código</option>
                  <option value="valorAtualDesc">Maior valor atual</option>
                  <option value="valorAtualAsc">Menor valor atual</option>
                  <option value="participacaoDesc">Maior participação</option>
                  <option value="resultadoDesc">Maior resultado</option>
                  <option value="resultadoAsc">Menor resultado</option>
                  <option value="rentabilidadeDesc">Maior rentabilidade</option>
                  <option value="rentabilidadeAsc">Menor rentabilidade</option>
                  <option value="quantidadeDesc">Maior quantidade</option>
                  <option value="quantidadeAsc">Menor quantidade</option>
                </select>
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setPortfolioFilters({ search: '', type: 'all', status: 'all', resultStatus: 'all', quoteStatus: 'all', sortBy: 'codigo' })}
                className="rounded-2xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-text-primary hover:bg-surface-elevated"
              >
                Limpar filtros
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="bg-surface border border-border rounded-3xl p-4 shadow-lg space-y-4">
              {filteredPortfolio.length > 0 ? (
                filteredPortfolio.map((item) => (
                <div key={item.codigo} className="bg-surface-elevated border border-border rounded-2xl p-4 transition-all hover:border-primary/50">
                  {/* Header do Card */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border pb-3">
                    <div className="flex-1"> {/* Use item.codigo, item.nome, item.tipoAtivo */}
                      <h4 className="text-xl font-bold text-text-primary">{item.codigo || "Código não informado"}</h4>
                      <p className="text-sm text-text-secondary">{item.nome || "Nome não informado"}</p>
                      <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">{item.tipoAtivo || "Tipo não informado"}</p>
                    </div>
                    {/* Use item.participacao */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-text-primary">{item.participacao.toFixed(1)}%</span>
                      <p className="text-xs text-text-muted">da carteira</p>
                    </div>
                  </div>

                  {/* Grid de Métricas */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-xs text-text-muted">Qtd. Atual</p>
                      <p className="font-semibold text-text-primary">{item.quantidadeAtual.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-text-muted">Preço Médio</p>
                      <p className="font-semibold text-text-primary">{formatCurrency(item.precoMedio)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-text-muted">Cotação Atual</p>
                      <p className="font-semibold text-info">{item.cotacaoAtual > 0 ? formatCurrency(item.cotacaoAtual) : <span className="text-rose-400">Sem cotação</span>}</p>
                    </div>
                     <div className="space-y-1">
                      <p className="text-xs text-text-muted">Valor Atual</p>
                      <p className="font-semibold text-text-primary">{formatCurrency(item.valorAtual)}</p>
                    </div>
                    <div className="space-y-1 col-span-2 sm:col-span-1">
                      <p className="text-xs text-text-muted">Resultado</p>
                      <p className={`font-bold ${item.resultadoNaoRealizado >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(item.resultadoNaoRealizado)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-text-muted">Rentabilidade</p>
                      <p className={`font-bold ${item.rentabilidadePosicao >= 0 ? 'text-success' : 'text-danger'}`}>{formatPercentage(item.rentabilidadePosicao)}</p>
                    </div>
                     <div className="space-y-1">
                      <p className="text-xs text-text-muted">Resultado Total</p>
                      <p className={`font-bold ${item.resultadoTotal >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(item.resultadoTotal)}</p>
                    </div>
                     <div className="space-y-1">
                      <p className="text-xs text-text-muted">Rentabilidade Total</p>
                      <p className={`font-bold ${item.rentabilidadeTotal >= 0 ? 'text-success' : 'text-danger'}`}>{formatPercentage(item.rentabilidadeTotal)}</p>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="border-t border-border mt-4 pt-4">
                    {assetActions(item)}
                  </div>
                </div>))
              ) : (
                <div className="h-32 flex items-center justify-center text-text-muted">
                  Nenhum ativo encontrado com os filtros selecionados.
                </div>
              )}
            </div>
            <div className="space-y-4">
              {selectedAsset ? (
                <div className="bg-surface border border-border rounded-3xl p-5 shadow-lg">
                  <h3 className="text-lg font-bold text-text-primary">Detalhes do ativo</h3>
                  <div className="mt-4 space-y-3 text-sm text-text-secondary">
                    <p><strong>Ativo:</strong> {selectedAsset.codigo || "Não informado"}</p>
                    <p><strong>Nome:</strong> {selectedAsset.nome || "Não informado"}</p> {/* This was already correct */}
                    <p><strong>Tipo:</strong> {selectedAsset.tipoAtivo || 'N/A'}</p>
                    <p><strong>Quantidade:</strong> {selectedAsset.quantidadeAtual.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}</p>
                    <p><strong>Capital investido:</strong> {formatCurrency(selectedAsset.capitalInvestidoAtual)}</p> {/* This was already correct */}
                    <p><strong>Quantidade comprada:</strong> {selectedAsset.quantidadeComprada.toLocaleString('pt-BR')}</p>
                    <p><strong>Quantidade vendida:</strong> {selectedAsset.quantidadeVendida.toLocaleString('pt-BR')}</p> {/* This was already correct */}
                    <p><strong>Preço médio:</strong> {formatCurrency(selectedAsset.precoMedio)}</p>
                    <p><strong>Valor atual:</strong> {formatCurrency(selectedAsset.valorAtual)}</p>
                    <p><strong>Valor líquido recebido em vendas:</strong> {formatCurrency(selectedAsset.valorLiquidoVendido)}</p>
                    <p><strong>Resultado realizado:</strong> {formatCurrency(selectedAsset.resultadoRealizado)}</p>
                    <p><strong>Resultado da posição:</strong> {formatCurrency(selectedAsset.resultadoNaoRealizado)}</p>
                    <p><strong>Participação:</strong> {selectedAsset.participacao.toFixed(1)}%</p> {/* This was already correct */}
                    <p className="text-xs text-text-muted">Última cotação: {selectedAsset.dataUltimaCotacao || 'Não disponível'}</p>
                  </div> {/* End of details block */}
                  <div className="mt-6 bg-surface-elevated border border-border rounded-3xl p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Cotação manual</p>
                        <p className="mt-2 text-sm text-text-primary">Dados baseados nas cotações manuais registradas no sistema.</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-3 text-sm text-text-secondary">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="bg-surface border border-border rounded-2xl p-3">
                          <p className="text-[11px] uppercase tracking-[0.25em] text-text-muted">Preço manual atual</p>
                          <p className="mt-2 text-lg font-semibold text-text-primary">{formatCurrency(selectedAsset.cotacaoAtual)}</p> {/* Use cotacaoAtual from consolidated */}
                        </div>
                        <div className="bg-surface border border-border rounded-2xl p-3">
                          <p className="text-[11px] uppercase tracking-[0.25em] text-text-muted">Última atualização</p>
                          <p className="mt-2 text-sm text-text-primary">{selectedAsset.dataUltimaCotacao || 'Não disponível'} {selectedAsset.horarioUltimaCotacao || ''}</p> {/* This was already correct */}
                        </div>
                      </div>
                      <div className="bg-surface border border-border rounded-2xl p-3">
                        <p className="text-[11px] uppercase tracking-[0.25em] text-text-muted">Fonte</p>
                        <p className="mt-2 text-sm text-text-primary">Manual</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-surface border border-border rounded-3xl p-5 shadow-lg">
                  <h3 className="text-lg font-bold text-text-primary">Selecione um ativo</h3>
                  <p className="mt-3 text-sm text-text-secondary">Clique em "Detalhes" para visualizar informações específicas do ativo.</p>
                </div>
              )}
              <div className="bg-surface border border-border rounded-3xl p-5 shadow-lg">
                <h3 className="text-lg font-bold text-text-primary">Cotações</h3>
                <p className="mt-2 text-sm text-text-secondary">Sua cotação manual mais recente.</p>
                {quotes.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <div className="bg-surface-elevated border border-border rounded-3xl p-4">
                      <p className="text-sm text-text-secondary">Última cotação registrada</p>
                      <p className="mt-2 text-lg font-semibold text-text-primary">{quotes[0].ativo} — {formatCurrency(Number(quotes[0].cotacao))}</p>
                      <p className="text-xs text-text-muted">Atualizado em {quotes[0].data} às {quotes[0].horario}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="bg-surface border border-border rounded-3xl p-5 shadow-lg">
              <h3 className="text-lg font-bold text-text-primary">Últimas movimentações</h3>
              <p className="mt-2 text-sm text-text-secondary">Veja os registros recentes de compras, vendas e ajustes.</p>
              <div className="mt-5 space-y-3">
                {movements.slice(0, 5).map((item) => (
                  <div key={item.id} className="bg-surface-elevated border border-border rounded-3xl p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{item.ativo} • {item.tipoMovimentacao}</p>
                        <p className="text-xs text-text-secondary">{item.data}</p>
                      </div>
                      <p className="text-sm font-bold text-text-primary">{formatCurrency((item.quantidade || 0) * (item.precoUnitario || 0) + (item.taxas || 0))}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-surface border border-border rounded-3xl p-5 shadow-lg">
              <h3 className="text-lg font-bold text-text-primary">Últimos proventos</h3>
              <p className="mt-2 text-sm text-text-secondary">Registros recentes de dividendos e rendimentos.</p>
              <div className="mt-5 space-y-3">
                {provents.slice(0, 5).map((item) => (
                  <div key={item.id} className="bg-surface-elevated border border-border rounded-3xl p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{item.ativo} • {item.tipoProvento}</p>
                        <p className="text-xs text-text-secondary">{item.dataPagamento}</p>
                      </div>
                      <p className="text-sm font-bold text-violet-400">{formatCurrency(item.valorTotal)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'movimentacoes' && (
        <section className="space-y-6"> {/* Filters for Movimentações */}
          <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
            <div className="bg-surface border border-border rounded-3xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-white">Registrar movimentação</h3>
              <form onSubmit={saveMovement} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-text-secondary">
                    Tipo de ativo
                    <select value={movementForm.tipoAtivo} onChange={(e) => setMovementForm({ ...movementForm, tipoAtivo: e.target.value })} className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition">
                      {ASSET_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm text-text-secondary">
                    Tipo de movimentação
                    <select value={movementForm.tipoMovimentacao} onChange={(e) => setMovementForm({ ...movementForm, tipoMovimentacao: e.target.value })} className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition">
                      {MOVEMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-text-secondary">
                    Código do ativo <span className="text-red-500">*</span>
                    <input value={movementForm.ativo} onChange={(e) => setMovementForm({ ...movementForm, ativo: e.target.value.toUpperCase() })} placeholder="Ex: PETR4" className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition" />
                    {movementErrors.ativo && <span className="text-xs text-red-400">{movementErrors.ativo}</span>}
                  </label>
                  <label className="space-y-2 text-sm text-text-secondary">
                    Nome do ativo
                    <input value={movementForm.nomeAtivo} onChange={(e) => setMovementForm({ ...movementForm, nomeAtivo: e.target.value })} placeholder="Ex: Petrobras" className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition" />
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-text-secondary">
                    Data <span className="text-red-500">*</span>
                    <input type="date" value={movementForm.data} onChange={(e) => setMovementForm({ ...movementForm, data: e.target.value })} className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition" />
                    {movementErrors.data && <span className="text-xs text-red-400">{movementErrors.data}</span>}
                  </label>
                  <label className="space-y-2 text-sm text-text-secondary">
                    Quantidade <span className="text-red-500">*</span>
                    <input type="number" step="0.0001" min="0" value={movementForm.quantidade} onChange={(e) => setMovementForm({ ...movementForm, quantidade: e.target.value })} className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition" />
                    {movementErrors.quantidade && <span className="text-xs text-red-400">{movementErrors.quantidade}</span>}
                    {showAvailableQuantity && (
                      <p className="mt-2 text-xs text-text-secondary">
                        Quantidade disponível: {' '}
                        <strong>
                          {quantidadeDisponivelVenda.toLocaleString('pt-BR', {
                            maximumFractionDigits: 4,
                          })}
                        </strong>
                        {quantidadeDisponivelVenda === 0 && !ativoDisponivel && (
                          <span className="text-rose-400"> (Ativo não encontrado na carteira ou sem quantidade disponível)</span>
                        )}
                      </p>
                    )}

                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-text-secondary">
                    Preço unitário {movementForm.tipoMovimentacao === 'Compra' || movementForm.tipoMovimentacao === 'Venda' ? <span className="text-red-500">*</span> : ''}
                    <input type="number" step="0.01" min="0" value={movementForm.precoUnitario} onChange={(e) => setMovementForm({ ...movementForm, precoUnitario: e.target.value })} className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition" />
                    {movementErrors.precoUnitario && <span className="text-xs text-red-400">{movementErrors.precoUnitario}</span>}
                  </label>
                  <label className="space-y-2 text-sm text-text-secondary">
                    Taxas
                    <input type="number" step="0.01" min="0" value={movementForm.taxas} onChange={(e) => setMovementForm({ ...movementForm, taxas: e.target.value })} className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition" />
                    {movementErrors.taxas && <span className="text-xs text-red-400">{movementErrors.taxas}</span>}
                  </label>
                </div>
                <div className="text-sm text-text-secondary">
                  <label className="space-y-2 block">
                    Corretora
                    <input value={movementForm.corretora} onChange={(e) => setMovementForm({ ...movementForm, corretora: e.target.value })} className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition" />
                  </label>
                </div>
                <div className="text-sm text-text-secondary">
                  <label className="space-y-2 block">
                    Observação
                    <textarea value={movementForm.observacao} onChange={(e) => setMovementForm({ ...movementForm, observacao: e.target.value })} rows="3" className="w-full resize-none rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition" />
                  </label>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button type="button" onClick={resetForms} className="rounded-2xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-text-primary hover:bg-surface-elevated">Limpar</button>
                  <button type="submit" className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover">{editingMovementId ? 'Atualizar movimentação' : 'Registrar movimentação'}</button>
                </div>
              </form>
            </div>
            <div className="bg-surface border border-border rounded-3xl p-5 shadow-lg">
              <h3 className="text-lg font-bold text-text-primary">Filtros das movimentações</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
                <label className="space-y-2 text-sm text-text-secondary">
                  Data de
                  <input
                    type="date"
                    value={dataDe} onChange={(e) => setDataDe(e.target.value)}
                    className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition"
                  />
                </label>
                <label className="space-y-2 text-sm text-text-secondary">
                  Data até
                  <input
                    type="date"
                    value={dataAte} onChange={(e) => setDataAte(e.target.value)}
                    className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition" />
                </label>
                <label className="space-y-2 text-sm text-text-secondary">
                  Código do ativo
                  <input
                    type="text"
                    value={movementFilters.search}
                    onChange={(e) => setMovementFilters({ ...movementFilters, search: e.target.value })}
                    placeholder="Ex: PETR4"
                    className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition"
                  />
                </label>
                <label className="space-y-2 text-sm text-text-secondary">
                  Tipo de ativo
                  <select
                    value={movementFilters.type}
                    onChange={(e) => setMovementFilters({ ...movementFilters, type: e.target.value })}
                    className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition"
                  >
                    <option value="all">Todos</option>
                    {ASSET_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
                <label className="space-y-2 text-sm text-text-secondary">
                  Tipo de movimentação
                  <select
                    value={movementFilters.movementType}
                    onChange={(e) => setMovementFilters({ ...movementFilters, movementType: e.target.value })}
                    className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition"
                  >
                    <option value="all">Todos</option>
                    {MOVEMENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
                <label className="space-y-2 text-sm text-text-secondary">
                  Corretora
                  <select
                    value={movementFilters.broker}
                    onChange={(e) => setMovementFilters({ ...movementFilters, broker: e.target.value })}
                    className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition"
                  >
                    <option value="all">Todas</option>
                    {brokerOptions.map(broker => <option key={broker} value={broker}>{broker}</option>)}
                  </select>
                </label>
                <label className="space-y-2 text-sm text-text-secondary">
                  Valor mínimo
                  <input
                    type="number"
                    step="0.01"
                    value={movementFilters.minAmount}
                    onChange={(e) => setMovementFilters({ ...movementFilters, minAmount: e.target.value })}
                    className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition"
                  />
                </label>
                <label className="space-y-2 text-sm text-text-secondary">
                  Valor máximo
                  <input
                    type="number"
                    step="0.01"
                    value={movementFilters.maxAmount}
                    onChange={(e) => setMovementFilters({ ...movementFilters, maxAmount: e.target.value })}
                    className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition"
                  />
                </label>
                <label className="space-y-2 text-sm text-text-secondary">
                  Ordenar por
                  <select
                    value={movementFilters.sortBy}
                    onChange={(e) => setMovementFilters({ ...movementFilters, sortBy: e.target.value })}
                    className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition"
                  >
                    <option value="recent">Mais recentes</option>
                    <option value="oldest">Mais antigas</option>
                    <option value="valueDesc">Maior valor</option>
                    <option value="valueAsc">Menor valor</option>
                    <option value="codeAsc">Código A-Z</option>
                    <option value="codeDesc">Código Z-A</option>
                    <option value="qtyDesc">Maior quantidade</option>
                    <option value="qtyAsc">Menor quantidade</option>
                  </select>
                </label>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setMovementFilters({ search: '', type: 'all', movementType: 'all', broker: 'all', minAmount: '', maxAmount: '', sortBy: 'recent' })}
                  className="rounded-2xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-text-primary hover:bg-surface-elevated"
                >
                  Limpar filtros
                </button>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-3xl shadow-lg overflow-x-auto">
            <h3 className="text-lg font-bold text-text-primary p-5">Histórico de movimentações</h3>
            {filteredMovements.length > 0 ? (
              <table className="min-w-full text-left text-sm text-text-secondary">
                <thead className="text-xs uppercase tracking-[0.2em] text-text-muted bg-table-header">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Ativo</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Quantidade</th>
                    <th className="px-4 py-3">Preço unitário</th>
                    <th className="px-4 py-3">Taxas</th>
                    <th className="px-4 py-3">Valor Líquido/Total</th>
                    <th className="px-4 py-3">Corretora</th>
                    <th className="px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">{
                  filteredMovements.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-4">{item.data}</td>
                      <td className="px-4 py-4 font-semibold text-white">{item.ativo}</td>
                      <td className="px-4 py-4">{item.tipoMovimentacao}</td>
                      <td className="px-4 py-4">{item.quantidade}</td>
                      <td className="px-4 py-4">{formatCurrency(item.precoUnitario)}</td>
                      <td className="px-4 py-4">{formatCurrency(item.taxas)}</td> {/* Display taxes */}
                      <td className="px-4 py-4">
                        {normalizeMovementType(item.tipoMovimentacao) === 'COMPRA'
                          ? formatCurrency((item.quantidade * item.precoUnitario) + item.taxas)
                          : formatCurrency((item.quantidade * item.precoUnitario) - item.taxas)}
                      </td>
                      <td className="px-4 py-4">{item.corretora || '—'}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => editMovement(item)} className="rounded-2xl bg-surface px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-text-primary hover:bg-surface-elevated">Editar</button>
                          <button onClick={() => removeMovement(item)} className="rounded-2xl bg-rose-600/10 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-rose-400 hover:bg-rose-600/20">Excluir</button>
                          <button onClick={() => {
                            setMovementForm({
                              tipoAtivo: item.tipoAtivo,
                              ativo: item.ativo,
                              nomeAtivo: item.nomeAtivo,
                              tipoMovimentacao: item.tipoMovimentacao,
                              data: item.data,
                              quantidade: String(item.quantidade),
                              precoUnitario: String(item.precoUnitario),
                              taxas: String(item.taxas),
                              corretora: item.corretora,
                              observacao: item.observacao,
                            });
                            setActiveTab('movimentacoes');
                          }} className="rounded-2xl bg-primary/10 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-primary hover:bg-primary/20">Duplicar</button>
                        </div>
                      </td>
                    </tr>
                  ))
                }</tbody>
              </table>
            ) : (
              <div className="p-5 text-text-muted">Nenhuma movimentação encontrada com os filtros selecionados.</div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'proventos' && (
        <section className="space-y-6"> {/* Filters for Proventos */}
          <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
            <div className="bg-surface border border-border rounded-3xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-text-primary">Registrar provento</h3>
              <form onSubmit={saveProvento} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-text-secondary">
                    Ativo <span className="text-red-500">*</span>
                    <input list="movement-assets" value={proventoForm.ativo} onChange={(e) => setProventoForm({ ...proventoForm, ativo: e.target.value.toUpperCase() })} placeholder="Ex: ITUB4" className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition" />
                    {proventoErrors.ativo && <span className="text-xs text-red-400">{proventoErrors.ativo}</span>}
                    <datalist id="movement-assets">
                      {movementAssets.map((ativo) => <option key={ativo} value={ativo} />)}
                    </datalist>
                  </label>
                  <label className="space-y-2 text-sm text-text-secondary">
                    Tipo do provento
                    <select value={proventoForm.tipoProvento} onChange={(e) => setProventoForm({ ...proventoForm, tipoProvento: e.target.value })} className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition">
                      {PROVENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-text-secondary">
                    Data de pagamento <span className="text-red-500">*</span>
                    <input type="date" value={proventoForm.dataPagamento} onChange={(e) => setProventoForm({ ...proventoForm, dataPagamento: e.target.value })} className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition" />
                    {proventoErrors.dataPagamento && <span className="text-xs text-red-400">{proventoErrors.dataPagamento}</span>}
                  </label>
                  <label className="space-y-2 text-sm text-text-secondary">
                    Valor por unidade <span className="text-red-500">*</span>
                    <input type="number" step="0.01" min="0" value={proventoForm.valorPorUnidade} onChange={(e) => setProventoForm({ ...proventoForm, valorPorUnidade: e.target.value })} className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition" />
                    {proventoErrors.valorPorUnidade && <span className="text-xs text-red-400">{proventoErrors.valorPorUnidade}</span>}
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-text-secondary">
                    Quantidade de referência <span className="text-red-500">*</span>
                    <input type="number" step="0.0001" min="0" value={proventoForm.quantidadeReferencia} onChange={(e) => setProventoForm({ ...proventoForm, quantidadeReferencia: e.target.value })} className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition" />
                    {proventoErrors.quantidadeReferencia && <span className="text-xs text-red-400">{proventoErrors.quantidadeReferencia}</span>}
                  </label>
                  <label className="space-y-2 text-sm text-text-secondary">
                    Valor total
                    <input type="number" step="0.01" min="0" value={proventoForm.valorTotal} readOnly={!proventoForm.manualValorTotal} onChange={(e) => setProventoForm({ ...proventoForm, valorTotal: e.target.value, manualValorTotal: true })} className={`w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition ${!proventoForm.manualValorTotal ? 'bg-surface-elevated cursor-not-allowed' : ''}`} />
                    {proventoErrors.valorTotal && <span className="text-xs text-red-400">{proventoErrors.valorTotal}</span>}
                  </label>
                </div>
                <div className="text-sm text-text-secondary">
                  <label className="space-y-2 flex items-center gap-2">
                    <input type="checkbox" checked={proventoForm.manualValorTotal} onChange={(e) => setProventoForm({ ...proventoForm, manualValorTotal: e.target.checked })} className="h-4 w-4 rounded border-border bg-background-secondary text-primary" />
                    Ajustar valor total manualmente
                  </label>
                </div>
                <div className="text-sm text-text-secondary">
                  <label className="space-y-2 block">
                    Observação
                    <textarea value={proventoForm.observacao} onChange={(e) => setProventoForm({ ...proventoForm, observacao: e.target.value })} rows="3" className="w-full resize-none rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition" />
                  </label>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button type="button" onClick={resetForms} className="rounded-2xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-text-primary hover:bg-surface-elevated">Limpar</button>
                  <button type="submit" className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover">{editingProventoId ? 'Atualizar provento' : 'Registrar provento'}</button>
                </div>
              </form>
            </div>
            <div className="bg-surface border border-border rounded-3xl p-5 shadow-lg">
              <h3 className="text-lg font-bold text-text-primary">Filtros dos proventos</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
                <label className="space-y-2 text-sm text-text-secondary">
                  Data de
                  <input
                    type="date"
                    value={proventDataDe} onChange={(e) => setProventDataDe(e.target.value)}
                    className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition"
                  />
                </label>
                <label className="space-y-2 text-sm text-text-secondary">
                  Data até
                  <input
                    type="date"
                    value={proventDataAte} onChange={(e) => setProventDataAte(e.target.value)}
                    className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition" />
                </label>
                <label className="space-y-2 text-sm text-text-secondary">
                  Código do ativo
                  <input
                    type="text"
                    value={proventFilters.search}
                    onChange={(e) => setProventFilters({ ...proventFilters, search: e.target.value })}
                    placeholder="Ex: ITUB4"
                    className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition"
                  />
                </label>
                <label className="space-y-2 text-sm text-text-secondary">
                  Tipo de provento
                  <select
                    value={proventFilters.type}
                    onChange={(e) => setProventFilters({ ...proventFilters, type: e.target.value })}
                    className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition"
                  >
                    <option value="all">Todos</option>
                    {PROVENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
                <label className="space-y-2 text-sm text-text-secondary">
                  Valor mínimo
                  <input
                    type="number"
                    step="0.01"
                    value={proventFilters.minAmount}
                    onChange={(e) => setProventFilters({ ...proventFilters, minAmount: e.target.value })}
                    className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition"
                  />
                </label>
                <label className="space-y-2 text-sm text-text-secondary">
                  Valor máximo
                  <input
                    type="number"
                    step="0.01"
                    value={proventFilters.maxAmount}
                    onChange={(e) => setProventFilters({ ...proventFilters, maxAmount: e.target.value })}
                    className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition"
                  />
                </label>
                <label className="space-y-2 text-sm text-text-secondary">
                  Ordenar por
                  <select
                    value={proventFilters.sortBy}
                    onChange={(e) => setProventFilters({ ...proventFilters, sortBy: e.target.value })}
                    className="w-full rounded-2xl border border-border bg-background-secondary px-4 py-3 text-text-primary outline-none transition"
                  >
                    <option value="recent">Mais recentes</option>
                    <option value="oldest">Mais antigos</option>
                    <option value="valueDesc">Maior valor total</option>
                    <option value="valueAsc">Menor valor total</option>
                    <option value="codeAsc">Código A-Z</option>
                    <option value="codeDesc">Código Z-A</option>
                    <option value="qtyDesc">Maior valor por unidade</option>
                    <option value="qtyAsc">Menor valor por unidade</option>
                  </select>
                </label>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setProventFilters({ search: '', type: 'all', minAmount: '', maxAmount: '', sortBy: 'recent' })}
                  className="rounded-2xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-text-primary hover:bg-surface-elevated"
                >
                  Limpar filtros
                </button>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-3xl shadow-lg overflow-x-auto">
            <h3 className="text-lg font-bold text-text-primary p-5">Histórico de proventos</h3>
            {filteredProvents.length > 0 ? (
              <table className="min-w-full text-left text-sm text-text-secondary mt-4">
                <thead className="text-xs uppercase tracking-[0.2em] text-text-muted bg-table-header">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Ativo</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Valor/un</th>
                    <th className="px-4 py-3">Quantidade</th>
                    <th className="px-4 py-3">Valor total</th>
                    <th className="px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredProvents.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-4">{item.dataPagamento}</td>
                      <td className="px-4 py-4 font-semibold text-white">{item.ativo}</td>
                      <td className="px-4 py-4">{item.tipoProvento}</td>
                      <td className="px-4 py-4">{formatCurrency(item.valorPorUnidade)}</td>
                      <td className="px-4 py-4">{item.quantidadeReferencia}</td>
                      <td className="px-4 py-4">{formatCurrency(item.valorTotal)}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => editProvento(item)} className="rounded-2xl bg-surface px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-text-primary hover:bg-surface-elevated">Editar</button>
                          <button onClick={() => removeProvento(item)} className="rounded-2xl bg-rose-600/10 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-rose-400 hover:bg-rose-600/20">Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-5 text-text-muted">Nenhum provento encontrado com os filtros selecionados.</div>
            )}
          </div>

          <div className="bg-surface border border-border rounded-3xl shadow-lg overflow-x-auto">
            <h3 className="text-lg font-bold text-text-primary p-5">Histórico de cotações</h3>
            {filteredQuotes.length > 0 ? (
              <table className="min-w-full text-left text-sm text-text-secondary mt-4">
                <thead className="text-xs uppercase tracking-[0.2em] text-text-muted bg-table-header">
                  <tr>
                    <th className="px-4 py-3">Ativo</th>
                    <th className="px-4 py-3">Cotação</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Horário</th>
                    <th className="px-4 py-3">Fonte</th>
                    <th className="px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredQuotes.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-4 font-semibold text-white">{item.ativo}</td>
                      <td className="px-4 py-4">{formatCurrency(item.cotacao)}</td>
                      <td className="px-4 py-4">{item.data}</td>
                      <td className="px-4 py-4">{item.horario}</td>
                      <td className="px-4 py-4">{item.fonte || 'Manual'}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => editQuote(item)} className="rounded-2xl bg-surface px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-text-primary hover:bg-surface-elevated">Editar</button>
                          <button onClick={() => removeQuote(item)} className="rounded-2xl bg-rose-600/10 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-rose-400 hover:bg-rose-600/20">Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-5 text-text-muted">Nenhuma cotação manual encontrada.</div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default Investimentos;
