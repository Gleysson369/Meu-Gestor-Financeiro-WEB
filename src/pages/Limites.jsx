import { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { collection, getDocs, query, where, doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useNotification } from '../components/NotificationProvider.jsx';
import { formatBRL } from '../utils/formatters.js';

const METODOS_ORCAMENTO = [
  { id: '503020', nome: 'Regra 50/30/20', resumo: '50% para necessidades, 30% para desejos e 20% para objetivos financeiros.' },
  { id: '8020', nome: 'Regra 80/20', resumo: 'Separe 20% da renda para poupança e investimentos; use os outros 80% nas despesas.' },
  { id: 'base-zero', nome: 'Orçamento Base Zero', resumo: 'Distribua toda a renda entre limites e objetivos, sem deixar valores sem destino.' },
  { id: 'pague-se-primeiro', nome: 'Pague-se Primeiro', resumo: 'Reserve uma porcentagem da renda assim que ela entrar e organize os gastos com o restante.' },
  { id: 'seis-caixas', nome: 'Método das 6 Caixas', resumo: 'Distribua a renda entre necessidades, independência, poupança, educação, lazer e doações.' },
  { id: 'envelopes', nome: 'Sistema de Envelopes', resumo: 'Defina um teto por categoria. Ao atingir o limite, novos gastos dessa categoria serão bloqueados.' },
];

const Limites = () => {
  const { notify, confirm } = useNotification();
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const anoAtual = new Date().getFullYear();

  const [user, setUser] = useState(null);
  const [periodo, setPeriodo] = useState(`${meses[new Date().getMonth()]} ${anoAtual}`);
  const [categorias, setCategorias] = useState([]);
  const [limitesCadastrados, setLimitesCadastrados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [rendaMensal, setRendaMensal] = useState(0);
  const [gastosPorCategoria, setGastosPorCategoria] = useState({});
  const [metodoOrcamento, setMetodoOrcamento] = useState('503020');
  const [percentualPagueSePrimeiro, setPercentualPagueSePrimeiro] = useState(20);

  const [formData, setFormData] = useState({
    categoria: '',
    valor: ''
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, "usuarios", user.uid));
      const partnerId = userDoc.data()?.parceiroId;
      const ids = partnerId ? [user.uid, partnerId] : [user.uid];

      // 1. Buscar Categorias de Despesa
      const qCats = query(
        collection(db, "categorias"), 
        where("userId", "in", ids), 
        where("tipo", "==", "despesa")
      );
      const catsSnap = await getDocs(qCats);
      const dbCats = catsSnap.docs.map(doc => doc.data().nome);
      const defaultCats = ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação', 'Entretenimento', 'Compras', 'Utilitários'];
      const allCats = [...new Set([...defaultCats, ...dbCats])].sort(); // Ordenar para melhor UX
      setCategorias(allCats);

      // 2. Buscar Definições de Limites (de ambos os usuários e combinar)
      let combinedLimitsMap = {};
      let ownLimitSettings = {};
      for (const id of ids) {
        const limiteDocRef = doc(db, "limites", id);
        const limiteSnap = await getDoc(limiteDocRef);
        if (limiteSnap.exists()) {
          const limitData = limiteSnap.data();
          const catLimits = limitData.categorias || {};
          if (id === user.uid) ownLimitSettings = limitData;
          Object.entries(catLimits).forEach(([cat, val]) => {
            combinedLimitsMap[cat] = (combinedLimitsMap[cat] || 0) + Number(val);
          });
        }
      }
      setMetodoOrcamento(METODOS_ORCAMENTO.some((metodo) => metodo.id === ownLimitSettings.metodoOrcamento) ? ownLimitSettings.metodoOrcamento : '503020');
      setPercentualPagueSePrimeiro(Number(ownLimitSettings.percentualPagueSePrimeiro) || 20);
      const limitsArray = Object.entries(combinedLimitsMap).map(([cat, val]) => ({ id: cat, categoria: cat, valor: val }));

      // 3. Buscar Gastos Reais do Período Selecionado
      const [mesNome, ano] = periodo.split(' ');
      const mesIndex = meses.indexOf(mesNome);
      const mesNum = String(mesIndex + 1).padStart(2, '0');
      const ultimoDia = new Date(ano, mesIndex + 1, 0).getDate();
      const dataInicio = `${ano}-${mesNum}-01`;
      const dataFim = `${ano}-${mesNum}-${ultimoDia}`;

      const qDespesas = query(
        collection(db, "despesas"),
        where("userId", "in", ids),
        where("data", ">=", dataInicio),
        where("data", "<=", dataFim)
      );
      const qReceitas = query(
        collection(db, "rendas"),
        where("userId", "in", ids),
        where("data", ">=", dataInicio),
        where("data", "<=", dataFim)
      );
      const [despesasSnap, receitasSnap] = await Promise.all([getDocs(qDespesas), getDocs(qReceitas)]);
      const gastosMap = {};
      despesasSnap.forEach(doc => {
        const d = doc.data();
        gastosMap[d.categoria] = (gastosMap[d.categoria] || 0) + Number(d.valor);
      });
      const totalRenda = receitasSnap.docs.reduce((total, receita) => total + Number(receita.data().valor || 0), 0);
      setRendaMensal(totalRenda);
      setGastosPorCategoria(gastosMap);

      // Unir dados para a tabela
      const mergedData = limitsArray.map(lim => ({
        ...lim,
        gastoReal: gastosMap[lim.categoria] || 0,
        diferenca: Number(lim.valor) - (gastosMap[lim.categoria] || 0),
        percentual: lim.valor > 0 ? Math.round(((gastosMap[lim.categoria] || 0) / lim.valor) * 100) : 0,
      }));

      setLimitesCadastrados(mergedData.sort((a, b) => b.percentual - a.percentual));

      // Gerar Alertas
      const novosAlertas = [];
      mergedData.forEach(item => {
        if (item.diferenca < 0) {
          novosAlertas.push({
            tipo: 'error',
            mensagem: `O limite da categoria ${item.categoria} foi ultrapassado em ${formatBRL(Math.abs(item.diferenca))}.`
          });
        } else if (item.percentual >= 100) {
          novosAlertas.push({
            tipo: 'warning',
            mensagem: `O limite da categoria ${item.categoria} foi atingido.`
          });
        } else if (item.percentual >= 80) {
          novosAlertas.push({
            tipo: 'warning',
            mensagem: `Você utilizou ${item.percentual}% do limite de ${item.categoria}.`
          });
        }
      });
      setAlertas(novosAlertas);

    } catch (error) {
      console.error("Erro ao carregar limites:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  // fetchData is invoked only when the selected account or period changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, periodo]);

  const handleMetodoChange = async (event) => {
    const metodo = event.target.value;
    setMetodoOrcamento(metodo);
    if (!user) return;

    try {
      await setDoc(doc(db, 'limites', user.uid), { metodoOrcamento: metodo, userId: user.uid }, { merge: true });
      notify('Método de orçamento atualizado.', 'success');
    } catch (error) {
      console.error('Erro ao salvar método de orçamento:', error);
      notify('Não foi possível salvar o método de orçamento.', 'danger');
    }
  };

  const salvarPercentualPagueSePrimeiro = async (value) => {
    const percentual = Math.min(40, Math.max(5, Number(value) || 20));
    setPercentualPagueSePrimeiro(percentual);
    if (!user) return;
    try {
      await setDoc(doc(db, 'limites', user.uid), { percentualPagueSePrimeiro: percentual, userId: user.uid }, { merge: true });
    } catch (error) {
      console.error('Erro ao salvar percentual de reserva:', error);
      notify('Não foi possível salvar o percentual.', 'danger');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const limiteDocRef = doc(db, "limites", user.uid);
      const limiteSnap = await getDoc(limiteDocRef);
      
      let currentCategorias = {};
      if (limiteSnap.exists()) {
        currentCategorias = limiteSnap.data().categorias || {};
      }

      // Atualiza o mapa de categorias (mesma lógica do limites_viewmodel.dart)
      const novosLimites = {
        ...currentCategorias,
        [formData.categoria]: parseFloat(formData.valor)
      };

      await setDoc(limiteDocRef, { categorias: novosLimites, userId: user.uid }, { merge: true });

      setEditingId(null);
      setFormData({ categoria: '', valor: '' });
      fetchData();
    } catch (error) {
      console.error("Erro ao salvar limite:", error);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({ categoria: item.categoria, valor: item.valor });
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Excluir Limite',
      message: 'Deseja excluir este limite?',
      confirmText: 'Excluir',
      cancelText: 'Cancelar'
    });

    if (!confirmed) return;

    try {
      const limiteDocRef = doc(db, "limites", user.uid);
      const limiteSnap = await getDoc(limiteDocRef);
      
      if (limiteSnap.exists()) {
        const currentCategorias = limiteSnap.data().categorias || {};
        delete currentCategorias[id]; // 'id' aqui é o nome da categoria
        
        await setDoc(limiteDocRef, { categorias: currentCategorias }, { merge: true });
        fetchData();
      }
    } catch (error) {
      console.error("Erro ao deletar limite:", error);
    }
  };

  const getProgressBarColor = (percentual) => {
    if (percentual >= 100) return 'bg-red-500';
    if (percentual >= 90) return 'bg-orange-500';
    if (percentual >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const totalLimites = limitesCadastrados.reduce((total, item) => total + Number(item.valor || 0), 0);
  const totalGastos = Object.values(gastosPorCategoria).reduce((total, valor) => total + Number(valor || 0), 0);
  const saldoDisponivel = totalLimites - totalGastos;
  const limitesUltrapassados = limitesCadastrados.filter((item) => item.diferenca < 0).length;
  const metodoAtual = METODOS_ORCAMENTO.find((metodo) => metodo.id === metodoOrcamento) || METODOS_ORCAMENTO[0];
  const normalizarCategoria = (categoria) => String(categoria || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const categoriasEssenciais = ['moradia', 'alimentacao', 'transporte', 'saude', 'educacao', 'utilitarios', 'agua', 'luz', 'energia'];
  const gastosNecessidades = Object.entries(gastosPorCategoria)
    .filter(([categoria]) => categoriasEssenciais.some((termo) => normalizarCategoria(categoria).includes(termo)))
    .reduce((total, [, valor]) => total + Number(valor || 0), 0);
  const gastosDesejos = Math.max(totalGastos - gastosNecessidades, 0);
  let alocacoesMetodo = [];

  if (metodoOrcamento === '503020') {
    alocacoesMetodo = [
      { nome: 'Necessidades', percentual: 50, valor: rendaMensal * 0.5, usado: gastosNecessidades },
      { nome: 'Desejos', percentual: 30, valor: rendaMensal * 0.3, usado: gastosDesejos },
      { nome: 'Objetivos financeiros', percentual: 20, valor: rendaMensal * 0.2, detalhe: 'Reserva, investimentos e dívidas' },
    ];
  } else if (metodoOrcamento === '8020') {
    alocacoesMetodo = [
      { nome: 'Despesas gerais', percentual: 80, valor: rendaMensal * 0.8, usado: totalGastos },
      { nome: 'Investimentos e reserva', percentual: 20, valor: rendaMensal * 0.2, detalhe: 'Separe assim que a renda entrar' },
    ];
  } else if (metodoOrcamento === 'pague-se-primeiro') {
    alocacoesMetodo = [
      { nome: 'Valor para separar primeiro', percentual: percentualPagueSePrimeiro, valor: rendaMensal * percentualPagueSePrimeiro / 100, detalhe: 'Sugestão para transferir assim que a renda entrar' },
      { nome: 'Saldo para despesas', percentual: 100 - percentualPagueSePrimeiro, valor: rendaMensal * (100 - percentualPagueSePrimeiro) / 100, usado: totalGastos },
    ];
  } else if (metodoOrcamento === 'seis-caixas') {
    alocacoesMetodo = [
      { nome: 'Necessidades', percentual: 55, valor: rendaMensal * 0.55 },
      { nome: 'Independência financeira', percentual: 10, valor: rendaMensal * 0.1 },
      { nome: 'Poupança de longo prazo', percentual: 10, valor: rendaMensal * 0.1 },
      { nome: 'Educação', percentual: 10, valor: rendaMensal * 0.1 },
      { nome: 'Lazer', percentual: 10, valor: rendaMensal * 0.1 },
      { nome: 'Doações', percentual: 5, valor: rendaMensal * 0.05 },
    ];
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header e Filtro de Período */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="border-l-4 border-orange-500 pl-4">
          <h2 className="page-title">Limites de Gastos</h2>
          <p className="page-subtitle">Acompanhe seus gastos e mantenha cada categoria dentro do planejado.</p>
        </div>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-text-secondary">
          Período de acompanhamento
          <select
          aria-label="Período de acompanhamento"
          value={periodo} 
          onChange={(e) => setPeriodo(e.target.value)}
          className="min-w-52 rounded-xl border border-input-border bg-input-background px-4 py-2.5 text-sm font-semibold text-text-primary outline-none transition focus:border-primary"
        >
          {meses.map(m => <option key={m} value={`${m} ${anoAtual}`}>{m} {anoAtual}</option>)}
        </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5 md:gap-4">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary md:text-xs">Entradas no período</p>
          <p className="mt-2 text-lg font-bold text-text-primary md:text-2xl">{formatBRL(rendaMensal)}</p>
          <p className="mt-1 text-xs text-text-muted">Base para organizar o orçamento</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary md:text-xs">Limites planejados</p>
          <p className="mt-2 text-lg font-bold text-text-primary md:text-2xl">{formatBRL(totalLimites)}</p>
          <p className="mt-1 text-xs text-text-muted">{limitesCadastrados.length} categorias</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary md:text-xs">Total gasto</p>
          <p className="mt-2 text-lg font-bold text-text-primary md:text-2xl">{formatBRL(totalGastos)}</p>
          <p className="mt-1 text-xs text-text-muted">No período selecionado</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary md:text-xs">Saldo dos limites</p>
          <p className="mt-2 text-lg font-bold text-text-primary md:text-2xl">{formatBRL(saldoDisponivel)}</p>
          <p className={`mt-1 text-xs font-semibold ${saldoDisponivel < 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>{saldoDisponivel < 0 ? 'Valor acima do planejado' : 'Ainda disponível'}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary md:text-xs">Limites excedidos</p>
          <p className="mt-2 text-lg font-bold text-text-primary md:text-2xl">{limitesUltrapassados}</p>
          <p className="mt-1 text-xs text-gray-500">Categorias acima da meta</p>
        </div>
      </div>

      <section className="space-y-5 rounded-3xl border border-border bg-surface p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-text-primary">Organize sua renda por método</h3>
            <p className="mt-1 max-w-2xl text-sm text-text-secondary">Escolha uma estratégia e veja uma sugestão calculada com as entradas do período.</p>
          </div>
          <label className="flex w-full flex-col gap-1.5 text-xs font-semibold text-text-secondary md:w-72">
            Método de orçamento
            <select value={metodoOrcamento} onChange={handleMetodoChange} className="rounded-xl border border-border bg-background-secondary px-4 py-3 text-sm font-semibold text-text-primary outline-none transition focus:border-orange-500">
              {METODOS_ORCAMENTO.map((metodo) => <option key={metodo.id} value={metodo.id}>{metodo.nome}</option>)}
            </select>
          </label>
        </div>

        <p className="rounded-xl bg-surface-elevated px-4 py-3 text-sm text-text-secondary">{metodoAtual.resumo}</p>

        {rendaMensal <= 0 && (
          <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
            Ainda não há entradas registradas neste período. Cadastre uma receita para calcular as sugestões do método.
          </p>
        )}

        {metodoOrcamento === 'pague-se-primeiro' && (
          <label className="flex flex-wrap items-center gap-3 text-sm font-medium text-text-secondary">
            Percentual para reservar primeiro
            <input type="number" min="5" max="40" value={percentualPagueSePrimeiro} onChange={(event) => setPercentualPagueSePrimeiro(event.target.value)} onBlur={(event) => salvarPercentualPagueSePrimeiro(event.target.value)} className="w-24 rounded-lg border border-border bg-background-secondary px-3 py-2 text-text-primary" />
            <span className="text-xs text-text-muted">Entre 5% e 40%. A configuração é salva automaticamente.</span>
          </label>
        )}

        {metodoOrcamento === 'base-zero' ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-surface-elevated p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Entradas do período</p>
              <p className="mt-2 text-xl font-bold text-text-primary">{formatBRL(rendaMensal)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface-elevated p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Limites distribuídos</p>
              <p className="mt-2 text-xl font-bold text-text-primary">{formatBRL(totalLimites)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface-elevated p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{rendaMensal - totalLimites >= 0 ? 'Ainda sem destino' : 'Acima das entradas'}</p>
              <p className="mt-2 text-xl font-bold text-text-primary">{formatBRL(Math.abs(rendaMensal - totalLimites))}</p>
            </div>
          </div>
        ) : metodoOrcamento === 'envelopes' ? (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-200">
            Cada limite cadastrado funciona como envelope mensal. Ao tentar registrar uma despesa que ultrapasse o saldo da categoria, o sistema bloqueia o lançamento e informa quanto ainda está disponível.
            <span className="mt-2 block font-semibold">Envelopes definidos: {limitesCadastrados.length} · Total distribuído: {formatBRL(totalLimites)}</span>
          </div>
        ) : (
          <div className={"grid grid-cols-1 gap-3 " + (metodoOrcamento === 'seis-caixas' ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6' : 'sm:grid-cols-2 lg:grid-cols-3')}>
            {alocacoesMetodo.map((alocacao) => (
              <div key={alocacao.nome} className="rounded-2xl border border-border bg-surface-elevated p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-text-primary">{alocacao.nome}</p>
                  <span className="shrink-0 rounded-full bg-blue-100 px-2 py-1 text-[11px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-200">{alocacao.percentual}%</span>
                </div>
                <p className="mt-3 text-lg font-bold text-text-primary">{formatBRL(alocacao.valor)}</p>
                {typeof alocacao.usado === 'number' && <p className="mt-1 text-xs text-text-secondary">Gasto registrado: {formatBRL(alocacao.usado)}</p>}
                {alocacao.detalhe && <p className="mt-1 text-xs text-text-muted">{alocacao.detalhe}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${alertas.some((alerta) => alerta.tipo === 'error') ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/25' : 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/25'}`}>
            <p className={`font-semibold ${alertas.some((alerta) => alerta.tipo === 'error') ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'}`}>
              {alertas.length === 1
                ? alertas[0].mensagem
                : `${alertas.filter((alerta) => alerta.tipo === 'error').length} acima do limite · ${alertas.filter((alerta) => alerta.tipo === 'warning').length} em atenção.`}
            </p>
            {alertas.length > 1 && (
              <button type="button" onClick={() => setShowAllAlerts((current) => !current)} className={`rounded-lg px-2 py-1 text-xs font-bold underline-offset-2 hover:underline ${alertas.some((alerta) => alerta.tipo === 'error') ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'}`}>
                {showAllAlerts ? 'Ocultar detalhes' : 'Ver detalhes'}
              </button>
            )}
          </div>
          {(showAllAlerts ? alertas : []).map((alerta, index) => (
            <div key={index} role="status" className={`rounded-xl border p-4 text-sm font-medium flex items-center gap-3 ${
              alerta.tipo === 'error' ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/25 dark:text-red-200' : 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950/25 dark:text-yellow-200'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <span>{alerta.mensagem}</span>
            </div>
          ))}
        </div>
      )}

      {/* Formulário de Definição de Limite */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-2xl backdrop-blur-md md:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">{editingId ? 'Atualizar limite' : 'Definir limite por categoria'}</h3>
            <p className="mt-1 text-sm text-gray-400">Escolha uma categoria e defina quanto pretende gastar no mês.</p>
          </div>
          <span className="rounded-full bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-300">{periodo}</span>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-gray-400 text-xs font-semibold">Categoria de Despesa <span className="text-red-500">*</span></label>
            <select 
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500 outline-none transition-all" 
              value={formData.categoria}
              onChange={(e) => setFormData({...formData, categoria: e.target.value})}
              required
            >
              <option value="">Selecione...</option>
              {categorias.map(cat => <option key={cat} value={cat} className="bg-black">{cat}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-gray-400 text-xs font-semibold">Definir Limite Mensal <span className="text-red-500">*</span></label>
            <input type="number" min="0.01" step="0.01" placeholder="Ex.: 500,00" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500 outline-none transition-all" value={formData.valor} onChange={(e) => setFormData({...formData, valor: e.target.value})} required />
          </div>
          <div className="flex items-end gap-2">
            {editingId && <button type="button" onClick={() => {setEditingId(null); setFormData({categoria:'', valor:''})}} className="flex-1 rounded-xl border border-white/10 px-4 text-gray-300 text-xs font-bold uppercase hover:bg-white/5 transition-all">Cancelar</button>}
            <button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-400 text-[#161616] font-bold uppercase text-xs tracking-widest h-[46px] rounded-xl transition-all shadow-lg shadow-orange-500/15">
              {editingId ? 'Atualizar Limite' : 'Salvar Limite'}
            </button>
          </div>
        </form>
      </div>

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Acompanhamento por categoria</h3>
          <p className="mt-1 text-sm text-gray-400">Veja quanto foi usado e o valor ainda disponível em cada limite.</p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/5 bg-[#14191e] p-8 text-center text-sm text-gray-400">Carregando limites e despesas…</div>
        ) : limitesCadastrados.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {limitesCadastrados.map((item) => {
              const statusLabel = item.diferenca < 0 ? 'Limite excedido' : item.percentual >= 100 ? 'Limite atingido' : item.percentual >= 80 ? 'Atenção' : 'Dentro do limite';
              const statusColor = item.diferenca < 0 ? 'text-red-700 bg-red-500/10 dark:text-red-300' : item.percentual >= 80 ? 'text-yellow-800 bg-yellow-500/10 dark:text-yellow-200' : 'text-green-800 bg-green-500/10 dark:text-green-300';
              const percentWidth = Math.max(0, Math.min(item.percentual, 100));
              return (
                <article key={item.id} className="group space-y-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md transition-all hover:border-orange-500/30 md:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      </div>
                      <div className="min-w-0">
                        <h4 className="break-words font-bold text-white">{item.categoria}</h4>
                        <span className={"mt-1 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide " + statusColor}>{statusLabel}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => handleEdit(item)} aria-label={"Editar limite de " + item.categoria} title="Editar limite" className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-orange-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button type="button" onClick={() => handleDelete(item.id)} aria-label={"Excluir limite de " + item.categoria} title="Excluir limite" className="rounded-lg p-2 text-gray-400 transition hover:bg-red-500/10 hover:text-red-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-2xl font-bold text-white">{formatBRL(item.gastoReal)}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Gasto neste período</p>
                    </div>
                    <p className="text-right text-sm text-text-secondary">de <span className="font-bold text-text-primary">{formatBRL(item.valor)}</span></p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-gray-400">Uso do limite</span>
                      <span className={item.diferenca < 0 ? 'text-red-700 dark:text-red-300' : item.percentual >= 80 ? 'text-yellow-800 dark:text-yellow-200' : 'text-green-800 dark:text-green-300'}>{item.percentual}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-black/50">
                      <div className={"h-full rounded-full transition-all duration-700 " + getProgressBarColor(item.percentual)} style={{ width: percentWidth + '%' }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-white/5 pt-4 text-xs">
                    <span className="text-gray-500">{item.diferenca < 0 ? 'Acima do limite' : 'Disponível'}</span>
                    <span className={"font-bold " + (item.diferenca < 0 ? 'text-red-700 dark:text-red-300' : 'text-text-primary')}>{formatBRL(Math.abs(item.diferenca))}</span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <p className="mt-4 font-semibold text-gray-200">Nenhum limite definido para este período.</p>
            <p className="mt-1 text-sm text-gray-500">Defina uma meta mensal para acompanhar seus gastos por categoria.</p>
          </div>
        )}
      </section>

    </div>
  );
};

export default Limites;
