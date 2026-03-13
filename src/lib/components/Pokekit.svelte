<script lang="ts">
  import type { AppData } from '../scripts/script';
  import { getUserLang } from '../scripts/script';
  import TeamOfMonth from './TeamOfMonth.svelte';
  import VRoulette from './VRoulette.svelte';
  import EventsCalendar from './EventsCalendar.svelte';

  let { data, onreload }: { data: AppData; onreload: () => void } = $props();
  const lang = getUserLang();

  type PokekitView = 'menu' | 'team' | 'roulette' | 'events';
  let currentView = $state<PokekitView>('menu');
</script>

<div class="pokekit-container">
  {#if currentView === 'menu'}
    <div class="pokekit-header">
      <h2>Pokékit</h2>
      <p class="pokekit-subtitle">{lang === 'fr' ? 'Modes secondaires & extras' : 'Secondary modes & extras'}</p>
    </div>

    <div class="pokekit-grid">
      <!-- Team of the month -->
      <button class="pokekit-card" onclick={() => { currentView = 'team'; }}>
        <div class="pokekit-card-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <h3>{lang === 'fr' ? 'La team du mois' : 'Team of the Month'}</h3>
        <p>{lang === 'fr' ? '6 Pokémon générés chaque mois pour former ta team !' : '6 Pokémon generated each month for your team!'}</p>
      </button>

      <!-- V-Roulette -->
      <button class="pokekit-card roulette-card" onclick={() => { currentView = 'roulette'; }}>
        <div class="pokekit-card-icon roulette-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
            <path d="M2 12h20"/>
          </svg>
        </div>
        <h3>V-Roulette</h3>
        <p>{lang === 'fr' ? 'Utilise tes tickets Victini pour tenter ta chance !' : 'Use your Victini tickets to try your luck!'}</p>
        {#if data.victiniTickets > 0}
          <span class="ticket-badge">{data.victiniTickets} ticket{data.victiniTickets > 1 ? 's' : ''}</span>
        {/if}
      </button>

      <!-- Events calendar -->
      <button class="pokekit-card" onclick={() => { currentView = 'events'; }}>
        <div class="pokekit-card-icon events-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        <h3>{lang === 'fr' ? 'Événements à venir' : 'Upcoming events'}</h3>
        <p>{lang === 'fr' ? 'Consulte le calendrier des événements.' : 'Check the events calendar.'}</p>
      </button>
    </div>
  {:else}
    <div class="pokekit-subview">
      <button class="back-btn" onclick={() => { currentView = 'menu'; }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5"/>
          <path d="M12 19l-7-7 7-7"/>
        </svg>
        <span>{lang === 'fr' ? 'Retour' : 'Back'}</span>
      </button>

      {#if currentView === 'team'}
        <TeamOfMonth {data} />
      {:else if currentView === 'roulette'}
        <VRoulette {data} {onreload} />
      {:else if currentView === 'events'}
        <EventsCalendar {data} />
      {/if}
    </div>
  {/if}
</div>

<style>
  .pokekit-container {
    padding: 20px;
    padding-bottom: 40px;
  }

  .pokekit-header {
    margin-bottom: 24px;
  }

  .pokekit-header h2 {
    font-size: 20px;
    font-weight: 900;
    letter-spacing: 0.08em;
  }

  .pokekit-subtitle {
    font-size: 13px;
    color: var(--text-muted);
    margin-top: 4px;
  }

  .pokekit-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .pokekit-card {
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: var(--card-radius);
    padding: 20px;
    cursor: pointer;
    text-align: left;
    font-family: var(--font-main);
    color: var(--text-primary);
    transition: background 0.15s, border-color 0.15s, transform 0.15s;
    position: relative;
  }

  .pokekit-card:hover {
    background: var(--bg-card-hover);
    border-color: var(--border-accent);
  }

  .pokekit-card:active {
    transform: scale(0.98);
  }

  .pokekit-card-icon {
    width: 36px;
    height: 36px;
    margin-bottom: 12px;
    color: var(--accent-light);
  }

  .pokekit-card-icon svg {
    width: 100%;
    height: 100%;
  }

  .roulette-icon {
    color: #f0a050;
  }

  .events-icon {
    color: #80b0f8;
  }

  .pokekit-card h3 {
    font-size: 16px;
    font-weight: 800;
    margin-bottom: 6px;
  }

  .pokekit-card p {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.4;
  }

  .ticket-badge {
    position: absolute;
    top: 12px;
    right: 12px;
    background: rgba(240, 160, 80, 0.2);
    color: #f0a050;
    border: 1px solid rgba(240, 160, 80, 0.4);
    font-size: 11px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 20px;
  }

  .pokekit-subview {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: none;
    color: var(--accent-light);
    font-family: var(--font-main);
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    padding: 4px 0;
    transition: color 0.15s;
    align-self: flex-start;
  }

  .back-btn:hover {
    color: #fff;
  }

  .back-btn svg {
    width: 18px;
    height: 18px;
  }
</style>
