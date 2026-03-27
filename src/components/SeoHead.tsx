import Head from 'next/head';

interface SeoHeadProps {
  title: string;
  description: string;
  path?: string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://gearlife.vercel.app';
const OG_IMAGE_PATH = '/images/tela-inicio-1.jpeg';

export default function SeoHead({ title, description, path = '/' }: SeoHeadProps) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const canonicalUrl = `${APP_URL}${normalizedPath}`;
  const imageUrl = `${APP_URL}${OG_IMAGE_PATH}`;

  return (
    <Head>
      <title>{title}</title>
      <meta name='description' content={description} />
      <meta
        name='viewport'
        content='width=device-width, initial-scale=1, viewport-fit=cover'
      />
      <meta name='theme-color' content='#121212' />
      <link rel='canonical' href={canonicalUrl} />

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
