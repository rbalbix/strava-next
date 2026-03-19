import { AppProps } from 'next/app';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

import Toast from '../components/Toast';
import { ToastProvider } from '../contexts/ToastContext';
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ToastProvider>
      <Component {...pageProps} />
      <Toast />
      <Analytics />
      <SpeedInsights />
    </ToastProvider>
  );
}

export default MyApp;
