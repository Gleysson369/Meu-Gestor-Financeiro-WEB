import { useRef, useState, useEffect } from 'react';
import { db, auth, storage } from '../services/firebase';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { 
  collection, addDoc, getDocs, query, where, deleteDoc, doc, orderBy, updateDoc, getDoc, runTransaction, writeBatch
} from 'firebase/firestore';
import { 
  onAuthStateChanged, updateProfile, updatePassword, 
  reauthenticateWithCredential, EmailAuthProvider, deleteUser, signOut 
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../components/NotificationProvider.jsx';

const MAX_PROFILE_PHOTO_SIZE = 2 * 1024 * 1024;
const PROFILE_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const Configuracoes = () => {
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('perfil');
  const [categorias, setCategorias] = useState([]);
  const [editingCatId, setEditingCatId] = useState(null);
  const [partnerEmail, setPartnerEmail] = useState('');
  const [linkedEmail, setLinkedEmail] = useState(null); 
  const [linkedPartnerId, setLinkedPartnerId] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [notificationSettings, setNotificationSettings] = useState({
    emailUpdates: true,
    monthlySummary: true,
    securityAlerts: true,
  });
  const [catForm, setCatForm] = useState({ nome: '', tipo: 'despesa', icone: '📌' });
  const photoInputRef = useRef(null);
  const navigate = useNavigate();
  const { notify, confirm, prompt } = useNotification();

  const TABS = [
    { id: 'perfil', label: 'Perfil', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
    { id: 'categorias', label: 'Categorias', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> },
    { id: 'compartilhamento', label: 'Compartilhamento', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { id: 'seguranca', label: 'Segurança', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
    { id: 'aparencia', label: 'Aparência', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg> },
    { id: 'notificacoes', label: 'Notificações', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg> },
    { id: 'dados', label: 'Dados da Conta', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg> },
  ];
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

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      body.classList.add('dark');
      body.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      body.classList.add('light');
      body.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      setNotificationSettings(JSON.parse(savedSettings));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
  }, [notificationSettings]);

  const fetchProfile = async (uid) => {
    try {
      setLinkedEmail(null);
      setLinkedPartnerId(null);
      const userDoc = await getDoc(doc(db, "usuarios", uid));
      if (!userDoc.exists()) return;
      const partnerId = userDoc.data().parceiroId;
      if (!partnerId) return;

      setLinkedPartnerId(partnerId);
      const partnerDoc = await getDoc(doc(db, "usuarios", partnerId));
      if (partnerDoc.exists()) setLinkedEmail(partnerDoc.data().email || null);
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
      notify('Nome atualizado com sucesso!', 'success');
    } catch (error) {
      console.error(error);
      notify('Erro ao atualizar o nome.', 'danger');
    } finally {
      setLoading(false); 
    }
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!PROFILE_PHOTO_TYPES.includes(file.type)) {
      notify('Use uma imagem JPEG, PNG ou WebP.', 'warning');
      return;
    }
    if (file.size > MAX_PROFILE_PHOTO_SIZE) {
      notify('A foto deve ter no máximo 2 MB.', 'warning');
      return;
    }

    try {
      const decodedImage = await createImageBitmap(file);
      decodedImage.close();
    } catch {
      notify('Não foi possível abrir essa imagem. Escolha outro arquivo.', 'warning');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      notify('Entre novamente para alterar sua foto.', 'warning');
      return;
    }

    setPhotoLoading(true);
    try {
      const photoRef = ref(storage, `usuarios/${currentUser.uid}/perfil/avatar`);
      await uploadBytes(photoRef, file, {
        contentType: file.type,
        cacheControl: 'private, max-age=3600',
      });
      const photoURL = await getDownloadURL(photoRef);
      await updateProfile(currentUser, { photoURL });
      setUser({ ...user, photoURL });
      notify('Foto de perfil atualizada com sucesso.', 'success');
    } catch (error) {
      console.error('Erro ao enviar foto de perfil:', error);
      const messagesByStorageError = {
        'storage/bucket-not-found': 'O bucket do Firebase Storage não foi encontrado. Confira VITE_FIREBASE_STORAGE_BUCKET no .env.',
        'storage/no-default-bucket': 'O Firebase Storage não tem um bucket configurado. Confira VITE_FIREBASE_STORAGE_BUCKET no .env.',
        'storage/quota-exceeded': 'O Firebase Storage está indisponível neste plano ou excedeu a cota. Confira o plano de faturamento do projeto.',
        'storage/unauthorized': 'As regras do Firebase Storage ainda não permitem esse upload. Publique storage.rules.',
        'storage/unauthenticated': 'Sua sessão expirou. Entre novamente para enviar a foto.',
      };
      const message = messagesByStorageError[error.code]
        || 'O navegador não conseguiu acessar o bucket. Confira o nome do bucket, o plano do projeto e a configuração CORS para http://localhost:5173.';
      notify(message, 'danger');
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleRemovePhoto = async () => {
    const confirmed = await confirm({
      title: 'Remover foto de perfil',
      message: 'Sua foto atual será removida e o perfil voltará a exibir sua inicial.',
      confirmText: 'Remover foto',
      cancelText: 'Cancelar',
    });
    if (!confirmed || !auth.currentUser) return;

    setPhotoLoading(true);
    try {
      const photoRef = ref(storage, `usuarios/${auth.currentUser.uid}/perfil/avatar`);
      await deleteObject(photoRef).catch((error) => {
        if (error.code !== 'storage/object-not-found') throw error;
      });
      await updateProfile(auth.currentUser, { photoURL: null });
      setUser({ ...user, photoURL: null });
      notify('Foto de perfil removida.', 'success');
    } catch (error) {
      console.error('Erro ao remover foto de perfil:', error);
      notify('Não foi possível remover a foto. Tente novamente.', 'danger');
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleInvite = async () => {
    const normalizedEmail = partnerEmail.trim().toLowerCase();
    if (!normalizedEmail || !user) return;
    setLoading(true);
    let shareStep = 'localizar a conta pelo e-mail';
    try {
      const usersRef = collection(db, "usuarios");
      const normalizedQuery = query(usersRef, where("emailNormalizado", "==", normalizedEmail));
      let snap = await getDocs(normalizedQuery);
      if (snap.empty) {
        const emailValues = [...new Set([partnerEmail.trim(), normalizedEmail])];
        snap = await getDocs(query(usersRef, where("email", "in", emailValues)));
      }
      
      if (snap.empty) {
        notify('Não encontramos o perfil financeiro desse e-mail. Se a pessoa já tem conta, peça para entrar no app uma vez para sincronizar o perfil e tente novamente.', 'warning');
        return;
      }

      const partnerMatch = snap.docs.find((account) => account.id !== user.uid);
      if (!partnerMatch) {
        notify('Você não pode compartilhar com você mesmo.', 'warning');
        return;
      }
      const partnerUid = partnerMatch.id;
      if (partnerUid === user.uid) {
        notify('Você não pode compartilhar com você mesmo.', 'warning');
        return;
      }

      const ownProfileRef = doc(db, "usuarios", user.uid);
      const partnerProfileRef = doc(db, "usuarios", partnerUid);
      shareStep = 'validar e gravar o vínculo nos dois perfis';
      const result = await runTransaction(db, async (transaction) => {
        const ownProfile = await transaction.get(ownProfileRef);
        const partnerProfile = await transaction.get(partnerProfileRef);
        if (!ownProfile.exists() || !partnerProfile.exists()) return 'missing-profile';

        const ownPartnerId = ownProfile.data().parceiroId;
        const otherPartnerId = partnerProfile.data().parceiroId;
        if (ownPartnerId && ownPartnerId !== partnerUid) return 'already-linked';
        if (otherPartnerId && otherPartnerId !== user.uid) return 'partner-linked';

        transaction.update(ownProfileRef, { parceiroId: partnerUid });
        transaction.update(partnerProfileRef, { parceiroId: user.uid });
        return 'linked';
      });

      if (result === 'missing-profile') {
        notify('Não foi possível localizar os dois perfis. Peça para a outra pessoa confirmar o cadastro e tente novamente.', 'warning');
        return;
      }
      if (result === 'already-linked') {
        notify('Sua conta já está compartilhada com outra pessoa. Encerre o vínculo atual antes de criar outro.', 'warning');
        return;
      }
      if (result === 'partner-linked') {
        notify('Este e-mail já está compartilhado com outra conta. A pessoa precisa encerrar esse vínculo antes.', 'warning');
        return;
      }

      notify('Compartilhamento ativado!', 'success');
      setPartnerEmail('');
      await fetchProfile(user.uid);
    } catch (error) {
      console.error(`Erro ao compartilhar na etapa "${shareStep}"`, {
        code: error.code,
        message: error.message,
        error,
      });
      if (error.code === 'permission-denied') {
        notify(
          'A conta foi localizada, mas as regras de segurança do Firestore bloquearam o vínculo entre os perfis. É necessário permitir essa operação nas regras ou realizá-la por uma função segura do Firebase.',
          'danger'
        );
      } else {
        notify('Erro ao tentar compartilhar. Confira o console para ver a etapa e o código do erro.', 'danger');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    const confirmed = await confirm({
      title: 'Interromper Compartilhamento',
      message: 'Tem certeza de que deseja interromper o compartilhamento de dados?',
      confirmText: 'Sim, interromper',
      cancelText: 'Cancelar'
    });

    if (!confirmed) return;

    setLoading(true);
    try {
      const ownProfileRef = doc(db, "usuarios", user.uid);
      const userDoc = await getDoc(ownProfileRef);
      const partnerId = userDoc.exists() ? userDoc.data().parceiroId : null;
      const batch = writeBatch(db);
      if (partnerId) {
        const partnerDoc = await getDoc(doc(db, "usuarios", partnerId));
        if (partnerDoc.exists() && partnerDoc.data().parceiroId === user.uid) {
          batch.update(doc(db, "usuarios", partnerId), { parceiroId: null });
        }
      }
      if (userDoc.exists()) batch.update(ownProfileRef, { parceiroId: null });
      await batch.commit();
      setLinkedEmail(null);
      setLinkedPartnerId(null);
      notify('Compartilhamento interrompido.', 'success');
    } catch (error) {
      console.error(error);
      notify('Erro ao interromper o compartilhamento.', 'danger');
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
    const confirmed = await confirm({
      title: 'Excluir Categoria',
      message: 'Deseja excluir esta categoria? Esta ação é irreversível.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar'
    });

    if (!confirmed) return;
    await deleteDoc(doc(db, "categorias", id));
    fetchCategorias(user.uid);
  };

  const handleChangePassword = async () => {
    const currentPass = await prompt({
      title: 'Senha Atual',
      message: 'Digite sua senha ATUAL:',
      placeholder: 'Senha atual',
      inputType: 'password',
      confirmText: 'Confirmar',
      cancelText: 'Cancelar'
    });

    if (!currentPass) return;

    const newPass = await prompt({
      title: 'Nova Senha',
      message: 'Digite a NOVA senha (min. 6 caracteres):',
      placeholder: 'Nova senha',
      inputType: 'password',
      confirmText: 'Salvar',
      cancelText: 'Cancelar'
    });

    if (!newPass || newPass.length < 6) return;

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPass);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPass);
      notify('Senha alterada com sucesso!', 'success');
    } catch (error) {
      notify('Erro ao alterar senha. Verifique sua senha atual.', 'danger');
    }
  };

  const handleDeleteAccount = async () => {
    const pass = await prompt({
      title: 'Confirmar Senha',
      message: 'Para excluir permanentemente, digite sua senha:',
      placeholder: 'Senha',
      inputType: 'password',
      confirmText: 'Continuar',
      cancelText: 'Cancelar'
    });
    if (!pass) return;

    const confirmed = await confirm({
      title: 'Excluir Conta',
      message: 'TEM CERTEZA? Todos os seus dados serão apagados.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar'
    });
    if (!confirmed) return;

    try {
      const credential = EmailAuthProvider.credential(user.email, pass);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await deleteUser(auth.currentUser);
      navigate('/login');
    } catch (error) {
      notify('Erro na autenticação. Falha ao excluir conta.', 'danger');
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 animate-fadeIn">
      {/* Menu Lateral */}
      <aside className="w-full md:w-1/4 lg:w-1/5 bg-surface rounded-3xl shadow-lg p-4">
        <div className="sticky top-24 space-y-2">
          {TABS.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.id ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 space-y-8">
        <div className="border-l-4 border-primary pl-4">
          <h2 className="page-title">Configurações</h2>
          <p className="page-subtitle">Gerencie seu perfil, preferências e dados da conta.</p>
        </div>

        {/* Seção Perfil */}
        {activeTab === 'perfil' && (
          <section className="bg-surface border border-border p-8 rounded-3xl shadow-lg">
            <h3 className="text-text-primary font-semibold text-sm mb-6 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Editar Perfil
            </h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="userName" className="text-xs font-semibold text-text-muted">Nome</label>
                  <input id="userName" type="text" value={userName} onChange={(e) => setUserName(e.target.value)} className="w-full bg-input-background border border-input-border rounded-xl px-4 py-3 text-text-primary text-sm focus:border-primary outline-none transition-all" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="userEmail" className="text-xs font-semibold text-text-muted">E-mail</label>
                  <input id="userEmail" type="email" value={user?.email || ''} disabled className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-text-muted text-sm cursor-not-allowed" />
                </div>
              </div>
              <div className="flex flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-4xl font-black text-primary ring-4 ring-primary/10">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt={`Foto de perfil de ${userName || 'usuário'}`} className="h-full w-full object-cover" />
                  ) : (userName.trim().charAt(0).toUpperCase() || 'U')}
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  className="sr-only"
                  aria-label="Selecionar foto de perfil"
                />
                <div className="flex flex-wrap justify-center gap-2">
                  <button type="button" onClick={() => photoInputRef.current?.click()} disabled={photoLoading} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white transition hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60">
                    {photoLoading ? 'Enviando foto…' : user?.photoURL ? 'Alterar foto' : 'Adicionar foto'}
                  </button>
                  {user?.photoURL && <button type="button" onClick={handleRemovePhoto} disabled={photoLoading} className="rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-text-secondary transition hover:bg-surface-elevated disabled:cursor-wait disabled:opacity-60">Remover</button>}
                </div>
                <p className="max-w-xs text-xs leading-relaxed text-text-muted">Recomendado: imagem quadrada (1:1), com pelo menos 256 × 256 px. Formatos: JPEG, PNG ou WebP. Tamanho máximo: 2 MB.</p>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-border">
              <button onClick={handleUpdateName} disabled={loading} className="w-full md:w-auto bg-primary hover:bg-primary-hover text-white font-bold uppercase text-xs tracking-widest h-11 px-8 rounded-xl transition-all">
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </section>
        )}

        {/* Seção Categorias */}
        {activeTab === 'categorias' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section className="bg-surface border border-border p-8 rounded-3xl shadow-lg">
              <h3 className="text-text-primary font-semibold text-sm mb-6 flex items-center gap-2">
                {editingCatId ? 'Editar Categoria' : 'Nova Categoria'}
              </h3>
              <form onSubmit={handleSaveCategory} className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="catNome" className="text-xs font-semibold text-text-muted">Nome da Categoria <span className="text-danger">*</span></label>
                  <input id="catNome" type="text" placeholder="Ex: Assinaturas, Saúde..." value={catForm.nome} onChange={(e) => setCatForm({...catForm, nome: e.target.value})} className="w-full bg-input-background border border-input-border rounded-xl px-4 py-3 text-text-primary text-sm focus:border-primary outline-none transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="catTipo" className="text-xs font-semibold text-text-muted">Tipo</label>
                    <select id="catTipo" value={catForm.tipo} onChange={(e) => setCatForm({...catForm, tipo: e.target.value})} className="w-full bg-input-background border border-input-border rounded-xl px-3 h-11 text-text-primary text-sm outline-none">
                      <option value="despesa" className="bg-surface">Despesa</option>
                      <option value="renda" className="bg-surface">Renda</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="catIcone" className="text-xs font-semibold text-text-muted">Ícone</label>
                    <select id="catIcone" value={catForm.icone} onChange={(e) => setCatForm({...catForm, icone: e.target.value})} className="w-full bg-input-background border border-input-border rounded-xl px-3 h-11 text-text-primary text-sm outline-none">
                      {icones.map(i => <option key={i} value={i} className="bg-surface">{i}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  {editingCatId && (
                    <button type="button" onClick={() => { setEditingCatId(null); setCatForm({ nome: '', tipo: 'despesa', icone: '📌' }); }} className="flex-1 bg-surface-elevated hover:bg-border text-text-primary font-bold uppercase text-xs tracking-widest h-11 rounded-xl transition-all">
                      Cancelar
                    </button>
                  )}
                  <button type="submit" className={`${editingCatId ? 'flex-[2]' : 'w-full'} bg-primary hover:bg-primary-hover text-white font-bold uppercase text-xs tracking-widest h-11 rounded-xl transition-all shadow-lg`}>
                    {editingCatId ? 'Salvar Alterações' : 'Cadastrar Categoria'}
                  </button>
                </div>
              </form>
            </section>
            <section className="bg-surface border border-border rounded-3xl shadow-lg overflow-hidden">
              <div className="p-8 border-b border-border bg-surface-elevated/50">
                <h3 className="text-text-primary font-semibold text-sm">Minhas Categorias</h3>
              </div>
              <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                {categorias.length === 0 ? (
                  <p className="p-10 text-center text-text-muted text-sm">Nenhuma categoria personalizada.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {categorias.map((c) => (
                      <div key={c.id} className="p-4 flex items-center justify-between hover:bg-surface-elevated transition-colors">
                        <div className="flex items-center gap-4">
                          <span className="text-2xl">{c.icone}</span>
                          <div>
                            <p className="text-text-primary text-sm font-bold">{c.nome}</p>
                            <p className={`text-xs font-bold uppercase ${c.tipo === 'renda' ? 'text-success' : 'text-danger'}`}>{c.tipo}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEditCategory(c)} className="p-2 text-text-muted hover:text-primary transition-colors" title="Editar"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                          <button onClick={() => handleDeleteCategory(c.id)} className="p-2 text-text-muted hover:text-danger transition-colors" title="Excluir"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* Seção Compartilhamento */}
        {activeTab === 'compartilhamento' && (
          <section className="bg-surface border border-border p-8 rounded-3xl shadow-lg">
            <h3 className="text-text-primary font-semibold text-sm mb-6 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Compartilhamento Financeiro
            </h3>
            
            {linkedPartnerId ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-success/20 bg-success/5 p-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs font-semibold text-success">Compartilhamento ativo</p>
                    <p className="truncate text-sm font-bold text-text-primary">Dados compartilhados com {linkedEmail || 'conta vinculada'}</p>
                  </div>
                </div>
                <button 
                  onClick={handleDisconnect}
                  className="w-full bg-danger/10 hover:bg-danger text-danger hover:text-white border border-danger/20 text-xs font-black uppercase tracking-widest h-11 rounded-xl transition-all"
                >
                  Interromper Compartilhamento
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-text-secondary">Informe o e-mail usado no cadastro da outra pessoa. O compartilhamento só funciona entre contas já registradas e permite que os dois perfis acompanhem os dados financeiros um do outro.</p>
                <div className="space-y-1">
                  <label htmlFor="partnerEmail" className="text-xs font-semibold text-text-muted">E-mail da pessoa com quem deseja compartilhar</label>
                  <input 
                    id="partnerEmail"
                    type="email" 
                    placeholder="nome@exemplo.com"
                    value={partnerEmail}
                    onChange={(e) => setPartnerEmail(e.target.value)}
                    className="w-full bg-input-background border border-input-border rounded-xl px-4 py-3 text-text-primary text-sm focus:border-primary outline-none transition-all"
                  />
                </div>
                <button 
                  onClick={handleInvite}
                  disabled={loading}
                  className="w-full bg-surface-elevated hover:bg-border text-text-primary font-black uppercase text-xs tracking-widest h-11 rounded-xl transition-all"
                >
                  {loading ? 'Processando...' : 'Convidar / Compartilhar'}
                </button>
              </div>
            )}
          </section>
        )}

        {/* Seção Segurança */}
        {activeTab === 'seguranca' && (
          <section className="bg-surface border border-border p-8 rounded-3xl shadow-lg">
            <h3 className="text-text-primary font-semibold text-sm mb-6 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Segurança
            </h3>
            <div className="space-y-3">
              <button 
                onClick={handleChangePassword}
                className="w-full text-left p-4 rounded-2xl bg-surface-elevated/50 hover:bg-surface-elevated transition-all flex items-center justify-between group"
              >
                <div>
                  <p className="text-text-primary text-sm font-bold">Alterar Senha</p>
                  <p className="text-text-muted text-xs">Atualize suas credenciais</p>
                </div>
                <svg className="text-text-muted group-hover:text-text-primary transition-colors" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              
              <button 
                onClick={handleDeleteAccount}
                className="w-full text-left p-4 rounded-2xl bg-danger/5 hover:bg-danger/10 transition-all flex items-center justify-between group"
              >
                <div>
                  <p className="text-danger text-sm font-bold">Excluir Conta</p>
                  <p className="text-danger/50 text-xs">Ação irreversível</p>
                </div>
                <svg className="text-danger" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              </button>
            </div>
          </section>
        )}

        {/* Seção Aparência */}
        {activeTab === 'aparencia' && (
          <section className="bg-surface border border-border p-8 rounded-3xl shadow-lg">
            <h3 className="text-text-primary font-semibold text-sm mb-6 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
              Aparência
            </h3>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-secondary">Tema do Sistema</label>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setTheme('light')} className={`p-4 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-primary' : 'border-border'}`}>
                  <div className="w-full h-16 bg-gray-200 rounded-lg mb-2"></div>
                  <p className="font-bold text-sm text-text-primary">Claro</p>
                </button>
                <button onClick={() => setTheme('dark')} className={`p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-primary' : 'border-border'}`}>
                  <div className="w-full h-16 bg-gray-800 rounded-lg mb-2"></div>
                  <p className="font-bold text-sm text-text-primary">Escuro</p>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Seção Notificações */}
        {activeTab === 'notificacoes' && (
          <section className="bg-surface border border-border p-8 rounded-3xl shadow-lg">
            <h3 className="text-text-primary font-semibold text-sm mb-6 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              Notificações
            </h3>
            <div className="space-y-4">
              <div className="rounded-3xl bg-surface-elevated border border-border p-4">
                <p className="text-text-primary font-bold">Preferências gerais</p>
                <p className="text-text-muted text-sm">Configure como você quer receber atualizações e alertas.</p>
              </div>
              <div className="grid gap-4">
                {[
                  { key: 'emailUpdates', label: 'E-mails sobre novidades e melhorias', description: 'Receba dicas de funcionalidades e novidades do app.' },
                  { key: 'monthlySummary', label: 'Resumo mensal por e-mail', description: 'Receba um resumo do seu fluxo e gastos todo mês.' },
                  { key: 'securityAlerts', label: 'Alertas de segurança', description: 'Notificações quando houver atividade suspeita na conta.' },
                ].map((item) => (
                  <label key={item.key} className="flex items-start gap-4 p-4 rounded-3xl border border-border bg-surface-elevated">
                    <input
                      type="checkbox"
                      checked={notificationSettings[item.key]}
                      onChange={() => setNotificationSettings(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                      className="mt-1 h-5 w-5 rounded border-input-border bg-input-background text-primary focus:ring-primary"
                    />
                    <div>
                      <p className="font-semibold text-text-primary">{item.label}</p>
                      <p className="text-text-muted text-sm">{item.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex flex-col gap-3 rounded-3xl border border-border bg-surface-elevated p-4">
                <p className="text-text-primary font-semibold">Sugestões de melhorias</p>
                <ul className="list-disc list-inside text-text-muted text-sm space-y-2">
                  <li>Notificações de metas atingidas e economia gerada.</li>
                  <li>Lembretes inteligentes para faturas e compromissos financeiros.</li>
                  <li>Relatórios semanais com insights sobre gastos.</li>
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* Seção Dados da Conta */}
        {activeTab === 'dados' && (
          <section className="bg-surface border border-border p-8 rounded-3xl shadow-lg">
            <h3 className="text-text-primary font-semibold text-sm mb-6 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
              Dados da Conta
            </h3>
            <div className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-3xl bg-surface-elevated border border-border p-4">
                  <p className="text-text-muted text-xs uppercase tracking-[0.2em] mb-2">Usuário</p>
                  <p className="text-text-primary font-semibold">{user?.displayName || 'Sem nome definido'}</p>
                </div>
                <div className="rounded-3xl bg-surface-elevated border border-border p-4">
                  <p className="text-text-muted text-xs uppercase tracking-[0.2em] mb-2">E-mail</p>
                  <p className="text-text-primary font-semibold">{user?.email || 'Não disponível'}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-3xl bg-surface-elevated border border-border p-4">
                  <p className="text-text-muted text-xs uppercase tracking-[0.2em] mb-2">Conta criada em</p>
                  <p className="text-text-primary font-semibold">{user?.metadata?.creationTime || 'Não disponível'}</p>
                </div>
                <div className="rounded-3xl bg-surface-elevated border border-border p-4">
                  <p className="text-text-muted text-xs uppercase tracking-[0.2em] mb-2">Último acesso</p>
                  <p className="text-text-primary font-semibold">{user?.metadata?.lastSignInTime || 'Não disponível'}</p>
                </div>
              </div>
              <div className="rounded-3xl bg-surface-elevated border border-border p-4">
                <p className="text-text-muted text-xs uppercase tracking-[0.2em] mb-2">Status da conta</p>
                <p className={`font-semibold ${user?.emailVerified ? 'text-success' : 'text-warning'}`}>
                  {user?.emailVerified ? 'E-mail verificado' : 'Verificação pendente'}
                </p>
              </div>
              <div className="rounded-3xl border border-border bg-surface-elevated p-4">
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-text-muted">Compartilhamento financeiro</p>
                {linkedPartnerId ? (
                  <>
                    <p className="font-semibold text-success">Ativo</p>
                    <p className="mt-1 break-all text-sm text-text-primary">Compartilhado com: {linkedEmail || 'E-mail não disponível'}</p>
                    <button type="button" onClick={() => setActiveTab('compartilhamento')} className="mt-3 text-sm font-semibold text-primary hover:underline">Gerenciar compartilhamento</button>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-text-primary">Não compartilhado</p>
                    <button type="button" onClick={() => setActiveTab('compartilhamento')} className="mt-3 text-sm font-semibold text-primary hover:underline">Compartilhar com outra conta</button>
                  </>
                )}
              </div>
              <div className="rounded-3xl bg-surface-elevated border border-border p-4">
                <p className="text-text-primary font-semibold mb-2">Melhorias recomendadas</p>
                <ul className="list-disc list-inside text-text-muted text-sm space-y-2">
                  <li>Mantenha seu nome atualizado para facilitar a identificação da conta.</li>
                  <li>Ative as notificações de resumo mensal para acompanhar melhor gastos.</li>
                  <li>Mantenha o e-mail verificado para maior segurança.</li>
                </ul>
              </div>
            </div>
          </section>
        )}
  
        {/* Botão de Logout Master */}
        <div className="flex justify-center pt-8">
          <button 
            onClick={async () => {
              const confirmed = await confirm({
                title: 'Sair do Sistema',
                message: 'Deseja encerrar sua sessão agora?',
                confirmText: 'Sair',
                cancelText: 'Cancelar'
              });
              if (!confirmed) return;
              await signOut(auth);
              navigate('/login');
            }}
            className="px-12 py-4 bg-danger text-white font-bold uppercase text-xs tracking-widest rounded-2xl hover:opacity-90 transition-all shadow-lg"
          >
            Encerrar Sessão
          </button>
        </div>
  
        {/* Footer Inspiracional */}
        <div className="pt-12 text-center space-y-3 text-text-muted">
          <p className="text-xs font-bold">Versão 1.2.0 Web</p>
          <p className="italic font-medium text-sm max-w-md mx-auto leading-relaxed">
            "Amado, desejo que te vá bem em todas as coisas, e que tenhas saúde, assim como bem vai a tua alma." <br/> 
            <span className="font-bold text-xs not-italic mt-2 block">- 3 João 1:2</span>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Configuracoes;
