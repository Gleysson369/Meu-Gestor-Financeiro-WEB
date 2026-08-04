import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
<<<<<<< HEAD
import { collection, addDoc, getDocs, query, where, doc, deleteDoc, updateDoc, orderBy, getDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useNotification } from '../components/NotificationProvider.jsx';

const Reserva = () => {
  const { notify, confirm } = useNotification();
=======
import { collection, addDoc, getDocs, query, where, doc, deleteDoc, updateDoc, orderBy, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const Reserva = () => {
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
  const [user, setUser] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
<<<<<<< HEAD
  const [showAporteModal, setShowAporteModal] = useState(false);
  const [currentReserveForAporte, setCurrentReserveForAporte] = useState(null);
=======
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
  
  const [formData, setFormData] = useState({
    objetivo: '',
    valorTotal: '',
<<<<<<< HEAD
    valorEconomizado: '',
    dataDesejada: '', // Novo campo
    categoriaFinalidade: '', // Novo campo
    valorMensalPlanejado: '', // Novo campo
    status: 'Ativa', // Ativa, Pausada, Concluída
=======
    valorEconomizado: ''
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
  });

  // 1. Monitorar estado de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 2. Buscar Reservas do Firebase
  const fetchReservas = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, "usuarios", user.uid));
      const partnerId = userDoc.data()?.parceiroId;
      const ids = partnerId ? [user.uid, partnerId] : [user.uid];

      const q = query(
        collection(db, "reservas"),
        where("userId", "in", ids),
<<<<<<< HEAD
        // orderBy("dataDesejada", "asc") // Removido para incluir reservas sem dataDesejada
=======
        orderBy("createdAt", "desc")
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReservas(data);
    } catch (error) {
      console.error("Erro ao buscar reservas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchReservas();
  }, [user]);

  // 3. Salvar ou Atualizar Reserva
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        objetivo: formData.objetivo,
        valorTotal: parseFloat(formData.valorTotal),
<<<<<<< HEAD
        valorEconomizado: parseFloat(formData.valorEconomizado || 0), // Garante que seja número
        dataDesejada: formData.dataDesejada,
        categoriaFinalidade: formData.categoriaFinalidade,
        valorMensalPlanejado: parseFloat(formData.valorMensalPlanejado || 0), // Garante que seja número
        status: formData.status,
=======
        valorEconomizado: parseFloat(formData.valorEconomizado),
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
        userId: user.uid,
        updatedAt: new Date()
      };

      if (editingId) {
        await updateDoc(doc(db, "reservas", editingId), payload);
<<<<<<< HEAD
        notify('Reserva atualizada com sucesso!', 'success');
      } else {
        await addDoc(collection(db, "reservas"), { ...payload, createdAt: new Date() });
        notify('Reserva criada com sucesso!', 'success');
      }

      setFormData({ objetivo: '', valorTotal: '', valorEconomizado: '', dataDesejada: '', categoriaFinalidade: '', valorMensalPlanejado: '', status: 'Ativa' });
      fetchReservas();
    } catch (error) {
      console.error("Erro ao salvar reserva:", error);
      notify('Erro ao salvar reserva. Tente novamente.', 'danger');
=======
        setEditingId(null);
      } else {
        await addDoc(collection(db, "reservas"), { ...payload, createdAt: new Date() });
      }

      setFormData({ objetivo: '', valorTotal: '', valorEconomizado: '' });
      fetchReservas();
    } catch (error) {
      console.error("Erro ao salvar reserva:", error);
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      objetivo: item.objetivo,
      valorTotal: item.valorTotal,
<<<<<<< HEAD
      valorEconomizado: item.valorEconomizado,
      dataDesejada: item.dataDesejada || '',
      categoriaFinalidade: item.categoriaFinalidade || '',
      valorMensalPlanejado: item.valorMensalPlanejado || '',
      status: item.status || 'Ativa',
=======
      valorEconomizado: item.valorEconomizado
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

<<<<<<< HEAD
  const handleAporte = (item) => {
    setCurrentReserveForAporte(item);
    setShowAporteModal(true);
  };

  const handleAporteSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const valorAporte = parseFloat(form.valor.value);
    const dataAporte = form.data.value;
    const observacaoAporte = form.observacao.value;
    const contaOrigemAporte = form.contaOrigem.value;

    if (isNaN(valorAporte) || valorAporte <= 0) {
      notify('Informe um valor de aporte válido.', 'warning');
      return;
    }

    try {
      const docRef = doc(db, "reservas", currentReserveForAporte.id);
      const novoValorEconomizado = currentReserveForAporte.valorEconomizado + valorAporte;
      
      const aporte = {
        valor: valorAporte,
        data: dataAporte,
        observacao: observacaoAporte,
        contaOrigem: contaOrigemAporte,
        timestamp: new Date(),
      };

      await updateDoc(docRef, {
        valorEconomizado: novoValorEconomizado,
        aportes: arrayUnion(aporte) // Adiciona o aporte ao array
      });
      notify('Aporte adicionado com sucesso!', 'success');
      setShowAporteModal(false);
      fetchReservas();
    } catch (error) {
      console.error("Erro ao adicionar aporte:", error);
      notify('Erro ao adicionar aporte.', 'danger');
    }
  };

  const handleUpdateStatus = async (item, newStatus) => {
    const confirmed = await confirm({
      title: 'Atualizar Reserva',
      message: `Deseja ${newStatus === 'Concluída' ? 'concluir' : 'pausar'} esta reserva?`,
      confirmText: 'Sim',
      cancelText: 'Cancelar'
    });

    if (!confirmed) return;

    try {
      await updateDoc(doc(db, "reservas", item.id), { status: newStatus });
      fetchReservas();
      notify(`Reserva ${newStatus.toLowerCase()} com sucesso!`, 'success');
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      notify('Erro ao atualizar status da reserva.', 'danger');
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Excluir Reserva',
      message: 'Deseja excluir este plano de reserva?',
      confirmText: 'Excluir',
      cancelText: 'Cancelar'
    });

    if (!confirmed) return;
    await deleteDoc(doc(db, "reservas", id));
    fetchReservas();
=======
  const handleDelete = async (id) => {
    if (window.confirm("Deseja excluir este plano de reserva?")) {
      await deleteDoc(doc(db, "reservas", id));
      fetchReservas();
    }
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
  };

  return (
    <div className="space-y-8 animate-fadeIn">
<<<<<<< HEAD
      <div className="border-l-4 border-purple-500 pl-4">
        <h2 className="text-white font-bold text-2xl">Reservas</h2>
        <p className="text-gray-400 text-sm">Planos de Futuro e Metas</p>
      </div>

      {/* Formulário de Cadastro/Edição */}
      <div className="bg-[#14191e] border border-white/5 p-8 rounded-3xl shadow-2xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-gray-400 text-xs font-semibold">Objetivo <span className="text-red-500">*</span></label>
            <input type="text" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500 outline-none transition-all" value={formData.objetivo} onChange={(e) => setFormData({...formData, objetivo: e.target.value})} placeholder="Ex: Viagem, Carro, etc" required />
          </div>
          <div className="space-y-2">
            <label className="text-gray-400 text-xs font-semibold">Valor Total do Objetivo <span className="text-red-500">*</span></label>
            <input type="number" step="0.01" min="0.01" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500 outline-none transition-all" value={formData.valorTotal} onChange={(e) => setFormData({...formData, valorTotal: e.target.value})} required />
          </div>
          <div className="space-y-2">
            <label className="text-gray-400 text-xs font-semibold">Valor Economizado <span className="text-red-500">*</span></label>
            <input type="number" step="0.01" min="0" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500 outline-none transition-all" value={formData.valorEconomizado} onChange={(e) => setFormData({...formData, valorEconomizado: e.target.value})} required />
          </div>
          <div className="space-y-2">
            <label className="text-gray-400 text-xs font-semibold">Data Desejada</label>
            <input type="date" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm [color-scheme:dark] focus:border-purple-500 outline-none transition-all cursor-pointer" value={formData.dataDesejada} onChange={(e) => setFormData({...formData, dataDesejada: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-gray-400 text-xs font-semibold">Categoria/Finalidade</label>
            <input type="text" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500 outline-none transition-all" value={formData.categoriaFinalidade} onChange={(e) => setFormData({...formData, categoriaFinalidade: e.target.value})} placeholder="Ex: Viagem, Educação" />
          </div>
          <div className="space-y-2">
            <label className="text-gray-400 text-xs font-semibold">Valor Mensal Planejado</label>
            <input type="number" step="0.01" min="0" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500 outline-none transition-all" value={formData.valorMensalPlanejado} onChange={(e) => setFormData({...formData, valorMensalPlanejado: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-gray-400 text-xs font-semibold">Status</label>
            <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500 outline-none transition-all">
              <option value="Ativa">Ativa</option>
              <option value="Pausada">Pausada</option>
              <option value="Concluída">Concluída</option>
            </select>
          </div>
          <div className="lg:col-span-3 flex items-end justify-end gap-3">
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setFormData({objetivo:'', valorTotal:'', valorEconomizado:'', dataDesejada:'', categoriaFinalidade:'', valorMensalPlanejado:'', status: 'Ativa'})}} className="flex-1 px-4 py-3 rounded-xl font-bold uppercase text-xs tracking-widest text-gray-400 hover:text-white transition-all">
                Cancelar
              </button>
            )}
            <button type="submit" className="flex-[2] bg-purple-600 hover:bg-purple-700 text-white font-bold uppercase text-xs tracking-widest h-[46px] rounded-xl transition-all shadow-lg shadow-purple-600/20">
              {editingId ? 'Salvar Alterações' : 'Criar Reserva'}
=======
      <div className="border-l-4 border-red-600 pl-4">
        <h2 className="text-white font-black italic uppercase tracking-tighter text-3xl">Reservas Financeiras</h2>
        <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.2em]">Planos de Futuro e Metas</p>
      </div>

      <div className="bg-[#14191e] border border-white/5 p-8 rounded-3xl shadow-2xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Objetivo</label>
            <input type="text" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-red-600 outline-none transition-all" value={formData.objetivo} onChange={(e) => setFormData({...formData, objetivo: e.target.value})} placeholder="Ex: Viagem, Carro, etc" required />
          </div>
          <div className="space-y-2">
            <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Valor Total do Objetivo</label>
            <input type="number" step="0.01" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-red-600 outline-none transition-all" value={formData.valorTotal} onChange={(e) => setFormData({...formData, valorTotal: e.target.value})} required />
          </div>
          <div className="space-y-2">
            <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Valor Economizado</label>
            <input type="number" step="0.01" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-red-600 outline-none transition-all" value={formData.valorEconomizado} onChange={(e) => setFormData({...formData, valorEconomizado: e.target.value})} required />
          </div>
          <div className="flex items-end gap-3">
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setFormData({objetivo:'', valorTotal:'', valorEconomizado:''})}} className="flex-1 px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest text-gray-400 hover:text-white transition-all">
                Cancelar
              </button>
            )}
            <button type="submit" className="flex-[2] bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] tracking-widest h-[46px] rounded-xl transition-all shadow-lg shadow-red-600/20">
              {editingId ? 'Salvar Alterações' : 'Gravar Plano'}
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
            </button>
          </div>
        </form>
      </div>

<<<<<<< HEAD
      {/* Tabela de Reservas */}
      <div className="bg-[#14191e] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="text-xs uppercase font-bold text-gray-500 bg-black/20">
=======
      <div className="bg-[#14191e] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="text-[10px] uppercase tracking-widest font-black text-gray-500 bg-black/20">
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
              <tr>
                <th className="px-6 py-4">Objetivo</th>
                <th className="px-6 py-4">Valor Total</th>
                <th className="px-6 py-4">Economizado</th>
                <th className="px-6 py-4">Progresso</th>
<<<<<<< HEAD
                <th className="px-6 py-4">Restante</th>
                <th className="px-6 py-4">Data Prevista</th>
                <th className="px-6 py-4">Mensal Ideal</th>
                <th className="px-6 py-4">Status</th>
=======
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {reservas.map((item) => {
                const progresso = Math.min(Math.round((item.valorEconomizado / item.valorTotal) * 100), 100);
                const isCompleto = progresso >= 100;
<<<<<<< HEAD
                const valorRestante = item.valorTotal - item.valorEconomizado;

                let valorMensalRecomendado = 0;
                let mesesRestantes = 0;
                if (item.dataDesejada && valorRestante > 0) {
                  const hoje = new Date();
                  const dataDesejada = new Date(item.dataDesejada + 'T00:00:00');
                  mesesRestantes = (dataDesejada.getFullYear() - hoje.getFullYear()) * 12;
                  mesesRestantes -= hoje.getMonth();
                  mesesRestantes += dataDesejada.getMonth();
                  if (mesesRestantes > 0) {
                    valorMensalRecomendado = valorRestante / mesesRestantes;
                  }
                }

                return (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 font-bold text-white text-sm">{item.objetivo}</td>
                    <td className="px-6 py-4">R$ {Number(item.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className={`px-6 py-4 font-bold ${isCompleto ? 'text-green-500' : 'text-purple-400'}`}>
=======

                return (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 font-bold text-white uppercase text-xs tracking-wider">{item.objetivo}</td>
                    <td className="px-6 py-4">R$ {Number(item.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className={`px-6 py-4 font-bold ${isCompleto ? 'text-green-500' : 'text-blue-400'}`}>
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
                      R$ {Number(item.valorEconomizado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-grow bg-white/5 rounded-full h-1.5 overflow-hidden">
                          <div 
<<<<<<< HEAD
                            className={`h-full transition-all duration-1000 ${isCompleto ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-purple-500'}`} 
                            style={{ width: `${progresso}%` }}
                          ></div>
                        </div>
                        <span className={`text-xs font-bold w-8 ${isCompleto ? 'text-green-500' : 'text-gray-400'}`}>{progresso}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-white">R$ {valorRestante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-gray-300">{item.dataDesejada ? new Date(item.dataDesejada + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</td>
                    <td className="px-6 py-4 text-blue-400 font-bold">
                      {valorMensalRecomendado > 0 ? `R$ ${valorMensalRecomendado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${
                        item.status === 'Ativa' ? 'bg-blue-500/10 text-blue-400' :
                        item.status === 'Pausada' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-green-500/10 text-green-500'
                      }`}>{item.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleAporte(item)} className="p-2 text-gray-500 hover:text-green-500 transition-colors" title="Adicionar Aporte">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                        <button onClick={() => handleEdit(item)} className="p-2 text-gray-500 hover:text-blue-500 transition-colors" title="Editar">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        {!isCompleto && item.status === 'Ativa' && (
                          <button onClick={() => handleUpdateStatus(item, 'Pausada')} className="p-2 text-gray-500 hover:text-yellow-500 transition-colors" title="Pausar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                          </button>
                        )}
                        {item.status === 'Pausada' && (
                          <button onClick={() => handleUpdateStatus(item, 'Ativa')} className="p-2 text-gray-500 hover:text-blue-500 transition-colors" title="Retomar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                          </button>
                        )}
                        {!isCompleto && (
                          <button onClick={() => handleUpdateStatus(item, 'Concluída')} className="p-2 text-gray-500 hover:text-green-500 transition-colors" title="Concluir">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </button>
                        )}
=======
                            className={`h-full transition-all duration-1000 ${isCompleto ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-600'}`} 
                            style={{ width: `${progresso}%` }}
                          ></div>
                        </div>
                        <span className={`text-[10px] font-black w-8 ${isCompleto ? 'text-green-500' : 'text-gray-500'}`}>{progresso}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-4">
                        <button onClick={() => handleEdit(item)} className="p-2 text-gray-500 hover:text-blue-500 transition-colors" title="Editar">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
                        <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-500 hover:text-red-500 transition-colors" title="Excluir">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {reservas.length === 0 && !loading && (
                <tr>
<<<<<<< HEAD
                  <td colSpan="9" className="px-6 py-12 text-center text-gray-500 text-sm">
                    <p>Nenhum plano de reserva cadastrado.</p>
                    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="mt-4 bg-purple-600/20 text-purple-400 px-4 py-2 rounded-lg text-xs font-bold hover:bg-purple-600/40">
                      Criar primeira reserva
                    </button>
                  </td>
                </tr>
              )}
              {/* Mensagem de Conclusão */}
              {reservas.some(r => r.valorEconomizado >= r.valorTotal) && (
                <tr>
                  <td colSpan="9" className="px-6 py-4 text-center text-green-500 font-bold text-lg">
                    Parabéns! Você alcançou sua meta financeira.
                  </td>
=======
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-600 font-black uppercase text-xs tracking-widest">Nenhum plano de reserva cadastrado.</td>
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
<<<<<<< HEAD

      {/* Modal de Adicionar Aporte */}
      {showAporteModal && currentReserveForAporte && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#14191e] border border-white/10 rounded-3xl p-8 shadow-2xl w-full max-w-md space-y-6 animate-fadeIn">
            <h3 className="text-white font-bold text-lg text-center">Adicionar Aporte para "{currentReserveForAporte.objetivo}"</h3>
            <form onSubmit={handleAporteSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-gray-400 text-xs font-semibold">Valor do Aporte <span className="text-red-500">*</span></label>
                <input type="number" step="0.01" min="0.01" name="valor" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-green-500 outline-none transition-all" required />
              </div>
              <div className="space-y-2">
                <label className="text-gray-400 text-xs font-semibold">Data do Aporte <span className="text-red-500">*</span></label>
                <input type="date" name="data" defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm [color-scheme:dark] focus:border-green-500 outline-none transition-all cursor-pointer" required />
              </div>
              <div className="space-y-2">
                <label className="text-gray-400 text-xs font-semibold">Conta de Origem</label>
                <input type="text" name="contaOrigem" placeholder="Ex: Salário, Poupança" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-green-500 outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-gray-400 text-xs font-semibold">Observação</label>
                <textarea name="observacao" rows="2" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-green-500 outline-none transition-all" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowAporteModal(false)} className="px-6 py-2 rounded-xl font-bold uppercase text-xs tracking-widest text-gray-400 hover:text-white transition-all">Cancelar</button>
                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold uppercase text-xs tracking-widest px-6 py-2 rounded-xl transition-all shadow-lg shadow-green-600/20">Registrar Aporte</button>
              </div>
            </form>

            {/* Histórico de Aportes */}
            {currentReserveForAporte.aportes && currentReserveForAporte.aportes.length > 0 && (
              <div className="mt-6 border-t border-white/10 pt-6">
                <h4 className="text-white font-bold text-md mb-4">Histórico de Aportes</h4>
                <div className="max-h-40 overflow-y-auto custom-scrollbar pr-2">
                  {currentReserveForAporte.aportes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map((aporte, idx) => (
                    <div key={idx} className="bg-black/20 p-3 rounded-lg mb-2 text-xs text-gray-300">
                      <div className="flex justify-between items-center">
                        <span className="font-bold">{new Date(aporte.data).toLocaleDateString('pt-BR')}</span>
                        <span className="text-green-400 font-bold">+ R$ {Number(aporte.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      {aporte.observacao && <p className="italic text-gray-500 mt-1">{aporte.observacao}</p>}
                      {aporte.contaOrigem && <p className="text-gray-500">Origem: {aporte.contaOrigem}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}


=======
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
    </div>
  );
};

export default Reserva;