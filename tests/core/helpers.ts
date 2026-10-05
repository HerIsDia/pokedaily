import type { DrawPool } from '../../src/core/model';

/** Un petit monde pour tester le tirage sans dépendre des vraies données. */
// Victini (494) n'est PAS en dernier : un « hasard toujours maximal » ne doit pas tomber dessus par accident.
const species = [494, ...Array.from({ length: 20 }, (_, i) => i + 1), 129, 130];
const forms = [10001, 10002, 10003];
const noShiny = new Set([7, 10003]);

export const testPool: DrawPool = {
  species,
  forms,
  natures: ['hardy', 'jolly', 'timid', 'bold'],
  isDrawable: (id) => species.includes(id) || forms.includes(id),
  canBeShiny: (id) => !noShiny.has(id),
  isForm: (id) => forms.includes(id),
};
