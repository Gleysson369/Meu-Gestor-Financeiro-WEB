import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../assets/img/icon.png';
import { auth } from '../services/firebase';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { useNotification } from '../components/NotificationProvider.jsx';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { notify } = useNotification();

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
      notify('A senha deve ter no mínimo 6 caracteres e conter letras e números.', 'warning');
      return;
    }

    if (password !== confirmPassword) {
      notify('As senhas não coincidem!', 'warning');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Envia e-mail de verificação logo após criar a conta
      await sendEmailVerification(userCredential.user);
      notify('Conta criada com sucesso! Enviamos um e-mail de verificação para sua caixa de entrada.', 'success');
      navigate('/login');
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      notify('Erro ao criar conta: ' + error.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Componente interno para os itens de requisito
  const Requirement = ({ met, text }) => (
    <div className={`flex items-center gap-1.5 transition-all duration-300 ${met ? 'text-success' : 'text-text-muted'}`}>
      {met ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      ) : (
        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
      )}
      <span className="text-[10px] font-bold uppercase tracking-tight">{text}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-background-primary flex items-center justify-center p-4 py-10 font-outfit overflow-y-auto">
      {/* Card Principal */}
      <div className="w-full max-w-md bg-surface rounded-3xl shadow-lg overflow-hidden animate-fadeIn">
        
        {/* Cabeçalho Azul Escuro */}
        <div className="bg-primary/10 p-8 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-surface rounded-2xl p-1.5 border border-border shadow-inner mb-6 overflow-hidden">
            <img src={logo} alt="marca-01" className="w-full h-full object-contain rounded-lg" />
          </div>
          <h2 className="text-text-primary text-3xl font-bold tracking-tight">
            Crie sua Conta
          </h2>
          <p className="text-text-muted text-xs mt-2 uppercase tracking-widest font-medium">
            Gestão Financeira Inteligente
          </p>
        </div>

        {/* Área do Formulário */}
        <div className="p-8 space-y-6">
          <form onSubmit={handleRegister} className="space-y-5">
            
            {/* Campo E-mail */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              </div>
              <input 
                className="w-full bg-input-background border border-input-border rounded-xl pl-12 pr-4 h-14 text-text-primary text-sm focus:border-primary outline-none transition-all placeholder:text-text-muted"
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required 
              />
            </div>
            
            {/* Campo Senha */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <input 
                className="w-full bg-input-background border border-input-border rounded-xl pl-12 pr-12 h-14 text-text-primary text-base focus:border-primary outline-none transition-all placeholder:text-text-muted"
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                required 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors"
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
                <span className="text-text-muted">Nível de Segurança</span>
                <span className={strength === 1 ? 'text-danger' : strength === 2 ? 'text-orange-500' : strength === 3 ? 'text-success' : 'text-text-muted'}>
                  {strength === 1 ? 'Fraca' : strength === 2 ? 'Média' : strength === 3 ? 'Forte' : 'Letras e Números'}
                </span>
              </div>
              <div className="h-1.5 w-full bg-surface-elevated rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    strength === 1 ? 'w-1/3 bg-danger' : 
                    strength === 2 ? 'w-2/3 bg-orange-500' : 
                    strength === 3 ? 'w-full bg-success' : 'w-0'
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
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <input 
                className={`w-full bg-input-background border rounded-xl pl-12 pr-12 h-14 text-text-primary text-base outline-none transition-all placeholder:text-text-muted ${
                  confirmPassword && password !== confirmPassword 
                  ? 'border-danger' 
                  : 'border-input-border focus:border-primary'
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
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors"
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
              className="w-full bg-primary hover:bg-primary-hover text-white font-bold text-lg h-14 rounded-2xl transition-all shadow-lg active:scale-[0.98] mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </button>
          </form>

          {/* Rodapé do Card */}
          <div className="text-center pt-2">
            <Link 
              to="/login" 
              className="text-primary text-sm font-semibold hover:underline transition-all"
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