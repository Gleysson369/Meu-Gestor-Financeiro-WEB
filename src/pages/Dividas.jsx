import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc, orderBy, getDoc, arrayUnion } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useNotification } from '../components/NotificationProvider.jsx';

const Dividas = () => {
  const today = new Date();
  const [user, setUser] = useState(null);
  const [dividas, setDividas] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    credor: '',
    valorTotalDivida: '', // Valor sem juros
    valorEntrada: '',
    parcelas: '',
    valorParcela: '',
    taxaJuros: '', // Novo
    dataPrimeiraParcela: '', // Novo
    diaVencimento: '', // Novo
    observacao: '', // Novo
  });
  const [editingId, setEditingId] = useState(null);
  const [viewingInstallments, setViewingInstallments] = useState(null); // Para o modal de parcelas
  const { notify, confirm } = useNotification();

  const resetForm = () => {
    setEditingId(null);
    setFormData({ credor: '', valorTotalDivida: '', valorEntrada: '', parcelas: '', valorParcela: '', taxaJuros: '', dataPrimeiraParcela: '', diaVencimento: '', observacao: '' });
  };

  // Cálculos de Simulação
  const totalAcordoSimulado = (Number(formData.valorParcela || 0) * Number(formData.parcelas || 0)) + Number(formData.valorEntrada || 0);
  const jurosSimulados = totalAcordoSimulado > 0 
    ? totalAcordoSimulado - Number(formData.valorTotalDivida || 0) 
    : 0;
  
  // Indicadores Gerais
  const totalDividas = dividas.reduce((acc, d) => acc + ((d.valorParcela * d.parcelas) + d.valorEntrada), 0);
  const totalPago = dividas.reduce((acc, d) => acc + ((d.parcelasPagas * d.valorParcela) + d.valorEntrada), 0);
  const saldoDevedor = totalDividas - totalPago;
  const valorMensalComprometido = dividas.filter(d => d.parcelasPagas < d.parcelas).reduce((acc, d) => acc + d.valorParcela, 0);

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
        taxaJuros: parseFloat(formData.taxaJuros || 0),
        dataPrimeiraParcela: formData.dataPrimeiraParcela,
        diaVencimento: parseInt(formData.diaVencimento || today.getDate()),
        observacao: formData.observacao,
        userId: user.uid,
        updatedAt: new Date()
      };

      if (editingId) {
        await updateDoc(doc(db, "dividas", editingId), payload);
        notify('Acordo atualizado com sucesso!', 'success');
        resetForm();
      } else {
        await addDoc(collection(db, "dividas"), {
          ...payload,
          parcelasPagas: 0,
          createdAt: new Date()
        });
      }

      resetForm();
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
        parcelasPagas: item.parcelasPagas + 1,
        historicoPagamentos: arrayUnion({
          data: new Date().toISOString(),
          valor: item.valorParcela,
          parcela: item.parcelasPagas + 1,
        })
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
      taxaJuros: item.taxaJuros || '',
      dataPrimeiraParcela: item.dataPrimeiraParcela || '',
      diaVencimento: item.diaVencimento || '',
      observacao: item.observacao || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Excluir Acordo',
      message: 'Deseja excluir este acordo permanentemente?',
      confirmText: 'Excluir',
      cancelText: 'Cancelar'
    });

    if (!confirmed) return;
    await deleteDoc(doc(db, "dividas", id));
    fetchDividas();
  };

  const getStatus = (item) => {
    const { parcelas, parcelasPagas, diaVencimento } = item;
    if (parcelasPagas >= parcelas) {
      return { text: 'Quitada', color: 'blue', icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> };
    }

    const hoje = today.getDate();
    const diff = diaVencimento - hoje;

    if (diff < 0) {
      return { text: 'Atrasada', color: 'red', icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> };
    }
    if (diff <= 5) {
      return { text: `Vence em ${diff} dia(s)`, color: 'yellow', icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="6" x2="12" y2="12"></line><polyline points="12 12 16 14"></polyline></svg> };
    }
    return { text: 'Em dia', color: 'green', icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"></path></svg> };
  };

  const colorMap = {
    green: 'bg-green-500/10 text-green-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
    red: 'bg-red-500/10 text-red-400',
    blue: 'bg-blue-500/10 text-blue-400',
  };

  return (
    <div className="space-y-10 animate-fadeIn">
      {/* Título Principal */}
      <div className="border-l-4 border-red-500 pl-4">
        <h2 className="text-white font-bold text-2xl mb-1">Dívidas e Acordos</h2>
        <p className="text-gray-400 text-sm">Gerencie e liquide seus passivos</p>
      </div>

      {/* Indicadores Gerais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#14191e] border border-white/5 p-4 rounded-2xl text-center">
          <p className="text-xs font-bold text-gray-400 uppercase">Total Dívidas</p>
          <p className="text-xl font-bold text-white">R$ {totalDividas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-[#14191e] border border-white/5 p-4 rounded-2xl text-center">
          <p className="text-xs font-bold text-gray-400 uppercase">Total Pago</p>
          <p className="text-xl font-bold text-green-500">R$ {totalPago.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-[#14191e] border border-white/5 p-4 rounded-2xl text-center">
          <p className="text-xs font-bold text-gray-400 uppercase">Saldo Devedor</p>
          <p className="text-xl font-bold text-red-500">R$ {saldoDevedor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-[#14191e] border border-white/5 p-4 rounded-2xl text-center">
          <p className="text-xs font-bold text-gray-400 uppercase">Mensal Comprometido</p>
          <p className="text-xl font-bold text-yellow-500">R$ {valorMensalComprometido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
        </div>
      </div>

      {/* Card Superior - Registro com Efeito Vidro */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-2xl">
        <h3 className="text-white font-semibold text-sm mb-8 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_#ff2d55]"></span>
          Simular / Registrar Acordo
        </h3>

        <form onSubmit={handleRegistrar} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-gray-400 text-xs font-semibold">Credor <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              placeholder="Banco ou Credor"
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-white text-sm outline-none focus:border-red-500 transition-all"
              value={formData.credor}
              onChange={(e) => setFormData({...formData, credor: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-gray-400 text-xs font-semibold">Valor da Dívida (s/ juros) <span className="text-red-500">*</span></label>
            <input 
              type="number" 
              placeholder="R$ Valor Original"
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-white text-sm outline-none focus:border-red-500 transition-all"
              value={formData.valorTotalDivida}
              onChange={(e) => setFormData({...formData, valorTotalDivida: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-gray-400 text-xs font-semibold">Valor de Entrada</label>
            <input 
              type="number" 
              placeholder="R$ 0,00"
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-white text-sm outline-none focus:border-red-500 transition-all"
              value={formData.valorEntrada}
              onChange={(e) => setFormData({...formData, valorEntrada: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-gray-400 text-xs font-semibold">Valor da Prestação <span className="text-red-500">*</span></label>
            <input 
              type="number" 
              placeholder="R$ Valor p/ Mês"
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-white text-sm outline-none focus:border-red-500 transition-all"
              value={formData.valorParcela}
              onChange={(e) => setFormData({...formData, valorParcela: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-gray-400 text-xs font-semibold">Qtd de Parcelas <span className="text-red-500">*</span></label>
            <input 
              type="number" 
              placeholder="Ex: 12"
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-white text-sm outline-none focus:border-red-500 transition-all"
              value={formData.parcelas}
              onChange={(e) => setFormData({...formData, parcelas: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-gray-400 text-xs font-semibold">Taxa de Juros (% a.m.)</label>
            <input type="number" step="0.01" placeholder="Ex: 1.99" className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-white text-sm outline-none focus:border-red-500 transition-all" value={formData.taxaJuros} onChange={(e) => setFormData({...formData, taxaJuros: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-gray-400 text-xs font-semibold">Data da 1ª Parcela</label>
            <input type="date" className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-white text-sm outline-none focus:border-red-500 transition-all [color-scheme:dark]" value={formData.dataPrimeiraParcela} onChange={(e) => setFormData({...formData, dataPrimeiraParcela: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-gray-400 text-xs font-semibold">Dia do Vencimento Mensal</label>
            <input type="number" min="1" max="31" placeholder="Ex: 10" className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-white text-sm outline-none focus:border-red-500 transition-all" value={formData.diaVencimento} onChange={(e) => setFormData({...formData, diaVencimento: e.target.value})} />
          </div>
          <div className="space-y-2 lg:col-span-3">
            <label className="text-gray-400 text-xs font-semibold">Observação</label>
            <textarea 
              placeholder="Detalhes do acordo, contato, etc."
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-white text-sm outline-none focus:border-red-500 transition-all"
              value={formData.observacao}
              onChange={(e) => setFormData({...formData, observacao: e.target.value})}
              rows="2"
            />
          </div>
          <div className="space-y-2">
            <label className="text-gray-400 text-xs font-semibold opacity-50">Juros do Acordo</label>
            <div className={`w-full bg-white/5 border border-white/5 rounded-xl px-4 py-4 text-sm font-bold ${jurosSimulados > 0 ? 'text-orange-500' : 'text-green-500'}`}>
              R$ {jurosSimulados.toFixed(2)}
            </div>
          </div>

          <div className="lg:col-span-3 flex gap-4 pt-2">
            {editingId && (
              <button type="button" onClick={resetForm} className="flex-1 bg-white/5 text-white font-bold uppercase text-xs tracking-widest rounded-xl hover:bg-white/10 transition-all">Cancelar</button>
            )}
            <button 
              type="submit"
              className="flex-[3] bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-xs tracking-widest h-[56px] rounded-xl transition-all shadow-lg shadow-red-600/20"
            >
              {editingId ? 'Salvar Alterações' : 'Registrar Acordo'}
            </button>
          </div>
        </form>
      </div>

      {/* Seção de Acompanhamento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {dividas.map((item) => {
          const totalAcordo = (item.valorParcela * item.parcelas) + item.valorEntrada;
          const totalPago = (item.parcelasPagas * item.valorParcela) + item.valorEntrada;
          const saldoRestante = totalAcordo - totalPago;
          const jurosAcordo = totalAcordo - item.valorTotalDivida;
          const percentual = totalAcordo > 0 ? Math.round((totalPago / totalAcordo) * 100) : 0;
          const status = getStatus(item);

          return (
            <div key={item.id} className="bg-white/[0.03] backdrop-blur-md border border-white/5 p-6 rounded-3xl space-y-6 group hover:border-red-500/30 transition-all">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <h4 className="text-white font-bold text-lg">{item.credor}</h4>
                  <span className={`w-fit px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${colorMap[status.color]}`}>
                    {status.icon} {status.text}
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
                <p className="text-2xl font-bold text-white">R$ {Number(item.valorParcela).toLocaleString('pt-BR', {minimumFractionDigits: 2})} <span className="text-gray-500 text-sm font-normal">/ mês</span></p>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Próximo Vencimento: {item.diaVencimento}/{today.getMonth()+2}/{today.getFullYear()}</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase">
                  <span className="text-gray-400">Evolução</span>
                  <span className="text-red-500">{percentual}% Pago</span>
                </div>
                <div className="w-full bg-black h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-1000 shadow-[0_0_10px_#ff2d55]" 
                    style={{ width: `${percentual}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex justify-between items-end pt-2">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-gray-500 font-semibold">Parcelas Pagas:</span><span className="text-white font-bold">{item.parcelasPagas} de {item.parcelas}</span>
                  <span className="text-gray-500 font-semibold">Total Pago:</span><span className="text-green-400 font-bold">R$ {totalPago.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                  <span className="text-gray-500 font-semibold">Saldo Devedor:</span><span className="text-red-400 font-bold">R$ {saldoRestante.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                  <span className="text-gray-500 font-semibold">Juros do Acordo:</span><span className="text-orange-400 font-bold">R$ {jurosAcordo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
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
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-red-600/20 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Registrar Pagamento
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {dividas.length === 0 && !loading && (
          <div className="md:col-span-2 text-center py-10">
            <p className="text-gray-500">Nenhuma dívida registrada ainda.</p>
          </div>
        )}
      </div>

      {/* Modal de Visualizar Parcelas */}
      {viewingInstallments && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setViewingInstallments(null)}>
          <div className="bg-[#14191e] border border-white/10 rounded-3xl p-8 shadow-2xl w-full max-w-2xl space-y-6 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg text-center">Histórico de Parcelas: {viewingInstallments.credor}</h3>
            <div className="max-h-96 overflow-y-auto custom-scrollbar pr-2">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase font-bold text-gray-500 sticky top-0 bg-[#14191e]">
                  <tr>
                    <th className="py-3">#</th>
                    <th className="py-3">Vencimento</th>
                    <th className="py-3">Valor</th>
                    <th className="py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {Array.from({ length: viewingInstallments.parcelas }, (_, i) => {
                    const parcelaNum = i + 1;
                    const isPaga = parcelaNum <= viewingInstallments.parcelasPagas;
                    const vencimento = new Date(viewingInstallments.dataPrimeiraParcela || today);
                    vencimento.setMonth(vencimento.getMonth() + i);
                    vencimento.setDate(viewingInstallments.diaVencimento);

                    return (
                      <tr key={i}>
                        <td className="py-2 font-bold text-gray-400">{parcelaNum}</td>
                        <td className="py-2">{vencimento.toLocaleDateString('pt-BR')}</td>
                        <td className="py-2">R$ {viewingInstallments.valorParcela.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${isPaga ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'}`}>
                            {isPaga ? 'Paga' : 'Pendente'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="text-center">
              <button onClick={() => setViewingInstallments(null)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-lg">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dividas;