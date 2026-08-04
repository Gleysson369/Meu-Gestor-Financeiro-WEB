import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
<<<<<<< HEAD
import { NotificationProvider } from './components/NotificationProvider.jsx'

const storedTheme = localStorage.getItem('theme');
const applyThemeClass = (theme) => {
  const root = document.documentElement;
  const body = document.body;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    body.classList.add('dark');
    body.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
    body.classList.add('light');
    body.classList.remove('dark');
  }
};
applyThemeClass(storedTheme === 'dark' ? 'dark' : 'light');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <NotificationProvider>
      <App />
    </NotificationProvider>
=======

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
>>>>>>> 4e8baa9fdfbe58b5f77bfcf2d800ec47e0e43867
  </StrictMode>,
)
