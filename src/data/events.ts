import type { GameEvent } from '../core/events/types';
import eventsFile from './events.json';

/**
 * Les événements du jeu (fichier `events.json`, validé par les tests).
 * Importés dans l'application : ils fonctionnent donc aussi HORS-LIGNE
 * (en v3.1, `events.json` n'était pas mis en cache et disparaissait sans réseau : A10).
 */
export const events = eventsFile.events as unknown as GameEvent[];
