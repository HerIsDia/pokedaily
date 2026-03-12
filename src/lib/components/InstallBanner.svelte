<script lang="ts">
  let {
    oninstall,
    onclose,
    isMetered = false,
  } = $props<{
    oninstall: () => void;
    onclose: () => void;
    isMetered?: boolean;
  }>();
</script>

<div class="install-banner">
  <div class="banner-content">
    <div class="banner-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    </div>
    <div class="banner-text">
      <strong>Installer Pokédex</strong>
      <span>
        {#if isMetered}
          Disponible hors ligne. Images préchargées sur Wi-Fi.
        {:else}
          Disponible hors ligne avec toutes les images.
        {/if}
      </span>
    </div>
  </div>
  <div class="banner-actions">
    <button class="btn-install" onclick={oninstall}>Installer</button>
    <button class="btn-close" onclick={onclose} aria-label="Fermer">✕</button>
  </div>
</div>

<style>
  .install-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 16px;
    background: var(--accent-subtle);
    border-bottom: 1px solid var(--border-accent);
    flex-wrap: wrap;
  }

  .banner-content {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
  }

  .banner-icon {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    color: var(--accent-light);
  }

  .banner-icon svg {
    width: 100%;
    height: 100%;
  }

  .banner-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .banner-text strong {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .banner-text span {
    font-size: 12px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .banner-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .btn-install {
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 8px 18px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    font-family: var(--font-main);
    transition: background 0.2s, transform 0.1s;
    letter-spacing: 0.03em;
  }

  .btn-install:hover {
    background: var(--accent-light);
  }

  .btn-install:active {
    transform: scale(0.96);
  }

  .btn-close {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 16px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    transition: color 0.2s;
    font-family: var(--font-main);
  }

  .btn-close:hover {
    color: var(--text-primary);
  }
</style>
