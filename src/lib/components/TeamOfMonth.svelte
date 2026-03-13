<script lang="ts">
  import { onMount } from 'svelte';
  import type { Nature, Type } from 'pokenode-ts';
  import type { AppData } from '../scripts/script';
  import { getPokemonImagePath, getUserLang } from '../scripts/script';
  import { getPokemonData, getPokemonNature, getPokemonTypes } from '../scripts/pokeAPI';
  import {
    openDB, getMonthlyTeam, saveMonthlyTeam, getState, saveState,
    type PokemonEntry, type MonthlyTeam,
  } from '../scripts/db';

  let { data }: { data: AppData } = $props();
  const lang = getUserLang();

  let team = $state<PokemonEntry[]>([]);
  let loading = $state(true);
  let progress = $state<{ current: number; total: number } | null>(null);

  function getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  onMount(async () => {
    const db = await openDB();
    const currentMonth = getCurrentMonth();
    const existing = await getMonthlyTeam(db);

    if (existing && existing.month === currentMonth && existing.pokemon.length === 6) {
      team = existing.pokemon;
      loading = false;
      return;
    }

    // Generate new team
    progress = { current: 0, total: 6 };
    const ids = new Set<number>();
    while (ids.size < 6) {
      ids.add(Math.floor(Math.random() * 1025) + 1);
    }

    const newTeam: PokemonEntry[] = [];
    const idArray = [...ids];
    const dateNow = Date.now() - (Date.now() % 86400000);

    for (let i = 0; i < 6; i++) {
      const pokemonId = idArray[i];
      const natureId = Math.floor(Math.random() * 25) + 1;
      const level = Math.floor(Math.random() * 99) + 1;
      const isShiny = Math.random() < 1 / 69;

      try {
        const [fetchedPokemon, fetchedNature] = await Promise.all([
          getPokemonData(pokemonId),
          getPokemonNature(natureId) as Promise<Nature>,
        ]);
        const typeNames = fetchedPokemon.pokemon.types.map((t) => t.type.name);
        const fetchedTypes = await Promise.all(
          typeNames.map((name) => getPokemonTypes(name) as Promise<Type>)
        );

        newTeam.push({
          id: pokemonId,
          natureId,
          level,
          isShiny,
          rename: '',
          date: dateNow,
          nameFr: fetchedPokemon.species.names.find((n) => n.language.name === 'fr')?.name ?? fetchedPokemon.pokemon.name,
          nameEn: fetchedPokemon.species.names.find((n) => n.language.name === 'en')?.name ?? fetchedPokemon.pokemon.name,
          natureFr: fetchedNature.names.find((n) => n.language.name === 'fr')?.name ?? fetchedNature.name,
          natureEn: fetchedNature.names.find((n) => n.language.name === 'en')?.name ?? fetchedNature.name,
          types: typeNames,
          typeNamesFr: fetchedTypes.map((t) => t.names.find((n) => n.language.name === 'fr')?.name ?? t.name),
          typeNamesEn: fetchedTypes.map((t) => t.names.find((n) => n.language.name === 'en')?.name ?? t.name),
        });
      } catch {
        // Skip on API failure
      }
      progress = { current: i + 1, total: 6 };
    }

    // Save team
    await saveMonthlyTeam(db, { month: currentMonth, pokemon: newTeam });

    // Add to Pokédex
    const state = await getState(db);
    const newPokedex = [...new Set([...state.pokedex, ...newTeam.map(p => p.id)])];
    const newShinydex = [...new Set([...state.shinydex, ...newTeam.filter(p => p.isShiny).map(p => p.id)])];
    await saveState(db, { ...state, pokedex: newPokedex, shinydex: newShinydex });

    team = newTeam;
    progress = null;
    loading = false;
  });

  const monthNames: Record<string, string[]> = {
    fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  };

  const currentMonthName = $derived(() => {
    const now = new Date();
    const names = monthNames[lang] ?? monthNames.en;
    return `${names[now.getMonth()]} ${now.getFullYear()}`;
  });
</script>

<div class="team-container">
  <h2>{lang === 'fr' ? 'La team du mois' : 'Team of the Month'}</h2>
  <p class="team-month">{currentMonthName()}</p>

  {#if loading}
    <div class="team-loading">
      <div class="pokeball-spinner"></div>
      {#if progress}
        <p>{lang === 'fr' ? 'Génération' : 'Generating'} {progress.current}/{progress.total}...</p>
      {:else}
        <p>{lang === 'fr' ? 'Chargement...' : 'Loading...'}</p>
      {/if}
    </div>
  {:else}
    <div class="team-grid">
      {#each team as poke}
        <div class="team-member" class:shiny={poke.isShiny}>
          <img
            src={getPokemonImagePath(poke.id, poke.isShiny)}
            alt={lang === 'fr' ? poke.nameFr : poke.nameEn}
            class="team-img"
            loading="lazy"
          />
          <div class="team-info">
            <span class="team-name">
              {#if poke.isShiny}<span class="shiny-star">✦</span>{/if}
              {lang === 'fr' ? poke.nameFr : poke.nameEn}
            </span>
            <span class="team-level">Lv. {poke.level}</span>
            <div class="team-types">
              {#each poke.types as type, i}
                <span class="type-badge type-{type}">
                  {lang === 'fr' ? poke.typeNamesFr[i] : poke.typeNamesEn[i]}
                </span>
              {/each}
            </div>
          </div>
        </div>
      {/each}
    </div>
    <p class="team-hint">
      {lang === 'fr'
        ? 'Ces Pokémon comptent pour ton Pokédex et ne sont pas affectés par les événements.'
        : 'These Pokémon count for your Pokédex and are not affected by events.'}
    </p>
  {/if}
</div>

<style>
  .team-container {
    padding-bottom: 20px;
  }

  .team-container h2 {
    font-size: 18px;
    font-weight: 900;
    letter-spacing: 0.06em;
  }

  .team-month {
    font-size: 13px;
    color: var(--accent-light);
    font-weight: 700;
    margin-top: 4px;
    margin-bottom: 20px;
  }

  .team-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 40px 0;
    color: var(--text-secondary);
  }

  .pokeball-spinner {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 3px solid var(--border-subtle);
    border-top-color: var(--accent);
    animation: spin 0.8s linear infinite;
  }

  .team-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .team-member {
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: 16px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    text-align: center;
  }

  .team-member.shiny {
    border-color: var(--shiny-glow);
    box-shadow: 0 0 12px var(--shiny-glow);
  }

  .team-img {
    width: 72px;
    height: 72px;
    image-rendering: pixelated;
  }

  .team-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: center;
  }

  .team-name {
    font-size: 14px;
    font-weight: 800;
  }

  .shiny-star {
    color: var(--shiny-color);
  }

  .team-level {
    font-size: 11px;
    color: var(--text-muted);
    font-weight: 700;
  }

  .team-types {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .team-types .type-badge {
    font-size: 9px;
    padding: 2px 6px;
  }

  .team-hint {
    font-size: 11px;
    color: var(--text-muted);
    text-align: center;
    margin-top: 16px;
    line-height: 1.5;
  }

  @media (max-width: 320px) {
    .team-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
