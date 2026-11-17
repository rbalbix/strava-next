import { timingSafeEqual } from 'node:crypto';

/**
 * Compara duas strings em tempo constante (mitiga timing attack).
 *
 * Usado nas comparações contra valores aleatórios de alta entropia gerados
 * pelo servidor:
 *  - `hasValidInternalApiKey` — chave interna `x-internal-api-key`;
 *  - state do OAuth no callback (`/api/authorize`).
 *
 * Buffers de tamanhos diferentes retornam `false` antes do `timingSafeEqual`
 * (que lança quando os tamanhos divergem). O vazamento de comprimento é
 * aceito: o que se protege é a posição do primeiro byte divergente — com
 * valores aleatórios de 192/256 bits, a comparação byte a byte seria o
 * único caminho para uma inferência prática.
 */
function safeCompare(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(
    aBuffer as unknown as Uint8Array,
    bBuffer as unknown as Uint8Array,
  );
}

export { safeCompare };
