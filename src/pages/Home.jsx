import React, { useState, useEffect, useRef } from 'react';
<<<<<<< HEAD
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../services/firebase';
import { collection, getDocs, query, where, doc, getDoc, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Chart from 'chart.js/auto';
import { buildHomeTips } from '../services/financialTipsService.js';
=======
import { db, auth } from '../services/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Chart from 'chart.js/auto';
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867

const Home = () => {
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const anoAtual = new Date().getFullYear();
<<<<<<< HEAD
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const ICONS = {
    saldo: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>,
    entradas: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>,
    saidas: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>,
    atrasadas: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>,
    vencer: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
    economia: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>,
    reservas: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>,
  };
=======
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867

  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const categoryChartRef = useRef(null);
  const categoryChartInstance = useRef(null);
  const distChartRef = useRef(null);
  const distChartInstance = useRef(null);
  const paymentChartRef = useRef(null);
  const paymentChartInstance = useRef(null);

<<<<<<< HEAD
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('Usuário');
  const [periodo, setPeriodo] = useState('current_month'); 
=======
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('Usuário');
  const [periodo, setPeriodo] = useState(`${meses[new Date().getMonth()]} ${anoAtual}`); 
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
  const [dados, setDados] = useState({
    saldoTotal: 0,
    entradas: 0,
    saidas: 0,
<<<<<<< HEAD
    contasAVencer: 0,
    despesasAtrasadas: 0,
    economiaMes: 0,
    reservasAcumuladas: 0,
=======
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
    porCategoria: [],
    despesasPagas: 0,
    despesasPendentes: 0,
    alertas: [],
    reservasProgresso: [],
    dividasProgresso: [],
<<<<<<< HEAD
    comparativos: {},
  });
  const [monthlyComparison, setMonthlyComparison] = useState([]);
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
=======
  });
  const [monthlyComparison, setMonthlyComparison] = useState([]);
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867

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

<<<<<<< HEAD
    const getPeriodDates = (periodKey) => {
      const now = new Date();
      let startDate, endDate;

      switch (periodKey) {
        case 'prev_month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
        case 'last_3_months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case 'last_6_months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case 'current_year':
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31);
          break;
        case 'current_month':
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
      }
      return {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      };
    };

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const userUid = user.uid;
        const { start: dataInicio, end: dataFim } = getPeriodDates(periodo);
        
=======
    const fetchDashboardData = async () => {
      try {
        const userUid = user.uid;
        const [mesNome, ano] = periodo.split(' ');
        const mesIndex = meses.indexOf(mesNome);

        // Busca o perfil para ver se há parceiro e constrói a lista de IDs
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
        const userDocRef = doc(db, "usuarios", userUid);
        const userDocSnap = await getDoc(userDocRef);
        const partnerId = userDocSnap.data()?.parceiroId;
        const ids = partnerId ? [userUid, partnerId] : [userUid];
<<<<<<< HEAD
=======

        // Busca os documentos de limite de ambos os usuários
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
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

<<<<<<< HEAD
        const qReceitas = query(collection(db, "rendas"),
          where("userId", "in", ids),
          where("data", ">=", dataInicio), 
          where("data", "<=", dataFim));
        
        const qDespesas = query(collection(db, "despesas"),
          where("userId", "in", ids),
          where("data", ">=", dataInicio), 
          where("data", "<=", dataFim));

        const [receitasSnap, despesasSnap, reservasSnap, dividasSnap] = await Promise.all([
          getDocs(qReceitas), 
          getDocs(qDespesas),
          getDocs(query(collection(db, "reservas"), where("userId", "in", ids))),
          getDocs(query(collection(db, "dividas"), where("userId", "in", ids), orderBy("createdAt", "desc")))
        ]);

        const collectedReceitas = receitasSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const collectedDespesas = despesasSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        // Processamento dos dados
        const categoriasMap = {};
        let totalEntradas = 0;
        let totalSaidas = 0;
        let totalPagas = 0;
        let totalPendentes = 0;
        let totalAtrasadas = 0;
        let totalAVencer = 0;

        collectedReceitas.forEach((item) => totalEntradas += Number(item.valor || 0));
=======
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
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867

        despesasSnap.forEach(doc => {
          const d = doc.data();
          const valor = Number(d.valor) || 0;
<<<<<<< HEAD
          totalSaidas += valor;
          categoriasMap[d.categoria] = (categoriasMap[d.categoria] || 0) + valor;

          if (d.pago) {
            totalPagas += valor;
          } else {
            const dataDespesa = new Date(d.data + 'T00:00:00');
            if (dataDespesa < today) {
              totalAtrasadas += valor;
            } else {
              totalAVencer += valor;
            }
            totalPendentes += valor;
          }
        });

        // Alertas de Limite
        const alertasGerados = [];
        const totalSaldo = totalEntradas - totalSaidas;

        if (totalSaldo < 0) {
          alertasGerados.push({
            id: 'alert-negative-balance',
            status: 'Saldo negativo',
            cat: 'Orçamento',
            message: `Seu saldo mensal está negativo em R$ ${Math.abs(totalSaldo).toFixed(2)}.`,
            color: 'text-red-400',
            bg: 'bg-red-500/10',
            border: 'border-red-500/20',
          });
        }

=======
          
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
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
        Object.entries(categoriasMap).forEach(([cat, gasto]) => {
          const limite = limitesMap[cat];
          if (limite) {
            const percentual = (gasto / limite) * 100;
            if (percentual > 100) {
<<<<<<< HEAD
              alertasGerados.push({ id: `alert-limit-exceeded:${cat}`, cat, status: 'Limite ultrapassado', percentual: Math.round(percentual), message: `Gastos em ${cat} estão ${Math.round(percentual)}% do limite.`, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' });
            } else if (percentual >= 80) {
              alertasGerados.push({ id: `alert-limit-warning:${cat}`, cat, status: 'Limite próximo', percentual: Math.round(percentual), message: `Gastos em ${cat} atingiram ${Math.round(percentual)}% do limite.`, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' });
=======
              alertasGerados.push({ cat, status: 'Estourado', percentual: Math.round(percentual), color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' });
            } else if (percentual >= 80) {
              alertasGerados.push({ cat, status: 'Atenção', percentual: Math.round(percentual), color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' });
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
            }
          }
        });

<<<<<<< HEAD
        despesasSnap.docs.forEach((docItem) => {
          const d = docItem.data();
          if (!d.pago && d.data) {
            const dueDate = new Date(`${d.data}T00:00:00`);
            const diffDays = Math.round((dueDate - today) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays <= 3) {
              alertasGerados.push({
                id: `alert-due-soon:${d.id || d.data}`,
                status: 'Conta vencendo',
                cat: d.categoria || 'Despesa',
                message: `A conta ${d.categoria || 'registrada'} vence em ${diffDays} dia(s).`,
                color: 'text-yellow-300',
                bg: 'bg-yellow-500/10',
                border: 'border-yellow-500/20',
              });
            }
            if (diffDays < 0) {
              alertasGerados.push({
                id: `alert-overdue:${d.id || d.data}`,
                status: 'Conta atrasada',
                cat: d.categoria || 'Despesa',
                message: `A conta ${d.categoria || 'registrada'} está atrasada há ${Math.abs(diffDays)} dia(s).`,
                color: 'text-red-400',
                bg: 'bg-red-500/10',
                border: 'border-red-500/20',
              });
            }
          }
        });

        // Reservas
        let totalReservas = 0;
        const resData = reservasSnap.docs.map(doc => {
          const d = doc.data();
          totalReservas += Number(d.valorEconomizado || 0);
=======
        // Processar Reservas
        const resData = reservasSnap.docs.map(doc => {
          const d = doc.data();
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
          const percent = d.valorTotal > 0 ? (d.valorEconomizado / d.valorTotal) * 100 : 0;
          return { nome: d.objetivo, valor: d.valorEconomizado, total: d.valorTotal, percent: Math.min(percent, 100) };
        });

<<<<<<< HEAD
        // Dívidas
        const divData = dividasSnap.docs.map(doc => {
          const d = doc.data();
          const valorEntrada = Number(d.valorEntrada || 0);
          const valorParcela = Number(d.valorParcela || 0);
          const parcelas = Number(d.parcelas || 0);
          const parcelasPagas = Number(d.parcelasPagas || 0);
          
          const totalAcordo = (valorParcela * parcelas) + valorEntrada;
          const totalPago = (valorParcela * parcelasPagas) + valorEntrada;
          
          const percent = totalAcordo > 0 ? (totalPago / totalAcordo) * 100 : 0;
          return { nome: d.credor, valor: totalPago, total: totalAcordo, percent: Math.min(percent, 100) };
        });

        // Gráfico de comparação mensal (simplificado para o período atual)
        const monthlyData = meses.map(() => ({ entradas: 0, saidas: 0 }));
        const currentMonthIndex = new Date().getMonth();
        monthlyData[currentMonthIndex] = { entradas: totalEntradas, saidas: totalSaidas };

        const limiteItems = Object.entries(limitesMap).map(([categoria, valor]) => ({ categoria, valor }));

        setDados({
          entradas: totalEntradas,
          saidas: totalSaidas,
          saldoTotal: totalEntradas - totalSaidas,
          economiaMes: totalEntradas - totalSaidas,
          contasAVencer: totalAVencer,
          despesasAtrasadas: totalAtrasadas,
          reservasAcumuladas: totalReservas,
          porCategoria: Object.entries(categoriasMap).map(([name, value]) => ({ name, value })),
          despesasPagas: totalPagas,
          despesasPendentes: totalPendentes,
          alertas: alertasGerados,
          reservasProgresso: resData,
          dividasProgresso: divData,
          comparativos: { // Lógica de comparação a ser implementada
            saldo: 10,
            entradas: 5,
            saidas: -2,
          }
        });
        setTips(buildHomeTips({
          despesas: collectedDespesas,
          receitas: collectedReceitas,
          limites: limiteItems,
          reservas: resData,
          dividas: divData,
          portfolio: [],
          provents: [],
          quotes: [],
        }));

        setMonthlyComparison(monthlyData);
      } catch (error) {
        console.error("Erro ao filtrar dados do Firebase:", error);
      } finally {
        setLoading(false);
=======
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
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
      }
    };

    fetchDashboardData();
  }, [periodo, user]); // Recarrega se o período ou o usuário logado mudar

  // 3. Efeito para renderizar os gráficos quando os dados chegarem
<<<<<<< HEAD
  useEffect(() => { // eslint-disable-line
=======
  useEffect(() => {
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
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

<<<<<<< HEAD
  const dicas = tips;

  const Card = ({ title, value, icon, comparison, colorClass }) => {
    const isPositive = comparison >= 0;
    return (
      <div className="bg-[#14191e] border border-white/5 p-6 rounded-3xl shadow-2xl space-y-2">
        <div className="flex justify-between items-center text-gray-400">
          <span className="text-sm font-semibold">{title}</span>
          {icon}
        </div>
        <h3 className={`text-2xl font-bold ${colorClass || 'text-white'}`}>
          R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </h3>
        {comparison !== undefined && <p className={`text-xs font-semibold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>{isPositive ? '↑' : '↓'} {Math.abs(comparison)}% vs. período anterior</p>}
      </div>
    );
  };
=======
  const dicas = [
    "Tente manter suas saídas abaixo de 70% da sua receita total.",
    "Sua reserva de emergência atual cobre 2 meses de gastos.",
    "A categoria 'Alimentação' subiu 15% em relação ao mês passado."
  ];
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header com Nome do Usuário */}
      <div className="flex justify-between items-end">
<<<<<<< HEAD
        <div className="border-l-4 border-blue-500 pl-4">
          <h2 className="text-white font-bold text-2xl">Dashboard</h2>
          <p className="text-gray-400 text-sm">Bem-vindo, {userName}</p>
        </div>
        <div className="flex items-center gap-2 bg-[#14191e] p-1 rounded-xl border border-white/10">
          {['current_month', 'prev_month', 'last_6_months', 'current_year'].map(p => {
            const labels = { current_month: 'Mês Atual', prev_month: 'Mês Anterior', last_6_months: 'Últimos 6 Meses', current_year: 'Ano Atual' };
            return (
              <button 
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${periodo === p ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-white/5'}`}
              >
                {labels[p]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Alertas Financeiros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dados.alertas.length > 0 ? dados.alertas.map((alerta) => (
          <div key={alerta.id} className={`${alerta.bg} ${alerta.border} border rounded-2xl p-4`}>
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${alerta.color} animate-pulse`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{alerta.status}: {alerta.cat}</p>
                {alerta.message ? (
                  <p className={`mt-2 text-sm font-semibold ${alerta.color}`}>{alerta.message}</p>
                ) : alerta.percentual ? (
                  <p className={`mt-2 text-sm font-semibold ${alerta.color}`}>Limite atingido em {alerta.percentual}%</p>
                ) : null}
              </div>
            </div>
          </div>
        )) : (
          <div className="md:col-span-3 rounded-3xl bg-[#0f172a] border border-white/10 p-6 text-gray-300 text-sm">
            Nenhum alerta financeiro urgente no momento. Continue acompanhando seus gastos e limites para manter a saúde do orçamento.
          </div>
        )}
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Saldo Total" value={dados.saldoTotal} icon={ICONS.saldo} comparison={dados.comparativos.saldo} colorClass={dados.saldoTotal >= 0 ? 'text-white' : 'text-red-500'} />
        <Card title="Entradas" value={dados.entradas} icon={ICONS.entradas} comparison={dados.comparativos.entradas} colorClass="text-green-500" />
        <Card title="Saídas" value={dados.saidas} icon={ICONS.saidas} comparison={dados.comparativos.saidas} colorClass="text-red-500" />
        <Card title="Economia do Mês" value={dados.economiaMes} icon={ICONS.economia} colorClass="text-blue-500" />
        
        <Card title="Contas a Vencer" value={dados.contasAVencer} icon={ICONS.vencer} colorClass="text-yellow-500" />
        <Card title="Despesas Atrasadas" value={dados.despesasAtrasadas} icon={ICONS.atrasadas} colorClass="text-orange-500" />
        <Card title="Reservas Acumuladas" value={dados.reservasAcumuladas} icon={ICONS.reservas} colorClass="text-purple-500" />
=======
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
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
      </div>

      {/* Área de Gráficos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Comparativo Mensal - Ocupa 2 colunas no desktop */}
        <div className="lg:col-span-2 bg-[#14191e] border border-white/5 rounded-3xl p-5 shadow-2xl">
<<<<<<< HEAD
          <h3 className="text-white font-semibold text-sm mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Comparativo Mensal (E/S)
          </h3>
          <div className="h-[260px]">
            {loading ? <div className="flex items-center justify-center h-full text-gray-500 text-sm">Carregando gráfico...</div> : 
             (dados.entradas > 0 || dados.saidas > 0) ? <canvas ref={chartRef} id="chartComparativo"></canvas> : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm space-y-4">
                <p>Você ainda não possui movimentações neste período.</p>
                <div className="flex gap-4">
                  <button onClick={() => navigate('/receita')} className="bg-green-600/20 text-green-400 px-5 py-3 rounded-xl text-sm font-bold hover:bg-green-600/40">Adicionar Receita</button>
                  <button onClick={() => navigate('/despesas')} className="bg-red-600/20 text-red-400 px-5 py-3 rounded-xl text-sm font-bold hover:bg-red-600/40">Adicionar Despesa</button>
                </div>
              </div>
            )}
=======
          <h3 className="text-white font-bold uppercase text-[11px] tracking-widest mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            Comparativo Mensal (E/S)
          </h3>
          <div className="h-[260px]">
            <canvas ref={chartRef} id="chartComparativo"></canvas>
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
          </div>
        </div>

        {/* Status de Pagamento */}
        <div className="bg-[#14191e] border border-white/5 rounded-3xl p-5 shadow-2xl">
<<<<<<< HEAD
          <h3 className="text-white font-semibold text-sm mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            Status das Despesas
          </h3>
          <div className="h-[260px]">
            {dados.despesasPagas === 0 && dados.despesasPendentes === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">Sem despesas neste período.</div>
=======
          <h3 className="text-white font-bold uppercase text-[11px] tracking-widest mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            Status de Pagamento
          </h3>
          <div className="h-[260px]">
            {dados.despesasPagas === 0 && dados.despesasPendentes === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-600 text-[10px] uppercase font-bold">Sem despesas no mês</div>
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
            ) : (
              <canvas ref={paymentChartRef}></canvas>
            )}
          </div>
        </div>

        {/* Distribuição E/S % */}
        <div className="bg-[#14191e] border border-white/5 rounded-3xl p-5 shadow-2xl">
<<<<<<< HEAD
          <h3 className="text-white font-semibold text-sm mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Distribuição (Receita vs Despesa)
          </h3>
          <div className="h-[260px]">
            {dados.entradas === 0 && dados.saidas === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">Sem dados no período</div>
=======
          <h3 className="text-white font-bold uppercase text-[11px] tracking-widest mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Distribuição E/S (%)
          </h3>
          <div className="h-[260px]">
            {dados.entradas === 0 && dados.saidas === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-600 text-[10px] uppercase font-bold">Sem dados no período</div>
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
            ) : (
              <canvas ref={distChartRef}></canvas>
            )}
          </div>
        </div>
      </div>

      {/* Gráfico de Categorias e Lista */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#14191e] border border-white/5 rounded-3xl p-5 shadow-2xl">
<<<<<<< HEAD
          <h3 className="text-white font-semibold text-sm mb-6 flex items-center gap-2">
=======
          <h3 className="text-white font-bold uppercase text-[11px] tracking-widest mb-6 flex items-center gap-2">
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            Gastos por Categoria
          </h3>
          <div className="h-[260px]">
            {dados.porCategoria.length > 0 ? (
              <canvas ref={categoryChartRef}></canvas>
            ) : (
<<<<<<< HEAD
              <div className="flex items-center justify-center h-full text-gray-500 text-sm text-center p-4">Cadastre suas despesas para visualizar a distribuição por categoria.</div>
=======
              <div className="flex items-center justify-center h-full text-gray-600 text-[10px] uppercase font-bold">Nenhuma despesa</div>
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
            )}
          </div>
        </div>

        <div className="bg-black border border-white/10 rounded-3xl p-5 shadow-2xl">
<<<<<<< HEAD
          <h3 className="text-white font-semibold text-sm mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Detalhamento de Categorias
          </h3>
          <div className="space-y-4 max-h-[260px] overflow-y-auto custom-scrollbar pr-4">
            {dados.porCategoria.map((cat, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-bold uppercase">
=======
          <h3 className="text-white font-bold uppercase text-[11px] tracking-widest mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            Detalhamento de Categorias
          </h3>
          <div className="space-y-4 max-h-[260px] overflow-y-auto custom-scrollbar pr-2">
            {dados.porCategoria.map((cat, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold uppercase">
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
                  <span className="text-gray-400">{cat.name}</span>
                  <span className="text-white">R$ {cat.value.toFixed(2)}</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <div 
<<<<<<< HEAD
                    className="bg-blue-500 h-full transition-all duration-500" 
=======
                    className="bg-blue-600 h-full transition-all duration-500" 
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
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
<<<<<<< HEAD
          <h3 className="text-white font-semibold text-sm mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></span>
            Progresso das Reservas
          </h3>
          <div className="space-y-4 max-h-[260px] overflow-y-auto custom-scrollbar pr-4">
            {dados.reservasProgresso.length > 0 ? dados.reservasProgresso.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-bold uppercase">
=======
          <h3 className="text-white font-bold uppercase text-[11px] tracking-widest mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></span>
            Progresso das Reservas
          </h3>
          <div className="space-y-4 max-h-[260px] overflow-y-auto custom-scrollbar pr-2">
            {dados.reservasProgresso.length > 0 ? dados.reservasProgresso.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold uppercase">
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
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
<<<<<<< HEAD
            )) : <p className="text-gray-500 text-center py-10 text-sm">Sem reservas ativas</p>}
=======
            )) : <p className="text-gray-600 text-center py-10 font-bold uppercase text-[10px]">Sem reservas ativas</p>}
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
          </div>
        </div>

        {/* Coluna Dívidas */}
        <div className="bg-[#14191e] border border-white/5 rounded-3xl p-5 shadow-2xl">
<<<<<<< HEAD
          <h3 className="text-white font-semibold text-sm mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_8px_#ef4444]"></span>
            Quitação de Dívidas
          </h3>
          <div className="space-y-4 max-h-[260px] overflow-y-auto custom-scrollbar pr-4">
            {dados.dividasProgresso.length > 0 ? dados.dividasProgresso.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-bold uppercase">
=======
          <h3 className="text-white font-bold uppercase text-[11px] tracking-widest mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_8px_#ef4444]"></span>
            Quitação de Dívidas
          </h3>
          <div className="space-y-4 max-h-[260px] overflow-y-auto custom-scrollbar pr-2">
            {dados.dividasProgresso.length > 0 ? dados.dividasProgresso.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold uppercase">
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
                  <span className="text-gray-400">{item.nome}</span>
                  <span className="text-red-500">{item.percent.toFixed(0)}% Pago</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <div 
<<<<<<< HEAD
                    className="bg-red-500 h-full transition-all duration-1000 shadow-[0_0_10px_#ef4444]" 
=======
                    className="bg-red-600 h-full transition-all duration-1000 shadow-[0_0_10px_#ef4444]" 
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
                    style={{ width: `${item.percent}%` }}
                  ></div>
                </div>
                <div className="flex justify-end">
<<<<<<< HEAD
                  <span className="text-[10px] text-gray-600 font-semibold">Saldo: R$ {(item.total - item.valor).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
              </div>
            )) : <p className="text-gray-500 text-center py-10 text-sm">Sem dívidas pendentes</p>}
=======
                  <span className="text-[8px] text-gray-600 uppercase font-black tracking-tighter">Saldo: R$ {(item.total - item.valor).toFixed(2)}</span>
                </div>
              </div>
            )) : <p className="text-gray-600 text-center py-10 font-bold uppercase text-[10px]">Sem dívidas pendentes</p>}
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
          </div>
        </div>
      </div>

      {/* Dicas Financeiras */}
<<<<<<< HEAD
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-3xl border border-blue-600/20 bg-blue-600/10 p-8">
          <div>
            <h3 className="text-blue-400 font-bold uppercase text-xs tracking-widest">Dicas Financeiras Inteligentes</h3>
            <p className="text-gray-300 text-sm mt-2">Orientações práticas e direcionadas para que você gaste menos, poupe mais e organize seus recursos.</p>
          </div>
          <span className="rounded-full bg-blue-500/10 px-4 py-2 text-xs text-blue-200 uppercase tracking-[0.2em]">Baseado em seus dados</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {dicas.length > 0 ? dicas.map((dica) => (
            <div key={dica.id} className="rounded-3xl border border-white/10 bg-[#0b1220] p-6 shadow-xl shadow-black/20">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-sky-400">{dica.category}</p>
                  <h4 className="mt-3 text-white font-semibold text-lg leading-tight">{dica.title}</h4>
                </div>
                <div className="space-y-1 text-right text-[10px] uppercase tracking-[0.2em] text-gray-400">
                  <span>{dica.impact}</span>
                  <span>{dica.difficulty}</span>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-gray-300">{dica.description}</p>
              <p className="mt-3 text-xs text-gray-500">Motivo: {dica.reason}</p>
              {dica.estimatedBenefitLabel ? (
                <p className="mt-4 text-sm font-semibold text-white">{dica.estimatedBenefitLabel}</p>
              ) : null}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {dica.actionRoute ? (
                  <button onClick={() => navigate(dica.actionRoute)} className="rounded-full bg-sky-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white hover:bg-sky-400">
                    {dica.actionLabel}
                  </button>
                ) : (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-300">{dica.actionLabel}</span>
                )}
                <span className="rounded-full bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-gray-400">Referência: {dica.referenceDate}</span>
              </div>
            </div>
          )) : (
            <div className="md:col-span-2 rounded-3xl bg-[#0f172a] p-8 text-gray-300 text-sm">
              Nenhuma dica disponível no momento. Registre despesas ou receitas para obter orientações financeiras personalizadas.
            </div>
          )}
=======
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
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
        </div>
      </div>
    </div>
  );
};

export default Home;