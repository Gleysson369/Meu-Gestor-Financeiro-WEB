import { useState } from 'react';

export function Footer() {
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);

  return (
    <>
      <footer className="mt-10 border-t border-white/5 pt-8 pb-4 animate-fadeIn">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] uppercase tracking-widest font-bold text-gray-600">
          
          {/* Nome e Versão */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400">RED-G <span className="text-blue-600">Meu Gestor Financeiro WEB</span></span>
            <span className="w-1 h-1 rounded-full bg-gray-700"></span>
            <button 
              onClick={() => setIsChangelogOpen(true)}
              className="hover:text-white transition-colors cursor-pointer underline decoration-dotted underline-offset-2"
              title="Ver Notas da Versão"
            >
              v1.2.0
            </button>
          </div>

          {/* Copyright */}
          <div className="text-center">
            <p>&copy; {new Date().getFullYear()} RED-G. Todos os direitos reservados.</p>
          </div>

          {/* Link de Suporte */}
          <a 
            href="https://wa.me/5562982649977" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-blue-500 transition-colors flex items-center gap-2 group cursor-pointer"
          >
            <i className="fas fa-life-ring group-hover:rotate-12 transition-transform"></i>
            Suporte Técnico 
          </a>
        </div>
      </footer>

      {/* Modal Changelog */}
      {isChangelogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" onClick={() => setIsChangelogOpen(false)}>
          <div className="bg-[#14191e] border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h3 className="text-white font-bold italic uppercase tracking-wider flex items-center gap-2">
                <i className="fas fa-code-branch text-red-500"></i> Notas da Versão
              </h3>
              <button onClick={() => setIsChangelogOpen(false)} className="text-gray-500 hover:text-red-500 transition-colors cursor-pointer">
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-8">
              {/* Versão Atual */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">v1.2.0</span>
                  <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Versão Atual</span>
                </div>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li className="flex gap-3"><i className="fas fa-check-circle text-blue-500 mt-0.5 text-xs"></i> <span>Novo <strong>Dashboard de Performance</strong> com gráficos integrados.</span></li>
                  <li className="flex gap-3"><i className="fas fa-check-circle text-blue-500 mt-0.5 text-xs"></i> <span>Sistema de <strong>Metas</strong> sincronizado com a Dieta.</span></li>
                  <li className="flex gap-3"><i className="fas fa-check-circle text-blue-500 mt-0.5 text-xs"></i> <span>Gestão aprimorada de <strong>Fichas de Treino</strong>.</span></li>
                  <li className="flex gap-3"><i className="fas fa-check-circle text-blue-500 mt-0.5 text-xs"></i> <span>Novo layout com <strong>Header Global</strong> e busca.</span></li>
                </ul>
              </div>

              {/* Versões Anteriores */}
              <div className="opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-gray-700 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">v1.1.0</span>
                  <span className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">Anterior</span>
                </div>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li className="flex gap-3"><i className="fas fa-check text-gray-600 mt-0.5 text-xs"></i> <span>Lançamento do módulo de <strong>Esportes</strong>.</span></li>
                  <li className="flex gap-3"><i className="fas fa-check text-gray-600 mt-0.5 text-xs"></i> <span>Correções visuais na Sidebar e Login.</span></li>
                  <li className="flex gap-3"><i className="fas fa-check text-gray-600 mt-0.5 text-xs"></i> <span>Implementação do modo Dark/Red.</span></li>
                </ul>
              </div>
            </div>
            <div className="p-4 bg-black/20 border-t border-white/5 text-center">
              <button onClick={() => setIsChangelogOpen(false)} className="text-xs font-bold uppercase text-gray-500 hover:text-white transition-colors cursor-pointer tracking-widest">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}