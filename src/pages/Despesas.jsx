import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { collection, addDoc, getDocs, query, where, doc, deleteDoc, updateDoc, orderBy, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useNotification } from '../components/NotificationProvider.jsx';

const Despesas = () => {
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const anoAtual = new Date().getFullYear();

  const getToday = () => new Date().toISOString().split('T')[0];

  const [user, setUser] = useState(null);
  const [despesas, setDespesas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [periodo, setPeriodo] = useState(`${meses[new Date().getMonth()]} ${anoAtual}`);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState('Todas');
  const [sortConfig, setSortConfig] = useState({ key: 'data', direction: 'desc' });
  const { notify, confirm, prompt } = useNotification();

  const [formData, setFormData] = useState({
    categoria: '',
    descricao: '',
    valor: '',
    data: getToday(),
    status: 'Pendente', // Pendente, Pago
    dataPagamento: '',
    observacao: '',
    recorrente: false,
    formaPagamento: '',
  });

  const resetForm = () => {
    setEditingId(null);
    setFormData({ categoria: '', descricao: '', valor: '', data: getToday(), status: 'Pendente', dataPagamento: '', observacao: '', recorrente: false, formaPagamento: '' });
  };

  // 1. Buscar Categorias de Despesa
  const fetchCategorias = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, "usuarios", user.uid));
      const partnerId = userDoc.data()?.parceiroId;
      const ids = partnerId ? [user.uid, partnerId] : [user.uid];

      const q = query(
        collection(db, "categorias"), 
        where("userId", "in", ids),
        where("tipo", "==", "despesa")
      );

      const snap = await getDocs(q);
      const customCats = snap.docs.map(d => d.data().nome);

      let profileCats = [];
      for (const id of ids) {
        const profileSnap = await getDoc(doc(db, "usuarios", id));
        if (profileSnap.exists()) {
          profileCats = [...profileCats, ...(profileSnap.data().categorias_despesa || [])];
        }
      }

      const defaultCats = ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação', 'Entretenimento', 'Compras', 'Utilitários', 'Outro'];

      const allCats = [...new Set([...defaultCats, ...profileCats, ...customCats])];
      setCategorias(allCats.map((nome, index) => ({ id: index, nome })));
    } catch (error) {
      console.error("Erro categorias:", error);
    }
  };

  // 2. Buscar Despesas filtradas por período e usuário
  const fetchDespesas = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [mesNome, ano] = periodo.split(' ');
      const mesIndex = meses.indexOf(mesNome);
      const mesNum = String(mesIndex + 1).padStart(2, '0');
      const ultimoDia = new Date(ano, mesIndex + 1, 0).getDate();
      
      const dataInicio = `${ano}-${mesNum}-01`;
      const dataFim = `${ano}-${mesNum}-${ultimoDia}`;

      const userDoc = await getDoc(doc(db, "usuarios", user.uid));
      const partnerId = userDoc.data()?.parceiroId;
      const ids = partnerId ? [user.uid, partnerId] : [user.uid];

      const q = query(
        collection(db, "despesas"),
        where("userId", "in", ids),
        where("data", ">=", dataInicio),
        where("data", "<=", dataFim)
      );

      const querySnapshot = await getDocs(q);
      const result = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDespesas(result.sort((a, b) => new Date(b.data) - new Date(a.data)));
    } catch (error) {
      console.error("Erro ao buscar despesas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchDespesas();
      fetchCategorias();
    }
  }, [periodo, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        valor: parseFloat(formData.valor),
        userId: user.uid,
        updatedAt: new Date()
      };

      // Se pago, mas sem data de pagamento, usa a data de vencimento
      if (payload.status === 'Pago' && !payload.dataPagamento) {
        payload.dataPagamento = payload.data;
      }

      if (editingId) {
        await updateDoc(doc(db, "despesas", editingId), payload);
        notify('Despesa atualizada com sucesso!', 'success');
      } else {
        await addDoc(collection(db, "despesas"), { ...payload, createdAt: new Date() });
        notify('Despesa registrada com sucesso!', 'success');
      }

      resetForm();
      fetchDespesas();
    } catch (error) {
      console.error("Erro ao salvar despesa:", error);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      categoria: item.categoria,
      descricao: item.descricao,
      valor: item.valor,
      data: item.data,
      status: item.status || 'Pendente',
      dataPagamento: item.dataPagamento || '',
      observacao: item.observacao || '',
      recorrente: item.recorrente || false,
      formaPagamento: item.formaPagamento || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDuplicate = (item) => {
    resetForm();
    setFormData({
      ...item,
      descricao: `${item.descricao} (Cópia)`,
      data: getToday(),
      status: 'Pendente',
      dataPagamento: '',
    });
    notify('Despesa duplicada. Ajuste e salve.', 'info');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePostpone = async (item) => {
    const daysInput = await prompt({
      title: 'Adiar Vencimento',
      message: 'Adiar vencimento por quantos dias?',
      placeholder: '7',
      inputType: 'number',
      confirmText: 'Confirmar',
      cancelText: 'Cancelar'
    });

    const days = parseInt(daysInput, 10);
    if (isNaN(days) || days <= 0) return;

    try {
      const newDueDate = new Date(item.data);
      newDueDate.setUTCDate(newDueDate.getUTCDate() + days);
      await updateDoc(doc(db, "despesas", item.id), {
        data: newDueDate.toISOString().split('T')[0]
      });
      fetchDespesas();
    } catch (error) {
      console.error("Erro ao adiar vencimento:", error);
      notify('Erro ao adiar vencimento.', 'danger');
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Excluir Despesa',
      message: 'Tem certeza de que deseja excluir esta despesa? Essa ação não poderá ser desfeita.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar'
    });

    if (!confirmed) return;
    await deleteDoc(doc(db, "despesas", id));
    fetchDespesas();
  };

  const toggleStatus = async (item) => {
    try {
      const newStatus = item.status === 'Pago' ? 'Pendente' : 'Pago';
      await updateDoc(doc(db, "despesas", item.id), {
        status: newStatus,
        dataPagamento: newStatus === 'Pago' ? getToday() : ''
      });
      fetchDespesas();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
    }
  };

  const totalMensal = despesas.reduce((acc, curr) => acc + Number(curr.valor), 0);

  // Lógica de filtragem local para melhor performance
  const despesasFiltradas = despesas
    .map(d => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const vencimento = new Date(d.data + 'T00:00:00');
      let effectiveStatus = d.status || 'Pendente';
      if (effectiveStatus === 'Pendente' && vencimento < hoje) {
        effectiveStatus = 'Atrasado';
      }
      return { ...d, effectiveStatus };
    })
    .filter(d => {
      const searchMatch = d.descricao.toLowerCase().includes(searchTerm.toLowerCase());
      const categoryMatch = categoryFilter === 'Todas' || d.categoria === categoryFilter;
      const statusMatch = statusFilter === 'Todas' || d.effectiveStatus === statusFilter;
      return searchMatch && categoryMatch && statusMatch;
    })
    .sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'Pago': return { text: 'Pago', color: 'bg-green-500/10 text-green-500' };
      case 'Atrasado': return { text: 'Atrasado', color: 'bg-red-500/10 text-red-500' };
      default: return { text: 'Pendente', color: 'bg-yellow-500/10 text-yellow-500' };
    }
  };

  const formasPagamento = ['Cartão de Crédito', 'Débito', 'PIX', 'Boleto', 'Dinheiro', 'Outro'];

  // Alertas
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const alertas = despesas
    .filter(d => d.status !== 'Pago')
    .map(d => {
      const vencimento = new Date(d.data + 'T00:00:00');
      const diffTime = vencimento - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return { ...d, message: `Esta despesa está atrasada há ${Math.abs(diffDays)} dia(s).`, type: 'error' };
      }
      if (diffDays === 0) {
        return { ...d, message: `Esta despesa vence hoje!`, type: 'warning' };
      }
      if (diffDays === 1) {
        return { ...d, message: `Esta despesa vence amanhã.`, type: 'info' };
      }
      return null;
    }).filter(Boolean);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header e Saldo Total de Despesas */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="border-l-4 border-red-600 pl-4">
          <h2 className="text-white font-bold text-2xl">Despesas</h2>
          <p className="text-gray-400 text-sm">Gestão de Gastos</p>
        </div>

        <div className="bg-[#14191e] border border-red-500/20 px-8 py-4 rounded-2xl shadow-2xl flex flex-col items-end">
          <p className="text-red-500/50 text-xs font-bold uppercase tracking-widest mb-1">Total de Gastos no Mês</p>
          <h3 className="text-3xl font-black text-red-500">
            R$ {totalMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
        </div>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.slice(0, 3).map(alerta => (
            <div key={alerta.id} className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-3 ${
              alerta.type === 'error' ? 'bg-red-500/10 text-red-400' : 
              alerta.type === 'warning' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-blue-500/10 text-blue-400'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <span><b>{alerta.descricao}:</b> {alerta.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-[#14191e] border border-white/5 p-8 rounded-3xl shadow-2xl mt-8">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2 md:col-span-2 lg:col-span-1">
              <label className="text-gray-400 text-xs font-semibold">Descrição <span className="text-red-500">*</span></label>
              <input type="text" className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:border-red-600 outline-none transition-all" value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})} required />
            </div>
            
            <div className="space-y-2">
              <label className="text-gray-400 text-xs font-semibold">Categoria <span className="text-red-500">*</span></label>
              <select 
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-red-600 outline-none transition-all" 
                value={formData.categoria}
                onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                required
              >
                <option value="">Selecione...</option>
                {categorias.map(cat => <option key={cat.id} value={cat.nome} className="bg-black">{cat.nome}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-gray-400 text-xs font-semibold">Valor <span className="text-red-500">*</span></label>
              <input type="number" step="0.01" min="0.01" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-red-600 outline-none transition-all" value={formData.valor} onChange={(e) => setFormData({...formData, valor: e.target.value})} required />
            </div>

            <div className="space-y-2">
              <label className="text-gray-400 text-xs font-semibold">Data de Vencimento <span className="text-red-500">*</span></label>
              <input 
                type="date" 
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm [color-scheme:dark] focus:border-red-600 outline-none transition-all cursor-pointer" 
                value={formData.data} 
                onClick={(e) => e.target.showPicker?.()}
                onChange={(e) => setFormData({...formData, data: e.target.value})} 
                required 
              />
            </div>

            <div className="space-y-2">
              <label className="text-gray-400 text-xs font-semibold">Status</label>
              <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-red-600 outline-none transition-all">
                <option value="Pendente">Pendente</option>
                <option value="Pago">Pago</option>
              </select>
            </div>

            {formData.status === 'Pago' && (
              <div className="space-y-2">
                <label className="text-gray-400 text-xs font-semibold">Data de Pagamento</label>
                <input type="date" value={formData.dataPagamento} onChange={(e) => setFormData({...formData, dataPagamento: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm [color-scheme:dark] focus:border-red-600 outline-none transition-all cursor-pointer" />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-gray-400 text-xs font-semibold">Forma de Pagamento</label>
              <select value={formData.formaPagamento} onChange={(e) => setFormData({...formData, formaPagamento: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-red-600 outline-none transition-all">
                <option value="">Nenhuma</option>
                {formasPagamento.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div className="space-y-2 lg:col-span-3">
              <label className="text-gray-400 text-xs font-semibold">Observação</label>
              <textarea value={formData.observacao} onChange={(e) => setFormData({...formData, observacao: e.target.value})} rows="2" className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:border-red-600 outline-none transition-all" />
            </div>

            <div className="lg:col-span-3 flex justify-between items-center gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" checked={formData.recorrente} onChange={(e) => setFormData({...formData, recorrente: e.target.checked})} className="w-4 h-4 rounded border-white/20 bg-black/20 text-red-600 focus:ring-red-600/50 accent-red-600" />
                <span className="text-xs font-semibold text-gray-300 group-hover:text-white">Repetir esta despesa</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                {editingId && (
                  <button type="button" onClick={resetForm} className="px-8 py-3 rounded-xl font-bold uppercase text-xs tracking-widest text-gray-400 hover:text-white transition-all">
                    Cancelar
                  </button>
                )}
                <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-xs tracking-widest px-10 py-3 rounded-xl transition-all shadow-lg shadow-red-600/20">
                  {editingId ? 'Salvar Alterações' : 'Registrar Despesa'}
                </button>
              </div>
            </div>
        </form>
      </div>

      <div className="bg-black border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/10 bg-zinc-900/50 flex flex-col md:flex-row gap-4 justify-between items-center">
          <h3 className="text-white font-semibold text-sm">Histórico de Lançamentos</h3>
          
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500 w-full sm:w-auto" />
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500 w-full sm:w-auto">
              <option value="Todas">Todas as Categorias</option>
              {categorias.map(cat => <option key={cat.id} value={cat.nome}>{cat.nome}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500 w-full sm:w-auto">
              <option value="Todas">Todos os Status</option>
              <option value="Pendente">Pendentes</option>
              <option value="Pago">Pagas</option>
              <option value="Atrasado">Atrasadas</option>
            </select>
            <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500 w-full sm:w-auto">
              {meses.map((mes) => (<option key={mes} value={`${mes} ${anoAtual}`}>{mes} {anoAtual}</option>))}
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="text-xs uppercase font-bold text-gray-400 bg-zinc-900">
              <tr>
                <th className="px-6 py-4 cursor-pointer hover:text-white" onClick={() => requestSort('descricao')}>Descrição</th>
                <th className="px-6 py-4 cursor-pointer hover:text-white" onClick={() => requestSort('categoria')}>Categoria</th>
                <th className="px-6 py-4 cursor-pointer hover:text-white" onClick={() => requestSort('data')}>Vencimento</th>
                <th className="px-6 py-4 cursor-pointer hover:text-white text-right" onClick={() => requestSort('valor')}>Valor</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {despesasFiltradas.map((item) => {
                const statusInfo = getStatusInfo(item.effectiveStatus);
                return (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-white">{item.descricao}</p>
                      {item.observacao && <p className="text-xs text-gray-500 italic mt-1">{item.observacao}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-red-500/10 text-red-400 text-xs font-bold px-2 py-1 rounded-md uppercase">{item.categoria}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-300 font-medium">
                      {new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </td>
                    <td className="px-6 py-4 text-red-500 font-bold text-right">
                      R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => toggleStatus(item)} title="Clique para alterar o status" className={`text-xs font-bold px-2 py-1 rounded-md uppercase transition-all shadow-sm ${statusInfo.color}`}>
                        {statusInfo.text}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => handleDuplicate(item)} className="p-2 text-gray-400 hover:text-green-500" title="Duplicar"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                        <button onClick={() => handlePostpone(item)} className="p-2 text-gray-400 hover:text-yellow-500" title="Adiar Vencimento"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></button>
                        <button onClick={() => handleEdit(item)} className="p-2 text-gray-400 hover:text-blue-500" title="Editar"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-500" title="Excluir"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {despesasFiltradas.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-gray-500 text-sm">
                    <p>Nenhuma despesa encontrada com os filtros selecionados.</p>
                    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="mt-4 bg-red-600/20 text-red-400 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-600/40">
                      Registrar primeira despesa
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Layout de Cards para Mobile */}
        <div className="block md:hidden p-4 space-y-4">
          {despesasFiltradas.map((item) => {
            const statusInfo = getStatusInfo(item.effectiveStatus);
            return (
              <div key={item.id} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-bold text-white text-base">{item.descricao}</p>
                    <span className="bg-red-500/10 text-red-400 text-xs font-bold px-2 py-1 rounded-md uppercase">{item.categoria}</span>
                  </div>
                  <p className="text-red-500 font-bold text-lg">
                    R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-400 border-t border-white/5 pt-3">
                  <div className="flex flex-col">
                    <span className="font-bold">Vencimento</span>
                    <span>{new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                  </div>
                  <button onClick={() => toggleStatus(item)} title="Clique para alterar o status" className={`text-xs font-bold px-3 py-1.5 rounded-md uppercase transition-all shadow-sm ${statusInfo.color}`}>
                    {statusInfo.text}
                  </button>
                </div>
                <div className="flex justify-end gap-2 border-t border-white/5 pt-3">
                    <button onClick={() => handleDuplicate(item)} className="p-2 text-gray-400 hover:text-green-500" title="Duplicar"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                    <button onClick={() => handlePostpone(item)} className="p-2 text-gray-400 hover:text-yellow-500" title="Adiar Vencimento"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></button>
                    <button onClick={() => handleEdit(item)} className="p-2 text-gray-400 hover:text-blue-500" title="Editar"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-500" title="Excluir"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
};

export default Despesas;