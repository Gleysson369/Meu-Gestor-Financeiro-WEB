import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { collection, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

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
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas');
  const [abaAtiva, setAbaAtiva] = useState('receitas');
  const [statusFiltro, setStatusFiltro] = useState('Todas');
  const [loading, setLoading] = useState(false);
  
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [totais, setTotais] = useState({
    receitas: 0,
    despesas: 0,
    saldo: 0,
    limiteTotal: 0
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
        pago: doc.data().pago || false,
        limite: limitesMap[doc.data().categoria] || 0 
      }));

      let combined = [...rendasData, ...despesasData];
      
      // Extrair categorias únicas para o filtro
      const catsUnicas = ['Todas', ...new Set(combined.map(item => item.categoria))];
      setCategorias(catsUnicas);

      // Aplicar filtro de categoria se necessário
      if (categoriaFiltro !== 'Todas') {
        combined = combined.filter(item => item.categoria === categoriaFiltro);
      }

      // Ordenar por data
      combined.sort((a, b) => new Date(b.data) - new Date(a.data));

      // Calcular Totais
      const recTotal = combined.filter(i => i.tipo === 'receita').reduce((acc, curr) => acc + Number(curr.valor), 0);
      const desTotal = combined.filter(i => i.tipo === 'despesa').reduce((acc, curr) => acc + Number(curr.valor), 0);
      
      // Calcular Limite Total
      const limitSum = Object.entries(limitesMap)
        .filter(([cat]) => categoriaFiltro === 'Todas' || cat === categoriaFiltro)
        .reduce((acc, [_, val]) => acc + Number(val), 0);

      setMovimentacoes(combined);
      setTotais({
        receitas: recTotal,
        despesas: desTotal,
        saldo: recTotal - desTotal,
        limiteTotal: limitSum
      });

    } catch (error) {
      console.error("Erro ao carregar relatório:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, dataDe, dataAte, categoriaFiltro]);

  const togglePago = async (item) => {
    if (item.tipo !== 'despesa') return;
    try {
      await updateDoc(doc(db, "despesas", item.id), {
        pago: !item.pago
      });
      fetchData();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
    }
  };

  // Lógica de filtragem combinada
  const movimentacoesFiltradas = movimentacoes.filter(m => {
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

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Relatorio_Financeiro_${dataDe}_a_${dataAte}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
            <input 
              type="date" 
              value={dataDe} 
              onChange={(e) => setDataDe(e.target.value)} 
              onClick={(e) => e.target.showPicker?.()}
              className="bg-black border border-white/10 text-white font-bold text-xs rounded-lg px-4 py-2 outline-none focus:border-blue-500 transition-all [color-scheme:dark] cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-500 uppercase">Fim</label>
            <input 
              type="date" 
              value={dataAte} 
              onChange={(e) => setDataAte(e.target.value)} 
              onClick={(e) => e.target.showPicker?.()}
              className="bg-black border border-white/10 text-white font-bold text-xs rounded-lg px-4 py-2 outline-none focus:border-blue-500 transition-all [color-scheme:dark] cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-500 uppercase">Filtrar Categoria</label>
            <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)} className="bg-black border border-white/10 text-white font-bold text-xs rounded-lg px-4 py-2 outline-none focus:border-blue-500 transition-all">
              {categorias.map(c => <option key={c} className="bg-black" value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-500 uppercase">Status</label>
            <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)} className="bg-black border border-white/10 text-white font-bold text-xs rounded-lg px-4 py-2 outline-none focus:border-blue-500 transition-all">
              <option value="Todas" className="bg-black">Todas</option>
              <option value="Pago" className="bg-black">{abaAtiva === 'receitas' ? 'Recebidas' : 'Pagas'}</option>
              <option value="Pendente" className="bg-black">Pendentes</option>
            </select>
          </div>

          <div className="flex items-end">
            <button 
              onClick={exportToExcel}
              className="bg-green-600 hover:bg-green-700 text-white font-black uppercase text-[10px] tracking-widest px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-green-600/20 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Gerar Excel
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Dados */}
      <div className="bg-black border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="text-[10px] uppercase tracking-widest font-black text-gray-400 bg-zinc-900">
              <tr>
                <th className="px-6 py-5">Data</th>
                <th className="px-6 py-5">Descrição</th>
                <th className="px-6 py-5">Categoria</th>
                {abaAtiva === 'despesas' && <th className="px-6 py-5 text-right">Limite</th>}
                <th className="px-6 py-5 text-right">Valor</th>
                <th className="px-6 py-5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
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
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Resumo de Totais no Rodapé da Tabela */}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default FluxoDeCaixa;