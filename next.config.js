// Cabeçalhos de segurança — hardening OWASP A05 (security review 17/11/2026).
//
// Só em produção: em dev o Turbopack/HMR e o overlay de erros do Next usam
// WebSocket e scripts inline que a CSP restringiria. O alvo protegido é a
// produção — e os previews da Vercel, que rodam com NODE_ENV=production,
// já recebem a política (dá para validar antes do deploy de produção).
//
// A política foi derivada do build real (17/11/2026), não de suposição:
//  - nenhum script executável inline (apenas __NEXT_DATA__ em JSON) e
//    nenhum handler on* → `script-src` SEM 'unsafe-inline';
//  - estilos inline (atributos style= dos componentes) exigem
//    `style-src` com 'unsafe-inline' — sem nonce dinâmico não dá para
//    evitar (MUI/emotion, que também injetavam <style>, saíram no P2/B1);
//  - imagens: própria origem + data: (next/image) + *.cloudfront.net
//    (remotePatterns — avatares do Strava);
//  - Analytics/Speed Insights (@vercel/* no _app.tsx) carregam de
//    va.vercel-scripts.com e fazem beacon de volta para esse host.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://*.cloudfront.net",
  "font-src 'self'",
  "connect-src 'self' https://va.vercel-scripts.com https://vitals.vercel-insights.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    if (process.env.NODE_ENV !== 'production') return [];
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  images: {
    // Hardening contra os RCEs de otimização de imagem do next@14.2.x
    // (VULN-004 — corrigidos só em ≥15.5.24/15.5.28; o projeto migrou para
    // next@15.5.28 em 17/11/2026):
    //  - `formats` restrito a webp: sem `image/avif` o optimizer não processa
    //    AVIF, fechando o vetor de RCE via AVIF;
    //  - `dangerouslyAllowSVG: false` (default, aqui explícito): sem SVG o
    //    vetor de RCE via SVG/`dangerouslyAllowSVG` fica fechado.
    // Mantidos como defesa em profundidade após a migração: são defaults
    // seguros e baratos — só reavaliar se algum dia precisarem de AVIF.
    formats: ['image/webp'],
    dangerouslyAllowSVG: false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.cloudfront.net',
      },
    ],
  },
};

export default nextConfig;
