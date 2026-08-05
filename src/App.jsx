import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Outlet, Navigate } from 'react-router-dom';
import { auth } from './services/firebase';
import { signOut, onAuthStateChanged, sendEmailVerification } from 'firebase/auth';
import Home from './pages/Home';
import Despesas from './pages/Despesas';
import Receita from './pages/Receita';
import Login from './pages/Login';
import Register from './pages/Register';
import Orcamento from './pages/Limites';
import Reserva from './pages/Reserva';
import Investimentos from './pages/Investimentos';
import Dividas from './pages/Dividas';
import Configuracoes from './pages/Configuracoes';
import FluxoDeCaixa from './pages/Saldo';
import { Footer } from './components/Footer/Footer';
import logo from './assets/img/marca-01.png';

const NAV_ITEMS = [
  { name: 'Inicio', path: '/', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { name: 'Receitas', path: '/receita', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg> },
  { name: 'Despesas', path: '/despesas', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg> },
  { name: 'Fluxo de Caixa', path: '/fluxo-de-caixa', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> },
  { name: 'Limites de Gastos', path: '/orcamento', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20.5525C12 20.5525 2.44749 15.415 2.44749 10.1325C2.44749 4.85 6.74499 0.55249 12 0.55249C17.255 0.55249 21.5525 4.85 21.5525 10.1325C21.5525 15.415 12 20.5525 12 20.5525Z"/><path d="M12 13.1325C13.6575 13.1325 15 11.79 15 10.1325C15 8.475 13.6575 7.13249 12 7.13249C10.3425 7.13249 9 8.475 9 10.1325C9 11.79 10.3425 13.1325 12 13.1325Z"/></svg> },
  { name: 'Reservas', path: '/reserva', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> },
  { name: 'Investimentos', path: '/investimentos', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19h16"/><path d="M6 15l3-3 4 4 5-5 3 3"/><path d="M5 11h3"/><path d="M10 7h3"/><path d="M16 3h3"/></svg> },
  { name: 'Dívidas', path: '/dividas', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.5 6.5c-2.5-1-5.5-1-8 0V12c0 5 3.5 7.5 8 9.5.5-2 1.5-3.5 3-5 .5-.5 1-1 1.5-1.5-1-1.5-1-3.5-1-5V6.5z"/><path d="M18.5 12.5c0-2.5.5-5.5-1.5-8"/><path d="M20 18c-2-1-3.5-2.5-5-4.5"/></svg> },
  { name: 'Configurações', path: '/configuracoes', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg> },
];

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Erro ao deslogar:", error);
    }
  };

  return (
    <header className="bg-background-secondary/80 backdrop-blur-md sticky top-0 z-40 border-b border-border">
      <nav className="w-full mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex justify-between items-center">
        <div className="flex items-center">
          <img src={logo} alt="Meu Gestor Financeiro" className="h-10 w-auto" />
        </div>

        <div className="hidden lg:flex items-center gap-1">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.path}>
                <Link 
                  to={item.path} 
                  className={`flex items-center gap-2 px-4 h-10 rounded-lg transition-all duration-200 font-semibold text-sm ${
                    location.pathname === item.path 
                    ? 'bg-primary text-white' 
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                  }`}
                  aria-current={location.pathname === item.path ? 'page' : undefined}
                >
                  {item.icon}
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleLogout}
            className="hidden lg:block bg-danger/10 hover:bg-danger text-danger hover:text-white border border-danger/20 px-6 h-10 rounded-xl font-bold uppercase text-xs tracking-widest transition-all"
          >
            Sair
          </button>
          <button onClick={toggleMenu} className="lg:hidden text-text-secondary hover:text-text-primary p-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/>
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`lg:hidden absolute top-[72px] left-0 w-full bg-background-secondary border-b border-border transition-all duration-300 ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
        <ul className="p-4 space-y-2">
          {NAV_ITEMS.map((item) => (
            <li key={item.path}>
              <Link 
                onClick={toggleMenu} 
                to={item.path} 
                className={`flex items-center gap-4 p-4 rounded-xl font-semibold text-base ${
                  location.pathname === item.path 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-text-secondary hover:bg-surface-elevated'
                }`}
              >
                {item.icon}
                {item.name}
              </Link>
            </li>
          ))}
          <li className="pt-4 border-t border-border">
            <button onClick={handleLogout} className="w-full bg-danger text-white p-4 rounded-xl font-bold text-center uppercase">Sair</button>
          </li>
        </ul>
      </div>
    </header>
  );
};

const ProtectedRoute = ({ user, loading, children }) => {
  const { notify } = useNotification();

  if (loading) {
    return (
      <div className="min-h-screen bg-background-primary flex flex-col items-center justify-center gap-4">
        <img src={logo} alt="Carregando..." className="h-12 w-auto animate-pulse opacity-50" />
        <div className="text-text-primary font-bold uppercase text-xs tracking-widest animate-pulse">Validando Sessão...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;

  // Bloqueio de Verificação de E-mail
  if (!user.emailVerified) {
    const handleCheckVerification = async () => {
      try {
        // Força o Firebase a buscar os dados mais recentes do usuário no servidor
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          window.location.reload(); // Recarrega para atualizar o estado do React
        } else {
          notify('O e-mail ainda não foi verificado. Por favor, clique no link enviado para ' + user.email, 'warning');
        }
      } catch (err) {
        console.error(err);
      }
    };

    const handleResend = async () => {
      try {
        await sendEmailVerification(auth.currentUser);
        notify('Novo e-mail de verificação enviado!', 'success');
      } catch (err) {
        notify('Aguarde um momento antes de tentar reenviar.', 'warning');
      }
    };

    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="w-20 h-20 bg-warning/10 text-warning rounded-full flex items-center justify-center mx-auto mb-4 border border-warning/20 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/><rect width="20" height="16" x="2" y="4" rx="2"/></svg>
          </div>
          <h2 className="text-text-primary text-2xl font-bold">Verifique seu E-mail</h2>
          <p className="text-text-secondary text-sm leading-relaxed">
            Para acessar seu gestor financeiro, você precisa confirmar seu endereço de e-mail <b>({user.email})</b>. Verifique sua caixa de entrada e spam.
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={handleCheckVerification} className="w-full bg-primary text-white font-bold uppercase text-xs tracking-widest py-4 rounded-xl hover:bg-primary-hover transition-all">Já verifiquei, entrar agora</button>
            <button onClick={handleResend} className="text-warning font-bold text-xs uppercase tracking-widest hover:underline">Reenviar link de confirmação</button>
            <button onClick={() => signOut(auth)} className="text-danger font-bold text-xs uppercase tracking-widest mt-4">Sair da conta</button>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

const PageLayout = () => {
  const location = useLocation();
  // Não mostrar footer nas páginas com bottom nav se preferir, ou manter ambos
  return (
    <div className="min-h-screen flex flex-col bg-background-primary text-text-primary">
      <Navbar />
      <main className="flex-grow w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Outlet />
      </main>
      
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Footer />
      </div>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <Router>
      <Routes>
        {/* Rotas Públicas: Se já estiver logado, redireciona para a Home */}
        <Route 
          path="/login" 
          element={!loading && user ? <Navigate to="/" replace /> : <Login />} 
        />
        <Route 
          path="/register" 
          element={!loading && user ? <Navigate to="/" replace /> : <Register />} 
        />
        
        {/* Rotas Protegidas: Iniciam aqui. Se não logado, o ProtectedRoute manda para /login */}
        <Route element={<ProtectedRoute user={user} loading={loading}><PageLayout /></ProtectedRoute>}>
          <Route path="/" element={<Home />} />
          <Route path="/despesas" element={<Despesas />} />
          <Route path="/receita" element={<Receita />} />
          <Route path="/fluxo-de-caixa" element={<FluxoDeCaixa />} />
          <Route path="/orcamento" element={<Orcamento />} />
          <Route path="/reserva" element={<Reserva />} />
          <Route path="/investimentos" element={<Investimentos />} />
          <Route path="/dividas" element={<Dividas />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App
