<script lang="ts">
  import { getUserLang } from '../scripts/script';
  import type { GameEvent } from '../scripts/script';

  let {
    activeEvent,
    nextEvent,
  }: {
    activeEvent: GameEvent | null;
    nextEvent: { event: GameEvent; daysUntil: number } | null;
  } = $props();

  const lang = getUserLang();
  let showPopup = $state(false);

  function togglePopup() {
    showPopup = !showPopup;
  }

  function closePopup() {
    showPopup = false;
  }

  function handleBackdropKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') closePopup();
  }
</script>

<svelte:window onkeydown={(e) => { if (showPopup && e.key === 'Escape') showPopup = false; }} />

{#if activeEvent || nextEvent}
  <button
    class="event-badge"
    class:active={!!activeEvent}
    onclick={togglePopup}
    aria-label={activeEvent ? `Évènement en cours : ${lang === 'fr' ? activeEvent.nameFr : activeEvent.nameEn}` : `Prochain évènement`}
  >
    {#if activeEvent}
      <span class="event-dot"></span>
      <span class="event-label">
        {lang === 'fr' ? activeEvent.nameFr : activeEvent.nameEn}
      </span>
    {:else if nextEvent}
      <span class="event-label muted">
        ⏱ {nextEvent.daysUntil === 1
          ? (lang === 'fr' ? 'demain' : 'tomorrow')
          : (lang === 'fr' ? `dans ${nextEvent.daysUntil}j` : `in ${nextEvent.daysUntil}d`)}
      </span>
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
        <div class="popup-title-row">
          {#if activeEvent}
            <span class="popup-status active">{lang === 'fr' ? 'EN COURS' : 'ACTIVE'}</span>
          {:else}
            <span class="popup-status upcoming">{lang === 'fr' ? 'À VENIR' : 'UPCOMING'}</span>
          {/if}
          <button class="popup-close" onclick={closePopup} aria-label="Fermer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <h2 class="popup-name">
          {#if activeEvent}
            {lang === 'fr' ? activeEvent.nameFr : activeEvent.nameEn}
          {:else if nextEvent}
            {lang === 'fr' ? nextEvent.event.nameFr : nextEvent.event.nameEn}
          {/if}
        </h2>
      </div>

      <div class="popup-body">
        <p class="popup-description">
          {#if activeEvent}
            {lang === 'fr' ? activeEvent.descriptionFr : activeEvent.descriptionEn}
          {:else if nextEvent}
            {lang === 'fr' ? nextEvent.event.descriptionFr : nextEvent.event.descriptionEn}
          {/if}
        </p>

        {#if nextEvent && !activeEvent}
          <div class="popup-countdown">
            <span class="countdown-number">{nextEvent.daysUntil}</span>
            <span class="countdown-label">{lang === 'fr' ? (nextEvent.daysUntil <= 1 ? 'jour restant' : 'jours restants') : (nextEvent.daysUntil <= 1 ? 'day remaining' : 'days remaining')}</span>
          </div>
        {/if}

        <!-- Modifier summary -->
        {#if activeEvent}
          {@const m = activeEvent.modifiers}
          <div class="popup-modifiers">
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
        {:else if nextEvent}
          {@const m = nextEvent.event.modifiers}
          <div class="popup-modifiers">
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
  }

  .popup-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .popup-status {
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.12em;
    padding: 3px 8px;
    border-radius: 6px;
  }

  .popup-status.active {
    background: rgba(255, 180, 30, 0.2);
    color: #ffb41e;
    border: 1px solid rgba(255, 180, 30, 0.4);
  }

  .popup-status.upcoming {
    background: rgba(155, 77, 202, 0.2);
    color: #b76ee0;
    border: 1px solid rgba(155, 77, 202, 0.4);
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

  .popup-name {
    font-size: 18px;
    font-weight: 900;
    color: #f0f0f5;
    letter-spacing: 0.02em;
  }

  .popup-body {
    padding: 16px 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .popup-description {
    font-size: 14px;
    color: var(--text-secondary, #9090b0);
    line-height: 1.6;
  }

  .popup-countdown {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  .countdown-number {
    font-size: 36px;
    font-weight: 900;
    color: #b76ee0;
    line-height: 1;
  }

  .countdown-label {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.4);
  }

  .popup-modifiers {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .modifier-chip {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 10px;
    font-size: 13px;
    color: #f0f0f5;
  }

  .modifier-chip.muted { color: rgba(255, 255, 255, 0.4); }
  .modifier-icon { font-size: 15px; flex-shrink: 0; }
</style>
