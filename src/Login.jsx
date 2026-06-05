import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../assets/img/marca-01.png';
import { auth } from '../services/firebase';
import { signInWithEmailAndPassword, setPersistence, browserSessionPersistence, sendPasswordResetEmail } from 'firebase/auth';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    // Validação de senha: min 6 caracteres, letras e números
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{6,}$/;
    if (!passwordRegex.test(password)) {
      alert('A senha deve ter no mínimo 6 caracteres e conter letras e números.');
      return;
    }

    setLoading(true);
    try {
      await setPersistence(auth, browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      alert('Usuário ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      alert('Por favor, informe seu e-mail no campo acima para recuperar a senha.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert('E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada.');
    } catch (error) {
      console.error('Erro ao enviar e-mail de recuperação:', error);
      alert('Ocorreu um erro ao tentar enviar o e-mail de recuperação. Verifique se o e-mail está correto.');
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
            Meu Gestor Financeiro
          </h2>
        </div>

        {/* Área do Formulário */}
        <div className="p-10 space-y-8">
          <form onSubmit={handleLogin} className="space-y-6">
            
            {/* Campo E-mail */}
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1552B3]">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              </div>
              <input 
                className="w-full bg-white border border-gray-300 rounded-[16px] pl-12 pr-4 py-5 text-gray-700 text-base focus:border-[#1552B3] focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-400"
                type="email"
                id="username" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required 
              />
            </div>
            
            {/* Campo Senha */}
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1552B3]">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <input 
                className="w-full bg-white border border-gray-300 rounded-[16px] pl-12 pr-12 py-5 text-gray-700 text-base focus:border-[#1552B3] focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-400"
                type={showPassword ? "text" : "password"} 
                id="password" 
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

            {/* Opção Esqueci minha Senha */}
            <div className="flex justify-end px-1">
              <button 
                type="button"
                onClick={handleForgotPassword}
                className="text-xs font-semibold text-[#1A66D4] hover:underline"
              >
                Esqueci minha senha
              </button>
            </div>

            {/* Dica de segurança para o usuário */}
            <p className="text-[10px] text-gray-400 px-1 italic">* Por segurança, sua sessão será encerrada ao fechar o navegador.</p>

            {/* Botão Login */}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#1A66D4] hover:bg-[#1552B3] text-white font-bold text-lg py-5 rounded-2xl transition-all shadow-lg shadow-blue-600/25 active:scale-[0.98] mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Entrando...' : 'Login'}
            </button>
          </form>

          {/* Rodapé do Card */}
          <div className="text-center pt-2">
            <Link 
              to="/register" 
              className="text-[#1A66D4] text-sm font-semibold hover:underline transition-all"
            >
              Não tem conta? Cadastre-se aqui
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;