<script lang="ts">
  import * as m from '#i18n/messages.js'
  import { getMovieStore, getProjectInfo } from '#core'
  import { shortcuts } from '#lib/shortcuts.js'

  const store = getMovieStore()
  const project = getProjectInfo()
  const stats = $derived(store.getStats())

  const commandGroups = [
    {
      title: m['about.commands.navigation'](),
      items: [
        {
          icon: 'fa-magnifying-glass',
          label: m['about.commands.search'](),
          key: shortcuts.search.label,
        },
        { icon: 'fa-sliders', label: m['about.commands.filters'](), key: shortcuts.filters.label },
        { icon: 'fa-xmark', label: m['about.commands.close'](), key: shortcuts.close.label },
      ],
    },
    {
      title: m['about.commands.views'](),
      items: [
        { icon: 'fa-map', label: m['view.map'](), key: shortcuts.viewMap.label },
        { icon: 'fa-chart-simple', label: m['view.chart'](), key: shortcuts.viewChart.label },
        { icon: 'fa-diagram-project', label: m['view.graph'](), key: shortcuts.viewGraph.label },
        { icon: 'fa-table', label: m['view.table'](), key: shortcuts.viewTable.label },
        {
          icon: 'fa-location-dot',
          label: m['about.commands.cities'](),
          key: shortcuts.cities.label,
        },
      ],
    },
    {
      title: m['about.commands.actions'](),
      items: [
        {
          icon: 'fa-compress-arrows-alt',
          label: m['settings.resetView'](),
          key: shortcuts.resetView.label,
        },
        { icon: 'fa-broom', label: m['filter.clearAll'](), key: shortcuts.clearFilters.label },
        { icon: 'fa-sync-alt', label: m['settings.reload'](), key: shortcuts.reload.label },
        {
          icon: 'fa-trash-alt',
          label: m['settings.clearCache'](),
          key: shortcuts.clearCache.label,
        },
      ],
    },
  ]

  const commandCount = commandGroups.reduce((total, group) => total + group.items.length, 0)
</script>

<div class="about-content">
  <section class="project-card">
    <div class="project-head">
      <div class="project-titles">
        <h3>{project.productName}</h3>
        <p>{m['info.description']()}</p>
      </div>
      <div class="project-badges">
        <span class="badge">v{project.version}</span>
        {#if project.license}
          <span class="badge license">{project.license}</span>
        {/if}
        {#if store.mock}
          <span class="badge demo" title={m['about.demo.hint']()}>
            <i class="fas fa-flask" aria-hidden="true"></i>
            {m['about.demo.badge']()}
          </span>
        {/if}
      </div>
    </div>

    {#if project.repositoryUrl || project.homepageUrl || project.issuesUrl || project.fundingUrls.length}
      <div class="project-links">
        {#if project.repositoryUrl}
          <a href={project.repositoryUrl} target="_blank" rel="noopener noreferrer">
            <i class="fab fa-github"></i>
            <span>{m['info.repository']()}</span>
            <i class="fas fa-arrow-up-right-from-square ext"></i>
          </a>
        {/if}
        {#if project.author?.url}
          <a href={project.author.url} target="_blank" rel="noopener noreferrer">
            <i class="fas fa-user"></i>
            <span><strong>Author:</strong> <i>{project.author.name}</i></span>
            <i class="fas fa-arrow-up-right-from-square ext"></i>
          </a>
        {/if}
        {#if project.homepageUrl}
          <a href={project.homepageUrl} target="_blank" rel="noopener noreferrer">
            <i class="fas fa-globe"></i>
            <span>{m['info.homepage']()}</span>
            <i class="fas fa-arrow-up-right-from-square ext"></i>
          </a>
        {/if}
        {#if project.issuesUrl}
          <a href={project.issuesUrl} target="_blank" rel="noopener noreferrer">
            <i class="fas fa-bug"></i>
            <span>{m['info.issues']()}</span>
            <i class="fas fa-arrow-up-right-from-square ext"></i>
          </a>
        {/if}
        {#each project.fundingUrls as url (url)}
          <a class="funding" href={url} target="_blank" rel="noopener noreferrer">
            <i class="fas fa-heart"></i>
            <span>{m['info.funding']()}</span>
            <i class="fas fa-arrow-up-right-from-square ext"></i>
          </a>
        {/each}
      </div>
    {/if}
  </section>

  <details class="about-section" open>
    <summary>
      <i class="fas fa-server section-icon" aria-hidden="true"></i>
      <span class="section-title">{m['info.instance']()}</span>
      <span class="section-count">{stats.total}</span>
      <i class="fas fa-chevron-down section-chevron" aria-hidden="true"></i>
    </summary>
    <div class="section-body">
      <div class="stats">
        <div class="stat">
          <span>{m['info.server']()}</span>
          <strong class="url">
            {store.mock ? m['about.demo.server']() : store.serverURL || '---'}
          </strong>
        </div>
        <div class="stat">
          <span>{m['stats.movies']()}</span>
          <strong>{stats.movies}</strong>
        </div>
        <div class="stat">
          <span>{m['stats.series']()}</span>
          <strong>{stats.series}</strong>
        </div>
        <div class="stat">
          <span>{m['info.media']()}</span>
          <strong>{stats.total}</strong>
        </div>
      </div>
    </div>
  </details>

  <details class="about-section">
    <summary>
      <i class="fas fa-map section-icon" aria-hidden="true"></i>
      <span class="section-title">{m['map.info.title']()}</span>
      <span class="section-count">{stats.countries}</span>
      <i class="fas fa-chevron-down section-chevron" aria-hidden="true"></i>
    </summary>
    <div class="section-body">
      <div class="sidebar-info" role="region" aria-label={m['map.info.title']()}>
        <p><i class="fas fa-circle" aria-hidden="true"></i> {m['map.info.countries']()}</p>
        <p><i class="fas fa-draw-polygon" aria-hidden="true"></i> {m['map.info.borders']()}</p>
        <p><i class="fas fa-location-dot" aria-hidden="true"></i> {m['map.info.cities']()}</p>
      </div>
    </div>
  </details>

  <details class="about-section">
    <summary>
      <i class="fas fa-keyboard section-icon" aria-hidden="true"></i>
      <span class="section-title">{m['about.shortcuts']()}</span>
      <span class="section-count">{commandCount}</span>
      <i class="fas fa-chevron-down section-chevron" aria-hidden="true"></i>
    </summary>
    <div class="section-body">
      <div class="command-groups">
        {#each commandGroups as group (group.title)}
          <div class="command-group">
            <h4 class="command-group-title">{group.title}</h4>
            {#each group.items as item (item.label)}
              <div class="command-row">
                <i class="fas {item.icon}" aria-hidden="true"></i>
                <span class="command-label">{item.label}</span>
                <kbd class="shortcut">{item.key}</kbd>
              </div>
            {/each}
          </div>
        {/each}
      </div>
      <p class="command-hint">{m['about.commands.hint']()}</p>
    </div>
  </details>

  <details class="about-section">
    <summary>
      <i class="fas fa-database section-icon" aria-hidden="true"></i>
      <span class="section-title">{m['about.data']()}</span>
      <i class="fas fa-chevron-down section-chevron" aria-hidden="true"></i>
    </summary>
    <div class="section-body">
      <ul class="sources">
        <li>
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
          >
            {m['about.source.osm']()}
            <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>
          </a>
        </li>
        <li>
          <a
            href="https://www.naturalearthdata.com/about/terms-of-use/"
            target="_blank"
            rel="noopener noreferrer"
          >
            {m['about.source.naturalEarth']()}
            <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>
          </a>
        </li>
        <li>
          <a
            href="https://github.com/aourednik/historical-basemaps"
            target="_blank"
            rel="noopener noreferrer"
          >
            {m['about.source.historical']()}
            <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>
          </a>
        </li>
        <li>
          <a href="https://www.wikidata.org/" target="_blank" rel="noopener noreferrer">
            {m['about.source.wikidata']()}
            <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>
          </a>
        </li>
        <li>
          <a href="https://www.wikipedia.org/" target="_blank" rel="noopener noreferrer">
            {m['about.source.wikipedia']()}
            <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>
          </a>
        </li>
      </ul>
    </div>
  </details>
</div>

<style>
  .about-content {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 0 2px 4px;
  }

  .project-card {
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--card);
    overflow: hidden;
  }

  .project-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 14px 12px;
  }

  .project-titles {
    min-width: 0;
  }

  .project-titles h3 {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.2px;
  }

  .project-titles p {
    margin-top: 2px;
    font-size: 11px;
    line-height: 1.5;
    color: var(--text-muted);
    overflow-wrap: anywhere;
  }

  .project-badges {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 5px;
    flex-shrink: 0;
  }

  .badge {
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--accent-dim);
    color: var(--accent);
    font-size: 10px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .badge.license {
    background: var(--teal-dim);
    color: var(--teal);
  }

  .badge.demo {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: var(--yellow-dim, var(--accent-dim));
    color: var(--yellow, var(--accent));
  }

  .badge.demo i {
    font-size: 9px;
  }

  .project-links {
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--border);
  }

  .project-links a {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 10px 14px;
    color: var(--text);
    font-size: 12px;
    font-weight: 500;
    text-decoration: none;
    transition: background 0.15s;
  }

  .project-links a + a {
    border-top: 1px solid var(--border);
  }

  .project-links a:hover {
    background: var(--card-hover);
    color: var(--accent);
  }

  .project-links a > i:first-child {
    width: 15px;
    color: var(--accent);
    font-size: 12px;
    text-align: center;
  }

  .project-links a.funding > i:first-child {
    color: var(--red);
  }

  .project-links .ext {
    margin-left: auto;
    color: var(--text-muted);
    font-size: 9px;
  }

  .about-section {
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--card);
    overflow: hidden;
  }

  .about-section summary {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 12px 14px;
    list-style: none;
    cursor: pointer;
    transition: background 0.15s;
  }

  .about-section summary::-webkit-details-marker {
    display: none;
  }

  .about-section summary:hover {
    background: var(--card-hover);
  }

  .about-section summary:focus-visible {
    outline: 3px solid var(--focus-ring);
    outline-offset: -3px;
  }

  .about-section[open] summary {
    border-bottom: 1px solid var(--border);
  }

  .section-icon {
    width: 15px;
    color: var(--accent);
    font-size: 12px;
    text-align: center;
    flex-shrink: 0;
  }

  .section-title {
    flex: 1;
    min-width: 0;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1.1px;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .about-section[open] .section-title {
    color: var(--text);
  }

  .section-count {
    flex-shrink: 0;
    padding: 1px 7px;
    border-radius: 999px;
    background: var(--accent-dim);
    color: var(--accent);
    font-size: 10px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .section-chevron {
    flex-shrink: 0;
    font-size: 10px;
    color: var(--text-muted);
    transition: transform 0.18s ease;
  }

  .about-section[open] .section-chevron {
    transform: rotate(180deg);
  }

  .section-body {
    padding: 12px 14px 14px;
  }

  .stats {
    display: flex;
    flex-direction: column;
  }

  .stat {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 2px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .stat + .stat {
    border-top: 1px solid var(--border);
  }

  .stat strong {
    color: var(--text);
    font-weight: 600;
    max-width: 60%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .stat .url {
    color: var(--accent);
  }

  .sidebar-info {
    padding: 10px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--text-muted);
    border-radius: 10px;
    /* background: var(--surface); */
  }
  .sidebar-info p {
    margin: 5px 0;
  }
  .sidebar-info i {
    width: 14px;
    margin-right: 5px;
    color: var(--accent);
    font-size: 11px;
  }

  .command-groups {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .command-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .command-group-title {
    margin-bottom: 3px;
    padding: 0 8px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .command-row {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 7px 8px;
    border-radius: 8px;
    font-size: 12px;
    color: var(--text);
  }

  .command-row:hover {
    background: var(--card-hover);
  }

  .command-row > i {
    width: 15px;
    color: var(--accent);
    font-size: 11px;
    text-align: center;
    flex-shrink: 0;
  }

  .command-label {
    flex: 1;
    min-width: 0;
  }

  .shortcut {
    flex-shrink: 0;
    padding: 1px 7px;
    border: 1px solid var(--border);
    border-radius: 5px;
    background: var(--surface);
    color: var(--text-muted);
    font-family: inherit;
    font-size: 10px;
    line-height: 1.5;
    white-space: nowrap;
  }

  .command-hint {
    margin-top: 10px;
    padding: 0 8px;
    font-size: 11px;
    line-height: 1.45;
    color: var(--text-muted);
  }

  .sources {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 2px;
  }

  .sources a {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 9px 10px;
    border-radius: 9px;
    color: var(--text);
    font-size: 12px;
    text-decoration: none;
    transition: background 0.15s;
  }

  .sources a:hover {
    background: var(--card-hover);
  }

  .sources a i {
    color: var(--text-muted);
    font-size: 10px;
  }

  @media (prefers-reduced-motion: reduce) {
    .section-chevron,
    .project-links a,
    .about-section summary,
    .sources a {
      transition: none;
    }
  }
</style>
