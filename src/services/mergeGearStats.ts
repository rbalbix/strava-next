import { GearStats } from '../services/gear';

export function mergeGearStats(
  previous: GearStats[],
  incoming: GearStats[]
): GearStats[] {
  const statsMap = new Map<string, GearStats>();

  previous.forEach((stat) => statsMap.set(stat.id, stat));

  incoming.forEach((newStat) => {
    const oldStat = statsMap.get(newStat.id);
    if (oldStat) {
      statsMap.set(newStat.id, {
        ...newStat,
        count: oldStat.count + newStat.count,
        distance: oldStat.distance + newStat.distance,
        movingTime: oldStat.movingTime + newStat.movingTime,
        equipments: [...oldStat.equipments, ...newStat.equipments],
      });
    } else {
      statsMap.set(newStat.id, newStat);
    }
  });

  return Array.from(statsMap.values());
}
