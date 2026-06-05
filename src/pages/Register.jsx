import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../assets/img/marca-01.png';
import { auth } from '../services/firebase';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Validações individuais
  const hasMinLength = password.length >= 6;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  // Cálculo de Força da Senha em tempo real
  const strength = (() => {
    if (!password) return 0;
    if (!hasMinLength) return 1;
    
    if (hasLetter && hasNumber && hasSpecial && password.length >= 8) return 3;
    if (hasLetter && hasNumber) return 2;
    return 1;
  })();

  const handleRegister = async (e) => {
    e.preventDefault();

    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{6,}$/;
    if (!passwordRegex.test(password)) {
      alert('A senha deve ter no mínimo 6 caracteres e conter letras e números.');
      return;
    }

    if (password !== confirmPassword) {
      alert('As senhas não coincidem!');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Envia e-mail de verificação logo após criar a conta
      await sendEmailVerification(userCredential.user);
      alert('Conta criada com sucesso! Enviamos um e-mail de verificação para sua caixa de entrada.');
      navigate('/login');
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      alert('Erro ao criar conta: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Componente interno para os itens de requisito
  const Requirement = ({ met, text }) => (
    <div className={`flex items-center gap-1.5 transition-all duration-300 ${met ? 'text-green-600' : 'text-gray-400'}`}>
      {met ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      ) : (
        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
      )}
      <span className="text-[10px] font-bold uppercase tracking-tight">{text}</span>
    </div>
  );

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
                className="w-full bg-white border border-gray-300 rounded-[16px] pl-12 pr-12 py-5 text-gray-700 text-base focus:border-[#1552B3] focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-400"
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                required 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1552B3] transition-colors"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>

            {/* Indicador de Força da Senha */}
            <div className="space-y-1.5 px-1">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                <span className="text-gray-400">Nível de Segurança</span>
                <span className={strength === 1 ? 'text-red-500' : strength === 2 ? 'text-orange-500' : strength === 3 ? 'text-green-500' : 'text-gray-400'}>
                  {strength === 1 ? 'Fraca' : strength === 2 ? 'Média' : strength === 3 ? 'Forte' : 'Letras e Números'}
                </span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    strength === 1 ? 'w-1/3 bg-red-500' : 
                    strength === 2 ? 'w-2/3 bg-orange-500' : 
                    strength === 3 ? 'w-full bg-green-500' : 'w-0'
                  }`}
                />
              </div>
            {/* Lista de Requisitos */}
            <div className="grid grid-cols-2 gap-y-2 pt-1 px-1">
              <Requirement met={hasMinLength} text="Mínimo 6 caracteres" />
              <Requirement met={hasLetter} text="Ao menos uma letra" />
              <Requirement met={hasNumber} text="Ao menos um número" />
              <Requirement met={hasSpecial} text="Caractere especial" />
            </div>
            </div>

            {/* Campo Confirmar Senha */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1552B3]">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <input 
                className={`w-full bg-white border rounded-[16px] pl-12 pr-12 py-5 text-gray-700 text-base outline-none transition-all placeholder:text-gray-400 ${
                  confirmPassword && password !== confirmPassword 
                  ? 'border-red-400 focus:ring-red-50' 
                  : 'border-gray-300 focus:border-[#1552B3] focus:ring-2 focus:ring-blue-100'
                }`}
                type={showPassword ? "text" : "password"} 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmar Senha"
                required 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1552B3] transition-colors"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
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