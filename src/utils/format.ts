// Formatação numérica em pt-BR via Intl.NumberFormat (API da plataforma) —
// substitui d3-format, que só existia por isto (P2/B3). Instanciar um
// formatter é caro: os de cada casas decimal são criados uma vez no módulo
// e reutilizados (js-cache-function-results).
const numberFormatters = new Map<number, Intl.NumberFormat>();

function getNumberFormatter(fractionDigits: number): Intl.NumberFormat {
  let formatter = numberFormatters.get(fractionDigits);
  if (!formatter) {
    formatter = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    numberFormatters.set(fractionDigits, formatter);
  }
  return formatter;
}

/**
 * formatNumber(12345.67) → '12.345,67' (2 casas, padrão);
 * formatNumber(12.34, 1) → '12,3'.
 */
function formatNumber(value: number, fractionDigits = 2): string {
  return getNumberFormatter(fractionDigits).format(value);
}

// dd/MM/yyyy em pt-BR via Intl.DateTimeFormat (P3) — substitui o
// format(date, 'dd/MM/yyyy') hardcoded do date-fns nos mesmos pontos.
// Formatter criado uma vez e reutilizado (js-cache-function-results).
const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/**
 * formatDate(new Date('2026-11-26')) → '26/11/2026'.
 */
function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

function secondsToHms(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
    2,
    '0',
  )}`;
}

export { formatDate, formatNumber, secondsToHms };
