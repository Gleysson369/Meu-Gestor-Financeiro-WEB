import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { auth } from './services/firebase';
import { signOut } from 'firebase/auth';
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
import logo from './assets/img/Marca 01.png';

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
            <img className="w-8 h-8" src="/assets/img/grid-inside.svg" alt="menu-icon" />
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
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Layout fixo que não recarrega ao navegar */}
        <Route element={<PageLayout />}>
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
