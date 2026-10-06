import type { PokemonEntry } from '../../core/model';
import { getEntry, getNature } from '../../data';
import type { I18n, MessageKey } from '../../i18n';
import { horoscopeText } from '../horoscope/horoscope';
import { formatDay, localeOf, SHARE_URL } from './share-image';

/** Nom du fichier de la fiche (à côté de `pokedaily-AAAA-MM-JJ.png` pour l'image). */
export const sheetFilename = (entry: PokemonEntry) => `pokedaily-${entry.day}-fiche.md`;

/**
 * La « fiche personnage » du Pokémon du jour, en Markdown : un texte simple qu'on peut coller dans
 * un carnet, un wiki, un message… Il reste des lignes vides à compléter à la main (caractère,
 * rêve, phrase fétiche) : c'est le point de départ d'un personnage, pas un texte tout fait.
 * Pur : aucune lecture du navigateur, donc testable.
 */
export function buildCharacterSheet(entry: PokemonEntry, i18n: I18n): string {
  const { t, lang } = i18n;
  const code = lang.get();
  const dex = getEntry(entry.id);
  const species = dex?.[code] ?? `#${entry.id}`;
  const name = entry.rename || species;
  const number = `N°${String(dex?.speciesId ?? entry.id).padStart(4, '0')}`;
  const types = (dex?.types ?? []).map((type) => t(`type.${type}` as MessageKey));
  const nature = getNature(entry.natureKey)?.[code] ?? entry.natureKey;
  const { lines, effect } = horoscopeText(entry, i18n);

  const identity = [number, ...types, ...(entry.isShiny ? [t('card.shiny')] : [])].join(' · ');
  const rows = [
    [t('sheet.species'), species],
    [t('card.level'), String(entry.level)],
    [t('card.nature'), nature],
  ];

  return [
    `# ${name}`,
    '',
    `*${formatDay(entry.day, localeOf(code))}*`,
    '',
    `> ${identity}`,
    '',
    '| | |',
    '|---|---|',
    ...rows.map(([label, value]) => `| **${label}** | ${value} |`),
    '',
    `## ${t('sheet.horoscope')}`,
    '',
    ...lines.map((line) => `- ${line}`),
    ...(effect ? [`- ${effect}`] : []),
    '',
    `## ${t('sheet.yourTurn')}`,
    '',
    `- ${t('sheet.prompt1')}`,
    `- ${t('sheet.prompt2')}`,
    `- ${t('sheet.prompt3')}`,
    '',
    '---',
    `*${t('sheet.footer', { url: SHARE_URL })}*`,
    '',
  ].join('\n');
}
