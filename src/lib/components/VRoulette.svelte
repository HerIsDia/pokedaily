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
  let boxLocked = $state(false);
  let boostedId = $state<number | null>(null);
  let spinning = $state(false);
  let spinResult = $state<number | null>(null);
  let resultEntry = $state<PokemonEntry | null>(null);
  let loading = $state(true);
  let luckyBox = $state<number[] | null>(null);
  let showLuckyBox = $state(false);
  let showPopup = $state(false);
  let highlightedIndex = $state<number | null>(null);
  let gridFinished = $state(false);

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
    if (spinning || boxLocked) return;
    selectedBox = index;
    boxLocked = true;
    spinResult = null;
    resultEntry = null;
  }

  function selectLuckyBox() {
    if (spinning || boxLocked) return;
    showLuckyBox = true;
    selectedBox = 0;
    boxLocked = true;
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
    gridFinished = false;
    showPopup = true;

    const ids = getSelectedPokemonIds();

    // Determine result
    let winIndex: number;
    if (boostedId !== null && ids.includes(boostedId) && Math.random() < 0.25) {
      winIndex = ids.indexOf(boostedId);
    } else {
      winIndex = Math.floor(Math.random() * ids.length);
    }

    // Grid highlight animation
    const totalSteps = 30 + Math.floor(Math.random() * 10);
    let step = 0;
    let delay = 80;

    await new Promise<void>((resolve) => {
      function tick() {
        if (step < totalSteps - 1) {
          highlightedIndex = Math.floor(Math.random() * ids.length);
          step++;
          // Accelerate deceleration in last third
          if (step > totalSteps * 0.6) {
            delay += 40;
          } else if (step > totalSteps * 0.4) {
            delay += 15;
          }
          setTimeout(tick, delay);
        } else {
          // Land on the winner
          highlightedIndex = winIndex;
          gridFinished = true;
          resolve();
        }
      }
      tick();
    });

    // Brief pause on winner
    await new Promise((r) => setTimeout(r, 600));

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

  function closePopup() {
    if (spinning) return;
    showPopup = false;
  }

  // Check if there's an active event with a featured Pokémon (for Lucky Day box display)
  const luckyDayEvent = data.activeEvents?.find((e) => e.modifiers.luckyDayBox);
  const luckyFeaturedId = luckyDayEvent?.modifiers.forcedPokemonId ?? 494;

  // Reactive selected pokemon IDs for the grid
  let popupIds = $derived(getSelectedPokemonIds());
</script>

<svelte:window onkeydown={(e) => { if (showPopup && e.key === 'Escape' && !spinning) showPopup = false; }} />

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
    {#if luckyBox && !boxLocked}
      <button
        class="lucky-box-card"
        onclick={selectLuckyBox}
        disabled={spinning}
      >
        <div class="lucky-box-header">
          <span class="lucky-label">{lang === 'fr' ? 'Boîte Lucky Day' : 'Lucky Day Box'}</span>
          <span class="lucky-star">★</span>
        </div>
        <div class="lucky-box-preview">
          <img
            src={getPokemonImagePath(luckyFeaturedId, false)}
            alt="Victini"
            class="lucky-featured-img"
          />
          <span class="lucky-featured-label">{lang === 'fr' ? 'Pokémon vedette' : 'Featured Pokémon'}</span>
        </div>
      </button>
    {/if}

    {#if !boxLocked}
      <!-- Box selection (preview limited to 3 Pokémon) -->
      <p class="vroulette-instruction">
        {lang === 'fr' ? 'Choisis une boîte PC :' : 'Choose a PC box:'}
      </p>
      <div class="box-selector">
        {#each rouletteState.boxes as box, i}
          <button
            class="box-card"
            onclick={() => selectBox(i)}
            disabled={spinning}
          >
            <span class="box-label">{lang === 'fr' ? 'Boîte' : 'Box'} {i + 1}</span>
            <div class="box-preview-limited">
              {#each box.slice(0, 3) as id}
                <img
                  src={getPokemonImagePath(id, false)}
                  alt="#{id}"
                  class="box-pokemon-thumb"
                  loading="lazy"
                />
              {/each}
              <div class="box-hidden-count">
                +13
              </div>
            </div>
          </button>
        {/each}
      </div>
    {:else}
      <!-- Box locked indicator -->
      <div class="locked-box-banner">
        <span class="lock-icon">🔒</span>
        <span>
          {showLuckyBox
            ? (lang === 'fr' ? 'Boîte Lucky Day sélectionnée' : 'Lucky Day Box selected')
            : (lang === 'fr' ? `Boîte ${(selectedBox ?? 0) + 1} sélectionnée` : `Box ${(selectedBox ?? 0) + 1} selected`)}
        </span>
      </div>

      <!-- Selected box detail + boosted selection -->
      <div class="selected-box-detail">
        <p class="boost-hint">
          {lang === 'fr'
            ? 'Clique sur un Pokémon pour le booster (1/4 de chance) :'
            : 'Click a Pokémon to boost it (1/4 chance):'}
        </p>
        <div class="boost-grid">
          {#each popupIds as id}
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
    {/if}
  {/if}
</div>

<!-- Roulette popup (bottom-sheet) -->
{#if showPopup}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="roulette-backdrop"
    onclick={(e) => { if (e.target === e.currentTarget && !spinning) closePopup(); }}
    role="dialog"
    aria-modal="true"
  >
    <div class="roulette-popup">
      <div class="popup-header">
        <h3 class="popup-title">V-Roulette</h3>
        {#if !spinning}
          <button class="popup-close" onclick={closePopup} aria-label="Fermer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        {/if}
      </div>

      <div class="popup-body">
        <!-- 4x4 Grid roulette -->
        <div class="roulette-grid">
          {#each popupIds as id, i}
            <div
              class="grid-cell"
              class:highlighted={highlightedIndex === i}
              class:winner={gridFinished && highlightedIndex === i}
            >
              <img
                src={getPokemonImagePath(id, false)}
                alt="#{id}"
                class="grid-cell-img"
              />
            </div>
          {/each}
        </div>

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

          <!-- Refresh button -->
          <button class="refresh-btn" onclick={onreload}>
            {lang === 'fr' ? 'Rafraîchir la page' : 'Refresh page'}
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}

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

  /* Lucky Day box card */
  .lucky-box-card {
    width: 100%;
    background: rgba(255, 215, 0, 0.08);
    border: 1px solid rgba(255, 215, 0, 0.3);
    border-radius: 14px;
    padding: 14px;
    margin-bottom: 16px;
    cursor: pointer;
    font-family: var(--font-main);
    color: var(--text-primary);
    transition: border-color 0.15s, background 0.15s;
    text-align: center;
  }

  .lucky-box-card:hover:not(:disabled) {
    border-color: rgba(255, 215, 0, 0.6);
    background: rgba(255, 215, 0, 0.15);
  }

  .lucky-box-card:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .lucky-box-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 10px;
  }

  .lucky-label {
    font-size: 13px;
    font-weight: 800;
    color: var(--shiny-color);
    letter-spacing: 0.04em;
  }

  .lucky-star {
    color: var(--shiny-color);
    font-size: 14px;
  }

  .lucky-box-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .lucky-featured-img {
    width: 64px;
    height: 64px;
    image-rendering: pixelated;
  }

  .lucky-featured-label {
    font-size: 10px;
    color: var(--text-muted);
    font-weight: 600;
  }

  .vroulette-instruction {
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: 10px;
  }

  /* Box selector — limited preview */
  .box-selector {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
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
    background: rgba(155, 77, 202, 0.08);
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

  .box-preview-limited {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }

  .box-pokemon-thumb {
    width: 32px;
    height: 32px;
    image-rendering: pixelated;
    opacity: 0.8;
  }

  .box-hidden-count {
    font-size: 11px;
    font-weight: 800;
    color: var(--text-muted);
    background: rgba(255, 255, 255, 0.06);
    border-radius: 6px;
    padding: 4px 6px;
    min-width: 28px;
  }

  /* Locked box banner */
  .locked-box-banner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 16px;
    background: rgba(155, 77, 202, 0.1);
    border: 1px solid rgba(155, 77, 202, 0.3);
    border-radius: 10px;
    font-size: 13px;
    font-weight: 700;
    color: var(--accent-light);
    margin-bottom: 14px;
  }

  .lock-icon {
    font-size: 14px;
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

  /* ── Roulette popup (bottom-sheet) ── */
  .roulette-backdrop {
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

  .roulette-popup {
    background: #0f0f1a;
    border: 1px solid rgba(240, 160, 80, 0.3);
    border-bottom: none;
    border-radius: 20px 20px 0 0;
    width: 100%;
    max-width: 480px;
    max-height: 85vh;
    overflow-y: auto;
    box-shadow: 0 -8px 60px rgba(240, 160, 80, 0.15);
    animation: slideUp 0.2s ease;
  }

  @keyframes slideUp {
    from { transform: translateY(40px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .popup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .popup-title {
    font-size: 16px;
    font-weight: 900;
    color: #f0a050;
    letter-spacing: 0.04em;
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
    gap: 16px;
  }

  /* ── 4x4 Grid roulette ── */
  .roulette-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }

  .grid-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.04);
    border: 2px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 8px;
    transition: border-color 0.08s, background 0.08s, box-shadow 0.08s;
  }

  .grid-cell.highlighted {
    border-color: #f0a050;
    background: rgba(240, 160, 80, 0.15);
    box-shadow: 0 0 12px rgba(240, 160, 80, 0.3);
  }

  .grid-cell.winner {
    border-color: #f0a050;
    background: rgba(240, 160, 80, 0.25);
    box-shadow: 0 0 24px rgba(240, 160, 80, 0.5);
    animation: winnerPulse 0.6s ease-in-out infinite alternate;
  }

  @keyframes winnerPulse {
    from { box-shadow: 0 0 16px rgba(240, 160, 80, 0.3); }
    to { box-shadow: 0 0 28px rgba(240, 160, 80, 0.6); }
  }

  .grid-cell-img {
    width: 100%;
    aspect-ratio: 1;
    image-rendering: pixelated;
  }

  /* ── Result ── */
  .spin-result {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(155, 77, 202, 0.4);
    border-radius: 16px;
    animation: fadeSlideUp 0.4s ease;
  }

  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
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
    color: #f0f0f5;
  }

  .shiny-star {
    color: var(--shiny-color);
  }

  .result-level {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
    font-weight: 700;
  }

  .result-hint {
    font-size: 11px;
    color: var(--accent-light);
    margin-top: 4px;
  }

  /* Refresh button */
  .refresh-btn {
    width: 100%;
    padding: 14px;
    background: rgba(155, 77, 202, 0.2);
    border: 1px solid rgba(155, 77, 202, 0.5);
    border-radius: 14px;
    color: var(--accent-light);
    font-family: var(--font-main);
    font-size: 15px;
    font-weight: 800;
    cursor: pointer;
    transition: background 0.15s, transform 0.15s;
  }

  .refresh-btn:hover {
    background: rgba(155, 77, 202, 0.3);
  }

  .refresh-btn:active {
    transform: scale(0.98);
  }
</style>
