import { AppProps } from 'next/app';
import dynamic from 'next/dynamic';
import { useEffect } from 'react';

import Toast from '../components/Toast';
import { ToastProvider } from '../contexts/ToastContext';
import { registerServiceWorker } from '../lib/registerServiceWorker';
import '../styles/globals.css';

// Analytics e Speed Insights não agregam no primeiro render: importados de
// forma dinâmica com ssr:false, só entram no bundle do cliente depois da
// hidratação (bundle-defer-third-party).
const Analytics = dynamic(
  () => import('@vercel/analytics/react').then((m) => m.Analytics),
  { ssr: false },
);
const SpeedInsights = dynamic(
  () => import('@vercel/speed-insights/react').then((m) => m.SpeedInsights),
  { ssr: false },
);

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <ToastProvider>
      {/* Skip link (P3): primeiro focável do documento, leva ao único
          <main> da página (#main-content em cada página). */}
      <a href='#main-content' className='skipLink'>
        Pular para o conteúdo
      </a>
      <Component {...pageProps} />
      <Toast />
      <Analytics />
      <SpeedInsights />
    </ToastProvider>
  );
}

export default MyApp;
