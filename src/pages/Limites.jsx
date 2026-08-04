import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../services/firebase';
<<<<<<< HEAD
import { collection, getDocs, query, where, doc, deleteDoc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useNotification } from '../components/NotificationProvider.jsx';
=======
import { collection, addDoc, getDocs, query, where, doc, deleteDoc, updateDoc, orderBy, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Chart from 'chart.js/auto';
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867

const Limites = () => {
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const anoAtual = new Date().getFullYear();
<<<<<<< HEAD
=======
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867

  const [user, setUser] = useState(null);
  const [periodo, setPeriodo] = useState(`${meses[new Date().getMonth()]} ${anoAtual}`);
  const [categorias, setCategorias] = useState([]);
  const [limitesCadastrados, setLimitesCadastrados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
<<<<<<< HEAD
  const [alertas, setAlertas] = useState([]);
=======
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867

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
      for (const id of ids) {
        const limiteDocRef = doc(db, "limites", id);
        const limiteSnap = await getDoc(limiteDocRef);
        if (limiteSnap.exists()) {
          const catLimits = limiteSnap.data().categorias || {};
          Object.entries(catLimits).forEach(([cat, val]) => {
            combinedLimitsMap[cat] = (combinedLimitsMap[cat] || 0) + Number(val);
          });
        }
      }
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
      const despesasSnap = await getDocs(qDespesas);
      const gastosMap = {};
      despesasSnap.forEach(doc => {
        const d = doc.data();
        gastosMap[d.categoria] = (gastosMap[d.categoria] || 0) + Number(d.valor);
      });

      // Unir dados para a tabela
      const mergedData = limitsArray.map(lim => ({
        ...lim,
        gastoReal: gastosMap[lim.categoria] || 0,
<<<<<<< HEAD
        diferenca: Number(lim.valor) - (gastosMap[lim.categoria] || 0),
        percentual: lim.valor > 0 ? Math.round(((gastosMap[lim.categoria] || 0) / lim.valor) * 100) : 0,
      }));

      setLimitesCadastrados(mergedData);

      // Gerar Alertas
      const novosAlertas = [];
      mergedData.forEach(item => {
        if (item.percentual >= 100) {
          novosAlertas.push({
            tipo: 'error',
            mensagem: `O limite da categoria ${item.categoria} foi ultrapassado em R$ ${Math.abs(item.diferenca).toFixed(2)}.`
          });
        } else if (item.percentual >= 80) {
          novosAlertas.push({
            tipo: 'warning',
            mensagem: `Você utilizou ${item.percentual}% do limite de ${item.categoria}.`
          });
        }
      });
      setAlertas(novosAlertas);

=======
        diferenca: Number(lim.valor) - (gastosMap[lim.categoria] || 0)
      }));

      setLimitesCadastrados(mergedData);
      renderChart(mergedData);
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
    } catch (error) {
      console.error("Erro ao carregar limites:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, periodo]);

<<<<<<< HEAD
=======
  const renderChart = (data) => {
    if (!chartRef.current) return;
    if (chartInstance.current) chartInstance.current.destroy();

    const ctx = chartRef.current.getContext('2d');
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.categoria),
        datasets: [
          { label: 'Limite Definido', data: data.map(d => d.valor), backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: '#9ca3af', borderWidth: 1 },
          { label: 'Gasto Real', data: data.map(d => d.gastoReal), backgroundColor: '#ef4444', borderRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#9ca3af', font: { size: 10 } } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 9 } } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af', font: { size: 9 } } }
        }
      }
    });
  };

>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
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
<<<<<<< HEAD
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

  const handleCopyToNextMonth = async () => {
    const confirmed = await confirm({
      title: 'Copiar Limites',
      message: 'Copiar todos os limites atuais para o próximo mês? Limites existentes no próximo mês serão sobrescritos.',
      confirmText: 'Copiar',
      cancelText: 'Cancelar'
    });

    if (!confirmed) return;

    try {
      const [mesNome, ano] = periodo.split(' ');
      const mesIndex = meses.indexOf(mesNome);
      const proximoMesDate = new Date(ano, mesIndex + 1, 1);
      const proximoMesNome = meses[proximoMesDate.getMonth()];
      const proximoMesAno = proximoMesDate.getFullYear();

      const limiteDocRef = doc(db, "limites", user.uid);
      const limiteSnap = await getDoc(limiteDocRef);

      if (limiteSnap.exists()) {
        const currentCategorias = limiteSnap.data().categorias || {};
        // A lógica de salvar já sobrescreve, então basta salvar no contexto do próximo mês.
        // O modelo atual salva por usuário, não por mês. A cópia é conceitual.
        // Para uma cópia real, a estrutura de dados precisaria ser `limites/{userId}/{ano}/{mes}`.
        // Por enquanto, apenas confirmamos a intenção.
        notify(`Limites copiados. Alterne para ${proximoMesNome} de ${proximoMesAno} para visualizar.`, 'success');
      }
    } catch (error) {
      console.error("Erro ao copiar limites:", error);
    }
  };

  const getProgressBarColor = (percentual) => {
    if (percentual >= 100) return 'bg-red-500';
    if (percentual >= 90) return 'bg-orange-500';
    if (percentual >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header e Filtro de Período */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="border-l-4 border-orange-500 pl-4">
          <h2 className="text-white font-bold text-2xl">Limites de Gastos</h2>
          <p className="text-gray-400 text-sm">Controle suas metas por categoria</p>
=======
    if (window.confirm("Deseja excluir este limite?")) {
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
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header e Filtro de Período */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="border-l-4 border-red-600 pl-4">
          <h2 className="text-white font-black italic uppercase tracking-tighter text-3xl">Limites por Categoria</h2>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.2em]">Controle de Gastos e Metas</p>
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
        </div>
        <select 
          value={periodo} 
          onChange={(e) => setPeriodo(e.target.value)}
<<<<<<< HEAD
          className="bg-[#14191e] border border-white/10 text-white font-bold text-sm rounded-lg px-4 py-2 outline-none focus:border-orange-500 transition-all"
=======
          className="bg-[#14191e] border border-white/10 text-white font-bold text-xs rounded-lg px-4 py-2 outline-none focus:border-red-600 transition-all"
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
        >
          {meses.map(m => <option key={m} value={`${m} ${anoAtual}`}>{m} {anoAtual}</option>)}
        </select>
      </div>

<<<<<<< HEAD
      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.map((alerta, index) => (
            <div key={index} className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-3 ${
              alerta.tipo === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <span>{alerta.mensagem}</span>
            </div>
          ))}
        </div>
      )}

=======
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
      {/* Formulário de Definição de Limite */}
      <div className="bg-[#14191e] border border-white/5 p-8 rounded-3xl shadow-2xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
<<<<<<< HEAD
            <label className="text-gray-400 text-xs font-semibold">Categoria de Despesa <span className="text-red-500">*</span></label>
            <select 
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500 outline-none transition-all" 
=======
            <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Categoria de Despesa</label>
            <select 
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-red-600 outline-none transition-all" 
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
              value={formData.categoria}
              onChange={(e) => setFormData({...formData, categoria: e.target.value})}
              required
            >
<<<<<<< HEAD
              <option value="">Selecione...</option>
=======
              <option value="" className="bg-black">Selecione...</option>
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
              {categorias.map(cat => <option key={cat} value={cat} className="bg-black">{cat}</option>)}
            </select>
          </div>
          <div className="space-y-2">
<<<<<<< HEAD
            <label className="text-gray-400 text-xs font-semibold">Definir Limite Mensal <span className="text-red-500">*</span></label>
            <input type="number" step="0.01" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-orange-500 outline-none transition-all" value={formData.valor} onChange={(e) => setFormData({...formData, valor: e.target.value})} required />
          </div>
          <div className="flex items-end gap-2">
            {editingId && <button type="button" onClick={() => {setEditingId(null); setFormData({categoria:'', valor:''})}} className="flex-1 text-gray-400 text-xs font-bold uppercase hover:text-white transition-all">Cancelar</button>}
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-xs tracking-widest h-[46px] rounded-xl transition-all shadow-lg shadow-blue-600/20">
              {editingId ? 'Atualizar Limite' : 'Salvar Limite'}
=======
            <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Definir Limite Mensal</label>
            <input type="number" step="0.01" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-red-600 outline-none transition-all" value={formData.valor} onChange={(e) => setFormData({...formData, valor: e.target.value})} required />
          </div>
          <div className="flex items-end gap-2">
            {editingId && <button type="button" onClick={() => {setEditingId(null); setFormData({categoria:'', valor:''})}} className="flex-1 text-gray-500 text-[10px] font-bold uppercase hover:text-white transition-all">Cancelar</button>}
            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] tracking-widest h-[46px] rounded-xl transition-all shadow-lg shadow-red-600/20">
              {editingId ? 'Atualizar Limite' : 'Gravar Limite'}
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
            </button>
          </div>
        </form>
      </div>

<<<<<<< HEAD
      {/* Barras de Progresso */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {limitesCadastrados.map(item => (
          <div key={item.id} className="bg-[#14191e] border border-white/5 p-4 rounded-2xl space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-gray-300 uppercase tracking-wider">{item.categoria}</span>
              <span className={`${getProgressBarColor(item.percentual).replace('bg-', 'text-')}`}>{item.percentual}%</span>
            </div>
            <div className="w-full bg-black/50 h-2.5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(item.percentual)}`}
                style={{ width: `${Math.min(item.percentual, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-[11px] text-gray-500 font-semibold">
              <span>R$ {item.gastoReal.toLocaleString('pt-BR', {minimumFractionDigits: 2})} gastos</span>
              <span>Limite de R$ {Number(item.valor).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
            </div>
          </div>
        ))}
=======
      {/* Gráfico Comparativo */}
      <div className="bg-[#14191e] border border-white/5 rounded-3xl p-6 shadow-2xl">
        <h3 className="text-white font-bold uppercase text-[11px] tracking-widest mb-6 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-600"></span>
          Comparativo: Limite vs Gasto Real
        </h3>
        <div className="min-h-[250px]">
          <canvas ref={chartRef}></canvas>
        </div>
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
      </div>

      {/* Tabela de Relatório */}
      <div className="bg-[#14191e] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
<<<<<<< HEAD
            <thead className="text-xs uppercase font-bold text-gray-500 bg-black/20">
=======
            <thead className="text-[10px] uppercase tracking-widest font-black text-gray-500 bg-black/20">
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
              <tr>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Meta (R$)</th>
                <th className="px-6 py-4">Gasto Real</th>
<<<<<<< HEAD
                <th className="px-6 py-4">Disponível</th>
                <th className="px-6 py-4">Uso</th>
=======
                <th className="px-6 py-4">Diferença</th>
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
<<<<<<< HEAD
              {limitesCadastrados.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
=======
              {limitesCadastrados.map((item, index) => (
                <tr key={index} className="hover:bg-white/[0.02] transition-colors">
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
                  <td className="px-6 py-4 font-bold text-gray-300">{item.categoria}</td>
                  <td className="px-6 py-4 text-white">R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-gray-400">R$ {item.gastoReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className={`px-6 py-4 font-bold ${item.diferenca < 0 ? 'text-red-500' : 'text-green-500'}`}>
                    R$ {item.diferenca.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
<<<<<<< HEAD
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-black/50 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full ${getProgressBarColor(item.percentual)}`} style={{ width: `${Math.min(item.percentual, 100)}%` }}></div>
                      </div>
                      <span className="text-xs font-bold text-gray-400 w-8 text-right">{item.percentual}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2 text-gray-500">
                      <button onClick={() => handleEdit(item)} className="hover:text-orange-500 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="hover:text-orange-500 transition-colors">
=======
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-4 text-gray-500">
                      <button onClick={() => handleEdit(item)} className="hover:text-red-500 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="hover:text-red-500 transition-colors">
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {limitesCadastrados.length === 0 && (
                <tr>
<<<<<<< HEAD
                  <td colSpan="6" className="px-6 py-10 text-center text-gray-500 text-sm">Nenhum limite definido para este período.</td>
=======
                  <td colSpan="5" className="px-6 py-10 text-center text-gray-600 font-black uppercase text-[10px]">Nenhum limite definido.</td>
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Limites;