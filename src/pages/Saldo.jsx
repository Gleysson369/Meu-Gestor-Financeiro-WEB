import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { collection, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
<<<<<<< HEAD
import { Link } from 'react-router-dom';
=======
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867

const FluxoDeCaixa = () => {
  // Auxiliares para datas padrão
  const getPrimeiroDiaMes = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  };

  const getUltimoDiaMes = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  };

  const [user, setUser] = useState(null);
  const [dataDe, setDataDe] = useState(getPrimeiroDiaMes());
  const [dataAte, setDataAte] = useState(getUltimoDiaMes());
<<<<<<< HEAD
  const [tipoFiltro, setTipoFiltro] = useState('Todas'); // Todas, receitas, despesas
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas');
  const [statusFiltro, setStatusFiltro] = useState('Todas');
  const [valorMin, setValorMin] = useState('');
  const [valorMax, setValorMax] = useState('');
=======
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas');
  const [abaAtiva, setAbaAtiva] = useState('receitas');
  const [statusFiltro, setStatusFiltro] = useState('Todas');
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
  const [loading, setLoading] = useState(false);
  
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [totais, setTotais] = useState({
    receitas: 0,
    despesas: 0,
    saldo: 0,
<<<<<<< HEAD
    limiteTotal: 0,
    saldoPrevisto: 0,
    totalPendente: 0,
    totalAtrasado: 0,
    percentualLimiteUtilizado: 0,
=======
    limiteTotal: 0
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

<<<<<<< HEAD
  const resetFilters = () => {
    setDataDe(getPrimeiroDiaMes());
    setDataAte(getUltimoDiaMes());
    setCategoriaFiltro('Todas'); // Adicionado para resetar o filtro de categoria
    setTipoFiltro('Todas');
    setCategoriaFiltro('Todas');
    setStatusFiltro('Todas');
    setValorMin('');
    setValorMax('');
  };

=======
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const dataInicio = dataDe;
      const dataFim = dataAte;

      const userDoc = await getDoc(doc(db, "usuarios", user.uid));
      const partnerId = userDoc.data()?.parceiroId;
      const ids = partnerId ? [user.uid, partnerId] : [user.uid];

      // Busca os documentos de limite de ambos os usuários
      let limitesMap = {};
      for (const id of ids) {
        const limiteSnap = await getDoc(doc(db, "limites", id));
        if (limiteSnap.exists()) {
          const catLimits = limiteSnap.data().categorias || {};
          Object.entries(catLimits).forEach(([cat, val]) => {
            limitesMap[cat] = (limitesMap[cat] || 0) + Number(val);
          });
        }
      }

      // Consultas ao Firebase
      const qRendas = query(collection(db, "rendas"), where("userId", "in", ids), where("data", ">=", dataInicio), where("data", "<=", dataFim));
      const qDespesas = query(collection(db, "despesas"), where("userId", "in", ids), where("data", ">=", dataInicio), where("data", "<=", dataFim));

      const [rendasSnap, despesasSnap] = await Promise.all([
        getDocs(qRendas),
        getDocs(qDespesas)
      ]);

      // Processar Rendas
      const rendasData = rendasSnap.docs.map(doc => ({ ...doc.data(), tipo: 'receita', id: doc.id }));
      // Processar Despesas
      const despesasData = despesasSnap.docs.map(doc => ({ 
        ...doc.data(), 
        tipo: 'despesa', 
        id: doc.id,
<<<<<<< HEAD
=======
        pago: doc.data().pago || false,
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
        limite: limitesMap[doc.data().categoria] || 0 
      }));

      let combined = [...rendasData, ...despesasData];
      
      // Extrair categorias únicas para o filtro
      const catsUnicas = ['Todas', ...new Set(combined.map(item => item.categoria))];
      setCategorias(catsUnicas);

<<<<<<< HEAD
=======
      // Aplicar filtro de categoria se necessário
      if (categoriaFiltro !== 'Todas') {
        combined = combined.filter(item => item.categoria === categoriaFiltro);
      }

>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
      // Ordenar por data
      combined.sort((a, b) => new Date(b.data) - new Date(a.data));

      // Calcular Totais
      const recTotal = combined.filter(i => i.tipo === 'receita').reduce((acc, curr) => acc + Number(curr.valor), 0);
      const desTotal = combined.filter(i => i.tipo === 'despesa').reduce((acc, curr) => acc + Number(curr.valor), 0);
<<<<<<< HEAD
      const hoje = new Date();
      hoje.setHours(0,0,0,0);

      const despesasPendentes = combined.filter(i => i.tipo === 'despesa' && i.status !== 'Pago');
      const totalPendente = despesasPendentes.reduce((acc, curr) => acc + Number(curr.valor), 0);
      const totalAtrasado = despesasPendentes
        .filter(d => new Date(d.data + 'T00:00:00') < hoje)
        .reduce((acc, curr) => acc + Number(curr.valor), 0);
      
      // Calcular Limite Total
      const limitSum = Object.entries(limitesMap)
        .reduce((acc, [_, val]) => acc + Number(val), 0);

      const percentualLimite = limitSum > 0 ? (desTotal / limitSum) * 100 : 0;

=======
      
      // Calcular Limite Total
      const limitSum = Object.entries(limitesMap)
        .filter(([cat]) => categoriaFiltro === 'Todas' || cat === categoriaFiltro)
        .reduce((acc, [_, val]) => acc + Number(val), 0);

>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
      setMovimentacoes(combined);
      setTotais({
        receitas: recTotal,
        despesas: desTotal,
        saldo: recTotal - desTotal,
<<<<<<< HEAD
        limiteTotal: limitSum,
        totalPendente: totalPendente,
        totalAtrasado: totalAtrasado,
        saldoPrevisto: (recTotal - desTotal) - totalPendente,
        percentualLimiteUtilizado: percentualLimite,
=======
        limiteTotal: limitSum
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
      });

    } catch (error) {
      console.error("Erro ao carregar relatório:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
<<<<<<< HEAD
  }, [user, dataDe, dataAte]); // Refetch on date change
=======
  }, [user, dataDe, dataAte, categoriaFiltro]);
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867

  const togglePago = async (item) => {
    if (item.tipo !== 'despesa') return;
    try {
      await updateDoc(doc(db, "despesas", item.id), {
<<<<<<< HEAD
        status: item.status === 'Pago' ? 'Pendente' : 'Pago',
        dataPagamento: item.status !== 'Pago' ? getToday() : ''
=======
        pago: !item.pago
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
      });
      fetchData();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
    }
  };

  // Lógica de filtragem combinada
  const movimentacoesFiltradas = movimentacoes.filter(m => {
<<<<<<< HEAD
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    const vencimento = new Date(m.data + 'T00:00:00');
    let effectiveStatus = m.status || 'Pendente';
    if (m.tipo === 'receita') effectiveStatus = 'Recebido';
    else if (effectiveStatus === 'Pendente' && vencimento < hoje) effectiveStatus = 'Atrasado';

    const matchTipo = tipoFiltro === 'Todas' || m.tipo === tipoFiltro;
    const matchCategoria = categoriaFiltro === 'Todas' || m.categoria === categoriaFiltro;
    const matchStatus = statusFiltro === 'Todas' || effectiveStatus === statusFiltro;
    const matchValorMin = !valorMin || m.valor >= parseFloat(valorMin);
    const matchValorMax = !valorMax || m.valor <= parseFloat(valorMax);

    return matchTipo && matchCategoria && matchStatus && matchValorMin && matchValorMax;
  });

  const getStatusInfo = (item) => { // Corrigido para receber o item completo
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    const vencimento = new Date(item.data + 'T00:00:00');

    if (item.tipo === 'receita') return { text: 'Recebido', color: 'bg-green-500/10 text-green-500' };
    if (item.status === 'Pago') return { text: 'Pago', color: 'bg-green-500/10 text-green-500' }; // Usar item.status
    if (vencimento < hoje) return { text: 'Atrasado', color: 'bg-red-500/10 text-red-500' };
    return { text: 'Pendente', color: 'bg-yellow-500/10 text-yellow-500' };
  };

  const exportToExcel = () => {
    const header = ["Data", "Tipo", "Descrição", "Categoria", "Status", "Valor (R$)"];
    const rows = movimentacoesFiltradas.map(item => [
      item.data,
      item.tipo.toUpperCase(),
      item.descricao || '',
      item.categoria || '',
      getStatusInfo(item).text.toUpperCase(),
      Number(item.valor).toFixed(2)
    ]);

    const summary = [
      ["RESUMO DO PERÍODO"],
      ["Total Receitas", totais.receitas.toFixed(2)],
      ["Total Despesas", totais.despesas.toFixed(2)],
      ["Saldo Líquido", totais.saldo.toFixed(2)],
      ["Total Pendente", totais.totalPendente.toFixed(2)],
      ["Total Atrasado", totais.totalAtrasado.toFixed(2)],
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + [header, ...rows, [], ...summary].map(e => e.join(";")).join("\n");
=======
    const matchAba = (abaAtiva === 'receitas' ? m.tipo === 'receita' : m.tipo === 'despesa');
    if (!matchAba) return false;

    if (statusFiltro === 'Todas') return true;
    if (m.tipo === 'receita') return statusFiltro === 'Pago'; // Receitas são sempre consideradas "pagas" no fluxo
    if (statusFiltro === 'Pago') return m.pago === true;
    if (statusFiltro === 'Pendente') return !m.pago;
    return true;
  });

  const exportToExcel = () => {
    const header = ["Data", "Descricao", "Categoria", "Tipo", "Status", "Limite (R$)", "Valor (R$)"];
    const rows = movimentacoesFiltradas.map(item => [
      item.data,
      item.descricao,
      item.categoria,
      item.tipo.toUpperCase(),
      item.tipo === 'receita' ? 'RECEBIDO' : (item.pago ? 'PAGO' : 'PENDENTE'),
      item.limite ? item.limite.toFixed(2) : "0.00",
      item.valor.toFixed(2)
    ]);

    // Adiciona totais ao final do Excel
    rows.push([]);
    rows.push(["RESUMO DO PERIODO"]);
    rows.push(["Total Receitas", totais.receitas.toFixed(2)]);
    rows.push(["Total Despesas", totais.despesas.toFixed(2)]);
    rows.push(["Saldo Liquido", totais.saldo.toFixed(2)]);
    rows.push(["Limite Total Definido", totais.limiteTotal.toFixed(2)]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [header, ...rows].map(e => e.join(";")).join("\n");
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
<<<<<<< HEAD
    link.setAttribute("download", `Fluxo_de_Caixa_${dataDe}_a_${dataAte}.csv`);
=======
    link.setAttribute("download", `Relatorio_Financeiro_${dataDe}_a_${dataAte}.csv`);
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

<<<<<<< HEAD
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    const userName = user?.displayName || user?.email || 'Usuário';
    const rowsHtml = movimentacoesFiltradas.map(item => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">${item.data}</td>
        <td style="padding:8px;border:1px solid #ddd;">${item.tipo.toUpperCase()}</td>
        <td style="padding:8px;border:1px solid #ddd;">${item.descricao || ''}</td>
        <td style="padding:8px;border:1px solid #ddd;">${item.categoria || ''}</td>
        <td style="padding:8px;border:1px solid #ddd;">${getStatusInfo(item).text.toUpperCase()}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">R$ ${Number(item.valor).toFixed(2)}</td>
      </tr>
    `).join('');

    const summaryHtml = `
      <tr><td colspan="5" style="padding:8px;border:none;text-align:right"><strong>Total Receitas</strong></td><td style="padding:8px;border:none;text-align:right"><strong>R$ ${totais.receitas.toFixed(2)}</strong></td></tr>
      <tr><td colspan="5" style="padding:8px;border:none;text-align:right"><strong>Total Despesas</strong></td><td style="padding:8px;border:none;text-align:right"><strong>R$ ${totais.despesas.toFixed(2)}</strong></td></tr>
      <tr><td colspan="5" style="padding:8px;border:none;text-align:right"><strong>Saldo Líquido</strong></td><td style="padding:8px;border:none;text-align:right"><strong>R$ ${totais.saldo.toFixed(2)}</strong></td></tr>
      <tr><td colspan="5" style="padding:8px;border:none;text-align:right"><strong>Total Pendente</strong></td><td style="padding:8px;border:none;text-align:right"><strong>R$ ${totais.totalPendente.toFixed(2)}</strong></td></tr>
      <tr><td colspan="5" style="padding:8px;border:none;text-align:right"><strong>Total Atrasado</strong></td><td style="padding:8px;border:none;text-align:right"><strong>R$ ${totais.totalAtrasado.toFixed(2)}</strong></td></tr>
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>Fluxo de Caixa - Impressão</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 24px; }
            h1 { font-size: 20px; margin-bottom: 8px; }
            .meta { font-size: 13px; color: #444; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #ccc; padding: 10px; font-size: 12px; }
            th { background: #f2f2f2; text-align: left; }
            .summary td { border: none; padding: 8px 10px; }
            .summary strong { display: inline-block; width: 100%; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>Fluxo de Caixa</h1>
          <div class="meta">Usuário: ${userName} | Período: ${dataDe} a ${dataAte} | Emissão: ${new Date().toLocaleDateString('pt-BR')}</div>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Status</th>
                <th style="text-align:right">Valor (R$)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <table class="summary">
            ${summaryHtml}
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header e Filtros */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="border-l-4 border-blue-600 pl-4">
          <h2 className="text-white font-bold text-2xl">Fluxo de Caixa</h2>
          <p className="text-gray-400 text-sm">Relatório Detalhado</p>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400">Início</label>
=======
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header e Filtros */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div className="border-l-4 border-blue-600 pl-4">
          <h2 className="text-white font-black italic uppercase tracking-tighter text-3xl">Fluxo de Caixa</h2>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.2em]">Relatório Detalhado Mensal</p>
        </div>

        <div className="flex flex-wrap gap-4 w-full lg:w-auto">
          {/* Abas de Navegação */}
          <div className="flex bg-[#14191e] p-1 rounded-xl border border-white/5 h-[42px]">
            <button 
              onClick={() => setAbaAtiva('receitas')}
              className={`px-6 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                abaAtiva === 'receitas' 
                ? 'bg-green-600 text-white shadow-lg shadow-green-600/20' 
                : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Receitas
            </button>
            <button 
              onClick={() => setAbaAtiva('despesas')}
              className={`px-6 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                abaAtiva === 'despesas' 
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' 
                : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Despesas
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-500 uppercase">Início</label>
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
            <input 
              type="date" 
              value={dataDe} 
              onChange={(e) => setDataDe(e.target.value)} 
              onClick={(e) => e.target.showPicker?.()}
              className="bg-black border border-white/10 text-white font-bold text-xs rounded-lg px-4 py-2 outline-none focus:border-blue-500 transition-all [color-scheme:dark] cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
<<<<<<< HEAD
            <label className="text-xs font-semibold text-gray-400">Fim</label>
=======
            <label className="text-[10px] font-black text-gray-500 uppercase">Fim</label>
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
            <input 
              type="date" 
              value={dataAte} 
              onChange={(e) => setDataAte(e.target.value)} 
              onClick={(e) => e.target.showPicker?.()}
              className="bg-black border border-white/10 text-white font-bold text-xs rounded-lg px-4 py-2 outline-none focus:border-blue-500 transition-all [color-scheme:dark] cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
<<<<<<< HEAD
            <label className="text-xs font-semibold text-gray-400">Categoria</label>
=======
            <label className="text-[10px] font-black text-gray-500 uppercase">Filtrar Categoria</label>
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
            <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)} className="bg-black border border-white/10 text-white font-bold text-xs rounded-lg px-4 py-2 outline-none focus:border-blue-500 transition-all">
              {categorias.map(c => <option key={c} className="bg-black" value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
<<<<<<< HEAD
            <label className="text-xs font-semibold text-gray-400">Status</label>
            <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)} className="bg-black border border-white/10 text-white font-bold text-xs rounded-lg px-4 py-2 outline-none focus:border-blue-500 transition-all">
              <option value="Todas" className="bg-black">Todas</option>
              <option value="Pago" className="bg-black">Pagas</option> {/* Removida referência a abaAtiva */}
=======
            <label className="text-[10px] font-black text-gray-500 uppercase">Status</label>
            <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)} className="bg-black border border-white/10 text-white font-bold text-xs rounded-lg px-4 py-2 outline-none focus:border-blue-500 transition-all">
              <option value="Todas" className="bg-black">Todas</option>
              <option value="Pago" className="bg-black">{abaAtiva === 'receitas' ? 'Recebidas' : 'Pagas'}</option>
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
              <option value="Pendente" className="bg-black">Pendentes</option>
            </select>
          </div>

<<<<<<< HEAD
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400">Tipo</label>
            <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)} className="bg-black border border-white/10 text-white font-bold text-xs rounded-lg px-4 py-2 outline-none focus:border-blue-500 transition-all">
              <option value="Todas">Todas</option>
              <option value="receita">Receitas</option>
              <option value="despesa">Despesas</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400">Valor Mín.</label>
            <input type="number" placeholder="R$ 0,00" value={valorMin} onChange={(e) => setValorMin(e.target.value)} className="bg-black border border-white/10 text-white font-bold text-xs rounded-lg px-4 py-2 outline-none focus:border-blue-500 transition-all" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400">Valor Máx.</label>
            <input type="number" placeholder="R$ 1.000,00" value={valorMax} onChange={(e) => setValorMax(e.target.value)} className="bg-black border border-white/10 text-white font-bold text-xs rounded-lg px-4 py-2 outline-none focus:border-blue-500 transition-all" />
          </div>

          <div className="flex items-end gap-2">
            <button 
              onClick={exportToExcel}
              className="bg-green-600 hover:bg-green-700 text-white font-bold uppercase text-xs tracking-widest px-4 h-[34px] rounded-xl transition-all shadow-lg shadow-green-600/20 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Excel
            </button>
            <button 
              onClick={handlePrint}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold uppercase text-xs tracking-widest px-4 h-[34px] rounded-xl transition-all flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Imprimir
=======
          <div className="flex items-end">
            <button 
              onClick={exportToExcel}
              className="bg-green-600 hover:bg-green-700 text-white font-black uppercase text-[10px] tracking-widest px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-green-600/20 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Gerar Excel
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Dados */}
      <div className="bg-black border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
<<<<<<< HEAD
            <thead className="text-xs uppercase font-bold text-gray-400 bg-zinc-900">
              <tr>
                <th className="px-6 py-5">Data</th>
                <th className="px-6 py-5">Tipo</th>
                <th className="px-6 py-5">Descrição</th>
                <th className="px-6 py-5">Categoria</th>
=======
            <thead className="text-[10px] uppercase tracking-widest font-black text-gray-400 bg-zinc-900">
              <tr>
                <th className="px-6 py-5">Data</th>
                <th className="px-6 py-5">Descrição</th>
                <th className="px-6 py-5">Categoria</th>
                {abaAtiva === 'despesas' && <th className="px-6 py-5 text-right">Limite</th>}
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
                <th className="px-6 py-5 text-right">Valor</th>
                <th className="px-6 py-5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
<<<<<<< HEAD
              {movimentacoesFiltradas.map((item) => {
                const statusInfo = getStatusInfo(item);
                return (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 font-medium text-gray-500 group-hover:text-gray-300">
                      {new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold uppercase text-xs px-2 py-1 rounded-md ${item.tipo === 'receita' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{item.tipo}</span>
                    </td>
                    <td className="px-6 py-4 text-white font-bold">{item.descricao}</td>
                    <td className="px-6 py-4">
                      <span className="bg-white/5 px-2 py-1 rounded text-xs font-bold uppercase">{item.categoria}</span>
                    </td>
                    <td className={`px-6 py-4 text-right font-bold ${item.tipo === 'receita' ? 'text-green-500' : 'text-red-500'}`}>
                      {item.tipo === 'receita' ? '+' : '-'} R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => togglePago(item)} disabled={item.tipo === 'receita'} className={`text-xs font-bold px-2 py-1 rounded-md uppercase transition-all ${statusInfo.color} ${item.tipo === 'receita' ? 'cursor-default' : 'hover:brightness-125'}`}>
                        {statusInfo.text}
                      </button>
                    </td>
                  </tr>
                )
              })}
              {movimentacoesFiltradas.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="px-6 py-20 text-center text-gray-500 text-sm space-y-4">
                    <p>Nenhuma movimentação encontrada para os filtros selecionados.</p>
                    <div className="flex justify-center gap-4">
                      <button onClick={resetFilters} className="bg-gray-600/20 text-gray-300 px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-600/40">Limpar Filtros</button>
                      <Link to="/receita" className="bg-green-600/20 text-green-400 px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-600/40">Adicionar Receita</Link>
                      <Link to="/despesas" className="bg-red-600/20 text-red-400 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-600/40">Adicionar Despesa</Link>
                    </div>
=======
              {movimentacoesFiltradas.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4 font-medium text-gray-500 group-hover:text-gray-300">
                    {new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                  </td>
                  <td className="px-6 py-4 text-white font-bold">{item.descricao}</td>
                  <td className="px-6 py-4">
                    <span className="bg-white/5 px-2 py-1 rounded text-[9px] font-black uppercase">{item.categoria}</span>
                  </td>
                  {abaAtiva === 'despesas' && (
                    <td className="px-6 py-4 text-right font-bold text-gray-400">
                      R$ {Number(item.limite || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  )}
                  <td className={`px-6 py-4 text-right font-black ${item.tipo === 'receita' ? 'text-green-500' : 'text-red-500'}`}>
                    {item.tipo === 'receita' ? '+' : '-'} R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => togglePago(item)}
                      disabled={item.tipo === 'receita'}
                      className={`text-[9px] font-black px-2 py-1 rounded-md uppercase transition-all ${
                        item.tipo === 'receita' 
                        ? 'bg-green-500/10 text-green-500 cursor-default' 
                        : item.pago ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                      }`}
                    >
                      {item.tipo === 'receita' ? 'Recebido' : (item.pago ? 'Pago' : 'Pendente')}
                    </button>
                  </td>
                </tr>
              ))}
              {movimentacoesFiltradas.length === 0 && !loading && (
                <tr>
                  <td colSpan={abaAtiva === 'despesas' ? "6" : "5"} className="px-6 py-20 text-center text-gray-600 font-black uppercase text-xs tracking-widest">
                    Nenhuma {abaAtiva} encontrada para os filtros selecionados.
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Resumo de Totais no Rodapé da Tabela */}
<<<<<<< HEAD
        <div className="flex flex-nowrap overflow-x-auto gap-4 bg-black/40 border-t border-white/5 p-4">
          <div className="min-w-[180px] flex-shrink-0 rounded-3xl bg-[#111827] p-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Receitas</p>
            <p className="text-xl font-bold text-green-500">R$ {totais.receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="min-w-[180px] flex-shrink-0 rounded-3xl bg-[#111827] p-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Despesas</p>
            <p className="text-xl font-bold text-red-500">R$ {totais.despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="min-w-[180px] flex-shrink-0 rounded-3xl bg-blue-600/5 p-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Saldo Líquido</p>
            <p className={`text-xl font-bold ${totais.saldo >= 0 ? 'text-white' : 'text-red-600'}`}>
              R$ {totais.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="min-w-[180px] flex-shrink-0 rounded-3xl bg-blue-600/10 p-4">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Saldo Previsto</p>
            <p className={`text-xl font-bold ${totais.saldoPrevisto >= 0 ? 'text-blue-300' : 'text-orange-400'}`}>
              R$ {totais.saldoPrevisto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="min-w-[180px] flex-shrink-0 rounded-3xl bg-[#111827] p-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Pendente</p>
            <p className="text-xl font-bold text-yellow-500">R$ {totais.totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="min-w-[180px] flex-shrink-0 rounded-3xl bg-[#111827] p-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Atrasado</p>
            <p className="text-xl font-bold text-orange-500">R$ {totais.totalAtrasado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
=======
        <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white/5 bg-black/40 border-t border-white/5">
          <div className="p-6">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Receitas</p>
            <p className="text-xl font-black text-green-500">R$ {totais.receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="p-6">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Despesas</p>
            <p className="text-xl font-black text-red-500">R$ {totais.despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="p-6">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Saldo Líquido</p>
            <p className={`text-xl font-black ${totais.saldo >= 0 ? 'text-white' : 'text-red-600'}`}>
              R$ {totais.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-6 bg-blue-600/5">
            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Limite Total Definido</p>
            <p className="text-xl font-black text-blue-500">R$ {totais.limiteTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
          </div>
        </div>
      </div>
    </div>
  );
};

export default FluxoDeCaixa;