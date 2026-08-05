import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [messages, setMessages] = useState([]);
  const [confirmation, setConfirmation] = useState(null);
  const [promptRequest, setPromptRequest] = useState(null);
  const [promptValue, setPromptValue] = useState('');

  useEffect(() => {
    if (!messages.length) return;

    const timers = messages.map((message) =>
      setTimeout(() => {
        setMessages((current) => current.filter((item) => item.id !== message.id));
      }, message.duration || 4500)
    );

    return () => timers.forEach(clearTimeout);
  }, [messages]);

  const notify = useCallback((message, type = 'info', duration = 4500) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setMessages((current) => [...current, { id, message, type, duration }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setMessages((current) => current.filter((message) => message.id !== id));
  }, []);

  const confirm = useCallback(({ title = 'Confirmação', message, confirmText = 'Sim', cancelText = 'Não' }) => {
    return new Promise((resolve) => {
      setConfirmation({ title, message, confirmText, cancelText, resolve });
    });
  }, []);

  const prompt = useCallback((options) => {
    return new Promise((resolve) => {
      setPromptValue(options.defaultValue || '');
      setPromptRequest({
        title: options.title || 'Entrada necessária',
        message: options.message || '',
        placeholder: options.placeholder || '',
        inputType: options.inputType || 'text',
        confirmText: options.confirmText || 'Enviar',
        cancelText: options.cancelText || 'Cancelar',
        resolve,
      });
    });
  }, []);

  const closeConfirmation = useCallback((result) => {
    if (confirmation?.resolve) {
      confirmation.resolve(result);
    }
    setConfirmation(null);
  }, [confirmation]);

  const closePrompt = useCallback((result) => {
    if (promptRequest?.resolve) {
      promptRequest.resolve(result);
    }
    setPromptRequest(null);
    setPromptValue('');
  }, [promptRequest]);

  return (
    <NotificationContext.Provider value={{ notify, confirm, prompt }}>
      {children}

      <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-3 max-w-sm">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`rounded-3xl border p-4 shadow-xl ring-1 ring-black/5 transition-all ${
              message.type === 'success'
                ? 'bg-success/10 border-success text-success'
                : message.type === 'danger'
                ? 'bg-danger/10 border-danger text-danger'
                : message.type === 'warning'
                ? 'bg-warning/10 border-warning text-warning'
                : 'bg-surface border-border text-text-primary'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm leading-6">{message.message}</p>
              <button
                type="button"
                onClick={() => removeToast(message.id)}
                className="text-text-muted hover:text-text-primary transition-colors"
                aria-label="Fechar notificação"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {confirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-[32px] border border-border bg-surface p-6 shadow-2xl">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.3em] text-text-muted">{confirmation.title}</p>
              <p className="mt-3 text-text-primary text-base leading-relaxed">{confirmation.message}</p>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => closeConfirmation(false)}
                className="rounded-2xl border border-border bg-surface-elevated px-5 py-3 text-sm font-semibold text-text-primary transition hover:bg-surface"
              >
                {confirmation.cancelText}
              </button>
              <button
                type="button"
                onClick={() => closeConfirmation(true)}
                className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
              >
                {confirmation.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {promptRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-[32px] border border-border bg-surface p-6 shadow-2xl">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.3em] text-text-muted">{promptRequest.title}</p>
              <p className="mt-3 text-text-primary text-base leading-relaxed">{promptRequest.message}</p>
            </div>
            <label className="block mb-4 text-sm text-text-secondary">
              <input
                type={promptRequest.inputType}
                value={promptValue}
                onChange={(event) => setPromptValue(event.target.value)}
                placeholder={promptRequest.placeholder}
                className="w-full rounded-3xl border border-border bg-input-background px-4 py-3 text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                autoFocus
              />
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => closePrompt(null)}
                className="rounded-2xl border border-border bg-surface-elevated px-5 py-3 text-sm font-semibold text-text-primary transition hover:bg-surface"
              >
                {promptRequest.cancelText}
              </button>
              <button
                type="button"
                onClick={() => closePrompt(promptValue)}
                className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
              >
                {promptRequest.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
