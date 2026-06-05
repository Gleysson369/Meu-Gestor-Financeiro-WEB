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
import Dividas from './pages/Dividas';
import Configuracoes from './pages/Configuracoes';
import FluxoDeCaixa from './pages/Saldo';
import { Footer } from './components/Footer/Footer';
import logo from './assets/img/marca-01.png'; // Garanta que o arquivo esteja todo em minúsculo
import menuIcon from './assets/img/grid-inside.svg';

const NAV_ITEMS = [
  { name: 'Inicio', path: '/' },
  { name: 'Receita', path: '/receita' },
  { name: 'Despesas', path: '/despesas' },
  { name: 'Fluxo de Caixa', path: '/fluxo-de-caixa' },
  { name: 'Limites', path: '/orcamento' },
  { name: 'Reserva', path: '/reserva' },
  { name: 'Dívidas', path: '/dividas' },
  { name: 'Ajustes', path: '/configuracoes' },
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
    <header className="bg-[#14191e]/80 backdrop-blur-md sticky top-0 z-40 border-b border-white/5">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
        <div className="flex flex-col items-center leading-tight">
          <img src={logo} alt="logo" className="h-8 w-auto" />
          <h1 className="text-white font-black italic tracking-tighter text-[10px] uppercase hidden sm:block text-center">
            Meu Gestor Financeiro WEB
          </h1>
        </div>

        <div className="hidden md:flex items-center gap-1">
          <ul className="flex items-center gap-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.path}>
                <Link 
                  to={item.path} 
                  className={`px-4 py-2 rounded-lg transition-all font-bold uppercase text-[11px] tracking-widest ${
                    location.pathname === item.path 
                    ? 'text-white bg-white/10' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handleLogout}
            className="hidden md:block bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/20 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
          >
            Sair
          </button>
          <button onClick={toggleMenu} className="md:hidden text-gray-400 hover:text-white p-2">
            <img className="w-8 h-8" src={menuIcon} alt="menu-icon" />
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`md:hidden absolute top-20 left-0 w-full bg-[#14191e] border-b border-white/5 transition-all duration-300 ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
        <ul className="p-4 space-y-2">
          {NAV_ITEMS.map((item) => (
            <li key={item.path}>
              <Link 
                onClick={toggleMenu} 
                to={item.path} 
                className={`block p-4 rounded-xl font-bold uppercase text-xs tracking-widest ${
                  location.pathname === item.path 
                  ? 'text-white bg-white/10' 
                  : 'text-gray-400 hover:bg-white/5'
                }`}
              >
                {item.name}
              </Link>
            </li>
          ))}
          <li className="pt-4 border-t border-white/5">
            <button onClick={handleLogout} className="block w-full bg-red-600 text-white p-4 rounded-xl font-bold text-center">Sair</button>
          </li>
        </ul>
      </div>
    </header>
  );
};

const ProtectedRoute = ({ user, loading, children }) => {
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <img src={logo} alt="Carregando..." className="h-12 w-auto animate-pulse opacity-50" />
        <div className="text-white font-black uppercase text-[10px] tracking-widest animate-pulse">Validando Sessão...</div>
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
          alert('O e-mail ainda não foi verificado. Por favor, clique no link enviado para ' + user.email);
        }
      } catch (err) {
        console.error(err);
      }
    };

    const handleResend = async () => {
      try {
        await sendEmailVerification(auth.currentUser);
        alert('Novo e-mail de verificação enviado!');
      } catch (err) {
        alert('Aguarde um momento antes de tentar reenviar.');
      }
    };

    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="w-20 h-20 bg-yellow-500/10 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/20 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/><rect width="20" height="16" x="2" y="4" rx="2"/></svg>
          </div>
          <h2 className="text-white text-2xl font-black uppercase italic">Verifique seu E-mail</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Para acessar seu gestor financeiro, você precisa confirmar seu endereço de e-mail <b>({user.email})</b>. Verifique sua caixa de entrada e spam.
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={handleCheckVerification} className="w-full bg-white text-black font-black uppercase text-[10px] tracking-widest py-4 rounded-xl hover:bg-gray-200 transition-all">Já verifiquei, entrar agora</button>
            <button onClick={handleResend} className="text-yellow-500 font-bold text-[10px] uppercase tracking-widest hover:underline">Reenviar link de confirmação</button>
            <button onClick={() => signOut(auth)} className="text-red-600 font-bold text-[10px] uppercase tracking-widest mt-4">Sair da conta</button>
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
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Outlet />
      </main>
      
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mb-4">
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
          <Route path="/dividas" element={<Dividas />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App
