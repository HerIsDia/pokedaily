import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyGameState } from '../../src/core/game-state';
import { seededRng } from '../../src/core/rng';
import { changelog } from '../../src/data/changelog';
import { stateLookup } from '../../src/data/lookup';
import { drawPool } from '../../src/data/pool';
import { createChangelogUi, shortVersion } from '../../src/features/changelog/changelog';
import { createDevPanel } from '../../src/features/dev/dev-panel';
import { createI18n } from '../../src/i18n';
import { createGame, type Game } from '../../src/state/game';
import { createMemoryRepository } from '../../src/storage/memory';
import { Scope } from '../../src/ui/scope';

describe('notes de mise à jour', () => {
  beforeEach(() => document.body.replaceChildren());

  it('la version courte est « majeur.mineur »', () => {
    expect(shortVersion('4.0.0-dev.1')).toBe('4.0');
    expect(shortVersion('3.1')).toBe('3.1');
  });

  it('les notes respectent le guide : pas de jargon, tutoiement, FR et EN complets', () => {
    const jargon =
      /indexeddb|localstorage|framework|svelte|\bapi\b|migration|composant|\bbuild\b|service worker|\bpwa\b/i;
    for (const entry of changelog) {
      for (const lang of ['fr', 'en'] as const) {
        expect(entry.date[lang]).toBeTruthy();
        for (const section of entry.sections) {
          expect(section.title[lang]).toBeTruthy();
          expect(section.items[lang].length).toBeGreaterThan(0);
          for (const item of section.items[lang]) expect(item, item).not.toMatch(jargon);
        }
      }
      // même nombre d'éléments dans les deux langues
      for (const section of entry.sections) {
        expect(section.items.fr.length).toBe(section.items.en.length);
      }
    }
    // jamais de vouvoiement dans la version française des nouveautés 4.0
    const fr = changelog[0]!.sections.flatMap((s) => s.items.fr).join(' ');
    expect(fr).not.toMatch(/\bvous\b|\bvotre\b|\bvos\b/i);
  });

  it('la Note de Diamant n’est jamais inventée : absente de la 4.0 tant qu’elle ne l’a pas écrite', () => {
    expect(changelog[0]!.version).toBe('4.0_b1');
    expect(changelog[0]!.note).toBeUndefined();
  });

  it('le bouton affiche la version et ouvre la fenêtre', () => {
    const i18n = createI18n('fr');
    const { badge, modal } = createChangelogUi({
      i18n,
      scope: new Scope(),
      version: '4.0.0-dev.1',
    });
    document.body.append(badge, modal.element);
    expect(badge.textContent).toBe('4.0');
    expect(badge.getAttribute('aria-label')).toBe('Voir les nouveautés (version 4.0)');
    badge.click();
    expect(modal.element.open).toBe(true);
    expect(modal.element.querySelector('.modal-title')?.textContent).toBe('Dernières mises à jour');
    expect(modal.element.querySelectorAll('.cl-entry')).toHaveLength(changelog.length);
    // la 4.0 n'a pas de note ; les versions 3.x oui, signées
    const notes = modal.element.querySelectorAll('.cl-note');
    expect(notes.length).toBe(changelog.filter((e) => e.note).length);
    expect(notes[0]?.textContent).toContain('— Diamant');
    i18n.setLang('en');
    expect(modal.element.querySelector('.modal-title')?.textContent).toBe('Latest updates');
    expect(modal.element.querySelector('.cl-date')?.textContent).toBe('October 2026');
  });
});

describe('mode développeur', () => {
  beforeEach(() => document.body.replaceChildren());

  async function setup(confirm: (message: string) => boolean = () => true) {
    const game: Game = createGame({
      repository: createMemoryRepository(emptyGameState()),
      pool: drawPool,
      events: [],
      lookup: stateLookup,
      rng: seededRng(11),
      now: () => new Date(2026, 4, 10, 10),
    });
    await game.start();
    const modal = createDevPanel({
      i18n: createI18n('fr'),
      game,
      scope: new Scope(),
      confirmAction: confirm,
    });
    document.body.append(modal.element);
    modal.open();
    const q = <T extends HTMLElement>(sel: string) => modal.element.querySelector<T>(sel)!;
    const button = (label: string) =>
      [...modal.element.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
        b.textContent?.includes(label),
      )!;
    return { game, modal, q, button };
  }

  it('affiche le Pokémon du jour dans les champs à l’ouverture', async () => {
    const { game, q } = await setup();
    const today = game.today.get()!;
    expect(q<HTMLInputElement>('input[type=number]').value).toBe(String(today.level));
  });

  it('modifier le niveau et le surnom du Pokémon du jour', async () => {
    const { game, q, button } = await setup();
    const level = q<HTMLInputElement>('input[type=number]');
    level.value = '77';
    const nick = q<HTMLInputElement>('input[type=text]');
    nick.value = 'Testeur';
    button('Appliquer').click();
    await vi.waitFor(() =>
      expect(game.today.get()).toMatchObject({ level: 77, rename: 'Testeur' }),
    );
    await vi.waitFor(() => expect(q('.dev-status').textContent).toBe('✓ Sauvegardé'));
  });

  it('forcer un identifiant valide, refuser un identifiant inconnu', async () => {
    const { game, q, button } = await setup();
    const id = q<HTMLInputElement>('input[placeholder=ID]');
    id.value = '99999';
    button('Forcer cet ID').click();
    expect(q('.dev-hint').textContent).toContain("n'existe pas");
    const before = game.today.get();
    expect(game.today.get()).toBe(before);
    id.value = '150';
    button('Forcer cet ID').click();
    await vi.waitFor(() => expect(game.today.get()?.id).toBe(150));
    expect(q('.dev-hint').textContent).toBe('');
  });

  it('ajouter puis retirer des tickets (jamais sous zéro)', async () => {
    const { game, modal, button } = await setup();
    const start = game.state.get().tickets;
    // champs numériques dans l'ordre : niveau, identifiant, quantité de tickets, nombre de jours
    const amount = modal.element.querySelectorAll<HTMLInputElement>('input[type=number]')[2]!;
    amount.value = '5';
    button('Ajouter').click();
    await vi.waitFor(() => expect(game.state.get().tickets).toBe(start + 5));
    amount.value = '-100';
    button('Ajouter').click();
    await vi.waitFor(() => expect(game.state.get().tickets).toBe(0));
  });

  it('remplir l’historique, supprimer un jour, vider (avec confirmation)', async () => {
    const asked: string[] = [];
    const { game, q, button } = await setup((m) => (asked.push(m), true));
    button('Générer').click();
    await vi.waitFor(() => expect(Object.keys(game.state.get().entries)).toHaveLength(8));
    expect(q('.dev-history').children).toHaveLength(7);
    q<HTMLButtonElement>('.dev-remove').click();
    await vi.waitFor(() => expect(Object.keys(game.state.get().entries)).toHaveLength(7));
    button("Vider l'historique").click();
    await vi.waitFor(() => expect(Object.keys(game.state.get().entries)).toHaveLength(1));
    expect(asked).toHaveLength(1);
  });

  it('refuser la confirmation ne change rien', async () => {
    const { game, button } = await setup(() => false);
    const before = game.state.get();
    button('Tout remettre à zéro').click();
    await new Promise((r) => setTimeout(r, 20));
    expect(game.state.get()).toBe(before);
  });

  it('tout remettre à zéro : collection vidée puis nouveau Pokémon du jour tiré', async () => {
    const { game, button } = await setup();
    await game.devApply((s) => ({ ...s, tickets: 9 }));
    button('Tout remettre à zéro').click();
    await vi.waitFor(() => expect(game.state.get().tickets).toBe(0));
    expect(game.today.get()).not.toBeNull();
    expect(Object.keys(game.state.get().entries)).toHaveLength(1);
  });
});
