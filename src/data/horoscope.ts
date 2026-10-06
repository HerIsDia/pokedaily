import type { Localized } from './changelog';
import type { PokemonType } from '../core/pokemon-types';

/**
 * Les textes de l'« horoscope du jour » : une phrase selon la NATURE du Pokémon (ton humeur) et
 * une selon son TYPE (la couleur de la journée). Textes d'ambiance, écrits pour sourire : à
 * relire et réécrire librement, la structure ne dépend pas de leur contenu.
 *
 * Règles : tutoiement, pas de genre (« concentré·e »), jamais méchant, une phrase courte.
 * Un test vérifie que les 25 natures et les 18 types ont leur texte en français ET en anglais.
 */

export const natureLines: Record<string, Localized> = {
  hardy: {
    fr: "Aujourd'hui, tu fais les choses sans chichi : une tâche, un pas, terminé.",
    en: 'Today you do things without fuss: one task, one step, done.',
  },
  lonely: {
    fr: "Tu as envie de calme et d'un coin à toi. Le monde peut attendre une heure.",
    en: 'You feel like peace and a corner of your own. The world can wait an hour.',
  },
  brave: {
    fr: 'Tu fonces avant d’avoir fini de réfléchir, et ça te réussit étonnamment bien.',
    en: 'You charge in before you finish thinking, and it works out surprisingly well.',
  },
  adamant: {
    fr: 'Ton avis est arrêté, et tu as de bons arguments. Pense juste à les dire gentiment.',
    en: 'Your mind is made up, and you have good arguments. Just remember to say them kindly.',
  },
  naughty: {
    fr: 'Petite bêtise en vue : une blague, un faux départ… rien de grave, promis.',
    en: 'A little mischief ahead: a joke, a false start… nothing serious, promise.',
  },
  bold: {
    fr: 'Tu tiens ta position avec calme. Les imprévus rebondissent sur toi.',
    en: 'You stand your ground calmly. Surprises just bounce off you.',
  },
  docile: {
    fr: 'Tu t’adaptes à tout et tu écoutes beaucoup. Pense à demander ce que toi, tu veux.',
    en: 'You adapt to everything and listen a lot. Remember to ask what you want.',
  },
  relaxed: {
    fr: 'Aucune urgence aujourd’hui. Prends le temps, et bois quelque chose de chaud.',
    en: 'No rush today. Take your time, and have something warm to drink.',
  },
  impish: {
    fr: 'Ton œil pétille : tu repères la faille dans tout, y compris dans le planning.',
    en: 'Your eyes sparkle: you spot the loophole in everything, even the schedule.',
  },
  lax: {
    fr: 'Tu gardes l’air détendu en toutes circonstances. Les problèmes se règleront. Plus tard.',
    en: 'You stay relaxed whatever happens. Problems will be sorted. Later.',
  },
  timid: {
    fr: 'Tu observes avant de te lancer. Ta discrétion est un super-pouvoir : laisse-la agir.',
    en: 'You watch before you leap. Your discretion is a superpower: let it work.',
  },
  hasty: {
    fr: 'Tu as déjà fini ta phrase, ton repas, et commencé la suite. Respire, il y a du temps.',
    en: 'You have already finished your sentence, your meal, and started what comes next. Breathe, there is time.',
  },
  serious: {
    fr: 'Journée studieuse : tu es concentré·e et ça se voit. Un petit sourire ne coûte rien.',
    en: 'A studious day: you are focused and it shows. A little smile costs nothing.',
  },
  jolly: {
    fr: 'Bonne humeur contagieuse : tout le monde autour de toi en profite.',
    en: 'Contagious good mood: everyone around you gets a share.',
  },
  naive: {
    fr: 'Tu fais confiance, et la journée te donne raison. Sauf pour les promos trop belles.',
    en: 'You trust people, and the day proves you right. Except for deals that look too good.',
  },
  modest: {
    fr: 'Tu fais des merveilles sans en faire des tonnes. Accepte le compliment qui arrive.',
    en: 'You do wonders without making a fuss. Accept the compliment that is coming.',
  },
  mild: {
    fr: 'Ta douceur désamorce tout. Une conversation tendue va se détendre toute seule.',
    en: 'Your gentleness defuses everything. A tense conversation will relax by itself.',
  },
  quiet: {
    fr: 'Tu parles peu, et chaque mot compte. Les autres vont t’écouter.',
    en: 'You speak little, and every word counts. People will listen.',
  },
  bashful: {
    fr: 'Un éclat de rire gêné te sauve d’un moment embarrassant. Rougir est autorisé.',
    en: 'An embarrassed laugh saves you from an awkward moment. Blushing is allowed.',
  },
  rash: {
    fr: 'Idée soudaine : la mauvaise ou la géniale ? Réponse ce soir.',
    en: 'Sudden idea: the bad one or the brilliant one? Answer tonight.',
  },
  calm: {
    fr: 'Tu es le point fixe de la journée : les autres viendront chercher ton calme.',
    en: 'You are the fixed point of the day: others will come looking for your calm.',
  },
  gentle: {
    fr: 'Tu es attentionné·e : un petit geste pour quelqu’un fera plus que tu ne crois.',
    en: 'You are thoughtful: a small gesture for someone will do more than you think.',
  },
  sassy: {
    fr: 'Ta répartie est au sommet. Choisis bien qui aura droit à ta langue de vipère.',
    en: 'Your comebacks are at their peak. Choose carefully who gets your sharp tongue.',
  },
  careful: {
    fr: 'Tu vérifies deux fois, et c’est bien : une erreur évitée vaut un point gagné.',
    en: 'You check twice, and that is good: a mistake avoided is a point scored.',
  },
  quirky: {
    fr: 'Rien n’est normal aujourd’hui, et c’est parfaitement ton style.',
    en: 'Nothing is normal today, and that is perfectly your style.',
  },
};

export const typeLines: Record<PokemonType, Localized> = {
  normal: {
    fr: 'Une journée sans vagues : prévois un thé et un plan simple.',
    en: 'A day without waves: plan a cup of tea and a simple plan.',
  },
  fire: {
    fr: 'Ça chauffe : évite les débats enflammés et garde un verre d’eau à portée.',
    en: 'Things are heating up: avoid heated debates and keep a glass of water nearby.',
  },
  water: {
    fr: 'Laisse-toi porter par le courant : les imprévus coulent plutôt dans ton sens.',
    en: 'Go with the flow: surprises tend to run your way.',
  },
  electric: {
    fr: 'Énergie à revendre : ta batterie est pleine, branche-la sur un projet.',
    en: 'Energy to spare: your battery is full, plug it into a project.',
  },
  grass: {
    fr: 'Journée de croissance : ce que tu plantes aujourd’hui poussera. Arrose un peu.',
    en: 'A growing day: what you plant today will sprout. Water it a little.',
  },
  ice: {
    fr: 'Garde la tête froide : une remarque piquante glissera sur toi.',
    en: 'Keep a cool head: a sharp remark will slide right off you.',
  },
  fighting: {
    fr: 'Un petit défi t’attend et tu le relèveras avec panache. Échauffe-toi un peu.',
    en: 'A little challenge awaits and you will take it on with style. Warm up first.',
  },
  poison: {
    fr: 'Évite les ragots : ce qui a un goût amer n’a pas à être avalé.',
    en: 'Skip the gossip: what tastes bitter does not have to be swallowed.',
  },
  ground: {
    fr: 'Reste bien ancré·e : les pieds sur terre te mèneront plus loin que les grands élans.',
    en: 'Stay grounded: feet on the earth will take you further than grand leaps.',
  },
  flying: {
    fr: 'Prends un peu de hauteur : la vue est dégagée sur ce qui compte vraiment.',
    en: 'Take a little altitude: the view is clear on what really matters.',
  },
  psychic: {
    fr: 'Ton intuition est affûtée. Fais confiance à ce petit pressentiment du matin.',
    en: 'Your intuition is sharp. Trust that little feeling from this morning.',
  },
  bug: {
    fr: 'Petits pas, grand progrès : tout s’arrange en s’occupant des détails.',
    en: 'Small steps, big progress: everything works out when you mind the details.',
  },
  rock: {
    fr: 'Solide comme un roc : une promesse tenue te vaudra le respect de quelqu’un.',
    en: 'Solid as a rock: a promise kept will earn you someone’s respect.',
  },
  ghost: {
    fr: 'Un souvenir ou un vieux message refait surface. Souris-lui, puis passe à autre chose.',
    en: 'A memory or an old message resurfaces. Smile at it, then move on.',
  },
  dragon: {
    fr: 'Grandes ambitions : ose demander ce que tu veux vraiment, avec un peu de feu dans la voix.',
    en: 'Big ambitions: dare to ask for what you really want, with a little fire in your voice.',
  },
  dark: {
    fr: 'Un peu de mystère te va bien : garde une carte secrète dans ta manche.',
    en: 'A little mystery suits you: keep a secret card up your sleeve.',
  },
  steel: {
    fr: 'Tu es blindé·e contre les contrariétés. Idéal pour affronter la paperasse.',
    en: 'You are armored against annoyances. Ideal for tackling paperwork.',
  },
  fairy: {
    fr: 'Un soupçon de magie dans l’air : fais un compliment, il fera des étincelles.',
    en: 'A touch of magic in the air: give a compliment, it will work wonders.',
  },
};
