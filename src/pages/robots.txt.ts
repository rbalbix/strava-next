import type { GetServerSideProps } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://gearlife.vercel.app';

function buildRobotsTxt(): string {
  return `User-agent: *
Allow: /

Sitemap: ${APP_URL}/sitemap.xml
`;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=86400, stale-while-revalidate=604800',
  );
  res.write(buildRobotsTxt());
  res.end();

  return { props: {} };
};

export default function RobotsTxt() {
  return null;
}
