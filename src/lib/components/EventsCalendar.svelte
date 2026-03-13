<script lang="ts">
  import type { AppData } from '../scripts/script';
  import { getUserLang } from '../scripts/script';
  import { getActiveEvents, getNextEvent, type GameEvent } from '../scripts/events';

  let { data }: { data: AppData } = $props();
  const lang = getUserLang();
  const now = new Date();

  interface EventInfo {
    event: GameEvent;
    isActive: boolean;
    daysUntil: number;
  }

  const eventList = $derived.by((): EventInfo[] => {
    const events = data.allEvents;
    const active = getActiveEvents(events, now);
    const result: EventInfo[] = [];

    for (const event of active) {
      result.push({ event, isActive: true, daysUntil: 0 });
    }

    const inactive = events.filter(e => !active.includes(e));
    for (const event of inactive) {
      const next = getNextEvent([event], now);
      if (next) {
        result.push({ event, isActive: false, daysUntil: next.daysUntil });
      }
    }

    result.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return a.daysUntil - b.daysUntil;
    });

    return result;
  });
</script>

<div class="events-container">
  <h2>{lang === 'fr' ? 'Événements' : 'Events'}</h2>

  <div class="events-list">
    {#each eventList as info}
      <div class="event-card" class:active={info.isActive}>
        <div class="event-header">
          <h3>{lang === 'fr' ? info.event.nameFr : info.event.nameEn}</h3>
          {#if info.isActive}
            <span class="event-badge active-badge">{lang === 'fr' ? 'En cours' : 'Active'}</span>
          {:else}
            <span class="event-badge upcoming-badge">
              {lang === 'fr' ? `Dans ${info.daysUntil}j` : `In ${info.daysUntil}d`}
            </span>
          {/if}
        </div>
        <p class="event-description">
          {lang === 'fr' ? info.event.descriptionFr : info.event.descriptionEn}
        </p>
        <div class="event-modifiers">
          {#if info.event.modifiers.shinyRate}
            <span class="modifier-tag shiny-tag">✦ 1/{info.event.modifiers.shinyRate}</span>
          {/if}
          {#if info.event.modifiers.forcedShiny}
            <span class="modifier-tag shiny-tag">✦ 100%</span>
          {/if}
          {#if info.event.modifiers.forcedPokemonChance}
            <span class="modifier-tag">{Math.round(info.event.modifiers.forcedPokemonChance * 100)}% {lang === 'fr' ? 'spécial' : 'special'}</span>
          {/if}
          {#if info.event.modifiers.forcedLevel}
            <span class="modifier-tag">Lv. {info.event.modifiers.forcedLevel}</span>
          {/if}
          {#if info.event.modifiers.victiniTicketsMin !== undefined}
            <span class="modifier-tag ticket-tag">
              V {info.event.modifiers.victiniTicketsMin}-{info.event.modifiers.victiniTicketsMax} tickets
            </span>
          {/if}
        </div>
      </div>
    {/each}

    {#if eventList.length === 0}
      <p class="no-events">{lang === 'fr' ? 'Aucun événement trouvé.' : 'No events found.'}</p>
    {/if}
  </div>
</div>

<style>
  .events-container {
    padding-bottom: 20px;
  }

  .events-container h2 {
    font-size: 18px;
    font-weight: 900;
    letter-spacing: 0.06em;
    margin-bottom: 16px;
  }

  .events-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .event-card {
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: 14px;
    padding: 14px 16px;
  }

  .event-card.active {
    border-color: var(--border-accent);
    background: rgba(155, 77, 202, 0.06);
  }

  .event-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;
  }

  .event-header h3 {
    font-size: 14px;
    font-weight: 800;
  }

  .event-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 20px;
    flex-shrink: 0;
  }

  .active-badge {
    background: rgba(76, 200, 120, 0.15);
    color: #60d080;
    border: 1px solid rgba(76, 200, 120, 0.4);
  }

  .upcoming-badge {
    background: rgba(155, 77, 202, 0.15);
    color: var(--accent-light);
    border: 1px solid rgba(155, 77, 202, 0.3);
  }

  .event-description {
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.5;
    margin-bottom: 8px;
  }

  .event-modifiers {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .modifier-tag {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.06);
    color: var(--text-secondary);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .shiny-tag {
    background: rgba(255, 215, 0, 0.1);
    color: var(--shiny-color);
    border-color: rgba(255, 215, 0, 0.3);
  }

  .ticket-tag {
    background: rgba(240, 160, 80, 0.1);
    color: #f0a050;
    border-color: rgba(240, 160, 80, 0.3);
  }

  .no-events {
    font-size: 13px;
    color: var(--text-muted);
    text-align: center;
    padding: 30px;
  }
</style>
