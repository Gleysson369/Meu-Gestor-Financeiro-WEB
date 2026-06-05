import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { collection, addDoc, getDocs, query, where, doc, deleteDoc, updateDoc, orderBy, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const Reserva = () => {
  const [user, setUser] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    objetivo: '',
    valorTotal: '',
    valorEconomizado: ''
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
        orderBy("createdAt", "desc")
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
        valorEconomizado: parseFloat(formData.valorEconomizado),
        userId: user.uid,
        updatedAt: new Date()
      };

      if (editingId) {
        await updateDoc(doc(db, "reservas", editingId), payload);
        setEditingId(null);
      } else {
        await addDoc(collection(db, "reservas"), { ...payload, createdAt: new Date() });
      }

      setFormData({ objetivo: '', valorTotal: '', valorEconomizado: '' });
      fetchReservas();
    } catch (error) {
      console.error("Erro ao salvar reserva:", error);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      objetivo: item.objetivo,
      valorTotal: item.valorTotal,
      valorEconomizado: item.valorEconomizado
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Deseja excluir este plano de reserva?")) {
      await deleteDoc(doc(db, "reservas", id));
      fetchReservas();
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
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
            </button>
          </div>
        </form>
      </div>

      <div className="bg-[#14191e] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="text-[10px] uppercase tracking-widest font-black text-gray-500 bg-black/20">
              <tr>
                <th className="px-6 py-4">Objetivo</th>
                <th className="px-6 py-4">Valor Total</th>
                <th className="px-6 py-4">Economizado</th>
                <th className="px-6 py-4">Progresso</th>
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
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-600 font-black uppercase text-xs tracking-widest">Nenhum plano de reserva cadastrado.</td>
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