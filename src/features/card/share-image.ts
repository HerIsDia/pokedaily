import type { PokemonEntry } from '../../core/model';
import { getEntry, getNature } from '../../data';
import { spriteUrl } from '../../data/sprites';
import type { I18n, MessageKey } from '../../i18n';
import type { Lang } from '../../i18n';

/**
 * L'IMAGE de la carte à partager (PNG). On la dessine dans un <canvas> : c'est ce qui permet de
 * l'envoyer comme une vraie image (réseaux, messageries) sans aucun serveur.
 *
 * Trois étapes séparées pour pouvoir tout tester :
 *  1. `buildCardImageSpec` : décide QUOI écrire (textes, couleur…), sans dessiner ;
 *  2. `drawCardImage`      : dessine dans un contexte 2D (testé avec un faux contexte) ;
 *  3. `renderCardImage`    : l'assemble dans le navigateur (vérifié dans Chromium).
 */

export const IMAGE_WIDTH = 400;
export const IMAGE_HEIGHT = 560;
/** Adresse affichée au bas de l'image (comme en v3.1). */
export const SHARE_URL = 'pokedaily.vercel.app';
const DEFAULT_COLOR = '#9b4dca';
const FONT = '"Roboto Condensed", system-ui, sans-serif';

export interface CardImageSpec {
  number: string;
  name: string;
  /** Nom de l'espèce, seulement si un surnom est donné. */
  originalName: string | null;
  typeLabels: string[];
  shinyLabel: string | null;
  levelLabel: string;
  level: string;
  natureLabel: string;
  nature: string;
  date: string;
  color: string;
  imageUrl: string;
  footer: string;
}

export function formatDay(day: string, locale: string): string {
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number);
  const label = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(year, month - 1, date));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export const localeOf = (lang: Lang): string => (lang === 'fr' ? 'fr-FR' : 'en-US');

export function buildCardImageSpec(
  entry: PokemonEntry,
  i18n: I18n,
  color: string = DEFAULT_COLOR,
): CardImageSpec {
  const { t, lang } = i18n;
  const dex = getEntry(entry.id);
  const speciesName = dex?.[lang.get()] ?? `#${entry.id}`;
  return {
    number: `N°${String(dex?.speciesId ?? entry.id).padStart(4, '0')}`,
    name: entry.rename || speciesName,
    originalName: entry.rename && entry.rename !== speciesName ? speciesName : null,
    typeLabels: (dex?.types ?? []).map((type) => t(`type.${type}` as MessageKey)),
    shinyLabel: entry.isShiny ? t('card.shiny') : null,
    levelLabel: t('card.level').toUpperCase(),
    level: String(entry.level),
    natureLabel: t('card.nature').toUpperCase(),
    nature: getNature(entry.natureKey)?.[lang.get()] ?? entry.natureKey,
    date: formatDay(entry.day, localeOf(lang.get())),
    color,
    imageUrl: spriteUrl(entry.id, entry.isShiny, 512),
    footer: SHARE_URL,
  };
}

/** Couleur d'un type, lue dans `types.css` (source unique : on ne la recopie pas ici). */
export function readTypeColor(type: string | undefined): string {
  if (!type) return DEFAULT_COLOR;
  const probe = document.createElement('div');
  probe.dataset.type = type;
  probe.hidden = true;
  document.body.append(probe);
  const value = getComputedStyle(probe).getPropertyValue('--type-color').trim();
  probe.remove();
  return /^#[0-9a-f]{6}$/i.test(value) ? value : DEFAULT_COLOR;
}

type Ctx = CanvasRenderingContext2D;

function roundedRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number | number[]) {
  ctx.beginPath();
  // `roundRect` manque aux navigateurs un peu anciens : des coins carrés valent mieux qu'une erreur.
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

/** Réduit la taille de la police jusqu'à ce que le texte tienne dans `maxWidth`. */
function fitFont(ctx: Ctx, text: string, weight: string, start: number, maxWidth: number): void {
  let size = start;
  do {
    ctx.font = `${weight} ${size}px ${FONT}`;
    size -= 1;
  } while (size > 14 && ctx.measureText(text).width > maxWidth);
}

/** Dessine la carte. `image` vaut `null` si l'illustration n'a pas pu être chargée. */
export function drawCardImage(ctx: Ctx, spec: CardImageSpec, image: CanvasImageSource | null) {
  const W = IMAGE_WIDTH;
  const H = IMAGE_HEIGHT;
  const { color } = spec;

  // Fond + halo de la couleur du type + liseré du haut
  const background = ctx.createLinearGradient(0, 0, 0, H);
  background.addColorStop(0, '#0f0f1a');
  background.addColorStop(1, '#1a0f2e');
  ctx.fillStyle = background;
  roundedRect(ctx, 0, 0, W, H, 20);
  ctx.fill();

  const glow = ctx.createRadialGradient(W / 2, 170, 0, W / 2, 170, 200);
  glow.addColorStop(0, `${color}30`);
  glow.addColorStop(1, `${color}00`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = color;
  roundedRect(ctx, 0, 0, W, 4, [20, 20, 0, 0]);
  ctx.fill();

  // Numéro
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = `700 14px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(spec.number, 24, 38);

  // Types (en ligne, de gauche à droite)
  ctx.font = `700 12px ${FONT}`;
  let x = 24;
  for (const label of spec.typeLabels) {
    const text = label.toUpperCase();
    const width = ctx.measureText(text).width + 24;
    ctx.fillStyle = `${color}35`;
    roundedRect(ctx, x, 50, width, 26, 13);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.fillText(text, x + 12, 67);
    x += width + 8;
  }

  // Shiny
  if (spec.shinyLabel) {
    ctx.font = `700 12px ${FONT}`;
    const width = ctx.measureText(spec.shinyLabel).width + 24;
    ctx.fillStyle = 'rgba(255,215,0,0.18)';
    roundedRect(ctx, W - 24 - width, 20, width, 26, 13);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,0,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.fillText(spec.shinyLabel, W - 24 - width / 2, 37);
  }

  // Illustration (ou repère « ? » si elle manque)
  if (image) {
    ctx.drawImage(image, W / 2 - 100, 84, 200, 200);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundedRect(ctx, W / 2 - 100, 84, 200, 200, 100);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = `900 80px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('?', W / 2, 205);
  }

  // Nom
  ctx.fillStyle = '#f0f0f5';
  ctx.textAlign = 'center';
  fitFont(ctx, spec.name, '900', 38, W - 48);
  ctx.fillText(spec.name, W / 2, 322);
  if (spec.originalName) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = `400 15px ${FONT}`;
    ctx.fillText(spec.originalName, W / 2, 345);
  }

  // Niveau + nature
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  roundedRect(ctx, W / 2 - 120, 358, 240, 54, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.moveTo(W / 2 - 20, 366);
  ctx.lineTo(W / 2 - 20, 404);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = `700 11px ${FONT}`;
  ctx.fillText(spec.levelLabel, W / 2 - 70, 376);
  ctx.fillText(spec.natureLabel, W / 2 + 50, 376);
  ctx.fillStyle = '#f0f0f5';
  ctx.font = `900 20px ${FONT}`;
  ctx.fillText(spec.level, W / 2 - 70, 398);
  fitFont(ctx, spec.nature, '900', 18, 130);
  ctx.fillText(spec.nature, W / 2 + 50, 398);

  // Date, séparateur, signature
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = `400 14px ${FONT}`;
  ctx.fillText(spec.date, W / 2, 438);

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(40, 456);
  ctx.lineTo(W - 40, 456);
  ctx.stroke();

  ctx.fillStyle = '#b76ee0';
  ctx.font = `900 22px ${FONT}`;
  ctx.fillText('Pokédaily', W / 2, 490);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = `400 13px ${FONT}`;
  ctx.fillText(spec.footer, W / 2, 512);
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Fabrique le PNG. Attend la police et l'illustration ; une illustration absente → repère « ? ». */
export async function renderCardImage(spec: CardImageSpec): Promise<Blob> {
  // Sans ça, le canvas pourrait dessiner avec une police de secours.
  try {
    await Promise.all([
      document.fonts.load(`900 38px ${FONT}`),
      document.fonts.load(`700 14px ${FONT}`),
      document.fonts.load(`400 14px ${FONT}`),
    ]);
  } catch {
    // police indisponible : on dessine avec la police de secours
  }
  const image = await loadImage(spec.imageUrl);
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement('canvas');
  canvas.width = IMAGE_WIDTH * scale;
  canvas.height = IMAGE_HEIGHT * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible.');
  ctx.scale(scale, scale);
  drawCardImage(ctx, spec, image);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Image vide.'))), 'image/png'),
  );
}
