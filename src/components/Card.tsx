import * as d3 from 'd3-format';
import { MdDirectionsBike, MdDirectionsRun } from 'react-icons/md';
import { Modal } from '../components/Modal';
import styles from '../styles/components/Card.module.css';

import { format } from 'date-fns';

const locale = d3.formatLocale({
  decimal: ',',
  thousands: '.',
  grouping: [3],
  currency: ['R$', ''],
});

export default function Card(props) {
  function handleOpenModal(id: string) {
    handleCloseModal();
    document.getElementById(id).style.display = 'block';
  }

  function handleCloseModal() {
    const itens = Array.from(
      document.getElementsByClassName('modal') as HTMLCollectionOf<HTMLElement>
    );
    itens.map((item) => {
      item.style.display = 'none';
    });
  }

  return (
    <div>
      <div
        className={styles.cardContainer}
        onClick={() => handleOpenModal(props.gear.id)}
      >
        <header>
          {props.gear.name}
          {props.gear.type === 'Ride' ? (
            <MdDirectionsBike color='var(--light-blue)' />
          ) : (
            <MdDirectionsRun color='#fc5200' />
          )}
        </header>
        <main>
          <p>{`${props.gear.count} atividades.`}</p>
          <p>{`${locale.format(',.2f')(props.gear.distance / 1000)} km`}</p>
          <p>{`${secondsToHms(props.gear.totalMovingTime)}h`}</p>

          {props.gear.type === 'Ride' && (
            <div>
              {props.gear.lubDistance != 0 && (
                <p>{`última lubrificação: ${locale.format(',.2f')(
                  props.gear.lubDistance / 1000
                )} km  | ${secondsToHms(props.gear.lubMovingTime)}h`}</p>
              )}

              {props.gear.frontLightDistance != 0 && (
                <p>{`última carga do front light: ${locale.format(',.2f')(
                  props.gear.frontLightDistance / 1000
                )} km  | ${secondsToHms(props.gear.frontLightMovingTime)}h`}</p>
              )}

              {props.gear.rearLightDistance != 0 && (
                <p>{`última carga do rear light: ${locale.format(',.2f')(
                  props.gear.rearLightDistance / 1000
                )} km  | ${secondsToHms(props.gear.rearLightMovingTime)}h`}</p>
              )}
            </div>
          )}
        </main>
      </div>

      <Modal id={props.gear.id} closeModal={handleCloseModal}>
        <main>
          <header>
            <span>
              {props.gear.type === 'Ride' ? (
                <MdDirectionsBike color='var(--light-blue)' />
              ) : (
                <MdDirectionsRun color='#fc5200' />
              )}
            </span>
            <span>{props.gear.name}</span>
          </header>

          <section>
            <p>{`${props.gear.count} atividades.`}</p>
            <p>{`Distância: ${locale.format(',.2f')(
              props.gear.distance / 1000
            )} km`}</p>
            <p>{`Tempo: ${secondsToHms(props.gear.totalMovingTime)}h`}</p>
          </section>

          {props.gear.type === 'Ride' && (
            <>
              <div>
                {props.gear.lubDistance != 0 && (
                  <p>{`última lubrificação: ${locale.format(',.2f')(
                    props.gear.lubDistance / 1000
                  )} km  | ${secondsToHms(props.gear.lubMovingTime)}h`}</p>
                )}

                {props.gear.frontLightDistance != 0 && (
                  <p>{`última carga do front light: ${locale.format(',.2f')(
                    props.gear.frontLightDistance / 1000
                  )} km  | ${secondsToHms(
                    props.gear.frontLightMovingTime
                  )}h`}</p>
                )}

                {props.gear.rearLightDistance != 0 && (
                  <p>{`última carga do rear light: ${locale.format(',.2f')(
                    props.gear.rearLightDistance / 1000
                  )} km  | ${secondsToHms(
                    props.gear.rearLightMovingTime
                  )}h`}</p>
                )}
              </div>

              <div>
                {props.gear.cleanDistance != 0 && (
                  <p>{`-> Lavagem: ${locale.format(',.2f')(
                    props.gear.cleanDistance / 1000
                  )} km  | ${secondsToHms(props.gear.cleanMovingTime)}h`}</p>
                )}

                {props.gear.reviewDistance != 0 && (
                  <p>{`-> Revisão geral: ${locale.format(',.2f')(
                    props.gear.reviewDistance / 1000
                  )} km  | ${secondsToHms(props.gear.reviewMovingTime)}h`}</p>
                )}

                {props.gear.suspDistance != 0 && (
                  <p>
                    {'-> Manutenção da Suspensão: '}
                    <span>
                      {`[${format(
                        new Date(props.gear.suspDate),
                        'dd/MM/yyyy'
                      )}]`}
                    </span>
                    {`${locale.format(',.2f')(
                      props.gear.suspDistance / 1000
                    )} km  | ${secondsToHms(props.gear.suspMovingTime)}h`}
                  </p>
                )}
              </div>

              <div>
                {(props.gear.rearBreakDistance != 0 ||
                  props.gear.frontBreakDistance != 0 ||
                  props.gear.breakDistance != 0 ||
                  props.gear.tapeDistance != 0 ||
                  props.gear.dropperDistance != 0 ||
                  props.gear.stemDistance != 0 ||
                  props.gear.saddleDistance != 0 ||
                  props.gear.handlebarDistance != 0 ||
                  props.gear.tireDistance != 0 ||
                  props.gear.tubelessDistance != 0 ||
                  props.gear.gripDistance != 0 ||
                  props.gear.pedalDistance != 0) && (
                  <strong>Outras trocas:</strong>
                )}

                {props.gear.rearBreakDistance != 0 && (
                  <p>
                    {'--> Freio [traseiro]: '}
                    <span>
                      {`[${format(
                        new Date(props.gear.rearBreakDate),
                        'dd/MM/yyyy'
                      )}]`}
                    </span>
                    {`${locale.format(',.2f')(
                      props.gear.rearBreakDistance / 1000
                    )} km  | ${secondsToHms(props.gear.rearBreakMovingTime)}h`}
                  </p>
                )}

                {props.gear.frontBreakDistance != 0 && (
                  <p>
                    {'--> Freio [dianteiro]: '}
                    <span>
                      {`[${format(
                        new Date(props.gear.frontBreakDate),
                        'dd/MM/yyyy'
                      )}]`}
                    </span>
                    {`${locale.format(',.2f')(
                      props.gear.frontBreakDistance / 1000
                    )} km  | ${secondsToHms(props.gear.frontBreakMovingTime)}h`}
                  </p>
                )}

                {props.gear.breakDistance != 0 && (
                  <p>
                    {'--> Freios: '}
                    <span>
                      {`[${format(
                        new Date(props.gear.breakDate),
                        'dd/MM/yyyy'
                      )}]`}
                    </span>
                    {`${locale.format(',.2f')(
                      props.gear.breakDistance / 1000
                    )} km  | ${secondsToHms(props.gear.breakMovingTime)}h`}
                  </p>
                )}

                {props.gear.tireDistance != 0 && (
                  <p>
                    {'--> Pneus: '}
                    <span>
                      {`[${format(
                        new Date(props.gear.tireDate),
                        'dd/MM/yyyy'
                      )}]`}
                    </span>
                    {`${locale.format(',.2f')(
                      props.gear.tireDistance / 1000
                    )} km  | ${secondsToHms(props.gear.tireMovingTime)}h`}
                  </p>
                )}

                {props.gear.tubelessDistance != 0 && (
                  <p>
                    {'--> Tubeless: '}
                    <span>
                      {`[${format(
                        new Date(props.gear.tubelessDate),
                        'dd/MM/yyyy'
                      )}]`}
                    </span>
                    {`${locale.format(',.2f')(
                      props.gear.tubelessDistance / 1000
                    )} km  | ${secondsToHms(props.gear.tubelessMovingTime)}h`}
                  </p>
                )}

                {props.gear.tapeDistance != 0 && (
                  <p>
                    {'--> Fita de guidão: '}
                    <span>
                      {`[${format(
                        new Date(props.gear.tapeDate),
                        'dd/MM/yyyy'
                      )}]`}
                    </span>
                    {`${locale.format(',.2f')(
                      props.gear.tapeDistance / 1000
                    )} km  | ${secondsToHms(props.gear.tapeMovingTime)}h`}
                  </p>
                )}

                {props.gear.dropperDistance != 0 && (
                  <p>
                    {'--> Canote retrátil: '}
                    <span>
                      {`[${format(
                        new Date(props.gear.dropperDate),
                        'dd/MM/yyyy'
                      )}]`}
                    </span>
                    {`${locale.format(',.2f')(
                      props.gear.dropperDistance / 1000
                    )} km  | ${secondsToHms(props.gear.dropperMovingTime)}h`}
                  </p>
                )}

                {props.gear.stemDistance != 0 && (
                  <p>
                    {'--> Mesa: '}
                    <span>
                      {`[${format(
                        new Date(props.gear.stemDate),
                        'dd/MM/yyyy'
                      )}]`}
                    </span>
                    {`${locale.format(',.2f')(
                      props.gear.stemDistance / 1000
                    )} km  | ${secondsToHms(props.gear.stemMovingTime)}h`}
                  </p>
                )}

                {props.gear.saddleDistance != 0 && (
                  <p>
                    {'--> Selim: '}
                    <span>
                      {`[${format(
                        new Date(props.gear.saddleDate),
                        'dd/MM/yyyy'
                      )}]`}
                    </span>
                    {`${locale.format(',.2f')(
                      props.gear.saddleDistance / 1000
                    )} km  | ${secondsToHms(props.gear.saddleMovingTime)}h`}
                  </p>
                )}

                {props.gear.handlebarDistance != 0 && (
                  <p>
                    {'--> Guidão: '}
                    <span>
                      {`[${format(
                        new Date(props.gear.handlebarDate),
                        'dd/MM/yyyy'
                      )}]`}
                    </span>
                    {`${locale.format(',.2f')(
                      props.gear.handlebarDistance / 1000
                    )} km  | ${secondsToHms(props.gear.handlebarMovingTime)}h`}
                  </p>
                )}

                {props.gear.gripDistance != 0 && (
                  <p>
                    {'--> Manoplas: '}
                    <span>
                      {`[${format(
                        new Date(props.gear.gripDate),
                        'dd/MM/yyyy'
                      )}]`}
                    </span>
                    {`${locale.format(',.2f')(
                      props.gear.gripDistance / 1000
                    )} km  | ${secondsToHms(props.gear.gripMovingTime)}h`}
                  </p>
                )}

                {props.gear.pedalDistance != 0 && (
                  <p>
                    {'--> Pedais: '}
                    <span>
                      {`[${format(
                        new Date(props.gear.pedalDate),
                        'dd/MM/yyyy'
                      )}]`}
                    </span>
                    {`${locale.format(',.2f')(
                      props.gear.pedalDistance / 1000
                    )} km  | ${secondsToHms(props.gear.pedalMovingTime)}h`}
                  </p>
                )}
              </div>
            </>
          )}
        </main>
      </Modal>
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
  // :${String(seconds).padStart(2, '0')}`;

  return movingTime;
}
