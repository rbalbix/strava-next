import type { GetServerSideProps } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://gearlife.vercel.app';

function buildSitemapXml(): string {
  const now = new Date().toISOString();
  const urls = [
    { loc: `${APP_URL}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${APP_URL}/como-funciona`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${APP_URL}/faq`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${APP_URL}/privacidade`, changefreq: 'monthly', priority: '0.6' },
    { loc: `${APP_URL}/contato`, changefreq: 'monthly', priority: '0.6' },
  ];

  const entries = urls
    .map(
      (url) => `<url>
  <loc>${url.loc}</loc>
  <lastmod>${now}</lastmod>
  <changefreq>${url.changefreq}</changefreq>
  <priority>${url.priority}</priority>
</url>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.write(buildSitemapXml());
  res.end();

  return { props: {} };
};

export default function SitemapXml() {
  return null;
}
