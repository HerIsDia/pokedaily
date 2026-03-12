<script lang="ts">
  import { getPokemonImagePath, getUserLang } from '../scripts/script';
  import type { AppData, PokemonEntry } from '../scripts/script';

  let { data } = $props<{ data: AppData }>();

  const lang = getUserLang();
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US';

  const labels = {
    fr: {
      empty: 'Aucune entrée dans ton historique pour le moment.',
      title: 'Historique',
      weekdays: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
    },
    en: {
      empty: 'No history entries yet.',
      title: 'History',
      weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    },
  };
  const l = labels[lang];

  // Group history entries by year-month
  interface MonthGroup {
    year: number;
    month: number;
    label: string;
    // map from day-of-month (1-31) to entry
    days: Map<number, PokemonEntry>;
    // total days in month, first weekday offset (0=Mon…6=Sun)
    daysInMonth: number;
    startOffset: number;
  }

  function buildCalendar(entries: PokemonEntry[]): MonthGroup[] {
    const map = new Map<string, MonthGroup>();

    for (const entry of entries) {
      const d = new Date(entry.date);
      const year = d.getUTCFullYear();
      const month = d.getUTCMonth(); // 0-based
      const day = d.getUTCDate();
      const key = `${year}-${month}`;

      if (!map.has(key)) {
        const firstDay = new Date(Date.UTC(year, month, 1));
        // JS getDay(): 0=Sun, so convert to Mon=0
        const jsDay = firstDay.getUTCDay();
        const startOffset = (jsDay + 6) % 7; // Mon=0, Tue=1, … Sun=6
        const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
        const label = firstDay.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
        map.set(key, { year, month, label, days: new Map(), daysInMonth, startOffset });
      }

      map.get(key)!.days.set(day, entry);
    }

    // Sort newest month first
    return [...map.values()].sort((a, b) =>
      b.year !== a.year ? b.year - a.year : b.month - a.month
    );
  }

  const months = buildCalendar(data.history);

  // Selected entry for tooltip/detail
  let selected = $state<PokemonEntry | null>(null);
  let selectedDay = $state<number | null>(null);

  function selectEntry(entry: PokemonEntry, day: number) {
    if (selected?.date === entry.date) {
      selected = null;
      selectedDay = null;
    } else {
      selected = entry;
      selectedDay = day;
    }
  }

  function getEntryName(entry: PokemonEntry): string {
    if (entry.rename && entry.rename !== '') return entry.rename;
    return lang === 'fr' ? entry.nameFr : entry.nameEn;
  }
</script>

<div class="history-page">
  <h2 class="section-title">{l.title}</h2>

  {#if months.length === 0}
    <div class="empty-state">
      <span class="empty-icon">📋</span>
      <p>{l.empty}</p>
    </div>
  {:else}
    <div class="calendar-list">
      {#each months as mg}
        <div class="month-block">
          <h3 class="month-label">{mg.label.charAt(0).toUpperCase() + mg.label.slice(1)}</h3>

          <!-- Weekday headers -->
          <div class="cal-grid">
            {#each l.weekdays as wd}
              <div class="cal-weekday">{wd}</div>
            {/each}

            <!-- Empty cells before month starts -->
            {#each { length: mg.startOffset } as _}
              <div class="cal-cell cal-empty"></div>
            {/each}

            <!-- Day cells -->
            {#each { length: mg.daysInMonth } as _, idx}
              {@const day = idx + 1}
              {@const entry = mg.days.get(day)}
              <div
                class="cal-cell"
                class:has-entry={!!entry}
                class:is-selected={selected?.date === entry?.date}
                onclick={entry ? () => selectEntry(entry, day) : undefined}
                role={entry ? 'button' : undefined}
                tabindex={entry ? 0 : undefined}
                onkeydown={entry ? (e) => { if (e.key === 'Enter' || e.key === ' ') selectEntry(entry, day); } : undefined}
                title={entry ? getEntryName(entry) : undefined}
              >
                {#if entry}
                  <img
                    src={getPokemonImagePath(entry.id, entry.isShiny)}
                    alt={getEntryName(entry)}
                    loading="lazy"
                    class:shiny={entry.isShiny}
                  />
                  {#if entry.isShiny}
                    <span class="shiny-dot">✦</span>
                  {/if}
                {:else}
                  <span class="day-number">{day}</span>
                {/if}
              </div>
            {/each}
          </div>

          <!-- Detail card for selected entry in this month -->
          {#if selected && mg.days.get(selectedDay ?? -1)?.date === selected.date}
            {@const name = getEntryName(selected)}
            {@const nature = lang === 'fr' ? selected.natureFr : selected.natureEn}
            {@const typeNames = lang === 'fr' ? selected.typeNamesFr : selected.typeNamesEn}
            {@const primaryType = selected.types[0] ?? ''}
            {@const dateStr = new Date(selected.date).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            <div class="detail-card detail-card-{primaryType}">
              <div class="detail-img-wrap detail-img-{primaryType}" class:shiny={selected.isShiny}>
                <img
                  src={getPokemonImagePath(selected.id, selected.isShiny)}
                  alt={name}
                  class:shiny={selected.isShiny}
                />
              </div>
              <div class="detail-info">
                <span class="detail-name">{name}</span>
                {#if selected.rename && selected.rename !== ''}
                  <span class="detail-original">{lang === 'fr' ? selected.nameFr : selected.nameEn}</span>
                {/if}
                <span class="detail-date">{dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}</span>
                <div class="detail-meta">
                  <span class="stat-pill">Niv. {selected.level}</span>
                  <span class="stat-pill">{nature}</span>
                  {#if selected.isShiny}
                    <span class="shiny-pill">✦ Shiny</span>
                  {/if}
                  {#each selected.types as type, i}
                    <span class="type-badge type-{type}">{typeNames[i] ?? type}</span>
                  {/each}
                </div>
              </div>
            </div>
          {/if}
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
    gap: 20px;
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

  /* ── Calendar ── */
  .calendar-list {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .month-block {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .month-label {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--accent-light);
    text-transform: capitalize;
  }

  .cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 3px;
  }

  .cal-weekday {
    text-align: center;
    font-size: 10px;
    font-weight: 700;
    color: var(--text-muted);
    letter-spacing: 0.05em;
    padding: 4px 0;
    text-transform: uppercase;
  }

  .cal-cell {
    aspect-ratio: 1;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    min-width: 0;
  }

  .cal-cell.cal-empty {
    background: transparent;
    border-color: transparent;
  }

  .cal-cell.has-entry {
    background: rgba(155, 77, 202, 0.08);
    border-color: rgba(155, 77, 202, 0.2);
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, transform 0.1s;
  }

  .cal-cell.has-entry:hover {
    background: rgba(155, 77, 202, 0.18);
    border-color: rgba(155, 77, 202, 0.45);
    transform: scale(1.06);
    z-index: 1;
  }

  .cal-cell.is-selected {
    background: rgba(155, 77, 202, 0.25) !important;
    border-color: var(--accent) !important;
    box-shadow: 0 0 10px var(--accent-glow);
  }

  .cal-cell img {
    width: 80%;
    height: 80%;
    object-fit: contain;
    image-rendering: pixelated;
  }

  .cal-cell img.shiny {
    filter: drop-shadow(0 0 4px rgba(255, 215, 0, 0.6));
  }

  .day-number {
    font-size: 11px;
    color: var(--text-muted);
    opacity: 0.4;
  }

  .shiny-dot {
    position: absolute;
    top: 1px;
    right: 2px;
    font-size: 8px;
    color: var(--shiny-color);
    line-height: 1;
  }

  /* ── Detail card ── */
  .detail-card {
    display: flex;
    align-items: center;
    gap: 14px;
    background: var(--bg-card);
    border-radius: 14px;
    border: 1px solid var(--border-subtle);
    padding: 12px 14px 12px 12px;
    animation: slide-in 0.2s ease;
  }

  @keyframes slide-in {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .detail-card-fire     { border-top: 2px solid rgba(238,129,48,0.6); }
  .detail-card-water    { border-top: 2px solid rgba(99,144,240,0.6); }
  .detail-card-grass    { border-top: 2px solid rgba(122,199,76,0.6); }
  .detail-card-electric { border-top: 2px solid rgba(247,208,44,0.6); }
  .detail-card-ice      { border-top: 2px solid rgba(150,217,214,0.6); }
  .detail-card-fighting { border-top: 2px solid rgba(194,46,40,0.6); }
  .detail-card-poison   { border-top: 2px solid rgba(163,62,161,0.6); }
  .detail-card-ground   { border-top: 2px solid rgba(226,191,101,0.6); }
  .detail-card-flying   { border-top: 2px solid rgba(169,143,243,0.6); }
  .detail-card-psychic  { border-top: 2px solid rgba(249,85,135,0.6); }
  .detail-card-bug      { border-top: 2px solid rgba(166,185,26,0.6); }
  .detail-card-rock     { border-top: 2px solid rgba(182,161,54,0.6); }
  .detail-card-ghost    { border-top: 2px solid rgba(123,98,163,0.6); }
  .detail-card-dragon   { border-top: 2px solid rgba(111,53,252,0.6); }
  .detail-card-dark     { border-top: 2px solid rgba(112,87,70,0.6); }
  .detail-card-steel    { border-top: 2px solid rgba(183,183,206,0.6); }
  .detail-card-fairy    { border-top: 2px solid rgba(214,133,173,0.6); }
  .detail-card-normal   { border-top: 2px solid rgba(168,167,122,0.6); }

  .detail-img-wrap {
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

  .detail-img-wrap.shiny {
    box-shadow: 0 0 12px var(--shiny-glow);
    border-color: rgba(255, 215, 0, 0.4);
  }

  .detail-img-wrap img {
    width: 60px;
    height: 60px;
    object-fit: contain;
    image-rendering: pixelated;
  }

  .detail-img-wrap img.shiny {
    filter: drop-shadow(0 0 6px rgba(255, 215, 0, 0.5));
  }

  .detail-img-fire     { border-color: rgba(238,129,48,0.5); }
  .detail-img-water    { border-color: rgba(99,144,240,0.5); }
  .detail-img-grass    { border-color: rgba(122,199,76,0.5); }
  .detail-img-electric { border-color: rgba(247,208,44,0.5); }
  .detail-img-ice      { border-color: rgba(150,217,214,0.5); }
  .detail-img-psychic  { border-color: rgba(249,85,135,0.5); }
  .detail-img-dragon   { border-color: rgba(111,53,252,0.5); }
  .detail-img-ghost    { border-color: rgba(123,98,163,0.5); }
  .detail-img-dark     { border-color: rgba(112,87,70,0.5); }
  .detail-img-fairy    { border-color: rgba(214,133,173,0.5); }

  .detail-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .detail-name {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .detail-original {
    font-size: 12px;
    color: var(--text-muted);
  }

  .detail-date {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: capitalize;
    margin-bottom: 4px;
  }

  .detail-meta {
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

  .shiny-pill {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 10px;
    border-radius: 6px;
    background: rgba(255, 215, 0, 0.12);
    color: var(--shiny-color);
    border: 1px solid rgba(255, 215, 0, 0.35);
  }
</style>
