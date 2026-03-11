<script lang="ts">
  import { getUserLang } from '../scripts/script';
  import type { AppData } from '../scripts/script';

  let { data } = $props<{ data: AppData }>();

  const lang = getUserLang();
  const found = new Set(data.pokedex);
  const total = 1025;
  const allIds = Array.from({ length: total }, (_, i) => i + 1);

  const labels = {
    fr: { title: 'Pokédex', counter: (n: number) => `Tu as été ${n} Pokémon` },
    en: { title: 'Pokédex', counter: (n: number) => `You've been ${n} Pokémon` },
  };
  const l = labels[lang];
</script>

<div class="pokedex-page">
  <div class="pokedex-header">
    <h2 class="section-title">{l.title}</h2>
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
          class:caught={isCaught}
        />
        {#if isCaught}
          <span class="caught-dot"></span>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .pokedex-page {
    padding: 20px 16px 40px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .pokedex-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
  }

  .section-title {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--text-muted);
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

  .progress-label {
    font-size: 11px;
    color: var(--text-muted);
    text-align: right;
  }

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
  }

  .grid-cell.caught {
    background: rgba(155, 77, 202, 0.06);
    border-color: rgba(155, 77, 202, 0.2);
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
</style>
