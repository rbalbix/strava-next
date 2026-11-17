const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Hardening contra os RCEs de otimização de imagem do next@14.2.x
    // (CVEs corrigidos só em ≥15.5.24/15.5.28 — VULN-004):
    //  - `formats` restrito a webp: sem `image/avif` o optimizer não processa
    //    AVIF, fechando o vetor de RCE via AVIF;
    //  - `dangerouslyAllowSVG: false` (default, aqui explícito): sem SVG o
    //    vetor de RCE via SVG/`dangerouslyAllowSVG` fica fechado.
    // Remover só depois da migração para Next ≥15.5.28.
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
