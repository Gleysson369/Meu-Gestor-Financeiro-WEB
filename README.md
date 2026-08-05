# 🚀 Meu Gestor Financeiro - Versão WEB

![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Firebase](https://img.shields.io/badge/firebase-%23039BE5.svg?style=for-the-badge&logo=firebase)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)

Esta é a versão **WEB** avançada do ecossistema *Meu Gestor Financeiro*. Desenvolvida para oferecer uma experiência de desktop imersiva, esta plataforma complementa o aplicativo móvel com funcionalidades expandidas de análise, gestão compartilhada e exportação de dados.

## 🌟 Diferenciais da Versão WEB

Diferente da versão mobile, a versão WEB foca em produtividade e análise detalhada:

*   **👫 Finanças em Casal (Exclusivo):** Vínculo bidirecional entre contas via Firebase, permitindo a consolidação automática de receitas, despesas e limites do parceiro em tempo real.
*   **📊 Dashboards Avançados:** Gráficos interativos com `Chart.js` para visualização de distribuição de gastos e comparativos mensais.
*   **📥 Exportação de Dados:** Módulo de Fluxo de Caixa com exportação direta para arquivos `.csv` compatíveis com Excel.
*   **🔒 Segurança Reforçada:** Implementação de persistência por sessão (`browserSessionPersistence`) e regras complexas de segurança no Firestore para garantir privacidade mútua entre casais.

## 🛠️ Stack Tecnológica

*   **Frontend:** React 18 com arquitetura baseada em Hooks e Router v6.
*   **Build Tool:** Vite (para performance ultra-rápida em desenvolvimento).
*   **Estilização:** Tailwind CSS (Design System Moderno / Dark Mode Nativo).
*   **Backend as a Service:** Firebase
    *   *Firestore:* Banco de dados NoSQL com índices compostos.
    *   *Authentication:* Gestão de usuários com validação de força de senha.
    *   *Analytics:* Monitoramento de comportamento de usuário.
*   **Gráficos:** Chart.js para renderização de dados financeiros.

## 🚀 Funcionalidades Principais

1.  **Dashboard Consolidado:** Visão geral do saldo, progresso de reservas e quitação de dívidas.
2.  **Gestão de Lançamentos:** CRUD completo de Receitas e Despesas com suporte a categorias customizadas.
3.  **Controle de Limites:** Definição de metas por categoria com alertas visuais de "Estourado" ou "Atenção".
4.  **Módulo de Investimentos Completo:**
    *   **Carteira Consolidada:** Visão detalhada da posição, preço médio, rentabilidade e participação de cada ativo.
    *   **Registro Flexível:** Suporte para Ações, FIIs, ETFs, Criptomoedas, BDRs e Títulos, com campos de alta precisão.
    *   **Controle de Proventos:** Cadastro de dividendos e rendimentos com cálculo automático de *Yield*.
    *   **Gestão de Cotações:** Registro e histórico de cotações manuais para ativos sem atualização automática.
5.  **Dívidas & Acordos:** Simulador de parcelamento e controle de evolução de pagamentos.
6.  **Ajustes de Perfil:** Gestão de categorias, troca de senha e configuração de compartilhamento familiar.

## 💻 Instalação e Execução

1.  **Clonar o repositório:**
    ```bash
    git clone https://github.com/Gleysson369/Meu-Gestor-Financeiro-WEB.git
    ```

2.  **Instalar dependências:**
    ```bash
    npm install
    ```

3.  **Configurar Variáveis de Ambiente:**
    Crie um arquivo `.env` na raiz com suas chaves do Firebase:
    ```env
    VITE_FIREBASE_API_KEY=sua_key
    VITE_FIREBASE_AUTH_DOMAIN=seu_dominio
    VITE_FIREBASE_PROJECT_ID=seu_id
    # ... demais chaves do Firebase
    ```

4.  **Executar em modo desenvolvimento:**
    ```bash
    npm run dev
    ```

> As cotações são registradas manualmente no sistema. Não é necessário nenhum token BRAPI para usar a versão atual.

## 🛡️ Segurança e Privacidade

O projeto utiliza o princípio de menor privilégio. As regras do Firestore garantem que:
*   Apenas você possa editar seus dados.
*   Seu parceiro vinculado possa **apenas visualizar** seus registros compartilhados.
*   Sua sessão expire automaticamente ao fechar o navegador.

---

## 📖 Citação Inspiracional

> *"Amado, desejo que te vá bem em todas as coisas, e que tenhas saúde, assim como bem vai a tua alma."*
> — **3 João 1:2**

---

Desenvolvido com ❤️ por Gleysson369
