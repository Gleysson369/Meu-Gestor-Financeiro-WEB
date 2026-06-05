import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../assets/img/Marca 01.png';
import { auth } from '../services/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('As senhas não coincidem!');
      return;
    }

    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      alert('Conta criada com sucesso!');
      navigate('/login');
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      alert('Erro ao criar conta: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FC] flex items-center justify-center p-4 py-10 font-outfit overflow-y-auto">
      {/* Card Principal */}
      <div className="w-full max-w-[800px] bg-white rounded-[32px] shadow-2xl shadow-blue-900/15 overflow-hidden animate-fadeIn">
        
        {/* Cabeçalho Azul Escuro */}
        <div className="bg-[#1552B3] p-12 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-white rounded-[22px] p-1.5 border border-white/50 shadow-inner mb-6 overflow-hidden">
            <img src={logo} alt="Marca 01" className="w-full h-full object-cover rounded-[14px]" />
          </div>
          <h2 className="text-white text-3xl font-bold tracking-tight">
            Crie sua Conta
          </h2>
          <p className="text-blue-100/70 text-xs mt-2 uppercase tracking-widest font-medium">
            Gestão Financeira Inteligente
          </p>
        </div>

        {/* Área do Formulário */}
        <div className="p-8 space-y-6">
          <form onSubmit={handleRegister} className="space-y-5">
            
            {/* Campo E-mail */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1552B3]">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              </div>
              <input 
                className="w-full bg-white border border-gray-300 rounded-[12px] pl-12 pr-4 py-5 text-gray-700 text-sm focus:border-[#1552B3] focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-400"
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required 
              />
            </div>
            
            {/* Campo Senha */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1552B3]">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <input 
                className="w-full bg-white border border-gray-300 rounded-[16px] pl-12 pr-4 py-5 text-gray-700 text-base focus:border-[#1552B3] focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-400"
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                required 
              />
            </div>

            {/* Campo Confirmar Senha */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1552B3]">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <input 
                className={`w-full bg-white border rounded-[16px] pl-12 pr-4 py-5 text-gray-700 text-base outline-none transition-all placeholder:text-gray-400 ${
                  confirmPassword && password !== confirmPassword 
                  ? 'border-red-400 focus:ring-red-50' 
                  : 'border-gray-300 focus:border-[#1552B3] focus:ring-2 focus:ring-blue-100'
                }`}
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmar Senha"
                required 
              />
            </div>

            {/* Botão Cadastrar */}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#1A66D4] hover:bg-[#1552B3] text-white font-bold text-lg py-5 rounded-2xl transition-all shadow-lg shadow-blue-600/25 active:scale-[0.98] mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </button>
          </form>

          {/* Rodapé do Card */}
          <div className="text-center pt-2">
            <Link 
              to="/login" 
              className="text-[#1A66D4] text-sm font-semibold hover:underline transition-all"
            >
              Já tem conta? Faça login aqui
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;