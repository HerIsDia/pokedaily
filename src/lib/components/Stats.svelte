<script lang="ts">
  import type { AppData } from '../scripts/script';
  import { getPokemonImagePath, getUserLang } from '../scripts/script';

  let { data }: { data: AppData } = $props();
  const lang = getUserLang();

  // Combine today + history for full stats
  const allPokemon = $derived([data.pokemonOfTheDay, ...data.history]);
  const totalCount = $derived(allPokemon.length);
  const shinyCount = $derived(allPokemon.filter(p => p.isShiny).length);
  const shinyRate = $derived(totalCount > 0 ? ((shinyCount / totalCount) * 100).toFixed(1) : '0');
  const avgLevel = $derived(totalCount > 0 ? Math.round(allPokemon.reduce((s, p) => s + p.level, 0) / totalCount) : 0);
  const pokedexCompletion = $derived(((data.pokedex.length / 1025) * 100).toFixed(1));
  const shinydexCompletion = $derived(((data.shinydex.length / 1025) * 100).toFixed(1));

  // Type frequency
  const typeFrequency = $derived.by(() => {
    const counts: Record<string, { key: string; name: string; count: number }> = {};
    for (const p of allPokemon) {
      for (let i = 0; i < p.types.length; i++) {
        const key = p.types[i];
        const name = lang === 'fr' ? p.typeNamesFr[i] : p.typeNamesEn[i];
        if (!counts[key]) counts[key] = { key, name, count: 0 };
        counts[key].count++;
      }
    }
    return Object.values(counts).sort((a, b) => b.count - a.count);
  });
  const maxTypeCount = $derived(typeFrequency.length > 0 ? typeFrequency[0].count : 1);

  // Most obtained Pokémon (top 5)
  const topPokemon = $derived.by(() => {
    const counts: Record<number, { id: number; name: string; count: number; isShiny: boolean }> = {};
    for (const p of allPokemon) {
      const name = lang === 'fr' ? p.nameFr : p.nameEn;
      if (!counts[p.id]) counts[p.id] = { id: p.id, name, count: 0, isShiny: p.isShiny };
      counts[p.id].count++;
    }
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  });

  // Current streak (consecutive days)
  const streak = $derived.by(() => {
    if (allPokemon.length === 0) return 0;
    const dates = allPokemon.map(p => p.date).sort((a, b) => b - a);
    const uniqueDates = [...new Set(dates)];
    let count = 1;
    for (let i = 0; i < uniqueDates.length - 1; i++) {
      if (uniqueDates[i] - uniqueDates[i + 1] === 86400000) {
        count++;
      } else {
        break;
      }
    }
    return count;
  });
</script>

<div class="stats-container">
  <div class="stats-header">
    <h2>{lang === 'fr' ? 'Statistiques' : 'Statistics'}</h2>
  </div>

  <!-- Summary cards -->
  <div class="stats-grid">
    <div class="stat-card">
      <span class="stat-value">{totalCount}</span>
      <span class="stat-label">{lang === 'fr' ? 'Pokémon obtenus' : 'Pokémon obtained'}</span>
    </div>
    <div class="stat-card shiny-card">
      <span class="stat-value">✦ {shinyCount}</span>
      <span class="stat-label">{lang === 'fr' ? 'Chromatiques' : 'Shinies'}</span>
    </div>
    <div class="stat-card">
      <span class="stat-value">{shinyRate}%</span>
      <span class="stat-label">{lang === 'fr' ? 'Taux chromatique' : 'Shiny rate'}</span>
    </div>
    <div class="stat-card">
      <span class="stat-value">{avgLevel}</span>
      <span class="stat-label">{lang === 'fr' ? 'Niveau moyen' : 'Avg. level'}</span>
    </div>
    <div class="stat-card">
      <span class="stat-value">{streak}</span>
      <span class="stat-label">{lang === 'fr' ? 'Jours consécutifs' : 'Day streak'}</span>
    </div>
    <div class="stat-card">
      <span class="stat-value">{data.victiniTickets}</span>
      <span class="stat-label">{lang === 'fr' ? 'Tickets Victini' : 'Victini tickets'}</span>
    </div>
  </div>

  <!-- Pokédex completion -->
  <section class="stats-section">
    <h3>{lang === 'fr' ? 'Complétion' : 'Completion'}</h3>
    <div class="completion-row">
      <span class="completion-label">Pokédex</span>
      <div class="progress-bar">
        <div class="progress-fill" style="width: {pokedexCompletion}%"></div>
      </div>
      <span class="completion-value">{data.pokedex.length}/1025</span>
    </div>
    <div class="completion-row">
      <span class="completion-label">Shinydex</span>
      <div class="progress-bar">
        <div class="progress-fill shiny-fill" style="width: {shinydexCompletion}%"></div>
      </div>
      <span class="completion-value">{data.shinydex.length}/1025</span>
    </div>
  </section>

  <!-- Type frequency -->
  <section class="stats-section">
    <h3>{lang === 'fr' ? 'Types les plus fréquents' : 'Most frequent types'}</h3>
    <div class="type-bars">
      {#each typeFrequency as t}
        <div class="type-bar-row">
          <span class="type-bar-label type-badge type-{t.key}">{t.name}</span>
          <div class="type-bar-track">
            <div class="type-bar-fill type-bar-{t.key}" style="width: {(t.count / maxTypeCount) * 100}%"></div>
          </div>
          <span class="type-bar-count">{t.count}</span>
        </div>
      {/each}
    </div>
  </section>

  <!-- Top Pokémon -->
  <section class="stats-section">
    <h3>{lang === 'fr' ? 'Pokémon les plus obtenus' : 'Most obtained Pokémon'}</h3>
    <div class="top-pokemon-list">
      {#each topPokemon as poke, i}
        <div class="top-pokemon-row">
          <span class="top-rank">#{i + 1}</span>
          <img
            src={getPokemonImagePath(poke.id, false)}
            alt={poke.name}
            class="top-pokemon-img"
            loading="lazy"
          />
          <span class="top-pokemon-name">{poke.name}</span>
          <span class="top-pokemon-count">&times;{poke.count}</span>
        </div>
      {/each}
      {#if topPokemon.length === 0}
        <p class="stats-empty">{lang === 'fr' ? 'Pas encore de données' : 'No data yet'}</p>
      {/if}
    </div>
  </section>
</div>

<style>
  .stats-container {
    padding: 20px;
    padding-bottom: 40px;
  }

  .stats-header h2 {
    font-size: 20px;
    font-weight: 900;
    letter-spacing: 0.08em;
    margin-bottom: 20px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 24px;
  }

  .stat-card {
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: 14px;
    padding: 14px 10px;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .stat-value {
    font-size: 20px;
    font-weight: 900;
    color: var(--accent-light);
  }

  .shiny-card .stat-value {
    color: var(--shiny-color);
  }

  .stat-label {
    font-size: 10px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .stats-section {
    margin-bottom: 24px;
  }

  .stats-section h3 {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.4);
    margin-bottom: 12px;
  }

  /* Completion bars */
  .completion-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }

  .completion-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-secondary);
    min-width: 70px;
  }

  .progress-bar {
    flex: 1;
    height: 8px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 4px;
    transition: width 0.5s ease;
  }

  .shiny-fill {
    background: var(--shiny-color);
  }

  .completion-value {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-muted);
    min-width: 60px;
    text-align: right;
  }

  /* Type bars */
  .type-bars {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .type-bar-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .type-bar-label {
    min-width: 80px;
    font-size: 10px;
    padding: 2px 8px;
  }

  .type-bar-track {
    flex: 1;
    height: 6px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 3px;
    overflow: hidden;
  }

  .type-bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.5s ease;
    background: var(--accent);
  }

  .type-bar-normal    { background: #c8c79a; }
  .type-bar-fighting  { background: #e05050; }
  .type-bar-flying    { background: #b8a0f8; }
  .type-bar-poison    { background: #c060c0; }
  .type-bar-ground    { background: #d8c070; }
  .type-bar-rock      { background: #c8b048; }
  .type-bar-bug       { background: #b8c830; }
  .type-bar-ghost     { background: #9878c8; }
  .type-bar-steel     { background: #c8c8e0; }
  .type-bar-fire      { background: #f0a050; }
  .type-bar-water     { background: #80b0f8; }
  .type-bar-grass     { background: #90d860; }
  .type-bar-electric  { background: #f8d840; }
  .type-bar-psychic   { background: #f870a0; }
  .type-bar-ice       { background: #a8e8e8; }
  .type-bar-dragon    { background: #9068f8; }
  .type-bar-dark      { background: #987860; }
  .type-bar-fairy     { background: #e898c8; }

  .type-bar-count {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-muted);
    min-width: 28px;
    text-align: right;
  }

  /* Top Pokémon */
  .top-pokemon-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .top-pokemon-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: 12px;
  }

  .top-rank {
    font-size: 14px;
    font-weight: 900;
    color: var(--accent-light);
    min-width: 28px;
  }

  .top-pokemon-img {
    width: 40px;
    height: 40px;
    image-rendering: pixelated;
  }

  .top-pokemon-name {
    flex: 1;
    font-size: 14px;
    font-weight: 700;
  }

  .top-pokemon-count {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-secondary);
  }

  .stats-empty {
    font-size: 13px;
    color: var(--text-muted);
    text-align: center;
    padding: 20px;
  }

  @media (max-width: 360px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
