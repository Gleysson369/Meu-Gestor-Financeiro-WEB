import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { 
  collection, addDoc, getDocs, query, where, deleteDoc, doc, orderBy, updateDoc, getDoc 
} from 'firebase/firestore';
import { 
  onAuthStateChanged, updateProfile, updatePassword, 
  reauthenticateWithCredential, EmailAuthProvider, deleteUser, signOut 
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const Configuracoes = () => {
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [editingCatId, setEditingCatId] = useState(null);
  const [partnerEmail, setPartnerEmail] = useState('');
  const [linkedEmail, setLinkedEmail] = useState(null);
  const [catForm, setCatForm] = useState({ nome: '', tipo: 'despesa', icone: '📌' });
  const navigate = useNavigate();

  const icones = ['📌', '🍔', '🚗', '🏠', '🏥', '📚', '🎬', '🛒', '⚡', '💼', '💻', '📈', '🎁'];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setUserName(currentUser.displayName || '');
        fetchCategorias(currentUser.uid);
        fetchProfile(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchProfile = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, "usuarios", uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.parceiroId) {
          const partnerDoc = await getDoc(doc(db, "usuarios", data.parceiroId));
          if (partnerDoc.exists()) {
            setLinkedEmail(partnerDoc.data().email);
          }
        } else {
          setLinkedEmail(null);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar perfil:", error);
    }
  };

  const fetchCategorias = async (uid) => {
    const q = query(collection(db, "categorias"), where("userId", "==", uid), orderBy("nome", "asc"));
    const snap = await getDocs(q);
    setCategorias(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleUpdateName = async () => {
    if (!userName.trim()) return;
    setLoading(true);
    try {
      await updateProfile(auth.currentUser, { displayName: userName });
      alert("Nome atualizado com sucesso!");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!partnerEmail.trim()) return;
    setLoading(true);
    try {
      const q = query(collection(db, "usuarios"), where("email", "==", partnerEmail.trim().toLowerCase()));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        alert("Usuário não encontrado com este e-mail.");
        return;
      }

      const partnerUid = snap.docs[0].id;
      if (partnerUid === user.uid) {
        alert("Você não pode compartilhar com você mesmo.");
        return;
      }

      // Vínculo bidirecional para facilitar as regras de segurança
      await updateDoc(doc(db, "usuarios", user.uid), { parceiroId: partnerUid });
      await updateDoc(doc(db, "usuarios", partnerUid), { parceiroId: user.uid });

      alert("Compartilhamento ativado!");
      setPartnerEmail('');
      fetchProfile(user.uid);
    } catch (error) {
      console.error(error);
      alert("Erro ao tentar compartilhar.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Interromper compartilhamento?")) return;
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, "usuarios", user.uid));
      if (userDoc.exists() && userDoc.data().parceiroId) {
        await updateDoc(doc(db, "usuarios", userDoc.data().parceiroId), { parceiroId: null });
      }
      await updateDoc(doc(db, "usuarios", user.uid), { parceiroId: null });
      setLinkedEmail(null);
      alert("Compartilhamento interrompido.");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!catForm.nome.trim()) return;
    try {
      if (editingCatId) {
        await updateDoc(doc(db, "categorias", editingCatId), {
          ...catForm,
          updatedAt: new Date()
        });
        setEditingCatId(null);
      } else {
        await addDoc(collection(db, "categorias"), {
          ...catForm,
          userId: user.uid,
          createdAt: new Date()
        });
      }
      setCatForm({ nome: '', tipo: 'despesa', icone: '📌' });
      fetchCategorias(user.uid);
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditCategory = (c) => {
    setEditingCatId(c.id);
    setCatForm({ nome: c.nome, tipo: c.tipo, icone: c.icone });
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm("Excluir esta categoria?")) {
      await deleteDoc(doc(db, "categorias", id));
      fetchCategorias(user.uid);
    }
  };

  const handleChangePassword = async () => {
    const currentPass = window.prompt("Digite sua senha ATUAL:");
    if (!currentPass) return;
    const newPass = window.prompt("Digite a NOVA senha (min. 6 caracteres):");
    if (!newPass || newPass.length < 6) return;

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPass);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPass);
      alert("Senha alterada com sucesso!");
    } catch (error) {
      alert("Erro ao alterar senha. Verifique sua senha atual.");
    }
  };

  const handleDeleteAccount = async () => {
    const pass = window.prompt("Para excluir permanentemente, digite sua senha:");
    if (!pass) return;

    if (window.confirm("TEM CERTEZA? Todos os seus dados serão apagados.")) {
      try {
        const credential = EmailAuthProvider.credential(user.email, pass);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await deleteUser(auth.currentUser);
        navigate('/login');
      } catch (error) {
        alert("Erro na autenticação. Falha ao excluir conta.");
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Header Perfil */}
      <div className="bg-black border border-white/10 p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center text-red-500 text-3xl font-black mb-4">
          {userName.charAt(0).toUpperCase() || 'U'}
        </div>
        <h2 className="text-white text-2xl font-black">{userName || 'Usuário'}</h2>
        <p className="text-gray-500 text-sm">{user?.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Coluna 1: Dados e Segurança */}
        <div className="space-y-8">
          <section className="bg-black border border-white/10 p-6 rounded-3xl shadow-xl">
            <h3 className="text-white font-bold uppercase text-[11px] tracking-widest mb-6 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Editar Perfil
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase">Seu Nome</label>
                <input 
                  type="text" 
                  value={userName} 
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-red-600 outline-none transition-all"
                />
              </div>
              <button 
                onClick={handleUpdateName}
                disabled={loading}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-black uppercase text-[10px] tracking-widest py-3 rounded-xl transition-all"
              >
                {loading ? 'Salvando...' : 'Salvar Nome'}
              </button>
            </div>
          </section>

          <section className="bg-black border border-white/10 p-6 rounded-3xl shadow-xl">
            <h3 className="text-white font-bold uppercase text-[11px] tracking-widest mb-6 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Finanças em Casal
            </h3>
            
            {linkedEmail ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-zinc-900 border border-green-500/10 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black text-gray-500 uppercase">Status</p>
                    <p className="text-white text-xs font-bold truncate">Conectado com: {linkedEmail}</p>
                  </div>
                </div>
                <button 
                  onClick={handleDisconnect}
                  className="w-full bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/20 text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all"
                >
                  Interromper Compartilhamento
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase">E-mail do Cônjuge</label>
                  <input 
                    type="email" 
                    placeholder="email@parceiro.com"
                    value={partnerEmail}
                    onChange={(e) => setPartnerEmail(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-red-600 outline-none transition-all"
                  />
                </div>
                <button 
                  onClick={handleInvite}
                  disabled={loading}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-black uppercase text-[10px] tracking-widest py-3 rounded-xl transition-all"
                >
                  {loading ? 'Processando...' : 'Convidar / Compartilhar'}
                </button>
              </div>
            )}
          </section>

          <section className="bg-black border border-white/10 p-6 rounded-3xl shadow-xl">
            <h3 className="text-white font-bold uppercase text-[11px] tracking-widest mb-6 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Segurança
            </h3>
            <div className="space-y-3">
              <button 
                onClick={handleChangePassword}
                className="w-full text-left p-4 rounded-2xl bg-zinc-900/50 hover:bg-zinc-800 transition-all flex items-center justify-between group"
              >
                <div>
                  <p className="text-white text-xs font-bold">Alterar Senha</p>
                  <p className="text-gray-500 text-[10px]">Atualize suas credenciais</p>
                </div>
                <svg className="text-gray-600 group-hover:text-white transition-colors" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              
              <button 
                onClick={handleDeleteAccount}
                className="w-full text-left p-4 rounded-2xl bg-red-500/5 hover:bg-red-500/10 transition-all flex items-center justify-between group"
              >
                <div>
                  <p className="text-red-500 text-xs font-bold">Excluir Conta</p>
                  <p className="text-red-500/50 text-[10px]">Ação irreversível</p>
                </div>
                <svg className="text-red-500" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              </button>
            </div>
          </section>
        </div>

        {/* Coluna 2: Categorias */}
        <div className="space-y-8">
          <section className="bg-black border border-white/10 p-6 rounded-3xl shadow-xl">
            <h3 className="text-white font-bold uppercase text-[11px] tracking-widest mb-6 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              Nova Categoria
            </h3>
            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase">Nome da Categoria</label>
                <input 
                  type="text" 
                  placeholder="Ex: Assinaturas, Saúde..."
                  value={catForm.nome}
                  onChange={(e) => setCatForm({...catForm, nome: e.target.value})}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-red-600 outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase">Tipo</label>
                  <select 
                    value={catForm.tipo}
                    onChange={(e) => setCatForm({...catForm, tipo: e.target.value})}
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-3 text-white text-sm outline-none"
                  >
                    <option value="despesa" className="bg-black">Despesa</option>
                    <option value="renda" className="bg-black">Renda</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase">Ícone</label>
                  <select 
                    value={catForm.icone}
                    onChange={(e) => setCatForm({...catForm, icone: e.target.value})}
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-3 text-white text-sm outline-none"
                  >
                    {icones.map(i => <option key={i} value={i} className="bg-black">{i}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                {editingCatId && (
                  <button 
                    type="button"
                    onClick={() => { setEditingCatId(null); setCatForm({ nome: '', tipo: 'despesa', icone: '📌' }); }}
                    className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-black uppercase text-[10px] tracking-widest py-3 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                )}
                <button 
                  type="submit"
                  className={`${editingCatId ? 'flex-[2]' : 'w-full'} bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] tracking-widest py-3 rounded-xl transition-all shadow-lg shadow-red-600/20`}
                >
                  {editingCatId ? 'Salvar Alterações' : 'Cadastrar Categoria'}
                </button>
              </div>
            </form>
          </section>

          {/* Lista de Categorias */}
          <section className="bg-black border border-white/10 rounded-3xl shadow-xl overflow-hidden">
            <div className="p-6 border-b border-white/10 bg-zinc-900/50">
              <h3 className="text-white font-bold uppercase text-[11px] tracking-widest">Minhas Categorias</h3>
            </div>
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
              {categorias.length === 0 ? (
                <p className="p-10 text-center text-gray-600 uppercase font-black text-[10px]">Nenhuma cadastrada</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {categorias.map((c) => (
                    <div key={c.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{c.icone}</span>
                        <div>
                          <p className="text-white text-sm font-bold">{c.nome}</p>
                          <p className={`text-[9px] font-black uppercase ${c.tipo === 'receita' ? 'text-green-500' : 'text-red-500'}`}>
                            {c.tipo}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEditCategory(c)}
                          className="p-2 text-gray-600 hover:text-blue-500 transition-colors"
                          title="Editar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button 
                          onClick={() => handleDeleteCategory(c.id)}
                          className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                          title="Excluir"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Botão de Logout Master */}
      <div className="flex justify-center pt-8">
        <button 
          onClick={async () => { if(window.confirm("Sair do sistema?")) { await signOut(auth); navigate('/login'); }}}
          className="px-12 py-4 bg-red-600 text-white font-black uppercase text-xs tracking-[0.3em] rounded-2xl hover:bg-red-700 transition-all shadow-2xl shadow-red-600/30"
        >
          Encerrar Sessão
        </button>
      </div>

      {/* Footer Inspiracional */}
      <div className="pt-12 text-center space-y-4">
        <p className="text-gray-600 text-[10px] uppercase tracking-widest font-bold">Versão 1.2.0 Web</p>
        <p className="text-red-600 italic font-medium text-sm max-w-md mx-auto leading-relaxed">
          "Amado, desejo que te vá bem em todas as coisas, e que tenhas saúde, assim como bem vai a tua alma." <br/> 
          <span className="font-black uppercase text-[10px] not-italic mt-2 block">- 3 João 1:2</span>
        </p>
      </div>
    </div>
  );
};

export default Configuracoes;