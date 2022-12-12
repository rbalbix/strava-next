import * as d3 from 'd3-format';
import { format } from 'date-fns';

const locale = d3.formatLocale({
  decimal: ',',
  thousands: '.',
  grouping: [3],
  currency: ['R$', ''],
});

export default function CardItem(props) {
  return (
    <div>
      <div>{props.gear.distance}</div>
      {props.gear.distance != 0 && (
        <p>
          {'--> Freio'}

          {`${locale.format(',.2f')(
            props.gear.distance / 1000
          )} km  | ${secondsToHms(props.gear.time)}h`}
        </p>
      )}
    </div>
  );
}

function secondsToHms(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor((totalSeconds % 3600) % 60);

  const movingTime = `${String(hours).padStart(2, '0')}:${String(
    minutes
  ).padStart(2, '0')}`;

  return movingTime;
}
