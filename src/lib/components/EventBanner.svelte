<script lang="ts">
  import { getUserLang } from '../scripts/script';
  import type { GameEvent } from '../scripts/script';

  let {
    activeEvents,
    upcomingEvents,
  }: {
    activeEvents: GameEvent[];
    upcomingEvents: { event: GameEvent; daysUntil: number }[];
  } = $props();

  const lang = getUserLang();
  let showPopup = $state(false);

  function togglePopup() {
    showPopup = !showPopup;
  }

  function closePopup() {
    showPopup = false;
  }

  const hasContent = $derived(activeEvents.length > 0 || upcomingEvents.length > 0);
</script>

<svelte:window onkeydown={(e) => { if (showPopup && e.key === 'Escape') showPopup = false; }} />

{#if hasContent}
  <button
    class="event-badge"
    class:active={activeEvents.length > 0}
    onclick={togglePopup}
    aria-label={activeEvents.length > 0
      ? `${activeEvents.length} ${lang === 'fr' ? 'évènement(s) en cours' : 'active event(s)'}`
      : `${upcomingEvents.length} ${lang === 'fr' ? 'évènement(s) à venir' : 'upcoming event(s)'}`}
  >
    {#if activeEvents.length > 0}
      <span class="event-dot"></span>
      <span class="event-label">
        {lang === 'fr' ? activeEvents[0].nameFr : activeEvents[0].nameEn}
      </span>
      {#if activeEvents.length > 1}
        <span class="event-extra">+{activeEvents.length - 1}</span>
      {/if}
    {:else if upcomingEvents.length > 0}
      <span class="event-label muted">
        ⏱ {upcomingEvents[0].daysUntil === 1
          ? (lang === 'fr' ? 'demain' : 'tomorrow')
          : (lang === 'fr' ? `dans ${upcomingEvents[0].daysUntil}j` : `in ${upcomingEvents[0].daysUntil}d`)}
      </span>
      {#if upcomingEvents.length > 1}
        <span class="event-extra muted">+{upcomingEvents.length - 1}</span>
      {/if}
    {/if}
  </button>
{/if}

{#if showPopup}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="event-backdrop"
    onclick={(e) => { if (e.target === e.currentTarget) closePopup(); }}
    role="dialog"
    aria-modal="true"
  >
    <div class="event-popup">
      <div class="popup-header">
        <h2 class="popup-title">{lang === 'fr' ? 'Évènements' : 'Events'}</h2>
        <button class="popup-close" onclick={closePopup} aria-label="Fermer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="popup-body">
        <!-- Active events section -->
        {#if activeEvents.length > 0}
          <div class="section-label active-label">{lang === 'fr' ? 'EN COURS' : 'ACTIVE'}</div>
          {#each activeEvents as event}
            {@const m = event.modifiers}
            <div class="event-card active-card">
              <h3 class="event-card-name">{lang === 'fr' ? event.nameFr : event.nameEn}</h3>
              <p class="event-card-desc">{lang === 'fr' ? event.descriptionFr : event.descriptionEn}</p>
              <div class="event-card-modifiers">
                {#if m.forcedPokemonChance !== undefined}
                  <div class="modifier-chip">
                    <span class="modifier-icon">🎯</span>
                    <span>{lang === 'fr' ? `${Math.round(m.forcedPokemonChance * 100)}% chance de rencontre forcée` : `${Math.round(m.forcedPokemonChance * 100)}% forced encounter chance`}</span>
                  </div>
                {/if}
                {#if m.shinyRate !== undefined}
                  <div class="modifier-chip">
                    <span class="modifier-icon">✦</span>
                    <span>{lang === 'fr' ? `Taux Chromatique : 1/${m.shinyRate}` : `Shiny rate: 1/${m.shinyRate}`}</span>
                  </div>
                {/if}
                {#if m.forcedShiny}
                  <div class="modifier-chip">
                    <span class="modifier-icon">✦</span>
                    <span>{lang === 'fr' ? 'Pokémon forcément Chromatique' : 'Pokémon always Shiny'}</span>
                  </div>
                {/if}
                {#if m.forcedLevel !== undefined}
                  <div class="modifier-chip">
                    <span class="modifier-icon">⭐</span>
                    <span>{lang === 'fr' ? `Niveau forcé : ${m.forcedLevel}` : `Forced level: ${m.forcedLevel}`}</span>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        {/if}

        <!-- Upcoming events section -->
        {#if upcomingEvents.length > 0}
          <div class="section-label upcoming-label">{lang === 'fr' ? 'À VENIR' : 'UPCOMING'}</div>
          {#each upcomingEvents as { event, daysUntil }}
            {@const m = event.modifiers}
            <div class="event-card upcoming-card">
              <div class="event-card-top">
                <h3 class="event-card-name">{lang === 'fr' ? event.nameFr : event.nameEn}</h3>
                <span class="event-card-countdown">
                  {daysUntil === 1
                    ? (lang === 'fr' ? 'demain' : 'tomorrow')
                    : (lang === 'fr' ? `dans ${daysUntil}j` : `in ${daysUntil}d`)}
                </span>
              </div>
              <p class="event-card-desc muted">{lang === 'fr' ? event.descriptionFr : event.descriptionEn}</p>
              <div class="event-card-modifiers">
                {#if m.forcedPokemonChance !== undefined}
                  <div class="modifier-chip muted">
                    <span class="modifier-icon">🎯</span>
                    <span>{lang === 'fr' ? `${Math.round(m.forcedPokemonChance * 100)}% chance de rencontre forcée` : `${Math.round(m.forcedPokemonChance * 100)}% forced encounter chance`}</span>
                  </div>
                {/if}
                {#if m.shinyRate !== undefined}
                  <div class="modifier-chip muted">
                    <span class="modifier-icon">✦</span>
                    <span>{lang === 'fr' ? `Taux Chromatique : 1/${m.shinyRate}` : `Shiny rate: 1/${m.shinyRate}`}</span>
                  </div>
                {/if}
                {#if m.forcedShiny}
                  <div class="modifier-chip muted">
                    <span class="modifier-icon">✦</span>
                    <span>{lang === 'fr' ? 'Pokémon forcément Chromatique' : 'Pokémon always Shiny'}</span>
                  </div>
                {/if}
                {#if m.forcedLevel !== undefined}
                  <div class="modifier-chip muted">
                    <span class="modifier-icon">⭐</span>
                    <span>{lang === 'fr' ? `Niveau forcé : ${m.forcedLevel}` : `Forced level: ${m.forcedLevel}`}</span>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        {/if}

        {#if activeEvents.length === 0 && upcomingEvents.length === 0}
          <p class="no-events">{lang === 'fr' ? 'Aucun évènement en ce moment.' : 'No events right now.'}</p>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  /* ── Badge ── */
  .event-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-radius: 20px;
    font-family: var(--font-main);
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s, transform 0.15s;
    background: rgba(255, 180, 30, 0.12);
    border: 1px solid rgba(255, 180, 30, 0.35);
    color: #ffb41e;
    letter-spacing: 0.03em;
  }

  .event-badge:hover { background: rgba(255, 180, 30, 0.2); transform: scale(1.03); }
  .event-badge:active { transform: scale(0.97); }

  .event-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #ffb41e;
    animation: pulse-event 1.6s ease-in-out infinite;
    flex-shrink: 0;
  }

  @keyframes pulse-event {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.4); }
  }

  .event-label { white-space: nowrap; max-width: 120px; overflow: hidden; text-overflow: ellipsis; }
  .event-label.muted { color: rgba(255, 255, 255, 0.4); }

  .event-extra {
    font-size: 10px;
    font-weight: 800;
    background: rgba(255, 180, 30, 0.25);
    padding: 1px 5px;
    border-radius: 8px;
    color: #ffb41e;
  }

  .event-extra.muted {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.4);
  }

  /* ── Popup ── */
  .event-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(4px);
    z-index: 900;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    animation: fadeIn 0.15s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .event-popup {
    background: #0f0f1a;
    border: 1px solid rgba(255, 180, 30, 0.3);
    border-bottom: none;
    border-radius: 20px 20px 0 0;
    width: 100%;
    max-width: 480px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 -8px 60px rgba(255, 180, 30, 0.15);
    animation: slideUp 0.2s ease;
  }

  @keyframes slideUp {
    from { transform: translateY(40px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .popup-header {
    padding: 16px 20px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }

  .popup-title {
    font-size: 18px;
    font-weight: 900;
    color: #f0f0f5;
    letter-spacing: 0.02em;
  }

  .popup-close {
    background: none;
    border: none;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.4);
    padding: 4px;
    display: flex;
    align-items: center;
    border-radius: 8px;
    transition: color 0.15s, background 0.15s;
  }

  .popup-close:hover { color: #fff; background: rgba(255, 255, 255, 0.08); }
  .popup-close svg { width: 18px; height: 18px; }

  .popup-body {
    padding: 16px 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
  }

  /* Section labels */
  .section-label {
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.12em;
    padding: 3px 8px;
    border-radius: 6px;
    align-self: flex-start;
  }

  .active-label {
    background: rgba(255, 180, 30, 0.2);
    color: #ffb41e;
    border: 1px solid rgba(255, 180, 30, 0.4);
  }

  .upcoming-label {
    background: rgba(155, 77, 202, 0.2);
    color: #b76ee0;
    border: 1px solid rgba(155, 77, 202, 0.4);
    margin-top: 8px;
  }

  /* Event cards */
  .event-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 14px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .active-card {
    border-color: rgba(255, 180, 30, 0.2);
  }

  .upcoming-card {
    border-color: rgba(155, 77, 202, 0.15);
  }

  .event-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .event-card-name {
    font-size: 15px;
    font-weight: 800;
    color: #f0f0f5;
  }

  .event-card-countdown {
    font-size: 11px;
    font-weight: 700;
    color: #b76ee0;
    white-space: nowrap;
  }

  .event-card-desc {
    font-size: 13px;
    color: var(--text-secondary, #9090b0);
    line-height: 1.5;
  }

  .event-card-desc.muted {
    color: rgba(255, 255, 255, 0.35);
  }

  .event-card-modifiers {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .modifier-chip {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 10px;
    font-size: 12px;
    color: #f0f0f5;
  }

  .modifier-chip.muted { color: rgba(255, 255, 255, 0.4); }
  .modifier-icon { font-size: 14px; flex-shrink: 0; }

  .no-events {
    font-size: 14px;
    color: var(--text-secondary, #9090b0);
    text-align: center;
    padding: 20px 0;
  }
</style>
