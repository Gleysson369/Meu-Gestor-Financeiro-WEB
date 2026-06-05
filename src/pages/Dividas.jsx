import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc, orderBy, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Link, useLocation } from 'react-router-dom';

const Dividas = () => {
  const [user, setUser] = useState(null);
  const [dividas, setDividas] = useState([]);
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  const [formData, setFormData] = useState({
    credor: '',
    valorTotalDivida: '', // Valor sem juros
    valorEntrada: '',
    parcelas: '',
    valorParcela: '',
  });
  const [editingId, setEditingId] = useState(null);

  // Cálculos de Simulação
  const totalAcordoSimulado = (Number(formData.valorParcela || 0) * Number(formData.parcelas || 0)) + Number(formData.valorEntrada || 0);
  const jurosSimulados = totalAcordoSimulado > 0 
    ? totalAcordoSimulado - Number(formData.valorTotalDivida || 0) 
    : 0;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const fetchDividas = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, "usuarios", user.uid));
      const partnerId = userDoc.data()?.parceiroId;
      const ids = partnerId ? [user.uid, partnerId] : [user.uid];

      const q = query(collection(db, "dividas"), where("userId", "in", ids), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setDividas(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Erro ao buscar dívidas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchDividas();
  }, [user]);

  const handleRegistrar = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        credor: formData.credor,
        valorTotalDivida: parseFloat(formData.valorTotalDivida),
        valorEntrada: parseFloat(formData.valorEntrada || 0),
        parcelas: parseInt(formData.parcelas),
        valorParcela: parseFloat(formData.valorParcela),
        userId: user.uid,
        updatedAt: new Date()
      };

      if (editingId) {
        await updateDoc(doc(db, "dividas", editingId), payload);
        setEditingId(null);
      } else {
        await addDoc(collection(db, "dividas"), {
          ...payload,
          parcelasPagas: 0,
          createdAt: new Date()
        });
      }

      setFormData({ credor: '', valorTotalDivida: '', valorEntrada: '', parcelas: '', valorParcela: '' });
      fetchDividas();
    } catch (error) {
      console.error(error);
    }
  };

  const pagarParcela = async (item) => {
    if (item.parcelasPagas >= item.parcelas) return;
    try {
      const docRef = doc(db, "dividas", item.id);
      await updateDoc(docRef, {
        parcelasPagas: item.parcelasPagas + 1
      });
      fetchDividas();
    } catch (error) {
      console.error(error);
    }
  };

  const desfazerPagamento = async (item) => {
    if (item.parcelasPagas <= 0) return;
    try {
      const docRef = doc(db, "dividas", item.id);
      await updateDoc(docRef, {
        parcelasPagas: item.parcelasPagas - 1
      });
      fetchDividas();
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      credor: item.credor,
      valorTotalDivida: item.valorTotalDivida,
      valorEntrada: item.valorEntrada,
      parcelas: item.parcelas,
      valorParcela: item.valorParcela,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Deseja excluir este acordo permanentemente?")) {
      await deleteDoc(doc(db, "dividas", id));
      fetchDividas();
    }
  };

  return (
    <div className="space-y-10 animate-fadeIn">
      {/* Título Principal */}
      <div className="border-l-4 border-red-600 pl-4">
        <h2 className="text-white font-black italic uppercase tracking-tighter text-3xl mb-1">Dívidas & Acordos</h2>
        <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.2em]">Gerencie e liquide seus passivos</p>
      </div>

      {/* Card Superior - Registro com Efeito Vidro */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-2xl">
        <h3 className="text-white font-black uppercase text-xs tracking-widest mb-8 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-neon-red shadow-[0_0_10px_#ff2d55]"></span>
          Simular / Registrar Acordo
        </h3>

        <form onSubmit={handleRegistrar} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Credor</label>
            <input 
              type="text" 
              placeholder="Banco ou Credor"
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-white text-sm outline-none focus:border-neon-red transition-all"
              value={formData.credor}
              onChange={(e) => setFormData({...formData, credor: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Valor da Dívida (s/ juros)</label>
            <input 
              type="number" 
              placeholder="R$ Valor Original"
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-white text-sm outline-none focus:border-neon-red transition-all"
              value={formData.valorTotalDivida}
              onChange={(e) => setFormData({...formData, valorTotalDivida: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Valor de Entrada</label>
            <input 
              type="number" 
              placeholder="R$ 0,00"
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-white text-sm outline-none focus:border-neon-red transition-all"
              value={formData.valorEntrada}
              onChange={(e) => setFormData({...formData, valorEntrada: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Valor da Prestação</label>
            <input 
              type="number" 
              placeholder="R$ Valor p/ Mês"
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-white text-sm outline-none focus:border-neon-red transition-all"
              value={formData.valorParcela}
              onChange={(e) => setFormData({...formData, valorParcela: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Qtd de Parcelas</label>
            <input 
              type="number" 
              placeholder="Ex: 12"
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-white text-sm outline-none focus:border-neon-red transition-all"
              value={formData.parcelas}
              onChange={(e) => setFormData({...formData, parcelas: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest opacity-50">Juros do Acordo</label>
            <div className={`w-full bg-white/5 border border-white/5 rounded-xl px-4 py-4 text-sm font-black ${jurosSimulados > 0 ? 'text-orange-500' : 'text-green-500'}`}>
              R$ {jurosSimulados.toFixed(2)}
            </div>
          </div>

          <div className="lg:col-span-4 flex gap-4 pt-2">
            {editingId && (
              <button type="button" onClick={() => {setEditingId(null); setFormData({credor:'', valorTotalDivida:'', valorEntrada:'', parcelas:'', valorParcela:''})}} className="flex-1 bg-white/5 text-white font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-white/10 transition-all">Cancelar</button>
            )}
            <button 
              type="submit"
              className="flex-[3] bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] tracking-widest h-[56px] rounded-xl transition-all shadow-lg shadow-red-600/20"
            >
              {editingId ? 'Salvar Alterações' : 'Registrar Acordo'}
            </button>
          </div>
        </form>
      </div>

      {/* Seção de Acompanhamento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {dividas.map((item) => {
          const totalAcordo = (item.valorParcela * item.parcelas) + item.valorEntrada;
          const totalPago = (item.parcelasPagas * item.valorParcela) + item.valorEntrada;
          const saldoRestante = totalAcordo - totalPago;
          const jurosAcordo = totalAcordo - item.valorTotalDivida;
          const percentual = totalAcordo > 0 ? Math.round((totalPago / totalAcordo) * 100) : 0;
          const isAtrasado = false; // Logica futura: comparar data atual com vencimento

          return (
            <div key={item.id} className="bg-white/[0.03] backdrop-blur-md border border-white/5 p-6 rounded-3xl space-y-6 group hover:border-neon-red/30 transition-all">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <h4 className="text-white font-black uppercase text-sm tracking-tighter">{item.credor}</h4>
                  <span className={`w-fit px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isAtrasado ? 'bg-orange-500/10 text-orange-500' : 'bg-green-500/10 text-green-500'}`}>
                    {isAtrasado ? 'Aviso' : 'Em dia'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(item)} className="p-2 text-gray-500 hover:text-blue-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-500 hover:text-red-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-2xl font-black text-white">R$ {Number(item.valorParcela).toLocaleString('pt-BR', {minimumFractionDigits: 2})} <span className="text-gray-500 text-xs font-normal">/ mês</span></p>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Faltam {item.parcelas - item.parcelasPagas} de {item.parcelas} parcelas</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase">
                  <span className="text-gray-500">Evolução</span>
                  <span className="text-neon-red">{percentual}% Pago</span>
                </div>
                <div className="w-full bg-black h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-red-600 to-neon-red transition-all duration-1000 shadow-[0_0_10px_#ff2d55]" 
                    style={{ width: `${percentual}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex justify-between items-end pt-2">
                <div className="space-y-1">
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Principal: R$ {item.valorTotalDivida.toLocaleString('pt-BR')}</p>
                  <p className="text-[9px] text-orange-500 font-bold uppercase tracking-widest">Juros: R$ {jurosAcordo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                  <p className="text-[9px] text-green-500 font-bold uppercase tracking-widest">Total Pago: R$ {totalPago.toLocaleString('pt-BR')}</p>
                  <p className="text-[9px] text-neon-red font-bold uppercase tracking-widest">A Pagar: R$ {saldoRestante.toLocaleString('pt-BR')}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => desfazerPagamento(item)}
                    title="Desfazer último pagamento"
                    className="bg-white/5 hover:bg-white/10 text-gray-400 p-2.5 rounded-xl transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  </button>
                  <button 
                    onClick={() => pagarParcela(item)}
                    disabled={item.parcelasPagas >= item.parcelas}
                    className="bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-red-600/20 disabled:opacity-30"
                  >
                    Pagar Parcela
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dividas;