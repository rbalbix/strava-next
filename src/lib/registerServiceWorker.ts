// Dedup + readyState (P3): se o 'load' já disparou (script carregado depois
// do evento), o listener nunca ia rodar e o SW nunca registrava; o flag
// impede o registro duplo do StrictMode/HMR.
let registerRequested = false;

function registerServiceWorker() {
  if (
    typeof window === 'undefined' ||
    process.env.NODE_ENV !== 'production' ||
    !('serviceWorker' in navigator) ||
    registerRequested
  ) {
    return;
  }
  registerRequested = true;

  const register = () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  };

  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register, { once: true });
  }
}

export { registerServiceWorker };
