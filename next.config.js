const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
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
