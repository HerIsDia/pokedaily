<script lang="ts">
  import { getUserLang } from '../scripts/script';
  import type { AppData } from '../scripts/script';

  let { data } = $props<{ data: AppData }>();

  const lang = getUserLang();
  const found = new Set(data.pokedex);
  const shiny = new Set(data.shinydex);
  const total = 1025;
  const allIds = Array.from({ length: total }, (_, i) => i + 1);

  let tab = $state<'pokedex' | 'shinydex'>('pokedex');

  const labels = {
    fr: {
      pokedex: 'Pokédex',
      shinydex: 'Shinydex',
      counter: (n: number) => `Tu as été ${n} Pokémon`,
      shinyCounter: (n: number) => `${n} Pokémon shiny`,
      shinyEmpty: 'Aucun Pokémon shiny pour le moment.',
    },
    en: {
      pokedex: 'Pokédex',
      shinydex: 'Shinydex',
      counter: (n: number) => `You've been ${n} Pokémon`,
      shinyCounter: (n: number) => `${n} shiny Pokémon`,
      shinyEmpty: 'No shiny Pokémon yet.',
    },
  };
  const l = labels[lang];
</script>

<div class="pokedex-page">
  <!-- Tab switcher -->
  <div class="tab-row">
    <button
      class="tab-btn"
      class:active={tab === 'pokedex'}
      onclick={() => { tab = 'pokedex'; }}
    >
      {l.pokedex}
    </button>
    <button
      class="tab-btn tab-btn-shiny"
      class:active={tab === 'shinydex'}
      onclick={() => { tab = 'shinydex'; }}
    >
      ✦ {l.shinydex}
    </button>
  </div>

  {#if tab === 'pokedex'}
    <div class="pokedex-header">
      <span class="counter-badge">{l.counter(found.size)}</span>
    </div>

    <div class="progress-bar">
      <div class="progress-fill" style="width: {(found.size / total) * 100}%"></div>
    </div>
    <p class="progress-label">{found.size} / {total}</p>

    <div class="pokemon-grid">
      {#each allIds as id}
        {@const paddedId = id.toString().padStart(3, '0')}
        {@const isCaught = found.has(id)}
        <div class="grid-cell" class:caught={isCaught} title="#{paddedId}">
          <img
            src="/images/{paddedId}.png"
            alt="#{paddedId}"
            loading="lazy"
            width="56"
            height="56"
            class:caught={isCaught}
          />
          {#if isCaught}
            <span class="caught-dot"></span>
          {/if}
        </div>
      {/each}
    </div>

  {:else}
    <!-- Shinydex -->
    <div class="pokedex-header">
      <span class="counter-badge counter-badge-shiny">{l.shinyCounter(shiny.size)}</span>
    </div>

    {#if shiny.size === 0}
      <div class="empty-state">
        <span class="empty-icon">✦</span>
        <p>{l.shinyEmpty}</p>
      </div>
    {:else}
      <div class="progress-bar">
        <div class="progress-fill progress-fill-shiny" style="width: {(shiny.size / total) * 100}%"></div>
      </div>
      <p class="progress-label">{shiny.size} / {total}</p>

      <div class="pokemon-grid">
        {#each allIds as id}
          {@const paddedId = id.toString().padStart(3, '0')}
          {@const isShiny = shiny.has(id)}
          {#if isShiny}
            <div class="grid-cell caught shiny-cell" title="#{paddedId} ✦">
              <img
                src="/images/{paddedId}S.png"
                alt="#{paddedId} shiny"
                loading="lazy"
                width="56"
                height="56"
                class="caught"
              />
              <span class="shiny-dot">✦</span>
            </div>
          {:else}
            <div class="grid-cell" title="#{paddedId}">
              <img
                src="/images/{paddedId}.png"
                alt="#{paddedId}"
                loading="lazy"
                width="56"
                height="56"
              />
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .pokedex-page {
    padding: 20px 16px 40px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  /* ── Tabs ── */
  .tab-row {
    display: flex;
    gap: 8px;
  }

  .tab-btn {
    flex: 1;
    padding: 8px 12px;
    border-radius: 10px;
    border: 1px solid var(--border-subtle);
    background: transparent;
    color: var(--text-muted);
    font-family: var(--font-main);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }

  .tab-btn.active {
    background: var(--accent-subtle);
    border-color: var(--border-accent);
    color: var(--accent-light);
  }

  .tab-btn-shiny.active {
    background: rgba(255, 215, 0, 0.1);
    border-color: rgba(255, 215, 0, 0.4);
    color: var(--shiny-color);
  }

  /* ── Header ── */
  .pokedex-header {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 8px;
  }

  .counter-badge {
    font-size: 13px;
    font-weight: 700;
    color: var(--accent-light);
    background: var(--accent-subtle);
    border: 1px solid var(--border-accent);
    padding: 4px 14px;
    border-radius: 20px;
  }

  .counter-badge-shiny {
    color: var(--shiny-color);
    background: rgba(255, 215, 0, 0.1);
    border-color: rgba(255, 215, 0, 0.35);
  }

  /* ── Progress ── */
  .progress-bar {
    width: 100%;
    height: 4px;
    background: var(--border-subtle);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), var(--accent-light));
    border-radius: 2px;
    transition: width 0.6s ease;
  }

  .progress-fill-shiny {
    background: linear-gradient(90deg, #b8860b, #ffd700);
  }

  .progress-label {
    font-size: 11px;
    color: var(--text-muted);
    text-align: right;
  }

  /* ── Grid ── */
  .pokemon-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
    gap: 4px;
  }

  .grid-cell {
    position: relative;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid transparent;
    overflow: hidden;
    content-visibility: auto;
    contain-intrinsic-size: 64px 64px;
  }

  .grid-cell.caught {
    background: rgba(155, 77, 202, 0.06);
    border-color: rgba(155, 77, 202, 0.2);
  }

  .grid-cell.shiny-cell {
    background: rgba(255, 215, 0, 0.06);
    border-color: rgba(255, 215, 0, 0.25);
  }

  .grid-cell img {
    width: 56px;
    height: 56px;
    object-fit: contain;
    image-rendering: pixelated;
    filter: brightness(0.08) saturate(0);
  }

  .grid-cell img.caught {
    filter: none;
  }

  .caught-dot {
    position: absolute;
    bottom: 4px;
    right: 4px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 4px var(--accent-glow);
  }

  .shiny-dot {
    position: absolute;
    top: 2px;
    right: 3px;
    font-size: 9px;
    color: var(--shiny-color);
    line-height: 1;
    text-shadow: 0 0 4px rgba(255, 215, 0, 0.6);
  }

  /* ── Empty ── */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 60px 24px;
    color: var(--text-secondary);
    text-align: center;
  }

  .empty-icon {
    font-size: 40px;
    color: var(--shiny-color);
  }
</style>
