import { AppProps } from 'next/app';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Inter, JetBrains_Mono } from 'next/font/google';

import '../styles/globals.css';

const inter = Inter({ subsets: ['latin'], weight: ['400', '600', '700'] });
const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
});

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <main className={`${inter.className} ${jetBrainsMono.className}`}>
      <Component {...pageProps} />
      <Analytics />
      <SpeedInsights />
    </main>
  );
}

export default MyApp;
