import { describe, expect, it } from 'vitest';
import { Equipments, resolveCaption } from '../../../src/services/equipment';

describe('resolveCaption', () => {
  it('prefers the current catalog caption over a stale cached one', () => {
    // O cache (Redis/localStorage) guarda o caption do momento do recompute:
    // um rename no catálogo deve valer no primeiro render, sem esperar a
    // estatística reprocessar.
    const cached = { id: 'brakes', caption: 'freio:' };

    expect(resolveCaption(cached)).toBe(Equipments.Brake.caption);
    expect(resolveCaption(cached)).not.toBe(cached.caption);
  });

  it('keeps the cached caption for ids outside the catalog', () => {
    expect(resolveCaption({ id: 'id-removido', caption: 'rótulo legado:' })).toBe(
      'rótulo legado:',
    );
  });

  it('falls back to the id when there is no caption at all', () => {
    expect(resolveCaption({ id: 'id-removido' })).toBe('id-removido');
    // Dados malformados no cache (caption nulo) também caem no id.
    expect(resolveCaption({ id: 'id-removido', caption: null as never })).toBe(
      'id-removido',
    );
  });

  it('resolves every catalog id to the current caption', () => {
    for (const equipment of Object.values(Equipments)) {
      const resolved = resolveCaption({ id: equipment.id });
      // O catálogo é a fonte da verdade: o render nunca pode divergir dele,
      // mesmo quando o cache traz outro caption.
      expect(resolved).toBe(equipment.caption);
      expect(resolved).not.toBe('');
    }
  });
});
