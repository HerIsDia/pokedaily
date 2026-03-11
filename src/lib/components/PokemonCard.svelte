<script lang="ts">
  import { setRename, getPokemonImagePath, getUserLang } from '../scripts/script';
  import type { AppData } from '../scripts/script';

  let { data } = $props<{ data: AppData }>();

  const pkmn = data.pokemonOfTheDay;
  const lang = getUserLang();
  const imageId = getPokemonImagePath(pkmn.id, pkmn.isShiny);
  const entryNumber = pkmn.id.toString().padStart(4, '0');

  const pokemonName = pkmn.fetched.pokemon.species.names.find(
    (n) => n.language.name === lang
  )?.name ?? pkmn.fetched.pokemon.pokemon.name;

  const natureName = pkmn.fetched.nature.names.find(
    (n) => n.language.name === lang
  )?.name ?? pkmn.fetched.nature.name;

  const types = pkmn.fetched.types.filter((t) => t !== null);
  const primaryTypeName = types[0]?.name ?? '';

  let rename = $state(pkmn.rename !== '' ? pkmn.rename : pokemonName);

  function onRenameInput(e: Event) {
    const el = e.target as HTMLElement;
    let val = el.innerText.replace(/\n/g, '').slice(0, 16);
    rename = val;
    el.innerText = val;
    // Move cursor to end
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
    setRename(val);
  }

  const dt = new Date();
  const dateLabel = dt.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
</script>

<svelte:head>
  <title>#{entryNumber} {pokemonName}</title>
  <link rel="icon" href={imageId} type="image/png" />
</svelte:head>

<div class="card-page">
  <div class="card card-{primaryTypeName}">
    <!-- Decorative background glow -->
    <div class="card-glow card-glow-{primaryTypeName}"></div>

    <!-- Entry header -->
    <div class="card-header">
      <span class="entry-number">N°{entryNumber}</span>
      <div class="type-badges">
        {#each types as type}
          <span class="type-badge type-{type.name}">
            {type.names.find((n) => n.language.name === lang)?.name ?? type.name}
          </span>
        {/each}
        {#if pkmn.isShiny}
          <span class="shiny-badge">✦ Shiny</span>
        {/if}
      </div>
    </div>

    <!-- Pokemon image -->
    <div class="pokemon-portrait portrait-{primaryTypeName}" class:shiny={pkmn.isShiny}>
      <img src={imageId} alt={pokemonName} />
    </div>

    <!-- Pokemon info -->
    <div class="card-body">
      <!-- Editable nickname -->
      <h1
        class="pokemon-rename"
        contenteditable="true"
        oninput={onRenameInput}
        title="Modifie le surnom"
        spellcheck="false"
        aria-label="Surnom du Pokémon"
      >{rename}</h1>

      <!-- Original name -->
      {#if rename !== pokemonName}
        <p class="pokemon-original-name">{pokemonName}</p>
      {/if}

      <!-- Stats row -->
      <div class="stats-row">
        <div class="stat-chip">
          <span class="stat-label">Niv.</span>
          <span class="stat-value">{pkmn.level}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-chip">
          <span class="stat-label">Nature</span>
          <span class="stat-value">{natureName}</span>
        </div>
      </div>
    </div>

    <!-- Date footer -->
    <div class="card-footer">
      <span class="date-label">{dateLabel}</span>
    </div>
  </div>

  <footer class="page-footer">
    <p>Pokedaily n'est pas affilié à Nintendo ou Game Freak. Pokémon est une marque déposée de Nintendo.</p>
    <p>Fait avec ♥ par <a href="https://herisdia.me">diamant</a></p>
  </footer>
</div>

<style>
  .card-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 16px 24px;
    min-height: 100%;
    gap: 20px;
  }

  .card {
    position: relative;
    width: 100%;
    max-width: 420px;
    background: var(--bg-card);
    border-radius: var(--card-radius);
    border: 1px solid var(--border-subtle);
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    overflow: hidden;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
  }

  /* Type-specific card accent borders */
  .card-fire     { border-top: 2px solid rgba(238,129,48,0.7); }
  .card-water    { border-top: 2px solid rgba(99,144,240,0.7); }
  .card-grass    { border-top: 2px solid rgba(122,199,76,0.7); }
  .card-electric { border-top: 2px solid rgba(247,208,44,0.7); }
  .card-ice      { border-top: 2px solid rgba(150,217,214,0.7); }
  .card-fighting { border-top: 2px solid rgba(194,46,40,0.7); }
  .card-poison   { border-top: 2px solid rgba(163,62,161,0.7); }
  .card-ground   { border-top: 2px solid rgba(226,191,101,0.7); }
  .card-flying   { border-top: 2px solid rgba(169,143,243,0.7); }
  .card-psychic  { border-top: 2px solid rgba(249,85,135,0.7); }
  .card-bug      { border-top: 2px solid rgba(166,185,26,0.7); }
  .card-rock     { border-top: 2px solid rgba(182,161,54,0.7); }
  .card-ghost    { border-top: 2px solid rgba(123,98,163,0.7); }
  .card-dragon   { border-top: 2px solid rgba(111,53,252,0.7); }
  .card-dark     { border-top: 2px solid rgba(112,87,70,0.7); }
  .card-steel    { border-top: 2px solid rgba(183,183,206,0.7); }
  .card-fairy    { border-top: 2px solid rgba(214,133,173,0.7); }
  .card-normal   { border-top: 2px solid rgba(168,167,122,0.7); }

  /* Background glow */
  .card-glow {
    position: absolute;
    top: -60px;
    left: 50%;
    transform: translateX(-50%);
    width: 260px;
    height: 260px;
    border-radius: 50%;
    opacity: 0.08;
    pointer-events: none;
  }
  .card-glow-fire     { background: radial-gradient(circle, #ee8130, transparent 70%); }
  .card-glow-water    { background: radial-gradient(circle, #6390f0, transparent 70%); }
  .card-glow-grass    { background: radial-gradient(circle, #7ac74c, transparent 70%); }
  .card-glow-electric { background: radial-gradient(circle, #f7d02c, transparent 70%); }
  .card-glow-ice      { background: radial-gradient(circle, #96d9d6, transparent 70%); }
  .card-glow-fighting { background: radial-gradient(circle, #c22e28, transparent 70%); }
  .card-glow-poison   { background: radial-gradient(circle, #a33ea1, transparent 70%); }
  .card-glow-ground   { background: radial-gradient(circle, #e2bf65, transparent 70%); }
  .card-glow-flying   { background: radial-gradient(circle, #a98ff3, transparent 70%); }
  .card-glow-psychic  { background: radial-gradient(circle, #f95587, transparent 70%); }
  .card-glow-bug      { background: radial-gradient(circle, #a6b91a, transparent 70%); }
  .card-glow-rock     { background: radial-gradient(circle, #b6a136, transparent 70%); }
  .card-glow-ghost    { background: radial-gradient(circle, #7b62a3, transparent 70%); }
  .card-glow-dragon   { background: radial-gradient(circle, #6f35fc, transparent 70%); }
  .card-glow-dark     { background: radial-gradient(circle, #705746, transparent 70%); }
  .card-glow-steel    { background: radial-gradient(circle, #b7b7ce, transparent 70%); }
  .card-glow-fairy    { background: radial-gradient(circle, #d685ad, transparent 70%); }
  .card-glow-normal   { background: radial-gradient(circle, #a8a77a, transparent 70%); }

  /* Card header */
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    position: relative;
    z-index: 1;
  }

  .entry-number {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-muted);
    letter-spacing: 0.08em;
  }

  .type-badges {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .shiny-badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: var(--badge-radius);
    font-size: 11px;
    font-weight: 700;
    background: rgba(255, 215, 0, 0.15);
    color: var(--shiny-color);
    border: 1px solid rgba(255, 215, 0, 0.4);
    animation: shiny-sparkle 2s ease-in-out infinite;
  }

  /* Pokemon portrait */
  .pokemon-portrait {
    position: relative;
    z-index: 1;
    width: 180px;
    height: 180px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--border-subtle);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: pulse-glow 3s ease-in-out infinite;
  }

  .pokemon-portrait img {
    width: 160px;
    height: 160px;
    object-fit: contain;
    image-rendering: pixelated;
    filter: drop-shadow(0 4px 16px rgba(0,0,0,0.5));
  }

  .pokemon-portrait.shiny {
    box-shadow: 0 0 30px var(--shiny-glow), 0 0 60px rgba(255, 215, 0, 0.15);
  }

  /* Card body */
  .card-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    width: 100%;
    position: relative;
    z-index: 1;
  }

  .pokemon-rename {
    font-size: 32px;
    font-weight: 900;
    letter-spacing: 0.03em;
    text-align: center;
    color: var(--text-primary);
    outline: none;
    cursor: text;
    border-bottom: 2px solid transparent;
    transition: border-color 0.2s;
    min-width: 1ch;
    max-width: 100%;
    word-break: break-word;
  }

  .pokemon-rename:focus {
    border-bottom-color: var(--accent);
  }

  .pokemon-original-name {
    font-size: 14px;
    color: var(--text-muted);
    letter-spacing: 0.05em;
  }

  .stats-row {
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border-subtle);
    border-radius: 12px;
    padding: 10px 20px;
  }

  .stat-chip {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .stat-label {
    font-size: 10px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 700;
  }

  .stat-value {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .stat-divider {
    width: 1px;
    height: 28px;
    background: var(--border-subtle);
  }

  /* Card footer */
  .card-footer {
    width: 100%;
    text-align: center;
    position: relative;
    z-index: 1;
  }

  .date-label {
    font-size: 12px;
    color: var(--text-muted);
    letter-spacing: 0.05em;
    text-transform: capitalize;
  }

  /* Page footer */
  .page-footer {
    text-align: center;
    font-size: 11px;
    color: var(--text-muted);
    line-height: 1.6;
    max-width: 380px;
  }

  .page-footer a {
    color: var(--accent-light);
    text-decoration: none;
  }
</style>
