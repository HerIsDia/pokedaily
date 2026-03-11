<script lang="ts">
  import { fade } from 'svelte/transition';
  import { getPokemonImagePath, getUserLang } from '../scripts/script';
  import type { AppData } from '../scripts/script';

  let { data } = $props<{ data: AppData }>();

  const lang = getUserLang();
  const entries = [...data.history].sort((a, b) => b._date - a._date);

  const labels = {
    fr: { empty: 'Aucune entrée dans ton historique pour le moment.', title: 'Historique' },
    en: { empty: 'No history entries yet.', title: 'History' },
  };
  const l = labels[lang];
</script>

<div class="history-page">
  <h2 class="section-title">{l.title}</h2>

  {#if entries.length === 0}
    <div class="empty-state">
      <span class="empty-icon">📋</span>
      <p>{l.empty}</p>
    </div>
  {:else}
    <div class="history-list">
      {#each entries as entry, i}
        {@const pkmn = entry.pokemon}
        {@const name = pkmn.rename !== '' ? pkmn.rename : (pkmn.fetched.pokemon.species.names.find((n) => n.language.name === lang)?.name ?? pkmn.fetched.pokemon.pokemon.name)}
        {@const nature = pkmn.fetched.nature.names.find((n) => n.language.name === lang)?.name ?? pkmn.fetched.nature.name}
        {@const types = pkmn.fetched.types.filter((t) => t !== null)}
        {@const primaryType = types[0]?.name ?? ''}
        {@const imgPath = getPokemonImagePath(pkmn.id, pkmn.isShiny)}
        {@const dateStr = new Date(entry._date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}

        <div
          class="history-entry"
          in:fade={{ duration: 400, delay: i * 60 }}
        >
          <div class="entry-image entry-image-{primaryType}">
            <img src={imgPath} alt={name} />
            {#if pkmn.isShiny}
              <span class="shiny-indicator">✦</span>
            {/if}
          </div>

          <div class="entry-info">
            <div class="entry-top">
              <span class="entry-name">{name}</span>
              <span class="entry-date">{dateStr}</span>
            </div>
            <div class="entry-meta">
              <span class="stat-pill">Niv. {pkmn.level}</span>
              <span class="stat-pill">{nature}</span>
              {#each types as type}
                <span class="type-badge type-{type.name}">
                  {type.names.find((n) => n.language.name === lang)?.name ?? type.name}
                </span>
              {/each}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .history-page {
    padding: 20px 16px 40px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .section-title {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--text-muted);
    padding-left: 4px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 60px 24px;
    color: var(--text-secondary);
    text-align: center;
  }

  .empty-icon { font-size: 40px; }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .history-entry {
    display: flex;
    align-items: center;
    gap: 14px;
    background: var(--bg-card);
    border-radius: 14px;
    border: 1px solid var(--border-subtle);
    padding: 12px 14px 12px 12px;
    transition: border-color 0.2s, background 0.2s;
  }

  .history-entry:hover {
    background: var(--bg-card-hover);
    border-color: var(--border-accent);
  }

  .entry-image {
    position: relative;
    flex-shrink: 0;
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border-subtle);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .entry-image img {
    width: 60px;
    height: 60px;
    object-fit: contain;
    image-rendering: pixelated;
  }

  /* type-colored left border on the entry */
  .entry-image-fire     { border-color: rgba(238,129,48,0.5); }
  .entry-image-water    { border-color: rgba(99,144,240,0.5); }
  .entry-image-grass    { border-color: rgba(122,199,76,0.5); }
  .entry-image-electric { border-color: rgba(247,208,44,0.5); }
  .entry-image-ice      { border-color: rgba(150,217,214,0.5); }
  .entry-image-psychic  { border-color: rgba(249,85,135,0.5); }
  .entry-image-dragon   { border-color: rgba(111,53,252,0.5); }
  .entry-image-ghost    { border-color: rgba(123,98,163,0.5); }
  .entry-image-dark     { border-color: rgba(112,87,70,0.5); }
  .entry-image-fairy    { border-color: rgba(214,133,173,0.5); }

  .shiny-indicator {
    position: absolute;
    top: 0;
    right: 0;
    font-size: 12px;
    color: var(--shiny-color);
  }

  .entry-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }

  .entry-top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .entry-name {
    font-size: 17px;
    font-weight: 700;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .entry-date {
    font-size: 11px;
    color: var(--text-muted);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .entry-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  .stat-pill {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 10px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.06);
    color: var(--text-secondary);
    border: 1px solid var(--border-subtle);
  }
</style>
