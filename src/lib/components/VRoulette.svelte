<script lang="ts">
  import { onMount } from 'svelte';
  import type { Nature, Type } from 'pokenode-ts';
  import type { AppData } from '../scripts/script';
  import { getPokemonImagePath, getUserLang } from '../scripts/script';
  import { getPokemonData, getPokemonNature, getPokemonTypes } from '../scripts/pokeAPI';
  import {
    openDB,
    getVictiniTickets, saveVictiniTickets,
    getVRouletteState, saveVRouletteState,
    getTodayEntry, saveTodayEntry,
    getState, saveState,
    getLuckyDayBox,
    type VRouletteState, type PokemonEntry,
  } from '../scripts/db';

  let { data, onreload }: { data: AppData; onreload: () => void } = $props();
  const lang = getUserLang();

  let tickets = $state(data.victiniTickets);
  let rouletteState = $state<VRouletteState | null>(null);
  let selectedBox = $state<number | null>(null);
  let boostedId = $state<number | null>(null);
  let spinning = $state(false);
  let spinResult = $state<number | null>(null);
  let resultEntry = $state<PokemonEntry | null>(null);
  let loading = $state(true);
  let luckyBox = $state<number[] | null>(null);
  let showLuckyBox = $state(false);

  // Seeded PRNG (mulberry32)
  function mulberry32(seed: number) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  function generateBoxes(month: string): number[][] {
    // Create seed from month string
    let seed = 0;
    for (let i = 0; i < month.length; i++) {
      seed = ((seed << 5) - seed + month.charCodeAt(i)) | 0;
    }
    const rng = mulberry32(seed);
    const boxes: number[][] = [];
    for (let b = 0; b < 3; b++) {
      const box: number[] = [];
      for (let i = 0; i < 16; i++) {
        box.push(Math.floor(rng() * 1025) + 1);
      }
      boxes.push(box);
    }
    return boxes;
  }

  onMount(async () => {
    const db = await openDB();
    const currentMonth = getCurrentMonth();
    let state = await getVRouletteState(db);

    // First time bonus
    if (!state || !state.firstTimeClaimed) {
      tickets += 1;
      await saveVictiniTickets(db, tickets);
    }

    // Regenerate boxes if month changed
    if (!state || state.month !== currentMonth) {
      const boxes = generateBoxes(currentMonth);
      state = {
        month: currentMonth,
        boxes,
        boostedId: null,
        firstTimeClaimed: true,
      };
      await saveVRouletteState(db, state);
    } else if (!state.firstTimeClaimed) {
      state = { ...state, firstTimeClaimed: true };
      await saveVRouletteState(db, state);
    }

    rouletteState = state;
    boostedId = state.boostedId;

    // Check for Lucky Day box
    const lucky = await getLuckyDayBox(db);
    if (lucky) {
      luckyBox = lucky.box;
    }

    loading = false;
  });

  function selectBox(index: number) {
    if (spinning) return;
    selectedBox = index;
    spinResult = null;
    resultEntry = null;
  }

  async function selectBoosted(pokemonId: number) {
    if (spinning || !rouletteState) return;
    boostedId = pokemonId;
    const db = await openDB();
    rouletteState = { ...rouletteState, boostedId: pokemonId };
    await saveVRouletteState(db, rouletteState);
  }

  function getSelectedPokemonIds(): number[] {
    if (showLuckyBox && luckyBox) return luckyBox;
    if (selectedBox === null || !rouletteState) return [];
    return rouletteState.boxes[selectedBox];
  }

  async function spin() {
    if (tickets <= 0 || selectedBox === null || spinning) return;

    spinning = true;
    spinResult = null;
    resultEntry = null;

    const ids = getSelectedPokemonIds();

    // Determine result
    let winIndex: number;
    if (boostedId !== null && ids.includes(boostedId) && Math.random() < 0.25) {
      winIndex = ids.indexOf(boostedId);
    } else {
      winIndex = Math.floor(Math.random() * ids.length);
    }

    // Animate the roulette
    const spinEl = document.querySelector('.roulette-strip');
    if (spinEl) {
      const totalSlots = ids.length * 4; // repeat 4 times for smooth scroll
      const targetSlot = ids.length * 3 + winIndex; // land on 4th iteration
      const slotWidth = 80;
      const offset = targetSlot * slotWidth + slotWidth / 2;
      (spinEl as HTMLElement).style.transition = 'none';
      (spinEl as HTMLElement).style.transform = 'translateX(0)';
      // Force reflow
      void (spinEl as HTMLElement).offsetWidth;
      (spinEl as HTMLElement).style.transition = 'transform 3.5s cubic-bezier(0.15, 0.85, 0.35, 1)';
      (spinEl as HTMLElement).style.transform = `translateX(-${offset - 160}px)`;
    }

    // Wait for animation
    await new Promise((r) => setTimeout(r, 3800));

    const wonId = ids[winIndex];
    spinResult = wonId;

    // Deduct ticket
    tickets -= 1;
    const db = await openDB();
    await saveVictiniTickets(db, tickets);

    // Fetch Pokémon data and replace today's entry
    try {
      const natureId = Math.floor(Math.random() * 25) + 1;
      const level = Math.floor(Math.random() * 99) + 1;
      const isShiny = Math.random() < 1 / 69;

      const [fetchedPokemon, fetchedNature] = await Promise.all([
        getPokemonData(wonId),
        getPokemonNature(natureId) as Promise<Nature>,
      ]);
      const typeNames = fetchedPokemon.pokemon.types.map((t) => t.type.name);
      const fetchedTypes = await Promise.all(
        typeNames.map((name) => getPokemonTypes(name) as Promise<Type>)
      );

      const dateNow = Date.now() - (Date.now() % 86400000);
      const newEntry: PokemonEntry = {
        id: wonId,
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
      };

      await saveTodayEntry(db, newEntry);
      resultEntry = newEntry;

      // Update Pokédex
      const state = await getState(db);
      const newPokedex = [...new Set([...state.pokedex, wonId])];
      const newShinydex = isShiny ? [...new Set([...state.shinydex, wonId])] : state.shinydex;
      await saveState(db, { ...state, pokedex: newPokedex, shinydex: newShinydex });
    } catch {
      // Silent fail
    }

    spinning = false;
  }
</script>

<div class="vroulette-container">
  <div class="vroulette-header">
    <h2>V-Roulette</h2>
    <div class="ticket-display">
      <span class="ticket-icon">V</span>
      <span class="ticket-count">{tickets}</span>
    </div>
  </div>

  {#if loading}
    <div class="vroulette-loading">
      <div class="pokeball-spinner"></div>
    </div>
  {:else if rouletteState}
    <!-- Lucky Day box toggle -->
    {#if luckyBox}
      <div class="lucky-toggle">
        <button
          class="lucky-btn"
          class:active={showLuckyBox}
          onclick={() => { showLuckyBox = !showLuckyBox; selectedBox = showLuckyBox ? 0 : null; }}
        >
          {lang === 'fr' ? 'Boîte Lucky Day' : 'Lucky Day Box'}
        </button>
      </div>
    {/if}

    {#if !showLuckyBox}
      <!-- Box selection -->
      <p class="vroulette-instruction">
        {lang === 'fr' ? 'Choisis une boîte PC :' : 'Choose a PC box:'}
      </p>
      <div class="box-selector">
        {#each rouletteState.boxes as box, i}
          <button
            class="box-card"
            class:selected={selectedBox === i}
            onclick={() => selectBox(i)}
            disabled={spinning}
          >
            <span class="box-label">{lang === 'fr' ? 'Boîte' : 'Box'} {i + 1}</span>
            <div class="box-preview">
              {#each box as id}
                <img
                  src={getPokemonImagePath(id, false)}
                  alt="#{id}"
                  class="box-pokemon-thumb"
                  loading="lazy"
                />
              {/each}
            </div>
          </button>
        {/each}
      </div>
    {/if}

    <!-- Selected box detail + boosted selection -->
    {#if selectedBox !== null || showLuckyBox}
      {@const ids = getSelectedPokemonIds()}
      <div class="selected-box-detail">
        <p class="boost-hint">
          {lang === 'fr'
            ? 'Clique sur un Pokémon pour le booster (1/4 de chance) :'
            : 'Click a Pokémon to boost it (1/4 chance):'}
        </p>
        <div class="boost-grid">
          {#each ids as id, i}
            <button
              class="boost-cell"
              class:boosted={boostedId === id}
              onclick={() => selectBoosted(id)}
              disabled={spinning}
            >
              <img
                src={getPokemonImagePath(id, false)}
                alt="#{id}"
                class="boost-img"
                loading="lazy"
              />
              {#if boostedId === id}
                <span class="boost-star">★</span>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      <!-- Roulette viewport -->
      <div class="roulette-viewport">
        <div class="roulette-pointer"></div>
        <div class="roulette-track">
          <div class="roulette-strip">
            {#each Array(4) as _, rep}
              {#each ids as id}
                <div class="roulette-slot">
                  <img
                    src={getPokemonImagePath(id, false)}
                    alt="#{id}"
                    class="roulette-slot-img"
                  />
                </div>
              {/each}
            {/each}
          </div>
        </div>
      </div>

      <!-- Spin button -->
      <button
        class="spin-btn"
        onclick={spin}
        disabled={tickets <= 0 || spinning}
      >
        {#if spinning}
          {lang === 'fr' ? 'En cours...' : 'Spinning...'}
        {:else if tickets <= 0}
          {lang === 'fr' ? 'Pas de ticket' : 'No tickets'}
        {:else}
          {lang === 'fr' ? 'Lancer la roulette' : 'Spin the roulette'} (1 ticket)
        {/if}
      </button>

      <!-- Result -->
      {#if resultEntry}
        <div class="spin-result" class:shiny={resultEntry.isShiny}>
          <img
            src={getPokemonImagePath(resultEntry.id, resultEntry.isShiny)}
            alt={lang === 'fr' ? resultEntry.nameFr : resultEntry.nameEn}
            class="result-img"
          />
          <div class="result-info">
            <span class="result-name">
              {#if resultEntry.isShiny}<span class="shiny-star">✦</span>{/if}
              {lang === 'fr' ? resultEntry.nameFr : resultEntry.nameEn}
            </span>
            <span class="result-level">Lv. {resultEntry.level}</span>
            <p class="result-hint">
              {lang === 'fr'
                ? 'Ce Pokémon remplace ton Pokémon du jour !'
                : 'This Pokémon replaces your daily Pokémon!'}
            </p>
          </div>
        </div>
      {/if}
    {/if}
  {/if}
</div>

<style>
  .vroulette-container {
    padding-bottom: 20px;
  }

  .vroulette-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .vroulette-header h2 {
    font-size: 18px;
    font-weight: 900;
    letter-spacing: 0.06em;
  }

  .ticket-display {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(240, 160, 80, 0.15);
    border: 1px solid rgba(240, 160, 80, 0.4);
    border-radius: 20px;
    padding: 4px 12px;
  }

  .ticket-icon {
    font-size: 14px;
    font-weight: 900;
    color: #f0a050;
  }

  .ticket-count {
    font-size: 14px;
    font-weight: 900;
    color: #f0a050;
  }

  .vroulette-loading {
    display: flex;
    justify-content: center;
    padding: 40px 0;
  }

  .pokeball-spinner {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 3px solid var(--border-subtle);
    border-top-color: var(--accent);
    animation: spin 0.8s linear infinite;
  }

  .lucky-toggle {
    margin-bottom: 12px;
  }

  .lucky-btn {
    background: rgba(255, 215, 0, 0.1);
    border: 1px solid rgba(255, 215, 0, 0.3);
    color: var(--shiny-color);
    font-family: var(--font-main);
    font-size: 12px;
    font-weight: 700;
    padding: 6px 14px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .lucky-btn.active {
    background: rgba(255, 215, 0, 0.25);
    border-color: rgba(255, 215, 0, 0.6);
  }

  .vroulette-instruction {
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: 10px;
  }

  /* Box selector */
  .box-selector {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
    overflow-x: auto;
  }

  .box-card {
    flex: 1;
    min-width: 0;
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: 12px;
    padding: 10px;
    cursor: pointer;
    font-family: var(--font-main);
    color: var(--text-primary);
    transition: border-color 0.15s, background 0.15s;
    text-align: center;
  }

  .box-card:hover:not(:disabled) {
    border-color: var(--border-accent);
  }

  .box-card.selected {
    border-color: var(--accent-light);
    background: rgba(155, 77, 202, 0.1);
  }

  .box-card:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .box-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    display: block;
    margin-bottom: 6px;
  }

  .box-preview {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2px;
  }

  .box-pokemon-thumb {
    width: 100%;
    aspect-ratio: 1;
    image-rendering: pixelated;
    opacity: 0.7;
  }

  /* Boost grid */
  .selected-box-detail {
    margin-bottom: 16px;
  }

  .boost-hint {
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 8px;
  }

  .boost-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 4px;
  }

  .boost-cell {
    position: relative;
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: 8px;
    padding: 4px;
    cursor: pointer;
    transition: border-color 0.15s;
  }

  .boost-cell:hover:not(:disabled) {
    border-color: var(--border-accent);
  }

  .boost-cell.boosted {
    border-color: #f0a050;
    background: rgba(240, 160, 80, 0.15);
  }

  .boost-cell:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .boost-img {
    width: 100%;
    aspect-ratio: 1;
    image-rendering: pixelated;
  }

  .boost-star {
    position: absolute;
    top: -4px;
    right: -4px;
    font-size: 12px;
    color: #f0a050;
  }

  /* Roulette viewport */
  .roulette-viewport {
    position: relative;
    margin: 16px 0;
    overflow: hidden;
    border-radius: 12px;
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    height: 88px;
  }

  .roulette-pointer {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 2px;
    height: 100%;
    background: var(--accent-light);
    z-index: 2;
    box-shadow: 0 0 8px var(--accent-glow);
  }

  .roulette-pointer::before {
    content: '';
    position: absolute;
    top: -6px;
    left: 50%;
    transform: translateX(-50%);
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 8px solid var(--accent-light);
  }

  .roulette-track {
    overflow: hidden;
    height: 100%;
  }

  .roulette-strip {
    display: flex;
    height: 100%;
    will-change: transform;
  }

  .roulette-slot {
    flex-shrink: 0;
    width: 80px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border-right: 1px solid var(--border-subtle);
  }

  .roulette-slot-img {
    width: 64px;
    height: 64px;
    image-rendering: pixelated;
  }

  /* Spin button */
  .spin-btn {
    width: 100%;
    padding: 14px;
    background: rgba(240, 160, 80, 0.2);
    border: 1px solid rgba(240, 160, 80, 0.5);
    border-radius: 14px;
    color: #f0a050;
    font-family: var(--font-main);
    font-size: 15px;
    font-weight: 800;
    cursor: pointer;
    transition: background 0.15s, transform 0.15s;
  }

  .spin-btn:hover:not(:disabled) {
    background: rgba(240, 160, 80, 0.3);
  }

  .spin-btn:active:not(:disabled) {
    transform: scale(0.98);
  }

  .spin-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Result */
  .spin-result {
    margin-top: 16px;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-accent);
    border-radius: 16px;
    animation: fadeSlideUp 0.4s ease;
  }

  .spin-result.shiny {
    border-color: var(--shiny-glow);
    box-shadow: 0 0 20px var(--shiny-glow);
  }

  .result-img {
    width: 80px;
    height: 80px;
    image-rendering: pixelated;
  }

  .result-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .result-name {
    font-size: 18px;
    font-weight: 900;
  }

  .shiny-star {
    color: var(--shiny-color);
  }

  .result-level {
    font-size: 12px;
    color: var(--text-muted);
    font-weight: 700;
  }

  .result-hint {
    font-size: 11px;
    color: var(--accent-light);
    margin-top: 4px;
  }
</style>
