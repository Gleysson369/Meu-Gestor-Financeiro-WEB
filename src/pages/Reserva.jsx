import { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { collection, addDoc, getDocs, query, where, doc, deleteDoc, updateDoc, getDoc, arrayUnion } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useNotification } from '../components/NotificationProvider.jsx';
import { formatBRL, toLocalDateInput } from '../utils/formatters.js';

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
    observacao: '',
  });

  const resetForm = () => {
    setEditingId(null);
    setFormData({ objetivo: '', valorTotal: '', valorEconomizado: '', dataDesejada: '', categoriaFinalidade: '', valorMensalPlanejado: '', status: 'Ativa', observacao: '' });
  };

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
  // The current user is the fetch trigger; fetchReservas is recreated on each render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        observacao: formData.observacao.trim(),
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

      resetForm();
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
      observacao: item.observacao || '',
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

  const totalObjetivos = reservas.reduce((total, item) => total + Number(item.valorTotal || 0), 0);
  const totalEconomizado = reservas.reduce((total, item) => total + Number(item.valorEconomizado || 0), 0);
  const valorRestanteGeral = Math.max(totalObjetivos - totalEconomizado, 0);
  const metasAtivas = reservas.filter((item) => (item.status || 'Ativa') === 'Ativa').length;

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="border-l-4 border-purple-500 pl-4">
        <h2 className="page-title">Reservas</h2>
        <p className="page-subtitle">Planos de Futuro e Metas</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <div className="rounded-2xl border border-white/5 bg-[#14191e] p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 md:text-xs">Total das metas</p>
          <p className="mt-1 text-base font-bold text-white md:text-xl">{formatBRL(totalObjetivos)}</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#14191e] p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 md:text-xs">Já economizado</p>
          <p className="mt-1 text-base font-bold text-purple-400 md:text-xl">{formatBRL(totalEconomizado)}</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#14191e] p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 md:text-xs">Valor restante</p>
          <p className="mt-1 text-base font-bold text-blue-400 md:text-xl">{formatBRL(valorRestanteGeral)}</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#14191e] p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 md:text-xs">Metas ativas</p>
          <p className="mt-1 text-base font-bold text-green-400 md:text-xl">{metasAtivas}</p>
        </div>
      </div>

      {/* Formulário de Cadastro/Edição */}
      <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl">
        <h3 className="text-white font-semibold text-sm mb-6 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_#a855f7]"></span>
          {editingId ? 'Editar reserva' : 'Criar uma reserva'}
        </h3>
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
          <div className="space-y-2 lg:col-span-3">
            <label className="text-gray-400 text-xs font-semibold">Observação</label>
            <textarea
              value={formData.observacao}
              onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
              placeholder="Anote detalhes importantes sobre esta meta."
              rows="3"
              maxLength="500"
              className="w-full resize-y bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-purple-500 outline-none transition-all"
            />
          </div>
          <div className="lg:col-span-3 flex items-end justify-end gap-3">
            {editingId && (
              <button type="button" onClick={resetForm} className="px-5 py-3 rounded-xl font-bold uppercase text-xs tracking-widest text-gray-400 hover:text-white transition-all">
                Cancelar
              </button>
            )}
            <button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold uppercase text-xs tracking-widest h-[46px] rounded-xl transition-all shadow-lg shadow-purple-600/20">
              {editingId ? 'Salvar Alterações' : 'Criar Reserva'}
            </button>
          </div>
        </form>
      </div>

      {/* Acompanhamento das Reservas */}
      {reservas.some((item) => Number(item.valorEconomizado) >= Number(item.valorTotal)) && (
        <div className="rounded-2xl border border-green-500/20 bg-green-500/10 px-5 py-4 text-sm font-semibold text-green-400">
          Parabéns! Você já alcançou uma ou mais metas financeiras.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {reservas.map((item) => {
          const valorTotal = Number(item.valorTotal || 0);
          const valorEconomizado = Number(item.valorEconomizado || 0);
          const progresso = valorTotal > 0 ? Math.min(Math.max(Math.round((valorEconomizado / valorTotal) * 100), 0), 100) : 0;
          const isCompleto = progresso >= 100 || item.status === 'Concluída';
          const valorRestante = Math.max(valorTotal - valorEconomizado, 0);
          const status = item.status || 'Ativa';
          let valorMensalRecomendado = 0;

          if (item.dataDesejada && valorRestante > 0) {
            const hoje = new Date();
            const dataDesejada = new Date(`${item.dataDesejada}T00:00:00`);
            if (dataDesejada > hoje) {
              const mesesRestantes = Math.max(1, (dataDesejada.getFullYear() - hoje.getFullYear()) * 12 + dataDesejada.getMonth() - hoje.getMonth());
              valorMensalRecomendado = valorRestante / mesesRestantes;
            }
          }

          const statusClasses = status === 'Ativa'
            ? 'bg-blue-500/10 text-blue-400'
            : status === 'Pausada'
              ? 'bg-yellow-500/10 text-yellow-400'
              : 'bg-green-500/10 text-green-400';

          return (
            <article key={item.id} className="group space-y-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5 md:p-6 backdrop-blur-md transition-all hover:border-purple-500/30">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="break-words text-lg font-bold text-white">{item.objetivo}</h3>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClasses}`}>{status}</span>
                  </div>
                  {item.categoriaFinalidade && <p className="text-sm text-gray-400">{item.categoriaFinalidade}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => handleEdit(item)} aria-label={`Editar reserva ${item.objetivo}`} title="Editar reserva" className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-blue-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button type="button" onClick={() => handleDelete(item.id)} aria-label={`Excluir reserva ${item.objetivo}`} title="Excluir reserva" className="rounded-lg p-2 text-gray-400 transition hover:bg-red-500/10 hover:text-red-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/5 pb-4">
                <div>
                  <p className="text-2xl font-bold text-white">{formatBRL(item.valorMensalPlanejado > 0 ? item.valorMensalPlanejado : valorTotal)}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-gray-500">{item.valorMensalPlanejado > 0 ? 'Aporte mensal planejado' : 'Valor total da meta'}</p>
                </div>
                <p className="text-right text-xs text-gray-400">
                  {item.dataDesejada ? <>Meta prevista em <span className="font-semibold text-text-primary">{new Date(`${item.dataDesejada}T00:00:00`).toLocaleDateString('pt-BR')}</span></> : 'Sem data prevista'}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-wide">
                  <span className="text-gray-400">Progresso da meta</span>
                  <span className={isCompleto ? 'text-green-400' : 'text-purple-300'}>{progresso}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-black/40">
                  <div className={`h-full rounded-full transition-all duration-700 ${isCompleto ? 'bg-green-500' : 'bg-gradient-to-r from-purple-600 to-purple-400'}`} style={{ width: `${progresso}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl bg-black/20 p-4 text-xs">
                <span className="text-gray-500">Valor da meta</span><span className="text-right font-semibold text-text-primary">{formatBRL(valorTotal)}</span>
                <span className="text-gray-500">Já economizado</span><span className="text-right font-semibold text-purple-300">{formatBRL(valorEconomizado)}</span>
                <span className="text-gray-500">Valor restante</span><span className="text-right font-semibold text-white">{formatBRL(valorRestante)}</span>
                <span className="text-gray-500">Aporte recomendado</span><span className="text-right font-semibold text-blue-400">{valorMensalRecomendado > 0 ? `${formatBRL(valorMensalRecomendado)} / mês` : '—'}</span>
              </div>

              {item.observacao && (
                <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Observação</p>
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-300">{item.observacao}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4">
                <button type="button" onClick={() => handleAporte(item)} className="rounded-xl bg-green-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-lg shadow-green-600/10 transition hover:bg-green-500">
                  Adicionar aporte
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  {!isCompleto && status === 'Ativa' && <button type="button" onClick={() => handleUpdateStatus(item, 'Pausada')} title="Pausar reserva" className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-gray-300 transition hover:border-yellow-500/30 hover:text-yellow-400">Pausar</button>}
                  {status === 'Pausada' && <button type="button" onClick={() => handleUpdateStatus(item, 'Ativa')} title="Retomar reserva" className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-gray-300 transition hover:border-blue-500/30 hover:text-blue-400">Retomar</button>}
                  {!isCompleto && <button type="button" onClick={() => handleUpdateStatus(item, 'Concluída')} title="Concluir reserva" className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-gray-300 transition hover:border-green-500/30 hover:text-green-400">Concluir</button>}
                </div>
              </div>
            </article>
          );
        })}

        {reservas.length === 0 && !loading && (
          <div className="lg:col-span-2 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
            <p className="font-semibold text-gray-300">Nenhum plano de reserva cadastrado.</p>
            <p className="mt-1 text-sm text-gray-500">Crie uma meta para acompanhar seu progresso financeiro.</p>
            <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="mt-5 rounded-xl bg-purple-600/15 px-4 py-2.5 text-xs font-bold text-purple-300 transition hover:bg-purple-600/25">
              Criar primeira reserva
            </button>
          </div>
        )}
        {reservas.length === 0 && loading && (
          <div className="lg:col-span-2 rounded-3xl border border-white/5 bg-white/[0.02] px-6 py-10 text-center text-sm text-gray-400">
            Carregando suas reservas…
          </div>
        )}
      </div>

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
                <input type="date" name="data" defaultValue={toLocalDateInput()} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm [color-scheme:dark] focus:border-green-500 outline-none transition-all cursor-pointer" required />
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


    </div>
  );
};

export default Reserva;
