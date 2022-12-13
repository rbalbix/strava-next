import * as d3 from 'd3-format';

const locale = d3.formatLocale({
  decimal: ',',
  thousands: '.',
  grouping: [3],
  currency: ['R$', ''],
});

function secondsToHms(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor((totalSeconds % 3600) % 60);

  const movingTime = `${String(hours).padStart(2, '0')}:${String(
    minutes
  ).padStart(2, '0')}`;
  // :${String(seconds).padStart(2, '0')}`;

  return movingTime;
}

export { locale, secondsToHms };
