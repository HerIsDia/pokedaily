import { beforeEach, describe, expect, it } from 'vitest';
import { emptyGameState, type GameState } from '../../src/core/game-state';
import { createFormGauge, formGaugeInfo } from '../../src/features/forms/form-gauge';
import { createI18n } from '../../src/i18n';
import { Scope } from '../../src/ui/scope';
import { createStore } from '../../src/ui/store';

const withToday = (id: number, daysWithoutForm: number): GameState => ({
  ...emptyGameState(),
  pity: { daysWithoutForm },
  lastDrawDay: '2026-05-20',
  entries: {
    '2026-05-20': {
      id,
      natureKey: 'jolly',
      level: 5,
      isShiny: false,
      day: '2026-05-20',
      rename: '',
    },
  },
});

describe('calcul de la jauge', () => {
  it('au départ : 1 % et garantie dans 100 jours', () => {
    expect(formGaugeInfo(emptyGameState())).toEqual({
      percent: 1,
      guaranteedInDays: 100,
      gotFormToday: false,
    });
  });

  it('monte de 1 % par jour sans forme', () => {
    expect(formGaugeInfo(withToday(25, 11))).toMatchObject({ percent: 12, guaranteedInDays: 89 });
  });

  it('au maximum : 100 % et garantie DEMAIN', () => {
    expect(formGaugeInfo(withToday(25, 99))).toMatchObject({ percent: 100, guaranteedInDays: 1 });
    expect(formGaugeInfo(withToday(25, 500)).percent).toBe(100);
  });

  it('une forme aujourd’hui est signalée (Méga-Dracaufeu X)', () => {
    expect(formGaugeInfo({ ...withToday(10034, 0) }).gotFormToday).toBe(true);
    expect(formGaugeInfo(withToday(6, 0)).gotFormToday).toBe(false);
  });
});

describe('jauge affichée', () => {
  beforeEach(() => document.body.replaceChildren());

  it('montre le pourcentage, la barre et l’explication, et suit l’état', () => {
    const state = createStore(withToday(25, 7));
    const root = createFormGauge({ i18n: createI18n('fr'), scope: new Scope(), state });
    document.body.append(root);
    expect(root.querySelector('.gauge-title')?.textContent).toBe('🌀 Chance de forme demain : 8 %');
    expect(root.querySelector<HTMLElement>('.gauge-fill')!.style.width).toBe('8%');
    expect(root.querySelector('.gauge-track')?.getAttribute('aria-valuenow')).toBe('8');
    expect(root.querySelector('.gauge-detail')?.textContent).toContain('1 % chaque jour');
    expect(root.querySelector('.gauge-detail')?.textContent).toContain('93 j');
    state.set(withToday(10034, 0));
    expect(root.querySelector('.gauge-title')?.textContent).toContain('1 %');
    expect(root.querySelector('.gauge-detail')?.textContent).toContain('repart à 1 %');
  });

  it('en anglais', () => {
    const root = createFormGauge({
      i18n: createI18n('en'),
      scope: new Scope(),
      state: createStore(withToday(25, 2)),
    });
    expect(root.querySelector('.gauge-title')?.textContent).toBe(
      '🌀 Chance of a form tomorrow: 3%',
    );
  });
});
