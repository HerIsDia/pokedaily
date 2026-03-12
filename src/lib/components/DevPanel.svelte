<script lang="ts">
  import { onMount } from 'svelte';
  import type { Nature, Type } from 'pokenode-ts';
  import {
    openDB, getState, saveState,
    getTodayEntry, saveTodayEntry,
    getHistory, addHistoryEntry, deleteHistoryEntry, clearHistoryEntries,
    clearAll,
    type PokemonEntry, type AppState,
  } from '../scripts/db';
  import { getPokemonData, getPokemonNature, getPokemonTypes } from '../scripts/pokeAPI';

  let { onclose, onreload }: { onclose: () => void; onreload: () => void } = $props();

  let db: IDBDatabase | null = $state(null);
  let appState: AppState | null = $state(null);
  let todayEntry: PokemonEntry | null = $state(null);
  let historyEntries: PokemonEntry[] = $state([]);

  let nextId = $state('');
  let saved = $state(false);

  // Fill history
  let fillDays = $state('7');
  let fillProgress = $state<{ current: number; total: number } | null>(null);

  onMount(async () => {
    const d = await openDB();
    db = d;
    const [s, t, h] = await Promise.all([getState(d), getTodayEntry(d), getHistory(d)]);
    appState = s;
    todayEntry = t ?? null;
    historyEntries = h.sort((a, b) => b.date - a.date);
  });

  async function save() {
    if (!db || !todayEntry) return;
    await saveTodayEntry(db, todayEntry);
    saved = true;
    setTimeout(() => { saved = false; }, 1500);
    onreload();
  }

  async function forcePokemon() {
    if (!db || !appState) return;
    const id = parseInt(nextId, 10);
    if (id >= 1 && id <= 1025) {
      localStorage.setItem('_devNextId', String(id));
    }
    await saveState(db, { ...appState, lastDate: 0 });
    onreload();
  }

  async function forceRandom() {
    if (!db || !appState) return;
    await saveState(db, { ...appState, lastDate: 0 });
    onreload();
  }

  async function removeHistoryEntry(entry: PokemonEntry) {
    if (!db) return;
    await deleteHistoryEntry(db, entry.date);
    historyEntries = historyEntries.filter((e) => e.date !== entry.date);
  }

  async function clearHistory() {
    if (!db || !appState) return;
    await clearHistoryEntries(db);
    const newPokedex = todayEntry ? [todayEntry.id] : [];
    const newShinydex = todayEntry?.isShiny ? [todayEntry.id] : [];
    await saveState(db, { ...appState, pokedex: newPokedex, shinydex: newShinydex });
    historyEntries = [];
  }

  async function resetAll() {
    if (!db) return;
    await clearAll(db);
    localStorage.removeItem('_devNextId');
    onreload();
  }

  async function fillHistory() {
    if (!db) return;
    const n = Math.min(Math.max(parseInt(fillDays, 10) || 7, 1), 30);
    const dateNow = Date.now() - (Date.now() % 86400000);
    fillProgress = { current: 0, total: n };

    for (let i = 1; i <= n; i++) {
      const date = dateNow - i * 86400000;
      // Skip if entry already exists
      const existing = historyEntries.find((e) => e.date === date);
      if (existing) {
        fillProgress = { current: i, total: n };
        continue;
      }
      const randomId = Math.floor(Math.random() * 1025) + 1;
      const randomNatureId = Math.floor(Math.random() * 25) + 1;
      const isShiny = Math.random() < 1 / 69;
      const level = Math.floor(Math.random() * 99) + 1;

      try {
        const [fetchedPokemon, fetchedNature] = await Promise.all([
          getPokemonData(randomId),
          getPokemonNature(randomNatureId) as Promise<Nature>,
        ]);
        const typeNames = fetchedPokemon.pokemon.types.map((t) => t.type.name);
        const fetchedTypes = await Promise.all(
          typeNames.map((name) => getPokemonTypes(name) as Promise<Type>)
        );
        const entry: PokemonEntry = {
          id: randomId,
          natureId: randomNatureId,
          level,
          isShiny,
          rename: '',
          date,
          nameFr: fetchedPokemon.species.names.find((n) => n.language.name === 'fr')?.name ?? fetchedPokemon.pokemon.name,
          nameEn: fetchedPokemon.species.names.find((n) => n.language.name === 'en')?.name ?? fetchedPokemon.pokemon.name,
          natureFr: fetchedNature.names.find((n) => n.language.name === 'fr')?.name ?? fetchedNature.name,
          natureEn: fetchedNature.names.find((n) => n.language.name === 'en')?.name ?? fetchedNature.name,
          types: typeNames,
          typeNamesFr: fetchedTypes.map((t) => t.names.find((n) => n.language.name === 'fr')?.name ?? t.name),
          typeNamesEn: fetchedTypes.map((t) => t.names.find((n) => n.language.name === 'en')?.name ?? t.name),
        };
        await addHistoryEntry(db, entry);
        historyEntries = [entry, ...historyEntries];
      } catch {
        // Skip on API failure
      }
      fillProgress = { current: i, total: n };
    }

    fillProgress = null;
    onreload();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }

  function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="dev-backdrop" onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}>
  <div class="dev-panel">
    <div class="dev-header">
      <div class="dev-title">
        <span class="dev-badge">DEV</span>
        <h2>Mode développeur</h2>
      </div>
      <button class="dev-close" onclick={onclose} aria-label="Fermer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <div class="dev-body">

      <!-- Pokémon du jour -->
      <section class="dev-section">
        <h3>Pokémon du jour</h3>
        {#if todayEntry}
          <div class="dev-info-row">
            <span class="dev-label">ID actuel</span>
            <span class="dev-value accent">#{todayEntry.id}</span>
          </div>
          <div class="dev-info-row">
            <span class="dev-label">Niveau</span>
            <input
              class="dev-input"
              type="number"
              min="1"
              max="99"
              bind:value={todayEntry.level}
            />
          </div>
          <div class="dev-info-row">
            <span class="dev-label">Shiny</span>
            <button
              class="dev-toggle"
              class:active={todayEntry.isShiny}
              onclick={() => { if (todayEntry) todayEntry.isShiny = !todayEntry.isShiny; }}
            >{todayEntry.isShiny ? '✦ Oui' : 'Non'}</button>
          </div>
          <div class="dev-info-row">
            <span class="dev-label">Surnom</span>
            <input class="dev-input" type="text" maxlength="16" bind:value={todayEntry.rename} placeholder="(aucun)" />
          </div>
          <div class="dev-info-row">
            <span class="dev-label">Dernière date</span>
            <span class="dev-value muted">{appState?.lastDate ? formatDate(appState.lastDate) : '—'}</span>
          </div>
          <button class="dev-btn primary" onclick={save}>
            {saved ? '✓ Sauvegardé' : 'Appliquer les changements'}
          </button>
        {:else}
          <p class="dev-hint">Chargement…</p>
        {/if}
      </section>

      <!-- Forcer un nouveau Pokémon -->
      <section class="dev-section">
        <h3>Forcer un nouveau tirage</h3>
        <div class="dev-row">
          <input
            class="dev-input flex"
            type="number"
            min="1"
            max="1025"
            bind:value={nextId}
            placeholder="ID (1–1025)"
          />
          <button class="dev-btn" onclick={forcePokemon} disabled={!nextId || parseInt(nextId) < 1 || parseInt(nextId) > 1025}>
            Forcer cet ID
          </button>
        </div>
        <button class="dev-btn" onclick={forceRandom}>
          Pokémon aléatoire
        </button>
        <p class="dev-hint">Réinitialise la date dans IndexedDB et recharge.</p>
      </section>

      <!-- Remplir l'historique -->
      <section class="dev-section">
        <h3>Remplir l'historique</h3>
        <div class="dev-row">
          <input
            class="dev-input flex"
            type="number"
            min="1"
            max="30"
            bind:value={fillDays}
            placeholder="Nb jours"
          />
          <button
            class="dev-btn"
            onclick={fillHistory}
            disabled={!!fillProgress}
          >
            {fillProgress ? `${fillProgress.current}/${fillProgress.total}…` : 'Générer'}
          </button>
        </div>
        <p class="dev-hint">Génère X jours de Pokémon aléatoires via l'API (1–30 jours).</p>
      </section>

      <!-- Historique -->
      <section class="dev-section">
        <h3>Historique ({historyEntries.length} entrées)</h3>
        {#if historyEntries.length > 0}
          <div class="dev-history-list">
            {#each historyEntries as entry (entry.date)}
              <div class="dev-history-entry">
                <span class="dev-history-id">#{entry.id}</span>
                <span class="dev-history-date">{formatDate(entry.date)}</span>
                <button
                  class="dev-remove"
                  onclick={() => removeHistoryEntry(entry)}
                  aria-label="Supprimer"
                >✕</button>
              </div>
            {/each}
          </div>
          <button class="dev-btn danger" onclick={clearHistory}>
            Vider l'historique
          </button>
        {:else}
          <p class="dev-hint">Aucune entrée dans l'historique.</p>
        {/if}
      </section>

      <!-- Reset -->
      <section class="dev-section">
        <h3>Reset</h3>
        <button class="dev-btn danger" onclick={resetAll}>
          Reset complet (efface tout)
        </button>
        <p class="dev-hint">Supprime toutes les données IndexedDB.</p>
      </section>

    </div>
    <div class="dev-footer">
      <span>CMD+SHIFT+C pour ouvrir/fermer · ESC pour fermer</span>
    </div>
  </div>
</div>

<style>
  .dev-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    z-index: 1000;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 0;
    animation: fadeIn 0.15s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .dev-panel {
    background: #0f0f1a;
    border: 1px solid rgba(155, 77, 202, 0.4);
    border-bottom: none;
    border-radius: 20px 20px 0 0;
    width: 100%;
    max-width: 480px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 -8px 60px rgba(155, 77, 202, 0.25);
    animation: slideUp 0.2s ease;
  }

  @keyframes slideUp {
    from { transform: translateY(40px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .dev-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    flex-shrink: 0;
  }

  .dev-title {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .dev-badge {
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.1em;
    background: rgba(155, 77, 202, 0.3);
    color: #b76ee0;
    border: 1px solid rgba(155, 77, 202, 0.5);
    padding: 3px 8px;
    border-radius: 6px;
  }

  .dev-title h2 {
    font-size: 16px;
    font-weight: 700;
    color: #f0f0f5;
  }

  .dev-close {
    background: none;
    border: none;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.5);
    padding: 4px;
    display: flex;
    align-items: center;
    border-radius: 8px;
    transition: color 0.15s, background 0.15s;
  }

  .dev-close:hover { color: #fff; background: rgba(255, 255, 255, 0.08); }
  .dev-close svg { width: 20px; height: 20px; }

  .dev-body {
    overflow-y: auto;
    flex: 1;
    padding: 4px 0;
  }

  .dev-section {
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .dev-section:last-child { border-bottom: none; }

  .dev-section h3 {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.4);
    margin-bottom: 2px;
  }

  .dev-info-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .dev-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .dev-label {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.55);
    flex-shrink: 0;
  }

  .dev-value {
    font-size: 13px;
    font-weight: 700;
    color: #f0f0f5;
  }

  .dev-value.accent { color: #b76ee0; }
  .dev-value.muted { color: rgba(255, 255, 255, 0.35); font-weight: 400; }

  .dev-input {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    color: #f0f0f5;
    font-family: inherit;
    font-size: 13px;
    padding: 6px 10px;
    outline: none;
    text-align: right;
    min-width: 0;
    width: 100px;
    transition: border-color 0.15s;
  }

  .dev-input:focus { border-color: rgba(155, 77, 202, 0.6); }
  .dev-input.flex { flex: 1; text-align: left; width: auto; }

  .dev-toggle {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.5);
    font-family: inherit;
    font-size: 13px;
    font-weight: 700;
    padding: 6px 14px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }

  .dev-toggle.active {
    background: rgba(255, 215, 0, 0.15);
    border-color: rgba(255, 215, 0, 0.4);
    color: #ffd700;
  }

  .dev-btn {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    color: rgba(255, 255, 255, 0.7);
    font-family: inherit;
    font-size: 13px;
    font-weight: 700;
    padding: 9px 16px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    text-align: center;
  }

  .dev-btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.1); color: #fff; }
  .dev-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .dev-btn.primary {
    background: rgba(155, 77, 202, 0.2);
    border-color: rgba(155, 77, 202, 0.5);
    color: #b76ee0;
  }

  .dev-btn.primary:hover { background: rgba(155, 77, 202, 0.35); color: #fff; }

  .dev-btn.danger {
    background: rgba(255, 80, 80, 0.1);
    border-color: rgba(255, 80, 80, 0.3);
    color: #ff8080;
  }

  .dev-btn.danger:hover { background: rgba(255, 80, 80, 0.2); }

  .dev-hint {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.3);
    line-height: 1.5;
  }

  .dev-history-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 180px;
    overflow-y: auto;
  }

  .dev-history-entry {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  .dev-history-id {
    font-size: 13px;
    font-weight: 700;
    color: #b76ee0;
    min-width: 40px;
  }

  .dev-history-date {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
    flex: 1;
  }

  .dev-remove {
    background: none;
    border: none;
    color: rgba(255, 80, 80, 0.5);
    cursor: pointer;
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 4px;
    transition: color 0.15s, background 0.15s;
  }

  .dev-remove:hover { color: #ff8080; background: rgba(255, 80, 80, 0.1); }

  .dev-footer {
    padding: 10px 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    flex-shrink: 0;
  }

  .dev-footer span {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.2);
  }
</style>
