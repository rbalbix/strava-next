import { useContext, useEffect, useState } from 'react';
import { PushSpinner } from 'react-spinners-kit';
import { DetailedActivity, SummaryActivity } from 'strava';
import { AuthContext } from '../contexts/AuthContext';
import styles from '../styles/components/Stats.module.css';
import Card from './Card';

type SummaryActivityWithNote = SummaryActivity & {
  note?: string;
};

type DetailedActivityWithNote = DetailedActivity & {
  private_note?: string;
};

export default function Stats() {
  const { setAthleteInfo, setErrorInfo, signIn, signOut, codeError } =
    useContext(AuthContext);

  const [gears, setGears] = useState([]);
  const [activities, setActivities] = useState<SummaryActivityWithNote[]>([]);

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

  useEffect(() => {
    async function configStravaParams() {
      try {
        const strava = await signIn();

        const athlete = await strava.athletes.getLoggedInAthlete();
        setAthleteInfo(athlete);

        // PEGAR OS EQUIPAMENTOS
        const gearsResult: [] = JSON.parse(
          JSON.stringify(athlete.bikes)
        ).concat(JSON.parse(JSON.stringify(athlete.shoes)));
        setGears(gearsResult);

        // PEGAR TODAS AS ATIVIDADES
        let page = 1;
        let activitiesResult = [];
        const activitiesResultTotal: SummaryActivityWithNote[] = [];

        do {
          activitiesResult =
            await strava.activities.getLoggedInAthleteActivities({
              per_page: 200,
              page,
            });

            const activitiesWithGear = activitiesResult.filter((activity) => {
              return activity.gear_id != null;
            });

            activitiesWithGear.map(async (activity) => {
            if (activity.name.includes('*') ) {
              const detail: DetailedActivityWithNote =
                await strava.activities.getActivityById({
                  id: activity.id,
                });

              activity.note = detail.private_note;
            }
          });

          activitiesResultTotal.push(...activitiesWithGear);
          page++;
        } while (activitiesResult.length !== 0 && page > 1);

        activitiesResultTotal.sort((a, b) => {
          if (a.gear_id > b.gear_id) return 1;
          if (a.gear_id < b.gear_id) return -1;
          return 0;
        });

        setActivities(activitiesResultTotal);
      } catch (error) {
        setErrorInfo(error);
        signOut();
      }
    }

    configStravaParams();
  }, []);

  return (
    <div className={styles.statsContainer}>
      <main>
        {gears.length === 0 || activities.length === 0 ? (
          <div className={styles.spinnerLoading}>
            <PushSpinner size={30} loading={true} />
            <span>Loading ...</span>
          </div>
        ) : (
          gears.map((gear) => {
            let totalMovingTime = 0;
            let totalDistance = 0;
            let count = 0;
            let activityType = '';

            let totalLubMovingTime = 0;
            let totalFrontLightMovingTime = 0;
            let totalRearLightMovingTime = 0;
            let totalReviewMovingTime = 0;
            let totalCleanMovingTime = 0;
            let totalSuspMovingTime = 0;
            let totalFrontBreakMovingTime = 0;
            let totalRearBreakMovingTime = 0;
            let totalBreakMovingTime = 0;
            let totalTapeMovingTime = 0;
            let totalDropperMovingTime = 0;
            let totalStemMovingTime = 0;
            let totalSaddleMovingTime = 0;
            let totalTireMovingTime = 0;
            let totalFrontTireMovingTime = 0;
            let totalRearTireMovingTime = 0;
            let totalTubeMovingTime = 0;
            let totalFrontTubeMovingTime = 0;
            let totalRearTubeMovingTime = 0;
            let totalTubelessMovingTime = 0;
            let totalHandlebarMovingTime = 0;
            let totalGripMovingTime = 0;
            let totalPedalMovingTime = 0;
            let totalChainMovingTime = 0;
            let totalFrontDiskMovingTime = 0;
            let totalRearDiskMovingTime = 0;
            let totalDisksMovingTime = 0;
            let totalWheelsetMovingTime = 0;

            let totalLubDistance = 0;
            let totalFrontLightDistance = 0;
            let totalRearLightDistance = 0;
            let totalReviewDistance = 0;
            let totalCleanDistance = 0;
            let totalSuspDistance = 0;
            let totalFrontBreakDistance = 0;
            let totalRearBreakDistance = 0;
            let totalBreakDistance = 0;
            let totalTapeDistance = 0;
            let totalDropperDistance = 0;
            let totalStemDistance = 0;
            let totalSaddleDistance = 0;
            let totalTireDistance = 0;
            let totalFrontTireDistance = 0;
            let totalRearTireDistance = 0;
            let totalTubeDistance = 0;
            let totalFrontTubeDistance = 0;
            let totalRearTubeDistance = 0;
            let totalTubelessDistance = 0;
            let totalHandlebarDistance = 0;
            let totalGripDistance = 0;
            let totalPedalDistance = 0;
            let totalChainDistance = 0;
            let totalFrontDiskDistance = 0;
            let totalRearDiskDistance = 0;
            let totalDisksDistance = 0;
            let totalWheelsetDistance = 0;

            let isLubRegistered = false;
            let isFrontLightRegistered = false;
            let isRearLightRegistered = false;
            let isReviewRegistered = false;
            let isCleanRegistered = false;
            let isSuspRegistered = false;
            let isFrontBreakRegistered = false;
            let isRearBreakRegistered = false;
            let isBreakRegistered = false;
            let isTapeRegistered = false;
            let isDropperRegistered = false;
            let isStemRegistered = false;
            let isSaddleRegistered = false;
            let isTireRegistered = false;
            let isFrontTireRegistered = false;
            let isRearTireRegistered = false;
            let isTubeRegistered = false;
            let isFrontTubeRegistered = false;
            let isRearTubeRegistered = false;
            let isTubelessRegistered = false;
            let isHandlebarRegistered = false;
            let isGripRegistered = false;
            let isPedalRegistered = false;
            let isChainRegistered = false;
            let isFrontDiskRegistered = false;
            let isRearDiskRegistered = false;
            let isDisksRegistered = false;
            let isWheelsetRegistered = false;

            let suspDate = '';
            let frontBreakDate = '';
            let rearBreakDate = '';
            let breakDate = '';
            let tapeDate = '';
            let tireDate = '';
            let frontTireDate = '';
            let rearTireDate = '';
            let tubeDate = '';
            let frontTubeDate = '';
            let rearTubeDate = '';
            let tubelessDate = '';
            let dropperDate = '';
            let stemDate = '';
            let saddleDate = '';
            let handlebarDate = '';
            let gripDate = '';
            let pedalDate = '';
            let chainDate = '';
            let frontDiskDate = '';
            let rearDiskDate = '';
            let disksDate = '';
            let wheelsetDate = '';

            activities.map((activity) => {
              if (activity.gear_id === gear.id) {
                if (activity.name.includes('*')) {
                  if (!isLubRegistered && activity.note?.includes('lub')) {
                    totalLubMovingTime = totalMovingTime;
                    totalLubDistance = totalDistance;
                    isLubRegistered = true;
                  }
                  if (
                    !isFrontLightRegistered &&
                    activity.note?.includes('frontlight')
                  ) {
                    totalFrontLightMovingTime = totalMovingTime;
                    totalFrontLightDistance = totalDistance;
                    isFrontLightRegistered = true;
                  }
                  if (
                    !isRearLightRegistered &&
                    activity.note?.includes('rearlight')
                  ) {
                    totalRearLightMovingTime = totalMovingTime;
                    totalRearLightDistance = totalDistance;
                    isRearLightRegistered = true;
                  }

                  if (
                    !isReviewRegistered &&
                    activity.note?.includes('review')
                  ) {
                    totalReviewMovingTime = totalMovingTime;
                    totalReviewDistance = totalDistance;
                    isReviewRegistered = true;
                  }

                  if (!isCleanRegistered && activity.note?.includes('clean')) {
                    totalCleanMovingTime = totalMovingTime;
                    totalCleanDistance = totalDistance;
                    isCleanRegistered = true;
                  }

                  if (!isSuspRegistered && activity.note?.includes('susp')) {
                    suspDate = activity.start_date_local;

                    totalSuspMovingTime = totalMovingTime;
                    totalSuspDistance = totalDistance;
                    isSuspRegistered = true;
                  }

                  if (
                    !isFrontBreakRegistered &&
                    activity.note?.includes('frontbreak')
                  ) {
                    frontBreakDate = activity.start_date_local;

                    totalFrontBreakMovingTime = totalMovingTime;
                    totalFrontBreakDistance = totalDistance;

                    isFrontBreakRegistered = true;
                    isBreakRegistered = true;
                  }

                  if (
                    !isRearBreakRegistered &&
                    activity.note?.includes('rearbreak')
                  ) {
                    rearBreakDate = activity.start_date_local;

                    totalRearBreakMovingTime = totalMovingTime;
                    totalRearBreakDistance = totalDistance;

                    isRearBreakRegistered = true;
                    isBreakRegistered = true;
                  }

                  if (!isBreakRegistered && activity.note?.includes('break')) {
                    breakDate = activity.start_date_local;

                    totalBreakMovingTime = totalMovingTime;
                    totalBreakDistance = totalDistance;
                    isBreakRegistered = true;
                  }

                  if (!isTapeRegistered && activity.note?.includes('tape')) {
                    tapeDate = activity.start_date_local;

                    totalTapeMovingTime = totalMovingTime;
                    totalTapeDistance = totalDistance;
                    isTapeRegistered = true;
                  }

                  if (
                    !isDropperRegistered &&
                    activity.note?.includes('dropper')
                  ) {
                    dropperDate = activity.start_date_local;

                    totalDropperMovingTime = totalMovingTime;
                    totalDropperDistance = totalDistance;
                    isDropperRegistered = true;
                  }

                  if (!isStemRegistered && activity.note?.includes('stem')) {
                    stemDate = activity.start_date_local;

                    totalStemMovingTime = totalMovingTime;
                    totalStemDistance = totalDistance;
                    isStemRegistered = true;
                  }

                  if (
                    !isSaddleRegistered &&
                    activity.note?.includes('saddle')
                  ) {
                    saddleDate = activity.start_date_local;

                    totalSaddleMovingTime = totalMovingTime;
                    totalSaddleDistance = totalDistance;
                    isSaddleRegistered = true;
                  }

                  if (
                    !isFrontTireRegistered &&
                    activity.note?.includes('fronttire')
                  ) {
                    frontTireDate = activity.start_date_local;

                    totalFrontTireMovingTime = totalMovingTime;
                    totalFrontTireDistance = totalDistance;
                    isFrontTireRegistered = true;
                    isTireRegistered = true;
                  }

                  if (
                    !isRearTireRegistered &&
                    activity.note?.includes('reartire')
                  ) {
                    rearTireDate = activity.start_date_local;

                    totalRearTireMovingTime = totalMovingTime;
                    totalRearTireDistance = totalDistance;
                    isRearTireRegistered = true;
                    isTireRegistered = true;
                  }

                  if (!isTireRegistered && activity.note?.includes('tire')) {
                    tireDate = activity.start_date_local;

                    totalTireMovingTime = totalMovingTime;
                    totalTireDistance = totalDistance;
                    isTireRegistered = true;
                  }

                  if (
                    !isTubelessRegistered &&
                    activity.note?.includes('tubeless')
                  ) {
                    tubelessDate = activity.start_date_local;

                    totalTubelessMovingTime = totalMovingTime;
                    totalTubelessDistance = totalDistance;
                    isTubelessRegistered = true;

                    isFrontTubeRegistered = true;
                    isRearTubeRegistered = true;
                    isTubeRegistered = true;
                  }

                  if (
                    !isFrontTubeRegistered &&
                    activity.note?.includes('fronttube')
                  ) {
                    frontTubeDate = activity.start_date_local;

                    totalFrontTubeMovingTime = totalMovingTime;
                    totalFrontTubeDistance = totalDistance;
                    isFrontTubeRegistered = true;
                    isTubeRegistered = true;
                  }

                  if (
                    !isRearTubeRegistered &&
                    activity.note?.includes('reartube')
                  ) {
                    rearTubeDate = activity.start_date_local;

                    totalRearTubeMovingTime = totalMovingTime;
                    totalRearTubeDistance = totalDistance;
                    isRearTubeRegistered = true;
                    isTubeRegistered = true;
                  }

                  if (!isTubeRegistered && activity.note?.includes('tube')) {
                    tubeDate = activity.start_date_local;

                    totalTubeMovingTime = totalMovingTime;
                    totalTubeDistance = totalDistance;
                    isTubeRegistered = true;
                  }

                  if (
                    !isHandlebarRegistered &&
                    activity.note?.includes('handlebar')
                  ) {
                    handlebarDate = activity.start_date_local;

                    totalHandlebarMovingTime = totalMovingTime;
                    totalHandlebarDistance = totalDistance;
                    isHandlebarRegistered = true;
                  }

                  if (!isGripRegistered && activity.note?.includes('grip')) {
                    gripDate = activity.start_date_local;

                    totalGripMovingTime = totalMovingTime;
                    totalGripDistance = totalDistance;
                    isGripRegistered = true;
                  }

                  if (!isPedalRegistered && activity.note?.includes('pedal')) {
                    pedalDate = activity.start_date_local;

                    totalPedalMovingTime = totalMovingTime;
                    totalPedalDistance = totalDistance;
                    isPedalRegistered = true;
                  }

                  if (!isChainRegistered && activity.note?.includes('chain')) {
                    chainDate = activity.start_date_local;

                    totalChainMovingTime = totalMovingTime;
                    totalChainDistance = totalDistance;
                    isChainRegistered = true;
                  }

                  if (
                    !isFrontDiskRegistered &&
                    activity.note?.includes('frontdisk')
                  ) {
                    frontDiskDate = activity.start_date_local;

                    totalFrontDiskMovingTime = totalMovingTime;
                    totalFrontDiskDistance = totalDistance;

                    isFrontDiskRegistered = true;
                    isDisksRegistered = true;
                  }

                  if (
                    !isRearDiskRegistered &&
                    activity.note?.includes('reardisk')
                  ) {
                    rearDiskDate = activity.start_date_local;

                    totalRearDiskMovingTime = totalMovingTime;
                    totalRearDiskDistance = totalDistance;

                    isRearDiskRegistered = true;
                    isDisksRegistered = true;
                  }

                  if (
                    !isWheelsetRegistered &&
                    activity.note?.includes('wheelset')
                  ) {
                    wheelsetDate = activity.start_date_local;

                    totalWheelsetMovingTime = totalMovingTime;
                    totalWheelsetDistance = totalDistance;

                    isWheelsetRegistered = true;
                  }
            
                }

                totalMovingTime = totalMovingTime + activity.moving_time;
                totalDistance = totalDistance + activity.distance;
                activityType = activity.type;

                count++;
              }
            });

            return (
              <Card
                key={gear.id}
                gear={{
                  id: gear.id,
                  name: gear.name,
                  type: activityType,
                  distance: totalDistance,
                  lubDistance: totalLubDistance,
                  frontLightDistance: totalFrontLightDistance,
                  rearLightDistance: totalRearLightDistance,
                  reviewDistance: totalReviewDistance,
                  cleanDistance: totalCleanDistance,
                  suspDistance: totalSuspDistance,
                  rearBreakDistance: totalRearBreakDistance,
                  frontBreakDistance: totalFrontBreakDistance,
                  breakDistance: totalBreakDistance,
                  tapeDistance: totalTapeDistance,
                  dropperDistance: totalDropperDistance,
                  stemDistance: totalStemDistance,
                  saddleDistance: totalSaddleDistance,
                  frontTireDistance: totalFrontTireDistance,
                  rearTireDistance: totalRearTireDistance,
                  tireDistance: totalTireDistance,
                  frontTubeDistance: totalFrontTubeDistance,
                  rearTubeDistance: totalRearTubeDistance,
                  tubeDistance: totalTubeDistance,
                  tubelessDistance: totalTubelessDistance,
                  handlebarDistance: totalHandlebarDistance,
                  gripDistance: totalGripDistance,
                  pedalDistance: totalPedalDistance,
                  chainDistance: totalChainDistance,
                  frontDiskDistance: totalFrontDiskDistance,
                  rearDiskDistance: totalRearDiskDistance,
                    
                  wheelsetDistance: totalWheelsetDistance,
                 
                  totalMovingTime,
                  lubMovingTime: totalLubMovingTime,
                  frontLightMovingTime: totalFrontLightMovingTime,
                  rearLightMovingTime: totalRearLightMovingTime,
                  reviewMovingTime: totalReviewMovingTime,
                  cleanMovingTime: totalCleanMovingTime,
                  suspMovingTime: totalSuspMovingTime,
                  rearBreakMovingTime: totalRearBreakMovingTime,
                  frontBreakMovingTime: totalFrontBreakMovingTime,
                  breakMovingTime: totalBreakMovingTime,
                  tapeMovingTime: totalTapeMovingTime,
                  dropperMovingTime: totalDropperMovingTime,
                  stemMovingTime: totalStemMovingTime,
                  saddleMovingTime: totalSaddleMovingTime,
                  frontTireMovingTime: totalFrontTireMovingTime,
                  rearTireMovingTime: totalRearTireMovingTime,
                  tireMovingTime: totalTireMovingTime,
                  frontTubeMovingTime: totalFrontTubeMovingTime,
                  rearTubeMovingTime: totalRearTubeMovingTime,
                  tubeMovingTime: totalTubeMovingTime,
                  tubelessMovingTime: totalTubelessMovingTime,
                  handlebarMovingTime: totalHandlebarMovingTime,
                  gripMovingTime: totalGripMovingTime,
                  pedalMovingTime: totalPedalMovingTime,
                  chainMovingTime: totalChainMovingTime,
                  frontDiskMovingTime: totalFrontDiskMovingTime,
                  rearDiskMovingTime: totalRearDiskMovingTime,
                    
                  wheelsetMovingTime: totalWheelsetMovingTime,
               
                  suspDate: suspDate,
                  rearBreakDate: rearBreakDate,
                  frontBreakDate: frontBreakDate,
                  breakDate: breakDate,
                  tapeDate: tapeDate,
                  frontTireDate: frontTireDate,
                  rearTireDate: rearTireDate,
                  tireDate: tireDate,
                  frontTubeDate: frontTubeDate,
                  rearTubeDate: rearTubeDate,
                  tubeDate: tubeDate,
                  tubelessDate: tubelessDate,
                  dropperDate: dropperDate,
                  stemDate: stemDate,
                  saddleDate: saddleDate,
                  handlebarDate: handlebarDate,
                  gripDate: gripDate,
                  pedalDate: pedalDate,
                  chainDate: chainDate,
                  frontDiskDate: frontDiskDate,
                  rearDiskDate: rearDiskDate,
                    
                  wheelsetDate: wheelsetDate,
             
                  count,
                }}
              />
            );
          })
        )}
      </main>
    </div>
  );
}
