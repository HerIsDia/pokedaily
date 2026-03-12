<script lang="ts">
  import { getUserLang } from '../scripts/script';

  let { onclose }: { onclose: () => void } = $props();

  const lang = getUserLang();

  interface ChangeEntry {
    version: string;
    date: string;
    note?: string;
    sections: { title: string; items: string[] }[];
  }

  const NOTE_LAUNCH = lang === 'fr'
    ? 'Bonjour ou bonsoir, j\'ai décidé de refaire vivre Pokédaily pour les 30 ans de Pokémon mais vu que ma passion pour le développement est néant, j\'utilise Claude Code pour l\'aspect codage. Cette version a été entièrement reconceptualisée pour avoir une meilleure interface et pour planifier des mises à jour régulières !'
    : 'Hello or good evening, I decided to bring Pokédaily back to life for Pokémon\'s 30th anniversary, but since my passion for development is non-existent, I use Claude Code for the coding side. This version was completely rethought to have a better interface and to plan regular updates!';

  const entries: ChangeEntry[] = [
    {
      version: '3.0_b2',
      date: lang === 'fr' ? 'Mars 2026' : 'March 2026',
      note: NOTE_LAUNCH,
      sections: [
        {
          title: lang === 'fr' ? 'Nouveautés' : "What's new",
          items: lang === 'fr'
            ? [
                'Des évènements spéciaux s\'activent automatiquement tout au long de l\'année ! À certaines dates — anniversaires Pokémon, fêtes, changements de saison — le Pokémon du jour peut changer ou devenir chromatique. Magicarpe le 1er avril, Pikachu pour la journée mondiale Pokémon, et bien d\'autres surprises t\'attendent.',
                'Un indicateur apparaît en haut de l\'écran lorsqu\'un évènement est en cours. Il te dit aussi combien de jours il reste avant le prochain. Tape dessus pour découvrir ce qui change pendant l\'évènement.',
                'L\'historique n\'affiche désormais plus qu\'un mois à la fois, navigable avec des flèches. Les jours avec un évènement actif sont signalés par un petit point doré sur la case.',
                'Tu peux désormais consulter les notes de mise à jour directement dans l\'application, en appuyant sur le numéro de version affiché en haut de l\'écran.',
              ]
            : [
                'Special events automatically activate throughout the year! On certain dates — Pokémon anniversaries, holidays, season changes — the daily Pokémon may change or become shiny. Magikarp on April 1st, Pikachu for Pokémon World Day, and many more surprises await.',
                'An indicator appears at the top of the screen when an event is active. It also tells you how many days until the next one. Tap it to see what changes during the event.',
                'The history now shows only one month at a time, navigable with arrows. Days with an active event are marked with a small golden dot.',
                'You can now read the update notes directly in the app by tapping the version number at the top of the screen.',
              ],
        },
        {
          title: lang === 'fr' ? 'Corrections' : 'Bug fixes',
          items: lang === 'fr'
            ? [
                'Lorsque tu copies la carte de ton Pokémon, le bouton passe maintenant au vert pour confirmer que l\'image a bien été copiée dans ton presse-papier.',
              ]
            : [
                'When you copy your Pokémon card, the button now turns green to confirm the image was successfully copied to your clipboard.',
              ],
        },
      ],
    },
    {
      version: '3.0_b1',
      date: lang === 'fr' ? 'Février 2026' : 'February 2026',
      note: NOTE_LAUNCH,
      sections: [
        {
          title: lang === 'fr' ? 'Refonte complète' : 'Full rebuild',
          items: lang === 'fr'
            ? [
                'Pokédaily a été entièrement repensé avec un nouveau design sombre inspiré de l\'univers de Pokémon Écarlate et Violet.',
                'Toutes tes données (Pokémon du jour, historique, Pokédex) sont maintenant sauvegardées de façon plus fiable directement sur ton appareil, même sans connexion.',
                'Un calendrier te permet de retrouver les Pokémon que tu as rencontrés les jours précédents, jour par jour.',
                'Un Shinydex recense automatiquement tous les Pokémon chromatiques que tu as eu la chance de croiser.',
                'Tu peux partager ou copier une carte illustrée de ton Pokémon du jour directement depuis l\'application, en un seul tap.',
              ]
            : [
                'Pokédaily was completely rethought with a new dark design inspired by the Pokémon Scarlet & Violet universe.',
                'All your data (daily Pokémon, history, Pokédex) is now saved more reliably directly on your device, even without a connection.',
                'A calendar lets you find Pokémon you encountered on previous days, day by day.',
                'A Shinydex automatically tracks all the shiny Pokémon you\'ve been lucky enough to encounter.',
                'You can share or copy an illustrated card of your daily Pokémon directly from the app, with a single tap.',
              ],
        },
      ],
    },
  ];

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="cl-backdrop" onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}>
  <div class="cl-panel">
    <div class="cl-header">
      <div class="cl-title">
        <span class="cl-badge">CHANGELOG</span>
        <h2>{lang === 'fr' ? 'Dernières mises à jour' : 'Latest updates'}</h2>
      </div>
      <button class="cl-close" onclick={onclose} aria-label="Fermer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <div class="cl-body">
      {#each entries as entry, i}
        <div class="cl-version" class:latest={i === 0}>
          <div class="cl-version-header">
            <span class="cl-version-tag" class:latest={i === 0}>
              {#if i === 0}<span class="latest-dot"></span>{/if}
              {entry.version}
            </span>
            <span class="cl-version-date">{entry.date}</span>
          </div>

          {#if entry.note}
            <div class="cl-note">
              <span class="cl-note-gem">✦</span>
              <div class="cl-note-content">
                <p>{entry.note}</p>
                <span class="cl-note-sig">— Diamant</span>
              </div>
            </div>
          {/if}

          {#each entry.sections as section}
            <div class="cl-section">
              <h3 class="cl-section-title">{section.title}</h3>
              <ul class="cl-list">
                {#each section.items as item}
                  <li>{item}</li>
                {/each}
              </ul>
            </div>
          {/each}
        </div>
      {/each}
    </div>

    <div class="cl-footer">
      <span>Pokédaily — fait par <a href="https://diamant.ink" target="_blank" rel="noopener">diamant</a></span>
    </div>
  </div>
</div>

<style>
  .cl-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    z-index: 950;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    animation: fadeIn 0.15s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .cl-panel {
    background: #0f0f1a;
    border: 1px solid rgba(155, 77, 202, 0.35);
    border-bottom: none;
    border-radius: 20px 20px 0 0;
    width: 100%;
    max-width: 480px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 -8px 60px rgba(155, 77, 202, 0.2);
    animation: slideUp 0.2s ease;
  }

  @keyframes slideUp {
    from { transform: translateY(40px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .cl-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    flex-shrink: 0;
  }

  .cl-title {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .cl-badge {
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.1em;
    background: rgba(155, 77, 202, 0.25);
    color: #b76ee0;
    border: 1px solid rgba(155, 77, 202, 0.4);
    padding: 3px 8px;
    border-radius: 6px;
  }

  .cl-title h2 {
    font-size: 16px;
    font-weight: 700;
    color: #f0f0f5;
  }

  .cl-close {
    background: none;
    border: none;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.5);
    padding: 4px;
    display: flex;
    align-items: center;
    border-radius: 8px;
    transition: color 0.15s, background 0.15s;
  }

  .cl-close:hover { color: #fff; background: rgba(255, 255, 255, 0.08); }
  .cl-close svg { width: 20px; height: 20px; }

  .cl-body {
    overflow-y: auto;
    flex: 1;
    padding: 4px 0;
  }

  .cl-version {
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .cl-version:last-child { border-bottom: none; }

  .cl-version-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }

  .cl-version-tag {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 900;
    color: rgba(255, 255, 255, 0.45);
    letter-spacing: 0.05em;
  }

  .cl-version-tag.latest { color: #b76ee0; }

  .latest-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #b76ee0;
    flex-shrink: 0;
  }

  .cl-version-date {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.25);
  }

  /* ── Note de Diamant ── */
  .cl-note {
    display: flex;
    gap: 12px;
    background: rgba(155, 77, 202, 0.07);
    border: 1px solid rgba(155, 77, 202, 0.2);
    border-left: 3px solid rgba(155, 77, 202, 0.6);
    border-radius: 0 10px 10px 0;
    padding: 12px 14px;
    margin-bottom: 14px;
  }

  .cl-note-gem {
    font-size: 14px;
    color: #b76ee0;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .cl-note-content {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .cl-note-content p {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.65);
    line-height: 1.55;
  }

  .cl-note-sig {
    font-size: 12px;
    font-weight: 700;
    color: rgba(155, 77, 202, 0.8);
    letter-spacing: 0.04em;
  }

  /* ── Sections ── */
  .cl-section {
    margin-bottom: 10px;
  }

  .cl-section:last-child { margin-bottom: 0; }

  .cl-section-title {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.3);
    margin-bottom: 6px;
  }

  .cl-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .cl-list li {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.55;
    padding-left: 14px;
    position: relative;
  }

  .cl-list li::before {
    content: '—';
    position: absolute;
    left: 0;
    color: rgba(155, 77, 202, 0.6);
    font-size: 11px;
  }

  .cl-footer {
    padding: 10px 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    flex-shrink: 0;
  }

  .cl-footer span {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.2);
  }

  .cl-footer a {
    color: rgba(155, 77, 202, 0.7);
    text-decoration: none;
  }
</style>
