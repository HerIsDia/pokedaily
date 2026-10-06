/**
 * Les notes de mise à jour affichées dans l'application (fenêtre ouverte en touchant le numéro de
 * version). Règles de rédaction : `docs/CHANGELOG_GUIDE.md` (tutoiement, zéro jargon, ce que le
 * joueur voit). Le plus récent en premier.
 *
 * La « Note de Diamant » (`note`) est SA voix : on ne l'invente jamais, on la laisse absente tant
 * qu'elle ne l'a pas écrite.
 */

export interface Localized<T = string> {
  fr: T;
  en: T;
}

export interface ChangelogSection {
  title: Localized;
  items: Localized<string[]>;
}

export interface ChangelogEntry {
  version: string;
  date: Localized;
  note?: Localized;
  sections: ChangelogSection[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: '4.0_b1',
    date: {
      fr: 'Octobre 2026',
      en: 'October 2026',
    },
    sections: [
      {
        title: {
          fr: 'Refonte complète',
          en: 'Full rebuild',
        },
        items: {
          fr: [
            'Pokédaily a été entièrement reconstruit pour être plus rapide, plus fiable et plus simple à faire évoluer.',
            'Ton Pokémon du jour change maintenant à minuit, heure de ton appareil, où que tu sois.',
            "Plus de 300 formes alternatives (Méga, Gigamax, formes d'Alola, de Galar, de Hisui, de Paldea…) peuvent désormais sortir. Plus tu passes de jours sans en croiser, plus ta chance d'en voir une augmente. Elles ont leur propre onglet « Formes » dans le Pokédex.",
            "Les images des Pokémon sont maintenant en 3D, plus nettes, et ton Pokédex reste à 1 025 Pokémon : une forme obtenue coche aussi son Pokémon d'origine.",
            "Un menu en bas de l'écran te donne accès à ton Pokémon du jour, à l'historique, au Pokédex, aux stats et au Pokékit.",
            'Tu peux exporter ta collection dans un fichier et la retrouver sur un autre appareil : ça se passe dans la page « À propos » (icône ⓘ en haut).',
            'La carte à partager affiche maintenant tous les types de ton Pokémon, et tu peux la partager, la copier ou la télécharger selon ce que ton appareil permet.',
            "Les événements ont leur fenêtre : appuie sur le bandeau sous l'en-tête pour voir ce qui est en cours, ce qui arrive, et ce que chaque événement change.",
          ],
          en: [
            'Pokédaily has been completely rebuilt to be faster, more reliable and easier to keep improving.',
            'Your Pokémon of the day now changes at midnight on your device, wherever you are.',
            'Over 300 alternate forms (Mega, Gigantamax, Alolan, Galarian, Hisuian, Paldean…) can now show up. The more days you go without meeting one, the better your chances get. They have their own “Forms” tab in the Pokédex.',
            'Pokémon images are now in 3D and sharper, and your Pokédex stays at 1,025 Pokémon: obtaining a form also ticks off its original Pokémon.',
            'A menu at the bottom of the screen takes you to your Pokémon of the day, history, Pokédex, stats and the Pokékit.',
            "You can export your collection to a file and bring it to another device: it's on the “About” page (ⓘ icon at the top).",
            "The shareable card now shows all of your Pokémon's types, and you can share, copy or download it depending on what your device allows.",
            "Events now have their own window: tap the banner under the header to see what's happening, what's coming, and what each event changes.",
          ],
        },
      },
      {
        title: {
          fr: 'Corrections',
          en: 'Bug fixes',
        },
        items: {
          fr: [
            "À la V-Roulette, le Pokémon « boosté » sort maintenant exactement 1 fois sur 4 (avant, c'était un peu plus).",
            "À la V-Roulette, un ticket n'est plus perdu si quelque chose se passe mal pendant le tour : le ticket et le nouveau Pokémon vont toujours ensemble.",
            "Les boîtes spéciales (Lucky Day, Poisson d'avril) sont valables 7 jours, et tu peux avoir les deux en même temps.",
            "Les événements qui n'ont lieu qu'une fois n'affichent plus un compte à rebours une fois terminés.",
            "Ta série de jours d'affilée et ton calendrier se calculent d'après ton heure locale : plus de décalage d'un jour.",
            'Les compteurs (tickets, Pokédex, stats) se mettent à jour tout de suite, sans recharger la page.',
          ],
          en: [
            'At the V-Roulette, the “boosted” Pokémon now comes up exactly 1 time in 4 (it used to be a bit more).',
            'At the V-Roulette, a ticket is no longer lost if something goes wrong during a spin: the ticket and the new Pokémon always go together.',
            'Special boxes (Lucky Day, April Fools) are valid for 7 days, and you can hold both at the same time.',
            'One-time events no longer show a countdown once they are over.',
            'Your day streak and your calendar follow your local time: no more one-day offsets.',
            'Counters (tickets, Pokédex, stats) update right away, without reloading the page.',
          ],
        },
      },
      {
        title: {
          fr: 'Petits plus',
          en: 'Little extras',
        },
        items: {
          fr: [
            'Ta série de jours d’affilée s’affiche sous le bandeau d’événement, et des badges se débloquent à 7, 30, 100 et 365 jours (page « Stats »). Un badge obtenu ne se perd jamais.',
            'Une jauge sous ta carte montre ta chance de tomber sur une forme alternative demain : elle monte de 1 % chaque jour sans forme, et retombe à 1 % quand une forme sort.',
            'L’application prend les couleurs du type de ton Pokémon du jour. Tu peux désactiver ça dans la page « À propos ».',
            'Halloween a maintenant des formes spectrales (Méga-Ectoplasma, Citrouillard…), le Pokémon Day fait venir des Pikachu à casquette, et trois nouveaux événements arrivent : la Fête de la musique (21 juin), la Journée du chat (8 août) et la Journée du chien (26 août).',
            'Un petit horoscope sous ta carte, selon la nature et le type de ton Pokémon (avec ce que sa nature change vraiment à ses statistiques).',
            'Les cartes partagées ont un décor à la couleur du type, et un cadre doré scintillant pour les shiny. Un nouveau bouton « Fiche » télécharge une fiche personnage de ton Pokémon à compléter.',
            'Des succès à débloquer dans la page « Stats », dont quelques-uns secrets… Et peut-être d’autres surprises cachées.',
          ],
          en: [
            'Your day streak shows under the event banner, and badges unlock at 7, 30, 100 and 365 days (“Stats” page). A badge you earned is never lost.',
            'A gauge under your card shows your chance of meeting an alternate form tomorrow: it goes up by 1% every day without a form, and drops back to 1% when one shows up.',
            'The app takes on the colors of your Pokémon of the day’s type. You can turn this off on the “About” page.',
            'Halloween now has ghostly forms (Mega Gengar, Pumpkaboo…), Pokémon Day brings Pikachu wearing caps, and three new events arrive: Music Day (June 21), Cat Day (August 8) and Dog Day (August 26).',
            'A little horoscope under your card, based on your Pokémon’s nature and type (with what its nature really changes to its stats).',
            'Shared cards get a decor in the type’s color, and a sparkling golden frame for shiny ones. A new “Sheet” button downloads a character sheet of your Pokémon for you to fill in.',
            'Achievements to unlock on the “Stats” page, a few of them secret… And maybe other hidden surprises.',
          ],
        },
      },
      {
        title: {
          fr: 'À savoir',
          en: 'Good to know',
        },
        items: {
          fr: [
            "Tout repart de zéro : la collection de la version 3 n'est pas reprise. L'ancienne sauvegarde est supprimée de ton appareil au premier lancement.",
          ],
          en: [
            'Everything starts over: your version 3 collection is not carried over. The old save is removed from your device on first launch.',
          ],
        },
      },
    ],
  },
  {
    version: '3.1',
    date: {
      fr: 'Mars 2026',
      en: 'March 2026',
    },
    note: {
      fr: "Mise à jour qui ajoute le Pokékit, l'ajout majeur de cette version 3 que je voulais faire depuis longtemps. Je vous proposerais beaucoup d'activité secondaire au fil du temps dessus !",
      en: "This update adds the Pokékit, the major addition of version 3 that I've been wanting to make for a long time. I'll be bringing you many side activities over time!",
    },
    sections: [
      {
        title: {
          fr: 'Nouveautés',
          en: "What's new",
        },
        items: {
          fr: [
            'Nouvel onglet Pokékit avec la V-Roulette, la Team du mois et un calendrier des événements.',
            'La V-Roulette te permet de dépenser des tickets Victini pour gagner un nouveau Pokémon qui remplace celui du jour. Choisis parmi 3 boîtes mystères, booste un Pokémon, et tente ta chance sur une grille 4x4 !',
            'La Team du mois génère 6 Pokémon aléatoires chaque mois — ils comptent pour ton Pokédex.',
            'Nouvel onglet Stats : consulte tes statistiques détaillées (total Pokémon, shinies, types fréquents, Pokédex complétion, etc.).',
            "Les tickets Victini s'obtiennent en rencontrant Victini, lors de certains événements (Lucky Day, Poisson d'avril), et au premier lancement de la V-Roulette.",
            'Nouvel événement Lucky Day (Vendredi 13) : taux shiny 1/13, tickets Victini, et une boîte PC spéciale !',
            "Nouvel événement Lancement V-Roulette : Victini a 5% de chance d'apparaître chaque dimanche de mars.",
            "Le Poisson d'avril donne maintenant un ticket Victini et une boîte spéciale avec des Magicarpe, Léviator, et quelques chromatiques garantis.",
            "L'indicateur d'événements dans la barre du haut affiche maintenant tous les événements en cours et ceux à venir dans les 7 prochains jours.",
          ],
          en: [
            'New Pokékit tab with the V-Roulette, Team of the Month, and an events calendar.',
            "The V-Roulette lets you spend Victini tickets to win a new Pokémon that replaces today's. Choose from 3 mystery boxes, boost a Pokémon, and try your luck on a 4x4 grid!",
            'Team of the Month generates 6 random Pokémon each month — they count toward your Pokédex.',
            'New Stats tab: view your detailed statistics (total Pokémon, shinies, frequent types, Pokédex completion, etc.).',
            'Victini tickets are earned by encountering Victini, during certain events (Lucky Day, April Fools), and on first V-Roulette launch.',
            'New Lucky Day event (Friday the 13th): 1/13 shiny rate, Victini tickets, and a special PC box!',
            'New V-Roulette Launch event: Victini has a 5% chance to appear every Sunday in March.',
            'April Fools now gives a Victini ticket and a special box with Magikarp, Gyarados, and some guaranteed shinies.',
            'The event indicator in the top bar now shows all active events and upcoming events within the next 7 days.',
          ],
        },
      },
    ],
  },
  {
    version: '3.0_b2',
    date: {
      fr: 'Mars 2026',
      en: 'March 2026',
    },
    note: {
      fr: "Bonjour ou bonsoir, j'ai décidé de refaire vivre Pokédaily pour les 30 ans de Pokémon mais vu que ma passion pour le développement est néant, j'utilise Claude Code pour l'aspect codage. Cette version a été entièrement reconceptualisée pour avoir une meilleure interface et pour planifier des mises à jour régulières !",
      en: "Hello or good evening, I decided to bring Pokédaily back to life for Pokémon's 30th anniversary, but since my passion for development is non-existent, I use Claude Code for the coding side. This version was completely rethought to have a better interface and to plan regular updates!",
    },
    sections: [
      {
        title: {
          fr: 'Nouveautés',
          en: "What's new",
        },
        items: {
          fr: [
            "Des évènements spéciaux s'activent automatiquement tout au long de l'année ! À certaines dates — anniversaires Pokémon, fêtes, changements de saison — le Pokémon du jour peut changer ou devenir chromatique. Magicarpe le 1er avril, Pikachu pour la journée mondiale Pokémon, et bien d'autres surprises t'attendent.",
            "Un indicateur apparaît en haut de l'écran lorsqu'un évènement est en cours. Il te dit aussi combien de jours il reste avant le prochain. Tape dessus pour découvrir ce qui change pendant l'évènement.",
            "L'historique n'affiche désormais plus qu'un mois à la fois, navigable avec des flèches. Les jours avec un évènement actif sont signalés par un petit point doré sur la case.",
            "Tu peux désormais consulter les notes de mise à jour directement dans l'application, en appuyant sur le numéro de version affiché en haut de l'écran.",
          ],
          en: [
            'Special events automatically activate throughout the year! On certain dates — Pokémon anniversaries, holidays, season changes — the daily Pokémon may change or become shiny. Magikarp on April 1st, Pikachu for Pokémon World Day, and many more surprises await.',
            'An indicator appears at the top of the screen when an event is active. It also tells you how many days until the next one. Tap it to see what changes during the event.',
            'The history now shows only one month at a time, navigable with arrows. Days with an active event are marked with a small golden dot.',
            'You can now read the update notes directly in the app by tapping the version number at the top of the screen.',
          ],
        },
      },
      {
        title: {
          fr: 'Corrections',
          en: 'Bug fixes',
        },
        items: {
          fr: [
            "Lorsque tu copies la carte de ton Pokémon, le bouton passe maintenant au vert pour confirmer que l'image a bien été copiée dans ton presse-papier.",
          ],
          en: [
            'When you copy your Pokémon card, the button now turns green to confirm the image was successfully copied to your clipboard.',
          ],
        },
      },
    ],
  },
  {
    version: '3.0_b1',
    date: {
      fr: 'Février 2026',
      en: 'February 2026',
    },
    note: {
      fr: "Bonjour ou bonsoir, j'ai décidé de refaire vivre Pokédaily pour les 30 ans de Pokémon mais vu que ma passion pour le développement est néant, j'utilise Claude Code pour l'aspect codage. Cette version a été entièrement reconceptualisée pour avoir une meilleure interface et pour planifier des mises à jour régulières !",
      en: "Hello or good evening, I decided to bring Pokédaily back to life for Pokémon's 30th anniversary, but since my passion for development is non-existent, I use Claude Code for the coding side. This version was completely rethought to have a better interface and to plan regular updates!",
    },
    sections: [
      {
        title: {
          fr: 'Refonte complète',
          en: 'Full rebuild',
        },
        items: {
          fr: [
            "Pokédaily a été entièrement repensé avec un nouveau design sombre inspiré de l'univers de Pokémon Écarlate et Violet.",
            'Toutes tes données (Pokémon du jour, historique, Pokédex) sont maintenant sauvegardées de façon plus fiable directement sur ton appareil, même sans connexion.',
            'Un calendrier te permet de retrouver les Pokémon que tu as rencontrés les jours précédents, jour par jour.',
            'Un Shinydex recense automatiquement tous les Pokémon chromatiques que tu as eu la chance de croiser.',
            "Tu peux partager ou copier une carte illustrée de ton Pokémon du jour directement depuis l'application, en un seul tap.",
          ],
          en: [
            'Pokédaily was completely rethought with a new dark design inspired by the Pokémon Scarlet & Violet universe.',
            'All your data (daily Pokémon, history, Pokédex) is now saved more reliably directly on your device, even without a connection.',
            'A calendar lets you find Pokémon you encountered on previous days, day by day.',
            "A Shinydex automatically tracks all the shiny Pokémon you've been lucky enough to encounter.",
            'You can share or copy an illustrated card of your daily Pokémon directly from the app, with a single tap.',
          ],
        },
      },
    ],
  },
];
