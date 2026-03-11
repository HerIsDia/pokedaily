<script lang="ts">
  import { onMount } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { script } from './lib/scripts/script';
  import { isUnlimitedConnection } from './lib/scripts/connection';
  import PokemonCard from './lib/components/PokemonCard.svelte';
  import History from './lib/components/History.svelte';
  import Pokedex from './lib/components/Pokedex.svelte';
  import InstallBanner from './lib/components/InstallBanner.svelte';
  import DevPanel from './lib/components/DevPanel.svelte';
  import type { AppData } from './lib/scripts/script';

  // --- View routing ---
  type View = 'pokemon' | 'history' | 'pokedex';
  let view = $state<View>(
    window.location.hash === '#history'
      ? 'history'
      : window.location.hash === '#pokedex'
        ? 'pokedex'
        : 'pokemon'
  );

  function navigate(target: View) {
    view = target;
    window.location.hash = target;
  }

  // --- Data loading ---
  let data = $state<AppData | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let isFirstLoad = $state(sessionStorage.getItem('done') !== '1');

  onMount(async () => {
    try {
      data = await script();
      sessionStorage.setItem('done', '1');
    } catch (e) {
      error = e instanceof Error ? e.message : 'Erreur inconnue';
    } finally {
      loading = false;
      isFirstLoad = false;
    }
  });

  // --- PWA install ---
  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  }

  let installPrompt = $state<BeforeInstallPromptEvent | null>(null);
  let showInstallBanner = $state(false);
  let cacheProgress = $state<{ current: number; total: number } | null>(null);
  let cacheComplete = $state(false);

  onMount(() => {
    // Service Worker registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          reg.addEventListener('updatefound', () => {
            const worker = reg.installing;
            worker?.addEventListener('statechange', () => {
              if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                worker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            });
          });
        })
        .catch(() => {});

      navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
        if (event.data?.type === 'PRECACHE_PROGRESS') {
          cacheProgress = { current: event.data.current as number, total: event.data.total as number };
        }
        if (event.data?.type === 'PRECACHE_COMPLETE') {
          cacheProgress = null;
          cacheComplete = true;
          setTimeout(() => { cacheComplete = false; }, 4000);
        }
      });
    }

    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      installPrompt = e as BeforeInstallPromptEvent;
      showInstallBanner = true;
    });

    window.addEventListener('appinstalled', () => {
      showInstallBanner = false;
      installPrompt = null;
      if (isUnlimitedConnection()) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.active?.postMessage({ type: 'PRECACHE_IMAGES' });
        });
      }
    });
  });

  async function handleInstall() {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      showInstallBanner = false;
      installPrompt = null;
    }
  }

  // --- Online status ---
  let online = $state(navigator.onLine);
  onMount(() => {
    window.addEventListener('online', () => { online = true; });
    window.addEventListener('offline', () => { online = false; });
  });

  // --- Dev panel ---
  let showDevPanel = $state(false);
  onMount(() => {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        showDevPanel = !showDevPanel;
      }
    });
  });
</script>

<div class="app-shell">
  <!-- Header -->
  <header class="topbar">
    <span class="topbar-logo">Pokédaily</span>
    <div class="topbar-meta">
      {#if !online}
        <span class="badge-status badge-offline">Hors ligne</span>
      {/if}
      {#if cacheProgress}
        <span class="badge-status badge-caching">
          Images {cacheProgress.current}/{cacheProgress.total}
        </span>
      {/if}
      {#if cacheComplete}
        <span class="badge-status badge-done" transition:fade>✓ En cache</span>
      {/if}
    </div>
  </header>

  <!-- Install banner -->
  {#if showInstallBanner}
    <InstallBanner
      oninstall={handleInstall}
      onclose={() => { showInstallBanner = false; }}
      isMetered={!isUnlimitedConnection()}
    />
  {/if}

  <!-- Main content -->
  <main class="main-content">
    {#if loading}
      <div class="loading-state" transition:fade={{ duration: 300 }}>
        <div class="pokeball-spinner"></div>
        <p>Chargement...</p>
      </div>
    {:else if error === 'offline-no-data'}
      <div class="error-state" transition:fade={{ duration: 300 }}>
        <span class="state-icon">📡</span>
        <h2>Hors ligne</h2>
        <p>Aucune donnée disponible. Connecte-toi pour découvrir ton Pokémon du jour.</p>
      </div>
    {:else if error}
      <div class="error-state" transition:fade={{ duration: 300 }}>
        <span class="state-icon">⚠️</span>
        <h2>Erreur</h2>
        <p>{error}</p>
      </div>
    {:else if data}
      <div
        class="view-container"
        in:fly={{ y: isFirstLoad ? 24 : 0, duration: isFirstLoad ? 400 : 0, opacity: isFirstLoad ? 0 : 1 }}
      >
        {#if view === 'pokemon'}
          <PokemonCard {data} />
        {:else if view === 'history'}
          <History {data} />
        {:else if view === 'pokedex'}
          <Pokedex {data} />
        {/if}
      </div>
    {/if}
  </main>

  <!-- Dev panel -->
  {#if showDevPanel}
    <DevPanel
      onclose={() => { showDevPanel = false; }}
      onreload={() => { window.location.reload(); }}
    />
  {/if}

  <!-- Bottom navigation -->
  <nav class="bottom-nav">
    <button
      class="nav-tab"
      class:active={view === 'history'}
      onclick={() => navigate('history')}
      aria-label="Historique"
    >
      <span class="nav-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
          <path d="M12 7v5l4 2"/>
        </svg>
      </span>
      <span class="nav-label">Historique</span>
    </button>

    <button
      class="nav-tab nav-tab-center"
      class:active={view === 'pokemon'}
      onclick={() => navigate('pokemon')}
      aria-label="Pokémon du jour"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>
      </svg>
    </button>

    <button
      class="nav-tab"
      class:active={view === 'pokedex'}
      onclick={() => navigate('pokedex')}
      aria-label="Pokédex"
    >
      <span class="nav-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
      </span>
      <span class="nav-label">Pokédex</span>
    </button>
  </nav>
</div>

<style>
  .app-shell {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-main);
    overflow: hidden;
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    background: var(--bg-nav);
    border-bottom: 1px solid var(--border-subtle);
    flex-shrink: 0;
  }

  .topbar-logo {
    font-size: 18px;
    font-weight: 900;
    letter-spacing: 0.15em;
    color: var(--accent-light);
    text-shadow: 0 0 20px var(--accent-glow);
  }

  .topbar-meta {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .badge-status {
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 20px;
    font-weight: 700;
  }

  .badge-offline {
    background: rgba(255, 80, 80, 0.15);
    color: #ff8080;
    border: 1px solid rgba(255, 80, 80, 0.4);
  }

  .badge-caching {
    background: var(--accent-subtle);
    color: var(--accent-light);
    border: 1px solid var(--border-accent);
  }

  .badge-done {
    background: rgba(76, 200, 120, 0.15);
    color: #60d080;
    border: 1px solid rgba(76, 200, 120, 0.4);
  }

  .main-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .view-container {
    min-height: 100%;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 60vh;
    gap: 24px;
    color: var(--text-secondary);
  }

  .pokeball-spinner {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    border: 3px solid var(--border-subtle);
    border-top-color: var(--accent);
    animation: spin 0.8s linear infinite;
  }

  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 60vh;
    gap: 16px;
    padding: 40px 24px;
    text-align: center;
  }

  .state-icon { font-size: 48px; }

  .error-state h2 {
    font-size: 22px;
    font-weight: 700;
  }

  .error-state p {
    color: var(--text-secondary);
    max-width: 280px;
    line-height: 1.5;
  }

  /* Bottom nav */
  .bottom-nav {
    display: flex;
    align-items: center;
    justify-content: space-around;
    background: var(--bg-nav);
    border-top: 1px solid var(--border-subtle);
    padding: 8px 0 max(8px, env(safe-area-inset-bottom));
    flex-shrink: 0;
    height: var(--nav-height);
  }

  .nav-tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    transition: color 0.2s, transform 0.15s;
    padding: 4px 20px;
    border-radius: 12px;
    font-family: var(--font-main);
  }

  .nav-tab:active { transform: scale(0.92); }
  .nav-tab.active { color: var(--accent-light); }

  .nav-icon svg {
    width: 22px;
    height: 22px;
  }

  .nav-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .nav-tab-center {
    background: var(--accent-subtle);
    border: 1px solid var(--border-accent) !important;
    border-radius: 50%;
    width: 52px;
    height: 52px;
    padding: 0;
    flex-shrink: 0;
    justify-content: center;
    box-shadow: 0 0 16px var(--accent-glow);
    transition: box-shadow 0.2s, transform 0.15s, background 0.2s;
  }

  .nav-tab-center svg {
    width: 26px;
    height: 26px;
  }

  .nav-tab-center.active {
    background: var(--accent);
    box-shadow: 0 0 28px var(--accent-glow);
    color: #fff;
  }
</style>
