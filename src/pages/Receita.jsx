import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { collection, addDoc, getDocs, query, where, doc, deleteDoc, updateDoc, orderBy, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const Receita = () => {
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const anoAtual = new Date().getFullYear();

  const getToday = () => new Date().toISOString().split('T')[0];

  const [user, setUser] = useState(null);
  const [receitas, setReceitas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [periodo, setPeriodo] = useState(`${meses[new Date().getMonth()]} ${anoAtual}`);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    descricao: '',
    categoria: '',
    data: getToday(),
    valor: ''
  });

  // 1. Buscar Categorias cadastradas no Firebase
  const fetchCategorias = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, "usuarios", user.uid));
      const partnerId = userDoc.data()?.parceiroId;
      const ids = partnerId ? [user.uid, partnerId] : [user.uid];

      // Busca categorias customizadas da coleção 'categorias'
      const q = query(
        collection(db, "categorias"), 
        where("userId", "in", ids),
        where("tipo", "==", "renda")
      );
      
      const snap = await getDocs(q);
      const customCats = snap.docs.map(d => d.data().nome);

      let profileCats = [];
      for (const id of ids) {
        const profileSnap = await getDoc(doc(db, "usuarios", id));
        if (profileSnap.exists()) {
          profileCats = [...profileCats, ...(profileSnap.data().categorias_renda || [])];
        }
      }

      const defaultCats = ['Salário', 'Freelance', 'Investimentos', 'Bônus', 'Outro'];

      const allCats = [...new Set([...defaultCats, ...profileCats, ...customCats])];
      setCategorias(allCats.map((nome, index) => ({ id: index, nome })));
    } catch (error) {
      console.error("Erro categorias:", error);
    }
  };

  // 2. Buscar Receitas filtradas por período e usuário
  const fetchReceitas = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [mesNome, ano] = periodo.split(' ');
      const mesIndex = meses.indexOf(mesNome);
      const mesNum = String(mesIndex + 1).padStart(2, '0');
      
      // Calcula o último dia do mês corretamente
      const ultimoDia = new Date(ano, mesIndex + 1, 0).getDate();
      const dataInicio = `${ano}-${mesNum}-01`;
      const dataFim = `${ano}-${mesNum}-${ultimoDia}`;

      const userDoc = await getDoc(doc(db, "usuarios", user.uid));
      const partnerId = userDoc.data()?.parceiroId;
      const ids = partnerId ? [user.uid, partnerId] : [user.uid];

      const q = query(
        collection(db, "rendas"), 
        where("userId", "in", ids),
        where("data", ">=", dataInicio),
        where("data", "<=", dataFim)
      );

      const querySnapshot = await getDocs(q);
      const result = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReceitas(result.sort((a, b) => new Date(b.data) - new Date(a.data)));
    } catch (error) {
      console.error("Erro ao buscar receitas:", error);
    } finally {
      setLoading(false);
    }
  };

  // Efeito para monitorar o login do usuário
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchReceitas();
      fetchCategorias();
    }
  }, [periodo, user]);

  // 3. Salvar ou Atualizar
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        valor: parseFloat(formData.valor),
        userId: user.uid,
        updatedAt: new Date()
      };

      if (editingId) {
        await updateDoc(doc(db, "rendas", editingId), payload);
        setEditingId(null);
      } else {
        await addDoc(collection(db, "rendas"), { ...payload, createdAt: new Date() });
      }

      setFormData({ descricao: '', categoria: '', data: getToday(), valor: '' });
      fetchReceitas();
    } catch (error) {
      console.error("Erro ao salvar:", error);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      descricao: item.descricao,
      categoria: item.categoria,
      data: item.data,
      valor: item.valor
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Deseja excluir esta receita?")) {
      await deleteDoc(doc(db, "rendas", id));
      fetchReceitas();
    }
  };

  const totalMensal = receitas.reduce((acc, curr) => acc + Number(curr.valor), 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header e Saldo Total */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="border-l-4 border-green-500 pl-4">
          <h2 className="text-white font-black italic uppercase tracking-tighter text-3xl">Receitas</h2>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.2em]">Gestão de Entradas</p>
        </div>
        
        <div className="bg-[#14191e] border border-green-500/20 px-8 py-4 rounded-2xl shadow-2xl flex flex-col items-end">
          <p className="text-green-500/50 text-[10px] font-black uppercase tracking-widest mb-1">Renda Total do Mês</p>
          <h3 className="text-3xl font-black text-green-500">
            R$ {totalMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
        </div>
      </div>

      {/* Formulário de Cadastro/Edição */}
      <div className="bg-[#14191e] border border-white/5 p-8 rounded-3xl shadow-2xl">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Descrição</label>
            <input 
              type="text" 
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-green-500 outline-none transition-all"
              value={formData.descricao} 
              onChange={(e) => setFormData({...formData, descricao: e.target.value})} 
              required 
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Categoria</label>
            <select 
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-green-500 outline-none transition-all"
              value={formData.categoria} 
              onChange={(e) => setFormData({...formData, categoria: e.target.value})}
              required
            >
              <option value="" className="bg-black">Selecione...</option>
              {categorias.map(cat => <option key={cat.id} value={cat.nome} className="bg-black">{cat.nome}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Data</label>
            <input 
              type="date" 
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm [color-scheme:dark] focus:border-green-500 outline-none transition-all cursor-pointer"
              value={formData.data} 
              onClick={(e) => e.target.showPicker?.()}
              onChange={(e) => setFormData({...formData, data: e.target.value})} 
              required 
            />
          </div>

          <div className="space-y-2">
            <label className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Valor</label>
            <input 
              type="number" 
              step="0.01"
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-green-500 outline-none transition-all"
              value={formData.valor} 
              onChange={(e) => setFormData({...formData, valor: e.target.value})} 
              required 
            />
          </div>

          <div className="lg:col-span-4 flex justify-end gap-4 mt-2">
            {editingId && (
              <button 
                type="button" 
                onClick={() => { setEditingId(null); setFormData({descricao:'', categoria:'', data: getToday(), valor:''}) }}
                className="px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest text-gray-400 hover:text-white transition-all"
              >
                Cancelar
              </button>
            )}
            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-black uppercase text-[10px] tracking-widest px-10 py-3 rounded-xl transition-all shadow-lg shadow-green-600/20">
              {editingId ? 'Salvar Alterações' : 'Adicionar Renda'}
            </button>
          </div>
        </form>
      </div>

      {/* Tabela de Histórico e Filtro */}
      <div className="bg-black border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/10 bg-zinc-900/50 flex justify-between items-center">
          <h3 className="text-white font-bold uppercase text-[11px] tracking-widest">Histórico de Recebimentos</h3>
          
          <select 
            value={periodo} 
            onChange={(e) => setPeriodo(e.target.value)}
            className="bg-black text-white font-bold text-xs outline-none cursor-pointer border border-white/20 rounded-lg px-3 py-1"
          >
            {meses.map((mes) => (
              <option key={mes} className="bg-black" value={`${mes} ${anoAtual}`}>
                {mes} {anoAtual}
              </option>
            ))}
          </select>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="text-[10px] uppercase tracking-widest font-black text-gray-400 bg-zinc-900">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {receitas.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 text-gray-300 font-medium">
                    {new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                  </td>
                  <td className="px-6 py-4 font-bold text-white">{item.descricao}</td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-500/10 text-blue-400 text-[9px] font-black px-2 py-1 rounded-md uppercase">{item.categoria}</span>
                  </td>
                  <td className="px-6 py-4 text-green-500 font-bold">
                    R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-4">
                      <button 
                        onClick={() => handleEdit(item)} 
                        className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                        title="Editar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)} 
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        title="Excluir"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {receitas.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-gray-600 uppercase font-black text-xs">Nenhum registro encontrado para este mês.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Receita;