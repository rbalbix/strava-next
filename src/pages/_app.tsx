import { AppProps, NextWebVitalsMetric } from 'next/app';
import '../styles/globals.css';
import { Analytics } from '@vercel/analytics/next';

export function reportWebVitals(metric: NextWebVitalsMetric) {
  // console.log(metric);
}

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
