<script lang="ts">
  import { getUserLang } from '../scripts/script';

  let { onclose }: { onclose: () => void } = $props();

  const lang = getUserLang();

  interface ChangeEntry {
    version: string;
    date: string;
    sections: { title: string; items: string[] }[];
  }

  const entries: ChangeEntry[] = [
    {
      version: '3.0_b2',
      date: 'Mars 2026',
      sections: [
        {
          title: lang === 'fr' ? 'Nouveautés' : "What's new",
          items: lang === 'fr'
            ? [
                'Système d\'évènements saisonniers avec effets sur le Pokémon du jour',
                'Compte à rebours et badge d\'évènement en haut de l\'app',
                'Popup de détails pour chaque évènement (modificateurs, durée)',
                'Changelog accessible via le badge de version',
                'Mode développeur revu pour IndexedDB + génération de données de test',
              ]
            : [
                'Seasonal event system with effects on the daily Pokémon',
                'Event countdown and badge at the top of the app',
                'Detail popup for each event (modifiers, duration)',
                'Changelog accessible via the version badge',
                'Developer mode rebuilt for IndexedDB + test data generation',
              ],
        },
        {
          title: lang === 'fr' ? 'Corrections' : 'Bug fixes',
          items: lang === 'fr'
            ? [
                'Mode développeur corrigé : lit maintenant IndexedDB au lieu de l\'ancien localStorage',
                'Retour visuel sur le bouton Copier : passe au vert lors d\'une copie réussie',
              ]
            : [
                'Developer mode fixed: now reads IndexedDB instead of old localStorage',
                'Visual feedback on Copy button: turns green on successful copy',
              ],
        },
      ],
    },
    {
      version: '3.0_b1',
      date: lang === 'fr' ? 'Février 2026' : 'February 2026',
      sections: [
        {
          title: lang === 'fr' ? 'Refonte complète' : 'Full rebuild',
          items: lang === 'fr'
            ? [
                'Nouvelle interface inspirée de Pokémon Écarlate et Violet (thème Violet)',
                'Migration des données vers IndexedDB pour une meilleure fiabilité',
                'Migration vers Svelte 5 avec les nouvelles runes',
                'Calendrier historique et Shinydex',
                'Nouveau système de partage de carte via l\'API Canvas',
              ]
            : [
                'New interface inspired by Pokémon Scarlet & Violet (Violet theme)',
                'Data migration to IndexedDB for better reliability',
                'Migration to Svelte 5 with new runes',
                'History calendar and Shinydex',
                'New card sharing system via Canvas API',
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
    gap: 5px;
  }

  .cl-list li {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.5;
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
