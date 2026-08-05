import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { collection, addDoc, getDocs, query, where, doc, deleteDoc, updateDoc, orderBy, getDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useNotification } from '../components/NotificationProvider.jsx';

const Reserva = () => {
  const { notify, confirm } = useNotification();
  const [user, setUser] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showAporteModal, setShowAporteModal] = useState(false);
  const [currentReserveForAporte, setCurrentReserveForAporte] = useState(null);
  
  const [formData, setFormData] = useState({
    objetivo: '',
    valorTotal: '',
    valorEconomizado: '',
    dataDesejada: '', // Novo campo
    categoriaFinalidade: '', // Novo campo
    valorMensalPlanejado: '', // Novo campo
    status: 'Ativa', // Ativa, Pausada, Concluída
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
        // orderBy("dataDesejada", "asc") // Removido para incluir reservas sem dataDesejada
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
        valorEconomizado: parseFloat(formData.valorEconomizado || 0), // Garante que seja número
        dataDesejada: formData.dataDesejada,
        categoriaFinalidade: formData.categoriaFinalidade,
        valorMensalPlanejado: parseFloat(formData.valorMensalPlanejado || 0), // Garante que seja número
        status: formData.status,
        userId: user.uid,
        updatedAt: new Date()
      };

      if (editingId) {
        await updateDoc(doc(db, "reservas", editingId), payload);
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
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      objetivo: item.objetivo,
      valorTotal: item.valorTotal,
      valorEconomizado: item.valorEconomizado,
      dataDesejada: item.dataDesejada || '',
      categoriaFinalidade: item.categoriaFinalidade || '',
      valorMensalPlanejado: item.valorMensalPlanejado || '',
      status: item.status || 'Ativa',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
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
  };

  return (
    <div className="space-y-8 animate-fadeIn">      
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
            </button>
          </div>
        </form>
      </div>

      {/* Tabela de Reservas */}
      <div className="bg-[#14191e] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="text-xs uppercase font-bold text-gray-500 bg-black/20">
              <tr>
                <th className="px-6 py-4">Objetivo</th>
                <th className="px-6 py-4">Valor Total</th>
                <th className="px-6 py-4">Economizado</th>
                <th className="px-6 py-4">Progresso</th>
                <th className="px-6 py-4">Restante</th>
                <th className="px-6 py-4">Data Prevista</th>
                <th className="px-6 py-4">Mensal Ideal</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {reservas.map((item) => {
                const progresso = Math.min(Math.round((item.valorEconomizado / item.valorTotal) * 100), 100);
                const isCompleto = progresso >= 100;

                return (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 font-bold text-white uppercase text-xs tracking-wider">{item.objetivo}</td>
                    <td className="px-6 py-4">R$ {Number(item.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className={`px-6 py-4 font-bold ${isCompleto ? 'text-green-500' : 'text-blue-400'}`}>
                      R$ {Number(item.valorEconomizado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-grow bg-white/5 rounded-full h-1.5 overflow-hidden">
                          <div 
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
                  <td colSpan="9" className="px-6 py-12 text-center text-gray-500 text-sm">Nenhum plano de reserva cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reserva;