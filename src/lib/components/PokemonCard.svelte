<script lang="ts">
  import { setRename, getPokemonImagePath, getUserLang } from '../scripts/script';
  import type { AppData } from '../scripts/script';

  let { data } = $props<{ data: AppData }>();

  const pkmn = data.pokemonOfTheDay;
  const lang = getUserLang();
  const imageId = getPokemonImagePath(pkmn.id, pkmn.isShiny);
  const entryNumber = pkmn.id.toString().padStart(4, '0');

  const pokemonName = lang === 'fr' ? pkmn.nameFr : pkmn.nameEn;
  const natureName = lang === 'fr' ? pkmn.natureFr : pkmn.natureEn;
  const typeDisplayNames = lang === 'fr' ? pkmn.typeNamesFr : pkmn.typeNamesEn;
  const primaryTypeName = pkmn.types[0] ?? '';

  let rename = $state(pkmn.rename !== '' ? pkmn.rename : pokemonName);
  let isEditing = $state(false);
  let editValue = $state('');

  function startEdit() {
    editValue = rename === pokemonName ? '' : rename;
    isEditing = true;
  }

  function confirmRename(val: string) {
    const trimmed = val.trim().slice(0, 16);
    rename = trimmed || pokemonName;
    isEditing = false;
    setRename(pkmn.date, trimmed);
  }

  function cancelRename() {
    isEditing = false;
  }

  const dt = new Date();
  const dateLabel = dt.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const typeColors: Record<string, string> = {
    fire: '#ee8130', water: '#6390f0', grass: '#7ac74c', electric: '#f7d02c',
    ice: '#96d9d6', fighting: '#c22e28', poison: '#a33ea1', ground: '#e2bf65',
    flying: '#a98ff3', psychic: '#f95587', bug: '#a6b91a', rock: '#b6a136',
    ghost: '#7b62a3', dragon: '#6f35fc', dark: '#705746', steel: '#b7b7ce',
    fairy: '#d685ad', normal: '#a8a77a',
  };

  // ── Canvas generation ──────────────────────────────────────────────────

  async function generateCardBlob(): Promise<Blob | null> {
    const canvas = document.createElement('canvas');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = 400, H = 560;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    const typeColor = typeColors[primaryTypeName] || '#9b4dca';

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#0f0f1a');
    bgGrad.addColorStop(1, '#1a0f2e');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.roundRect(0, 0, W, H, 20);
    ctx.fill();

    // Type glow
    const glowGrad = ctx.createRadialGradient(W / 2, 170, 0, W / 2, 170, 200);
    glowGrad.addColorStop(0, typeColor + '30');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, W, H);

    // Top accent bar
    ctx.fillStyle = typeColor;
    ctx.beginPath();
    ctx.roundRect(0, 0, W, 4, [20, 20, 0, 0]);
    ctx.fill();

    // Entry number
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`N°${entryNumber}`, 24, 36);

    // Shiny badge
    if (pkmn.isShiny) {
      ctx.fillStyle = 'rgba(255,215,0,0.18)';
      ctx.beginPath();
      ctx.roundRect(W - 92, 20, 80, 26, 13);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,215,0,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(W - 92, 20, 80, 26, 13);
      ctx.stroke();
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✦ Shiny', W - 52, 37);
    }

    // Type badge
    const typeLabel = typeDisplayNames[0] ?? primaryTypeName;
    ctx.font = 'bold 13px sans-serif';
    const badgeW = ctx.measureText(typeLabel).width + 24;
    ctx.fillStyle = typeColor + '35';
    ctx.beginPath();
    ctx.roundRect(24, 50, badgeW, 26, 13);
    ctx.fill();
    ctx.fillStyle = typeColor;
    ctx.textAlign = 'left';
    ctx.fillText(typeLabel, 36, 67);

    // Pokémon image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageId;
    await new Promise<void>((resolve) => { img.onload = () => resolve(); img.onerror = () => resolve(); });
    ctx.drawImage(img, W / 2 - 100, 80, 200, 200);

    // Pokémon name
    ctx.fillStyle = '#f0f0f5';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(rename, W / 2, 320);

    // Original name if renamed
    if (rename !== pokemonName) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '14px sans-serif';
      ctx.fillText(pokemonName, W / 2, 342);
    }

    // Stats pill background
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.roundRect(W / 2 - 110, 356, 220, 52, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(W / 2 - 110, 356, 220, 52, 12);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('NIV.', W / 2 - 50, 371);
    ctx.fillStyle = '#f0f0f5';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(String(pkmn.level), W / 2 - 50, 392);

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2, 362);
    ctx.lineTo(W / 2, 402);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('NATURE', W / 2 + 50, 371);
    ctx.fillStyle = '#f0f0f5';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(natureName, W / 2 + 50, 392);

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '13px sans-serif';
    ctx.fillText(dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1), W / 2, 432);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 450);
    ctx.lineTo(W - 40, 450);
    ctx.stroke();

    ctx.fillStyle = '#b76ee0';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Pokédaily', W / 2, 485);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '13px sans-serif';
    ctx.fillText('pokedaily.vercel.app', W / 2, 507);

    return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  }

  // ── Share ──────────────────────────────────────────────────────────────

  let sharing = $state(false);

  async function shareCard() {
    sharing = true;
    try {
      const blob = await generateCardBlob();
      if (!blob) return;
      const file = new File([blob], `pokemon-${pkmn.id}.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: lang === 'fr' ? `Je suis ${rename} aujourd'hui !` : `I am ${rename} today!`,
          text: lang === 'fr'
            ? 'Découvre ton Pokémon du jour sur pokedaily.vercel.app'
            : 'Discover your Pokémon of the day at pokedaily.vercel.app',
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pokemon-${pkmn.id}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch { /* user cancelled */ }
    sharing = false;
  }

  // ── Copy ───────────────────────────────────────────────────────────────

  let copying = $state(false);
  let copied = $state(false);

  async function copyCard() {
    copying = true;
    try {
      const blob = await generateCardBlob();
      if (!blob) return;
      if (navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        copied = true;
        setTimeout(() => { copied = false; }, 2000);
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pokemon-${pkmn.id}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch { /* permission denied */ }
    copying = false;
  }
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
        {#each pkmn.types as type, i}
          <span class="type-badge type-{type}">
            {typeDisplayNames[i] ?? type}
          </span>
        {/each}
        {#if pkmn.isShiny}
          <span class="shiny-badge">✦ Shiny</span>
        {/if}
      </div>
    </div>

    <!-- Pokémon image -->
    <div class="pokemon-portrait portrait-{primaryTypeName}" class:shiny={pkmn.isShiny}>
      <img src={imageId} alt={pokemonName} />
    </div>

    <!-- Pokémon info -->
    <div class="card-body">
      <!-- Name + rename button -->
      <div class="name-row">
        {#if isEditing}
          <input
            class="name-input"
            type="text"
            value={editValue}
            placeholder={pokemonName}
            maxlength="16"
            autofocus
            onkeydown={(e) => {
              if (e.key === 'Enter') confirmRename(e.currentTarget.value);
              if (e.key === 'Escape') cancelRename();
            }}
            onblur={(e) => confirmRename(e.currentTarget.value)}
          />
        {:else}
          <h1 class="pokemon-name">{rename}</h1>
          <button class="rename-btn" onclick={startEdit} aria-label="Renommer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        {/if}
      </div>

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

  <!-- Action buttons -->
  <div class="action-row">
    <button class="action-btn" onclick={shareCard} disabled={sharing} aria-label="Partager">
      {#if sharing}
        <span class="btn-spinner"></span>
      {:else}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
      {/if}
      {lang === 'fr' ? 'Partager' : 'Share'}
    </button>

    <button class="action-btn" class:copied={copied} onclick={copyCard} disabled={copying} aria-label="Copier l'image">
      {#if copying}
        <span class="btn-spinner"></span>
      {:else if copied}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      {:else}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      {/if}
      {#if copied}
        {lang === 'fr' ? 'Copié !' : 'Copied!'}
      {:else}
        {lang === 'fr' ? 'Copier' : 'Copy'}
      {/if}
    </button>
  </div>

  <footer class="page-footer">
    <p>Pokedaily n'est pas affilié à Nintendo ou Game Freak. Pokémon est une marque déposée de Nintendo.</p>
    <p>Fait par <a href="https://diamant.ink">diamant</a> avec Claude Code</p>
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

  .card-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    width: 100%;
    position: relative;
    z-index: 1;
  }

  /* ── Rename ── */
  .name-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .pokemon-name {
    font-size: 32px;
    font-weight: 900;
    letter-spacing: 0.03em;
    text-align: center;
    color: var(--text-primary);
  }

  .rename-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    padding: 4px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    transition: color 0.15s, background 0.15s;
    flex-shrink: 0;
  }

  .rename-btn:hover { color: var(--accent-light); background: var(--accent-subtle); }
  .rename-btn svg { width: 15px; height: 15px; }

  .name-input {
    background: rgba(255, 255, 255, 0.06);
    border: 2px solid var(--accent);
    border-radius: 10px;
    color: var(--text-primary);
    font-family: var(--font-main);
    font-size: 28px;
    font-weight: 900;
    letter-spacing: 0.03em;
    padding: 4px 12px;
    text-align: center;
    outline: none;
    width: 100%;
    max-width: 260px;
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

  /* ── Action buttons ── */
  .action-row {
    display: flex;
    gap: 10px;
    width: 100%;
    max-width: 420px;
  }

  .action-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: var(--accent-subtle);
    border: 1px solid var(--border-accent);
    border-radius: 12px;
    color: var(--accent-light);
    font-family: var(--font-main);
    font-size: 14px;
    font-weight: 700;
    padding: 10px 16px;
    cursor: pointer;
    transition: background 0.2s, transform 0.15s, box-shadow 0.2s, color 0.2s;
    letter-spacing: 0.03em;
  }

  .action-btn:hover:not(:disabled) {
    background: var(--accent);
    color: #fff;
    box-shadow: 0 0 20px var(--accent-glow);
  }

  .action-btn:active:not(:disabled) { transform: scale(0.96); }
  .action-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .action-btn svg { width: 17px; height: 17px; flex-shrink: 0; }

  .action-btn.copied {
    background: rgba(76, 200, 120, 0.15);
    border-color: rgba(76, 200, 120, 0.4);
    color: #60d080;
  }

  .action-btn.copied:hover:not(:disabled) {
    background: rgba(76, 200, 120, 0.25);
    color: #80f0a0;
    box-shadow: 0 0 20px rgba(76, 200, 120, 0.3);
  }

  .btn-spinner {
    display: inline-block;
    width: 15px;
    height: 15px;
    border: 2px solid var(--border-accent);
    border-top-color: var(--accent-light);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  /* ── Footer ── */
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
