import { Equipment, Equipments } from '../services/equipment';

export function parseEquipmentsFromActivity(
  activityNote: string,
  activityDate: string,
  distance: number,
  movingTime: number,
  equipmentTemplate: Record<string, Equipment>
): Equipment[] {
  const equipmentsFound: Equipment[] = [];
  const registered = new Set<string>();

  const note = activityNote.toLowerCase();
  const hasReview = /\breview\b/.test(note);

  for (const key in Equipments) {
    const e = Equipments[key];
    if (note.includes(e.id) && !registered.has(e.id)) {
      if (e.id === Equipments.Review.id && !hasReview) continue;

      const base = equipmentTemplate[e.id];

      const copy: Equipment = {
        id: base.id,
        caption: base.caption,
        distance,
        movingTime,
        date: activityDate,
        isRegistered: true,
      };

      registered.add(e.id);
      equipmentsFound.push(copy);

      // Equipamentos relacionados
      if (e.id === Equipments.Tubeless.id) {
        registered.add(Equipments.Tube.id);
        registered.add(Equipments.FrontTube.id);
        registered.add(Equipments.RearTube.id);
      }

      if (e.id === Equipments.Break.id) {
        registered.add(Equipments.FrontBreak.id);
        registered.add(Equipments.RearBreak.id);
      }

      if (e.id === Equipments.Suspension.id) {
        registered.add(Equipments.SuspensionReview.id);
        registered.add(Equipments.SuspensionKit.id);
      }

      if (e.id === Equipments.Shock.id) {
        registered.add(Equipments.ShockReview.id);
        registered.add(Equipments.ShockKit.id);
      }
    }
  }

  return equipmentsFound;
}
