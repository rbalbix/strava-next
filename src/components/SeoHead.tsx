import Head from 'next/head';

import { DEFAULT_APP_URL } from '../config';

interface SeoHeadProps {
  title: string;
  description: string;
  path?: string;
  /**
   * Emite `<meta name="robots" content="noindex">`.
   *
   * Usado na URL `/` quando ela está servindo o painel autenticado: a mesma
   * URL é landing para visitante e dashboard para quem tem sessão, e só a
   * primeira pode ser indexada. O crawler do Strava/Google não tem cookies,
   * então sempre recebe a versão indexável.
   */
  noindex?: boolean;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;
const OG_IMAGE_PATH = '/images/tela-inicio-1.jpeg';

export default function SeoHead({
  title,
  description,
  path = '/',
  noindex = false,
}: SeoHeadProps) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const canonicalUrl = `${APP_URL}${normalizedPath}`;
  const imageUrl = `${APP_URL}${OG_IMAGE_PATH}`;

  return (
    <Head>
      <title>{title}</title>
      <meta name='description' content={description} />
      {noindex && <meta name='robots' content='noindex' />}
      <meta
        name='viewport'
        content='width=device-width, initial-scale=1, viewport-fit=cover'
      />
      {/* theme-color saiu daqui para o _document.tsx (P3): duas metas
          conflitantes no mesmo documento. */}
      <link rel='canonical' href={canonicalUrl} />
      {/* Avatares do Strava vêm do CloudFront: sem preconnect o handshake
          do primeiro avatar só começa depois do HTML (P3). */}
      <link rel='preconnect' href='https://dgalywyr863hv.cloudfront.net' />

      <meta property='og:type' content='website' />
      <meta property='og:site_name' content='GearLife' />
      <meta property='og:title' content={title} />
      <meta property='og:description' content={description} />
      <meta property='og:url' content={canonicalUrl} />
      <meta property='og:image' content={imageUrl} />
      <meta property='og:image:alt' content='Prévia do GearLife' />

      <meta name='twitter:card' content='summary_large_image' />
      <meta name='twitter:title' content={title} />
      <meta name='twitter:description' content={description} />
      <meta name='twitter:image' content={imageUrl} />
    </Head>
  );
}
