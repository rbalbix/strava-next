import Divider from '@mui/material/Divider';
import { useContext } from 'react';
import { FaArrowRight } from 'react-icons/fa';
import { IoMdStats } from 'react-icons/io';
import { MdClose, MdDirectionsBike, MdDirectionsRun } from 'react-icons/md';
import { ActivityTotal } from 'strava';
import { AuthContext } from '../contexts/AuthContext';
import { locale, secondsToHms } from '../services/utils';
import cardStyles from '../styles/components/Card.module.css';

export default function AthleteStats() {
  const { athlete, athleteStats, closeModal } = useContext(AuthContext);

  if (!athleteStats) return null;

  const renderStats = (
    title: string,
    stats: {
      biggestDistance?: number;
      biggestClimb?: number;
      recent: ActivityTotal;
      ytd: ActivityTotal;
      all: ActivityTotal;
    }
  ) => (
    <div className={cardStyles.cardContainer}>
      <header>
        {title === 'Ciclismo' ? (
          <MdDirectionsBike color='var(--light-blue)' />
        ) : (
          <MdDirectionsRun color='#fc5200' />
        )}
      </header>
      <div>
        {title === 'Ciclismo' && (
          <>
            <p>{`Maior distância: ${locale.format(',.2f')(
              (stats?.biggestDistance || 0) / 1000
            )}km`}</p>
            <p>{`Maior escalada: ${locale.format(',.2f')(
              stats?.biggestClimb || 0
            )}m`}</p>
          </>
        )}

        <p className={cardStyles.cardNewItem}>
          <span>
            <FaArrowRight />
          </span>
          <span>
            <strong>&nbsp;Últimas 4 semanas:</strong>
          </span>
        </p>
        <p>{`[${stats?.recent?.count || 0} atividades | ${locale.format(',.2f')(
          (stats?.recent?.distance || 0) / 1000
        )}km | ${secondsToHms(stats?.recent?.moving_time || 0)}h
              | ${locale.format(',.2f')(
                stats?.recent?.elevation_gain || 0
              )}m]`}</p>

        <p className={cardStyles.cardNewItem}>
          <span>
            <FaArrowRight />
          </span>
          <span>
            <strong>&nbsp;Último ano:</strong>
          </span>
        </p>
        <p>{`[${stats?.ytd?.count || 0} atividades | ${locale.format(',.2f')(
          (stats?.ytd?.distance || 0) / 1000
        )}km |  
              
              ${secondsToHms(stats?.ytd?.moving_time || 0)}h
              
              | ${locale.format(',.2f')(
                stats?.ytd?.elevation_gain || 0
              )}m]`}</p>

        <p className={cardStyles.cardNewItem}>
          <span>
            <FaArrowRight />
          </span>
          <span>
            <strong>&nbsp;Totais:</strong>
          </span>
        </p>
        <p>{`[${stats?.all?.count || 0} atividades | ${locale.format(',.2f')(
          (stats?.all?.distance || 0) / 1000
        )}km |  
              
              ${secondsToHms(stats?.all?.moving_time || 0)}h
              
              | ${locale.format(',.2f')(
                stats?.all?.elevation_gain || 0
              )}m]`}</p>
      </div>
    </div>
  );

  return (
    <>
      {athleteStats && athlete?.id && (
        <main className={cardStyles.athleteStatInfoContent}>
          <header>
            <div className={cardStyles.athleteStatInfoTitle}>
              <div>
                <span className={cardStyles.athleteStatInfoTitleIcon}>
                  <IoMdStats color='var(--stat-icon)' />
                </span>
                <span>Estatísticas:</span>
              </div>
              <div>
                <MdClose onClick={closeModal} style={{ cursor: 'pointer' }} />
              </div>
            </div>
          </header>

          {renderStats('Ciclismo', {
            biggestDistance: athleteStats?.biggest_ride_distance,
            biggestClimb: athleteStats?.biggest_climb_elevation_gain,
            recent: athleteStats?.recent_ride_totals,
            ytd: athleteStats?.ytd_ride_totals,
            all: athleteStats?.all_ride_totals,
          })}

          <Divider />

          {renderStats('Corrida', {
            recent: athleteStats?.recent_run_totals,
            ytd: athleteStats?.ytd_run_totals,
            all: athleteStats?.all_run_totals,
          })}

          <Divider />
        </main>
      )}
    </>
  );
}
