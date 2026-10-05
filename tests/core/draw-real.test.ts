import { describe, expect, it } from 'vitest';
import { drawOfTheDay } from '../../src/core/draw';
import { addDays } from '../../src/core/dates';
import { INITIAL_FORM_PITY, type FormPity } from '../../src/core/form-pity';
import { seededRng } from '../../src/core/rng';
import { drawPool } from '../../src/data/pool';
import { events } from '../../src/data/events';

/** Tirages avec les VRAIES données (1 025 espèces, 324 formes) et les 12 vrais événements. */
describe('tirage avec les vraies données', () => {
  it('sans événement : fréquences conformes (formes ≈ 8,2 %, shiny ≈ 1/69)', () => {
    const rng = seededRng(1234);
    let pity: FormPity = INITIAL_FORM_PITY;
    const days = 60_000;
    let forms = 0;
    let shiny = 0;
    let shinyOnShinyable = 0;
    let shinyable = 0;
    const formsSeen = new Set<number>();
    const levels = new Set<number>();

    for (let i = 0; i < days; i++) {
      const r = drawOfTheDay({ day: '2026-10-05', rng, pool: drawPool, events: [], pity });
      pity = r.pity;
      const { id, isShiny, level } = r.entry;
      expect(drawPool.isDrawable(id)).toBe(true);
      if (!drawPool.canBeShiny(id)) expect(isShiny).toBe(false);
      levels.add(level);
      if (r.reason === 'form') {
        forms++;
        formsSeen.add(id);
        expect(drawPool.isForm(id)).toBe(true);
      } else {
        expect(drawPool.isForm(id)).toBe(false);
      }
      if (drawPool.canBeShiny(id)) {
        shinyable++;
        if (isShiny) shinyOnShinyable++;
      }
      if (isShiny) shiny++;
    }

    expect(forms / days).toBeGreaterThan(0.078);
    expect(forms / days).toBeLessThan(0.086);
    expect(shinyOnShinyable / shinyable).toBeGreaterThan(1 / 69 - 0.003);
    expect(shinyOnShinyable / shinyable).toBeLessThan(1 / 69 + 0.003);
    expect(shiny).toBeGreaterThan(0);
    expect(formsSeen.size).toBeGreaterThan(300); // quasiment toutes les formes sont sorties
    expect([...levels].sort((a, b) => a - b)[0]).toBe(1);
    expect(Math.max(...levels)).toBe(99);
  });

  it('une année entière jour après jour, avec les événements : tout reste cohérent', () => {
    const rng = seededRng(99);
    let pity: FormPity = INITIAL_FORM_PITY;
    let day = '2026-01-01';
    const eventDays: Record<string, number> = {};
    for (let i = 0; i < 365; i++) {
      const r = drawOfTheDay({ day, rng, pool: drawPool, events, pity });
      pity = r.pity;
      expect(r.entry.day).toBe(day);
      expect(drawPool.isDrawable(r.entry.id)).toBe(true);
      expect(r.entry.level).toBeGreaterThanOrEqual(1);
      expect(r.entry.level).toBeLessThanOrEqual(100);
      expect(pity.daysWithoutForm).toBeLessThan(100);
      for (const id of r.effects.eventIds) eventDays[id] = (eventDays[id] ?? 0) + 1;
      day = addDays(day, 1);
    }
    // en 2026 : 1 jour pour chaque fête annuelle ; Vendredi 13 trois fois ; Pokopia 31 jours
    expect(eventDays).toMatchObject({
      new_year: 1,
      valentine: 1,
      pokemon_day: 1,
      april_fools: 1,
      halloween: 1,
      diamant_day: 1,
      christmas: 1,
      lucky_day: 3,
      pokopia_2026: 31,
      victini_launch_march_2026: 5,
      go_fest: 2,
      season_change: 4,
    });
  });

  describe('jours d’événement', () => {
    const one = (d: string, seed: number, pity = INITIAL_FORM_PITY) =>
      drawOfTheDay({ day: d, rng: seededRng(seed), pool: drawPool, events, pity });

    it('Poisson d’avril : Magicarpe à coup sûr, 1 ticket, une boîte de 16', () => {
      for (let seed = 0; seed < 50; seed++) {
        const r = one('2026-04-01', seed);
        expect(r.entry.id).toBe(129);
        expect(r.reason).toBe('event');
        expect(r.tickets).toBe(1);
        expect(r.boxes).toHaveLength(1);
        expect(r.boxes[0]?.kind).toBe('april_fools');
        expect(r.boxes[0]?.ids).toHaveLength(16);
      }
    });

    it('Poisson d’avril : chance shiny ≈ 1/100 (moins bonne que d’habitude, voulu)', () => {
      let shiny = 0;
      const n = 60_000;
      for (let seed = 0; seed < n; seed++) if (one('2026-04-01', seed).entry.isShiny) shiny++;
      expect(shiny / n).toBeGreaterThan(0.007);
      expect(shiny / n).toBeLessThan(0.013);
    });

    it('Diamant Day (18 novembre) : toujours niveau 69 ; shiny sauf si le Pokémon ne peut pas l’être', () => {
      for (let seed = 0; seed < 300; seed++) {
        const { entry } = one('2026-11-18', seed);
        expect(entry.level).toBe(69);
        expect(entry.isShiny).toBe(drawPool.canBeShiny(entry.id));
      }
    });

    it('Bonne Année : toujours niveau 100', () => {
      for (let seed = 0; seed < 100; seed++) expect(one('2027-01-01', seed).entry.level).toBe(100);
    });

    it('Noël : Cadoizo (#225) à coup sûr', () => {
      for (let seed = 0; seed < 50; seed++) expect(one('2026-12-25', seed).entry.id).toBe(225);
    });

    it('Pokémon Day : Pikachu environ 10 % du temps, et alors forcément shiny', () => {
      let pikachu = 0;
      const n = 20_000;
      for (let seed = 0; seed < n; seed++) {
        const r = one('2027-02-27', seed);
        if (r.reason === 'event') {
          pikachu++;
          expect(r.entry).toMatchObject({ id: 25, isShiny: true });
        }
      }
      expect(pikachu / n).toBeGreaterThan(0.09);
      expect(pikachu / n).toBeLessThan(0.11);
    });

    it('Halloween : environ 30 % de Pokémon spectraux, tous pris dans la liste', () => {
      const list = events.find((e) => e.id === 'halloween')!.modifiers.forcedPokemonIds!;
      let forced = 0;
      const n = 20_000;
      for (let seed = 0; seed < n; seed++) {
        const r = one('2026-10-31', seed);
        if (r.reason === 'event') {
          forced++;
          expect(list).toContain(r.entry.id);
        }
      }
      expect(forced / n).toBeGreaterThan(0.28);
      expect(forced / n).toBeLessThan(0.32);
    });

    it('Vendredi 13 : 1 à 3 tickets, boîte Lucky Day avec 3 Victini', () => {
      const tickets = new Set<number>();
      for (let seed = 0; seed < 500; seed++) {
        const r = one('2026-11-13', seed);
        tickets.add(r.tickets - (r.entry.id === 494 ? 1 : 0));
        expect(r.boxes[0]?.kind).toBe('lucky_day');
        expect(r.boxes[0]?.ids.filter((id) => id === 494)).toHaveLength(3);
      }
      expect([...tickets].sort()).toEqual([1, 2, 3]);
    });

    it('Vendredi 13 pendant Pokopia (13 mars 2026) : les deux événements agissent', () => {
      const r = one('2026-03-13', 1);
      expect(r.effects.eventIds).toEqual(['pokopia_2026', 'lucky_day']);
      expect(r.effects.shinyRate).toBe(13);
      expect(r.boxes[0]?.kind).toBe('lucky_day');
    });
  });
});
