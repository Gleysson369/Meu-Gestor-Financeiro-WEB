import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../services/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Chart from 'chart.js/auto';

const Home = () => {
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const anoAtual = new Date().getFullYear();

  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const categoryChartRef = useRef(null);
  const categoryChartInstance = useRef(null);
  const distChartRef = useRef(null);
  const distChartInstance = useRef(null);
  const paymentChartRef = useRef(null);
  const paymentChartInstance = useRef(null);

  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('Usuário');
  const [periodo, setPeriodo] = useState(`${meses[new Date().getMonth()]} ${anoAtual}`); 
  const [dados, setDados] = useState({
    saldoTotal: 0,
    entradas: 0,
    saidas: 0,
    porCategoria: [],
    despesasPagas: 0,
    despesasPendentes: 0,
    alertas: [],
    reservasProgresso: [],
    dividasProgresso: [],
  });
  const [monthlyComparison, setMonthlyComparison] = useState([]);

  // 1. Efeito para monitorar Auth (roda apenas uma vez)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setUserName(currentUser.displayName || currentUser.email.split('@')[0]);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Efeito para buscar dados sempre que o período mudar
  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        const userUid = user.uid;
        const [mesNome, ano] = periodo.split(' ');
        const mesIndex = meses.indexOf(mesNome);

        // Busca o perfil para ver se há parceiro e constrói a lista de IDs
        const userDocRef = doc(db, "usuarios", userUid);
        const userDocSnap = await getDoc(userDocRef);
        const partnerId = userDocSnap.data()?.parceiroId;
        const ids = partnerId ? [userUid, partnerId] : [userUid];

        // Busca os documentos de limite de ambos os usuários
        let limitesMap = {};
        for (const id of ids) {
          const limiteSnap = await getDoc(doc(db, "limites", id));
          if (limiteSnap.exists()) {
            const catLimits = limiteSnap.data().categorias || {};
            Object.entries(catLimits).forEach(([cat, val]) => {
              limitesMap[cat] = (limitesMap[cat] || 0) + Number(val);
            });
          }
        }

        const qReceitasAno = query(collection(db, "rendas"),
          where("userId", "in", ids),
          where("data", ">=", `${ano}-01-01`), 
          where("data", "<=", `${ano}-12-31`));
        
        const qDespesasAno = query(collection(db, "despesas"),
          where("userId", "in", ids),
          where("data", ">=", `${ano}-01-01`), 
          where("data", "<=", `${ano}-12-31`));

        const [receitasSnap, despesasSnap, reservasSnap, dividasSnap] = await Promise.all([
          getDocs(qReceitasAno), 
          getDocs(qDespesasAno),
          getDocs(query(collection(db, "reservas"), where("userId", "in", ids))),
          getDocs(query(collection(db, "dividas"), where("userId", "in", ids)))
        ]);

        console.log(`Reservas: ${reservasSnap.size}, Dívidas: ${dividasSnap.size}`);

        console.log(`Dados encontrados: ${receitasSnap.size} receitas, ${despesasSnap.size} despesas`);

        // Inicializa estrutura para Jan-Dez
        const totaisMensais = meses.map(() => ({ entradas: 0, saidas: 0 }));
        const categoriasMap = {};
        let entradasMesSelecionado = 0;
        let saidasMesSelecionado = 0;
        let pagasMes = 0;
        let pendentesMes = 0;

        receitasSnap.forEach(doc => {
          const d = doc.data();
          const valor = Number(d.valor) || 0;
          
          if (d.data && typeof d.data === 'string') {
            const partesData = d.data.split('-');
            const mesDoc = parseInt(partesData[1]) - 1;
            
            if (mesDoc >= 0 && mesDoc < 12) totaisMensais[mesDoc].entradas += valor;
            if (mesDoc === mesIndex) entradasMesSelecionado += valor;
          }
        });

        despesasSnap.forEach(doc => {
          const d = doc.data();
          const valor = Number(d.valor) || 0;
          
          if (d.data && typeof d.data === 'string') {
            const partesData = d.data.split('-');
            const mesDoc = parseInt(partesData[1]) - 1;

            if (mesDoc >= 0 && mesDoc < 12) totaisMensais[mesDoc].saidas += valor;
            
            if (mesDoc === mesIndex) {
              saidasMesSelecionado += valor;
              categoriasMap[d.categoria] = (categoriasMap[d.categoria] || 0) + valor;
              
              if (d.pago) {
                pagasMes += valor;
              } else {
                pendentesMes += valor;
              }
            }
          }
        });

        // Gerar Alertas de Limite (Regra do App Flutter)
        const alertasGerados = [];
        Object.entries(categoriasMap).forEach(([cat, gasto]) => {
          const limite = limitesMap[cat];
          if (limite) {
            const percentual = (gasto / limite) * 100;
            if (percentual > 100) {
              alertasGerados.push({ cat, status: 'Estourado', percentual: Math.round(percentual), color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' });
            } else if (percentual >= 80) {
              alertasGerados.push({ cat, status: 'Atenção', percentual: Math.round(percentual), color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' });
            }
          }
        });

        // Processar Reservas
        const resData = reservasSnap.docs.map(doc => {
          const d = doc.data();
          const percent = d.valorTotal > 0 ? (d.valorEconomizado / d.valorTotal) * 100 : 0;
          return { nome: d.objetivo, valor: d.valorEconomizado, total: d.valorTotal, percent: Math.min(percent, 100) };
        });

        // Processar Dívidas
        const divData = dividasSnap.docs.map(doc => {
          const d = doc.data();
          const totalPago = (d.parcelasPagas || 0) * (d.valorParcela || 0);
          const percent = d.valorTotal > 0 ? (totalPago / d.valorTotal) * 100 : 0;
          return { nome: d.credor, valor: totalPago, total: d.valorTotal, percent: Math.min(percent, 100) };
        });

        setDados({
          entradas: entradasMesSelecionado,
          saidas: saidasMesSelecionado,
          saldoTotal: entradasMesSelecionado - saidasMesSelecionado,
          porCategoria: Object.entries(categoriasMap).map(([name, value]) => ({ name, value })),
          despesasPagas: pagasMes,
          despesasPendentes: pendentesMes,
          alertas: alertasGerados,
          reservasProgresso: resData,
          dividasProgresso: divData,
        });

        setMonthlyComparison(totaisMensais);
      } catch (error) {
        console.error("Erro ao filtrar dados do Firebase:", error);
      }
    };

    fetchDashboardData();
  }, [periodo, user]); // Recarrega se o período ou o usuário logado mudar

  // 3. Efeito para renderizar os gráficos quando os dados chegarem
  useEffect(() => {
    if (monthlyComparison.length === 0 || !chartRef.current || !categoryChartRef.current || !distChartRef.current || !paymentChartRef.current) return;

    // Destruir instâncias anteriores para evitar bugs de sobreposição
    if (chartInstance.current) chartInstance.current.destroy();
    if (categoryChartInstance.current) categoryChartInstance.current.destroy();
    if (distChartInstance.current) distChartInstance.current.destroy();
    if (paymentChartInstance.current) paymentChartInstance.current.destroy();

    const ctx = chartRef.current.getContext('2d');
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: meses,
        datasets: [
          { label: 'Entradas', data: monthlyComparison.map(m => m.entradas), backgroundColor: '#10b981', borderRadius: 4 },
          { label: 'Saídas', data: monthlyComparison.map(m => m.saidas), backgroundColor: '#ef4444', borderRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#9ca3af', font: { size: 10 } } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 9 } } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af', font: { size: 9 } } }
        }
      }
    });

    // Gráfico de Despesas por Categoria (Pizza/Doughnut)
    const catCtx = categoryChartRef.current.getContext('2d');
    categoryChartInstance.current = new Chart(catCtx, {
      type: 'doughnut',
      data: {
        labels: dados.porCategoria.map(c => c.name),
        datasets: [{
          data: dados.porCategoria.map(c => c.value),
          backgroundColor: ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'],
          borderWidth: 0,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#9ca3af', font: { size: 10 }, padding: 20 } },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw;
                const total = dados.saidas;
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return `${context.label}: ${percentage}% (R$ ${value.toFixed(2)})`;
              }
            }
          }
        },
        cutout: '70%'
      }
    });

    // Gráfico de Distribuição E/S (Porcentagem)
    const distCtx = distChartRef.current.getContext('2d');
    const total = dados.entradas + dados.saidas;
    distChartInstance.current = new Chart(distCtx, {
      type: 'pie',
      data: {
        labels: ['Entradas', 'Saídas'],
        datasets: [{
          data: [dados.entradas, dados.saidas],
          backgroundColor: ['#10b981', '#ef4444'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#9ca3af', font: { size: 10 }, padding: 20 } },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw;
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return `${context.label}: ${percentage}% (R$ ${value.toFixed(2)})`;
              }
            }
          }
        }
      }
    });

    // Gráfico de Despesas Pagas vs Pendentes
    const payCtx = paymentChartRef.current.getContext('2d');
    paymentChartInstance.current = new Chart(payCtx, {
      type: 'doughnut',
      data: {
        labels: ['Pagas', 'Pendentes'],
        datasets: [{
          data: [dados.despesasPagas, dados.despesasPendentes],
          backgroundColor: ['#10b981', '#f59e0b'],
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#9ca3af', font: { size: 10 }, padding: 20 } },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw;
                const total = dados.despesasPagas + dados.despesasPendentes;
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return `${context.label}: ${percentage}% (R$ ${value.toFixed(2)})`;
              }
            }
          }
        },
        cutout: '70%'
      }
    });

    return () => { 
      [chartInstance, categoryChartInstance, distChartInstance, paymentChartInstance].forEach(instance => {
        if (instance.current) instance.current.destroy();
      });
    };
  }, [monthlyComparison, dados]);

  const dicas = [
    "Tente manter suas saídas abaixo de 70% da sua receita total.",
    "Sua reserva de emergência atual cobre 2 meses de gastos.",
    "A categoria 'Alimentação' subiu 15% em relação ao mês passado."
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header com Nome do Usuário */}
      <div className="flex justify-between items-end">
        <div className="border-l-4 border-blue-600 pl-4">
          <h2 className="text-white font-black italic uppercase tracking-tighter text-3xl">Dashboard</h2>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">Bem-vindo, {userName}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Período de Análise</p>
          <select 
            value={periodo} 
            onChange={(e) => setPeriodo(e.target.value)}
            className="bg-transparent text-white font-bold outline-none cursor-pointer"
          >
            {meses.map((mes) => (
              <option key={mes} className="bg-[#14191e]" value={`${mes} ${anoAtual}`}>
                {mes} {anoAtual}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Alertas de Limite Excedido */}
      {dados.alertas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dados.alertas.map((alerta, idx) => (
            <div key={idx} className={`${alerta.bg} ${alerta.border} border rounded-2xl p-4 flex items-center gap-4 animate-pulse`}>
              <div className={`w-10 h-10 rounded-full ${alerta.bg} border ${alerta.border} flex items-center justify-center ${alerta.color}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{alerta.status}: {alerta.cat}</p>
                <p className={`text-sm font-bold ${alerta.color}`}>Limite atingido em {alerta.percentual}%</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-[#14191e] border border-white/5 p-6 rounded-3xl shadow-2xl">
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Saldo Total</p>
          <h3 className={`text-2xl font-black ${dados.saldoTotal >= 0 ? 'text-white' : 'text-red-500'}`}>
            R$ {dados.saldoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
        </div>
        <div className="bg-[#14191e] border border-white/5 p-6 rounded-3xl shadow-2xl">
          <p className="text-green-500/50 text-[10px] font-black uppercase tracking-widest mb-1">Entradas</p>
          <h3 className="text-2xl font-black text-green-500">
            R$ {dados.entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
        </div>
        <div className="bg-[#14191e] border border-white/5 p-6 rounded-3xl shadow-2xl">
          <p className="text-red-500/50 text-[10px] font-black uppercase tracking-widest mb-1">Saídas</p>
          <h3 className="text-2xl font-black text-red-500">
            R$ {dados.saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
        </div>
      </div>

      {/* Área de Gráficos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Comparativo Mensal - Ocupa 2 colunas no desktop */}
        <div className="lg:col-span-2 bg-[#14191e] border border-white/5 rounded-3xl p-5 shadow-2xl">
          <h3 className="text-white font-bold uppercase text-[11px] tracking-widest mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            Comparativo Mensal (E/S)
          </h3>
          <div className="h-[260px]">
            <canvas ref={chartRef} id="chartComparativo"></canvas>
          </div>
        </div>

        {/* Status de Pagamento */}
        <div className="bg-[#14191e] border border-white/5 rounded-3xl p-5 shadow-2xl">
          <h3 className="text-white font-bold uppercase text-[11px] tracking-widest mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            Status de Pagamento
          </h3>
          <div className="h-[260px]">
            {dados.despesasPagas === 0 && dados.despesasPendentes === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-600 text-[10px] uppercase font-bold">Sem despesas no mês</div>
            ) : (
              <canvas ref={paymentChartRef}></canvas>
            )}
          </div>
        </div>

        {/* Distribuição E/S % */}
        <div className="bg-[#14191e] border border-white/5 rounded-3xl p-5 shadow-2xl">
          <h3 className="text-white font-bold uppercase text-[11px] tracking-widest mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Distribuição E/S (%)
          </h3>
          <div className="h-[260px]">
            {dados.entradas === 0 && dados.saidas === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-600 text-[10px] uppercase font-bold">Sem dados no período</div>
            ) : (
              <canvas ref={distChartRef}></canvas>
            )}
          </div>
        </div>
      </div>

      {/* Gráfico de Categorias e Lista */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#14191e] border border-white/5 rounded-3xl p-5 shadow-2xl">
          <h3 className="text-white font-bold uppercase text-[11px] tracking-widest mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            Gastos por Categoria
          </h3>
          <div className="h-[260px]">
            {dados.porCategoria.length > 0 ? (
              <canvas ref={categoryChartRef}></canvas>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-600 text-[10px] uppercase font-bold">Nenhuma despesa</div>
            )}
          </div>
        </div>

        <div className="bg-black border border-white/10 rounded-3xl p-5 shadow-2xl">
          <h3 className="text-white font-bold uppercase text-[11px] tracking-widest mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            Detalhamento de Categorias
          </h3>
          <div className="space-y-4 max-h-[260px] overflow-y-auto custom-scrollbar pr-2">
            {dados.porCategoria.map((cat, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-gray-400">{cat.name}</span>
                  <span className="text-white">R$ {cat.value.toFixed(2)}</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full transition-all duration-500" 
                    style={{ width: `${(cat.value / dados.saidas) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detalhamento de Reservas e Dívidas (Barras de Progresso) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Coluna Reservas */}
        <div className="bg-[#14191e] border border-white/5 rounded-3xl p-5 shadow-2xl">
          <h3 className="text-white font-bold uppercase text-[11px] tracking-widest mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></span>
            Progresso das Reservas
          </h3>
          <div className="space-y-4 max-h-[260px] overflow-y-auto custom-scrollbar pr-2">
            {dados.reservasProgresso.length > 0 ? dados.reservasProgresso.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-gray-400">{item.nome}</span>
                  <span className="text-green-500">{item.percent.toFixed(0)}% (R$ {item.valor.toFixed(2)})</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-green-500 h-full transition-all duration-1000 shadow-[0_0_10px_#22c55e]" 
                    style={{ width: `${item.percent}%` }}
                  ></div>
                </div>
              </div>
            )) : <p className="text-gray-600 text-center py-10 font-bold uppercase text-[10px]">Sem reservas ativas</p>}
          </div>
        </div>

        {/* Coluna Dívidas */}
        <div className="bg-[#14191e] border border-white/5 rounded-3xl p-5 shadow-2xl">
          <h3 className="text-white font-bold uppercase text-[11px] tracking-widest mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_8px_#ef4444]"></span>
            Quitação de Dívidas
          </h3>
          <div className="space-y-4 max-h-[260px] overflow-y-auto custom-scrollbar pr-2">
            {dados.dividasProgresso.length > 0 ? dados.dividasProgresso.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-gray-400">{item.nome}</span>
                  <span className="text-red-500">{item.percent.toFixed(0)}% Pago</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-red-600 h-full transition-all duration-1000 shadow-[0_0_10px_#ef4444]" 
                    style={{ width: `${item.percent}%` }}
                  ></div>
                </div>
                <div className="flex justify-end">
                  <span className="text-[8px] text-gray-600 uppercase font-black tracking-tighter">Saldo: R$ {(item.total - item.valor).toFixed(2)}</span>
                </div>
              </div>
            )) : <p className="text-gray-600 text-center py-10 font-bold uppercase text-[10px]">Sem dívidas pendentes</p>}
          </div>
        </div>
      </div>

      {/* Dicas Financeiras */}
      <div className="bg-blue-600/10 border border-blue-600/20 rounded-3xl p-8">
        <h3 className="text-blue-500 font-black uppercase text-xs tracking-[0.2em] mb-4">Dicas Financeiras Inteligentes</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {dicas.map((dica, i) => (
            <div key={i} className="flex gap-4">
              <span className="text-blue-500 font-black text-xl opacity-50">0{i+1}</span>
              <p className="text-gray-300 text-xs leading-relaxed font-medium">
                {dica}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;