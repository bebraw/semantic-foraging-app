import { describeArtifactRevisionChanges } from "../domain/agents/artifact-agent";
import type { HomeScreenModel, SemanticTableColumn } from "../domain/contracts/screen";
import { escapeHtml } from "./shared";
import { renderPage } from "./render-page";

export function renderHomePage(screen: HomeScreenModel): string {
  const supportsMapEnhancement = screen.mapView.features.length > 0;
  const heading = screen.title
    ? `<h1 class="mt-2 text-[clamp(1.85rem,5vw,3.1rem)] leading-[0.94] font-semibold tracking-[-0.05em]">${escapeHtml(screen.title)}</h1>`
    : "";
  const body = `<main class="min-h-screen px-5 py-5 sm:px-8 sm:py-6 lg:px-10">
    <div class="mx-auto flex max-w-6xl flex-col gap-6 sm:gap-8">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-app-accent">${escapeHtml(screen.eyebrow)}</p>
          ${heading}
        </div>
        <p class="max-w-xl text-sm leading-6 text-app-text-soft">${escapeHtml(screen.description)}</p>
      </header>
      ${renderSearchSurface(screen)}
      ${renderAlerts(screen.alerts)}
      ${renderPresentationSection(screen)}
      ${renderSupportRail(screen)}
    </div>
  </main>`;

  return renderPage({
    title: screen.title || screen.eyebrow,
    body,
    traceId: screen.meta.traceId,
    stylesheets: supportsMapEnhancement ? ["/vendor/leaflet.css"] : [],
    scriptUrls: supportsMapEnhancement ? ["/vendor/leaflet.js"] : [],
    scripts: [renderViewSwitchScript(), ...(supportsMapEnhancement ? [renderMapEnhancementScript()] : [])],
  });
}

function renderSearchSurface(screen: HomeScreenModel): string {
  const statusCopy = screen.presentation.primaryKind === "empty" ? screen.presentation.emptyState : "";
  const exampleFieldName = `${screen.searchPrompt.rawInputName}Example`;

  return `<section class="max-w-4xl">
    <div class="sticky top-0 z-10 rounded-[1.5rem] border border-app-line bg-app-canvas/92 px-3 py-3 shadow-[var(--shadow-panel)] supports-[backdrop-filter]:bg-app-canvas/72 backdrop-blur-xl">
      <form method="post" action="${escapeHtml(screen.searchPrompt.actionPath)}" class="grid gap-2.5">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label class="block min-w-0 flex-1" for="semantic-query">
            <span class="sr-only">${escapeHtml(screen.searchPrompt.rawInputLabel)}</span>
            <input
              id="semantic-query"
              name="${escapeHtml(screen.searchPrompt.rawInputName)}"
              type="search"
              autocomplete="off"
              spellcheck="false"
              placeholder="${escapeHtml(screen.searchPrompt.rawInputPlaceholder)}"
              value="${escapeHtml(screen.searchPrompt.rawInputValue)}"
              class="w-full rounded-[1.25rem] bg-app-surface px-4 py-3 text-lg text-app-text outline-none ring-1 ring-app-line transition placeholder:text-app-text-soft/72 focus:bg-app-canvas focus:ring-2 focus:ring-app-accent/35"
            >
          </label>
          <button class="rounded-full bg-app-ink px-4 py-3 text-sm font-semibold text-app-ink-text sm:shrink-0" type="submit">${escapeHtml(
            screen.searchPrompt.submitLabel,
          )}</button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          ${screen.searchPrompt.examples
            .map(
              (example) =>
                `<button class="rounded-full border border-app-line bg-app-surface px-3 py-2 text-sm text-app-text-soft" type="submit" name="${escapeHtml(
                  exampleFieldName,
                )}" value="${escapeHtml(example)}">${escapeHtml(example)}</button>`,
            )
            .join("")}
        </div>
      </form>
      ${
        statusCopy
          ? `<div id="search-status" class="mt-2 flex flex-wrap items-center gap-3 text-sm leading-6 text-app-text-soft">
              <span>${escapeHtml(statusCopy)}</span>
            </div>`
          : ""
      }
    </div>
  </section>`;
}

function renderSearchMeta(screen: HomeScreenModel): string {
  const submission = screen.intentWorkbench.latestSubmission;

  if (!submission) {
    return "";
  }

  const cueSummary = summarizeCues(submission.classification.cues);
  const missing = submission.classification.missing.join(", ") || "none";

  return `<span class="rounded-full border border-app-line bg-app-surface px-3 py-1">${escapeHtml(submission.classification.intent)}</span>
    <span class="rounded-full border border-app-line bg-app-surface px-3 py-1">${escapeHtml(submission.confidenceBand)}</span>
    <span class="rounded-full border border-app-line bg-app-surface px-3 py-1">${escapeHtml(`missing: ${missing}`)}</span>
    ${cueSummary.length > 0 ? `<span class="rounded-full border border-app-line bg-app-surface px-3 py-1">${escapeHtml(cueSummary)}</span>` : ""}`;
}

function renderAlerts(alerts: HomeScreenModel["alerts"]): string {
  if (alerts.length === 0) {
    return "";
  }

  return `<ul class="grid gap-3 max-w-4xl">
    ${alerts
      .map(
        (alert) =>
          `<li class="rounded-[1.4rem] border px-4 py-3 ${alert.tone === "error" ? "border-rose-200 bg-rose-50/80 text-rose-950" : "border-sky-200 bg-sky-50/80 text-sky-950"}">
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em]">${escapeHtml(alert.title)}</p>
            <p class="mt-2 leading-7">${escapeHtml(alert.body)}</p>
          </li>`,
      )
      .join("")}
  </ul>`;
}

function renderPresentationSection(screen: HomeScreenModel): string {
  return `<section class="grid gap-4" data-presentation-kind="${escapeHtml(screen.presentation.primaryKind)}">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div class="max-w-3xl">
        <h2 class="text-[clamp(1.45rem,4vw,2.35rem)] leading-[0.98] font-semibold tracking-[-0.04em]">${escapeHtml(screen.presentation.title)}</h2>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-app-text-soft sm:text-base sm:leading-7">${escapeHtml(screen.presentation.summary)}</p>
      </div>
      ${renderComponentPalette(screen)}
    </div>
    ${renderDebugPanel(screen)}
    ${renderPrimaryPresentation(screen)}
  </section>`;
}

function renderComponentPalette(screen: HomeScreenModel): string {
  const orderedComponents = [...screen.presentation.components].sort(compareComponentPaletteOrder);

  return `<ul class="flex flex-wrap gap-2" aria-label="Semantic result components">
    ${orderedComponents
      .map(
        (component) =>
          `<li>${renderComponentPaletteItem(screen, component)}</li>`,
      )
      .join("")}
  </ul>`;
}

function renderComponentPaletteItem(screen: HomeScreenModel, component: HomeScreenModel["presentation"]["components"][number]): string {
  const className = `rounded-full border px-3 py-2 text-sm ${component.selected ? "border-app-accent bg-app-accent-ghost text-app-accent-strong" : "border-app-line bg-app-surface text-app-text-soft"}`;
  const sharedAttributes = `title="${escapeHtml(component.reason)}" data-semantic-component="${escapeHtml(component.kind)}" data-component-selected="${component.selected ? "true" : "false"}" data-component-signals="${escapeHtml(component.signals.join(","))}"`;
  const href = buildPresentationComponentHref(screen, component.kind);

  if (!href) {
    return `<span class="${className}" ${sharedAttributes}>
      <span class="font-medium">${escapeHtml(component.title)}</span>
    </span>`;
  }

  return `<a class="${className}" href="${escapeHtml(href)}" data-component-link="true" ${sharedAttributes}>
    <span class="font-medium">${escapeHtml(component.title)}</span>
  </a>`;
}

function buildPresentationComponentHref(
  screen: HomeScreenModel,
  kind: HomeScreenModel["presentation"]["components"][number]["kind"],
): string | null {
  const query = screen.searchPrompt.rawInputValue.trim();

  if (!query || kind === "empty" || kind === "clarification") {
    return null;
  }

  const url = new URL("http://local/");
  url.searchParams.set("q", query);
  url.searchParams.set("view", kind);

  return `${url.pathname}${url.search}`;
}

function compareComponentPaletteOrder(
  left: HomeScreenModel["presentation"]["components"][number],
  right: HomeScreenModel["presentation"]["components"][number],
): number {
  const rank = (kind: HomeScreenModel["presentation"]["components"][number]["kind"]) => {
    switch (kind) {
      case "map":
        return 1;
      case "cards":
        return 2;
      case "table":
        return 3;
      case "prose":
        return 4;
      case "empty":
        return 5;
      case "clarification":
        return 6;
    }
  };

  return rank(left.kind) - rank(right.kind);
}

function renderViewSwitchScript(): string {
  return `
(() => {
  const currentOrigin = window.location.origin;

  const swapMain = (documentText) => {
    const parser = new DOMParser();
    const nextDocument = parser.parseFromString(documentText, "text/html");
    const nextMain = nextDocument.querySelector("main");
    const currentMain = document.querySelector("main");

    if (!nextMain || !currentMain) {
      throw new Error("Expected a main element in the fetched document.");
    }

    document.title = nextDocument.title;
    document.body.dataset.traceId = nextDocument.body.dataset.traceId ?? "";
    currentMain.replaceWith(nextMain);

    window.__semanticForagingInitMap?.();
  };

  const navigate = async (href, pushHistory) => {
    const url = new URL(href, window.location.href);

    if (url.origin !== currentOrigin || url.pathname !== "/") {
      window.location.assign(url.href);
      return;
    }

    const response = await fetch(url.href, {
      headers: {
        accept: "text/html",
        "x-semantic-foraging-nav": "view-switch",
      },
    });

    if (!response.ok) {
      window.location.assign(url.href);
      return;
    }

    swapMain(await response.text());

    if (pushHistory) {
      window.history.pushState({ href: url.href }, "", url.href);
    }
  };

  if (!window.__semanticForagingViewSwitchBound) {
    window.__semanticForagingViewSwitchBound = true;

    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target.closest("a[data-component-link='true']") : null;

      if (!target) {
        return;
      }

      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      event.preventDefault();
      navigate(target.href, true).catch(() => {
        window.location.assign(target.href);
      });
    });

    window.addEventListener("popstate", () => {
      navigate(window.location.href, false).catch(() => {
        window.location.reload();
      });
    });
  }
})();
`.trim();
}

function renderDebugPanel(screen: HomeScreenModel): string {
  if (!screen.intentWorkbench.latestSubmission) {
    return "";
  }

  return `<details class="fixed top-24 right-0 z-30 flex max-w-[min(22rem,calc(100vw-1rem))] flex-row-reverse items-start" data-debug-panel>
    <summary class="mt-5 rounded-l-[1rem] border border-app-line border-r-0 bg-app-surface/96 px-2 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-app-text shadow-[var(--shadow-panel)] backdrop-blur-xl [writing-mode:vertical-rl]" data-debug-toggle>Debug</summary>
    <div class="w-[min(20rem,calc(100vw-3rem))] rounded-l-[1.3rem] border border-app-line bg-app-surface/96 px-4 py-4 text-sm text-app-text-soft shadow-[var(--shadow-panel)] backdrop-blur-xl">
      <p class="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-app-text">Debug details</p>
      <p class="mt-2 text-xs leading-5 text-app-text-soft">Intent, confidence, and semantic mapping signals.</p>
      <div class="mt-3 grid gap-3">
      <div class="flex flex-wrap gap-2" data-debug-search-meta>
        ${renderSearchMeta(screen)}
      </div>
      ${renderSignalList(screen.presentation.signals)}
      </div>
    </div>
  </details>`;
}

function renderSignalList(signals: HomeScreenModel["presentation"]["signals"]): string {
  return `<ul class="flex flex-wrap gap-2 text-sm text-app-text-soft" data-debug-signal-list>
    ${signals
      .map(
        (signal) =>
          `<li class="rounded-full border border-app-line bg-app-surface px-3 py-2" title="${escapeHtml(signal.reason)}">${escapeHtml(
            `${signal.kind}: ${signal.value}`,
          )}</li>`,
      )
      .join("")}
  </ul>`;
}

function renderPrimaryPresentation(screen: HomeScreenModel): string {
  switch (screen.presentation.primaryKind) {
    case "empty":
      return renderEmptyState(screen);
    case "clarification":
      return renderClarificationPanel(screen);
    case "map":
      return renderMapPresentation(screen);
    case "cards":
      return renderCardsPresentation(screen);
    case "table":
      return renderTablePresentation(screen);
    case "prose":
      return renderProsePresentation(screen);
  }
}

function renderEmptyState(screen: HomeScreenModel): string {
  return `<div class="grid gap-4 rounded-[1.8rem] border border-app-line bg-app-surface p-6">
    <p class="max-w-2xl text-base leading-7 text-app-text-soft">${escapeHtml(screen.presentation.emptyState)}</p>
    <ul class="grid gap-3 md:grid-cols-3">
      ${screen.searchPrompt.examples
        .map(
          (example) =>
            `<li class="rounded-[1.3rem] border border-app-line bg-app-canvas px-4 py-4 text-sm leading-6 text-app-text-soft">${escapeHtml(example)}</li>`,
        )
        .join("")}
    </ul>
  </div>`;
}

function renderClarificationPanel(screen: HomeScreenModel): string {
  const workflow = screen.intentWorkbench.latestSubmission?.workflow;

  if (!workflow || workflow.state !== "awaiting_clarification") {
    return renderEmptyState(screen);
  }

  return `<div class="grid gap-5 rounded-[1.8rem] border border-app-line bg-app-surface p-6">
    <div>
      <p class="text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-app-text-soft">Clarification</p>
      <p class="mt-3 max-w-2xl text-lg leading-8 text-app-text">${escapeHtml(workflow.question)}</p>
    </div>
    <ul class="flex flex-wrap gap-2 text-sm text-app-text-soft">
      ${workflow.options.map((option) => `<li class="rounded-full border border-app-line bg-app-canvas px-3 py-2">${escapeHtml(option)}</li>`).join("")}
    </ul>
    <form class="grid gap-3 max-w-2xl" method="post" action="${escapeHtml(screen.intentWorkbench.clarificationActionPath)}">
      <input type="hidden" name="${escapeHtml(screen.intentWorkbench.clarificationWorkflowIdName)}" value="${escapeHtml(workflow.workflowId)}">
      <label class="grid gap-2">
        <span class="text-sm font-medium text-app-text">${escapeHtml(screen.intentWorkbench.clarificationLabel)}</span>
        <input
          class="rounded-[1.2rem] border border-app-line bg-app-canvas px-4 py-3 text-base text-app-text"
          type="text"
          name="${escapeHtml(screen.intentWorkbench.clarificationName)}"
          value="${escapeHtml(screen.intentWorkbench.clarificationValue)}"
          placeholder="${escapeHtml(screen.intentWorkbench.clarificationPlaceholder)}"
        >
      </label>
      <div>
        <button class="rounded-full bg-app-ink px-4 py-2 text-sm font-semibold text-app-ink-text" type="submit">Continue search</button>
      </div>
    </form>
  </div>`;
}

function renderMapPresentation(screen: HomeScreenModel): string {
  if (screen.mapView.features.length === 0) {
    return renderEmptyState(screen);
  }

  const initialFeature = screen.mapView.features[0] ?? null;
  const overlay = screen.mapView.overlays[0];
  const width = screen.mapView.viewport.width;
  const height = screen.mapView.viewport.height;
  const bounds = screen.mapView.viewport.bounds;
  const serializedMapState = serializeMapClientState(screen.mapView);
  const mapMarkup = screen.mapView.features
    .map((feature) => renderMapFeature(feature, width, height, bounds, feature.id === initialFeature?.id))
    .join("");
  const overlayMarkup =
    overlay?.status === "ready" ? overlay.points.map((point) => renderOverlayPoint(point, width, height, bounds)).join("") : "";

  return `<div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_22rem]" data-map-root data-map-location="idle" data-map-state="${escapeHtml(
    serializedMapState,
  )}" data-map-active-id="${escapeHtml(initialFeature?.id ?? "")}">
    <div class="grid content-start gap-4 self-start rounded-[1.8rem] border border-app-line bg-app-surface p-4">
      <div class="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <p class="text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-app-text-soft">${escapeHtml(screen.mapView.title)}</p>
          <p class="mt-2 text-sm leading-6 text-app-text-soft">${escapeHtml(screen.mapView.viewport.frameLabel)}</p>
        </div>
        <div class="flex items-center gap-2" data-map-zoom-controls hidden>
          <button class="rounded-full border border-app-line bg-app-canvas px-3 py-2 text-sm text-app-text" type="button" data-map-zoom-out aria-label="Zoom out">-</button>
          <button class="rounded-full border border-app-line bg-app-canvas px-3 py-2 text-sm text-app-text" type="button" data-map-zoom-in aria-label="Zoom in">+</button>
          <span class="rounded-full border border-app-line bg-app-canvas px-3 py-2 text-sm text-app-text-soft" data-map-browser-zoom></span>
        </div>
      </div>
      <div class="grid content-start gap-3">
        <div class="relative hidden overflow-hidden rounded-[1.4rem] border border-app-line bg-app-canvas" data-map-browser-frame data-map-mode="fallback" hidden>
          <div class="flex items-center justify-between gap-3 border-b border-app-line px-4 py-3" data-map-browser-chrome>
            <p class="text-sm font-medium text-app-text" data-map-browser-source>${escapeHtml(screen.mapView.basemap.label)}</p>
            <p class="text-xs text-app-text-soft" data-map-browser-attribution>${escapeHtml(screen.mapView.basemap.attribution)}</p>
          </div>
          <div class="h-[420px] w-full" data-map-leaflet></div>
        </div>
        <div class="overflow-hidden rounded-[1.4rem] border border-app-line bg-app-canvas" data-map-fallback>
          <svg viewBox="0 0 ${width} ${height}" class="h-auto w-full" role="img" aria-label="${escapeHtml(screen.mapView.viewport.frameLabel)}">
            <rect width="${width}" height="${height}" fill="rgb(247 250 254)"/>
            ${renderMapGraticule(width, height, bounds)}
            ${overlayMarkup}
            ${mapMarkup}
          </svg>
        </div>
        <div class="flex flex-wrap items-center gap-3 px-1">
          <button class="rounded-full border border-app-line bg-app-canvas px-4 py-2 text-sm font-medium text-app-text" type="button" data-map-locate>${escapeHtml(
            screen.mapView.locationControl.actionLabel,
          )}</button>
          <p class="text-sm leading-6 text-app-text-soft" data-map-location-status>${escapeHtml(screen.mapView.locationControl.idleLabel)}</p>
        </div>
      </div>
    </div>
    <aside class="grid gap-4 rounded-[1.8rem] border border-app-line bg-app-surface p-5">
      <div class="grid gap-2 rounded-[1.3rem] border border-app-line bg-app-canvas px-4 py-4">
        <p class="text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-app-text-soft" data-map-detail-meta>${escapeHtml(
          formatMapDetailMeta(initialFeature),
        )}</p>
        <h3 class="text-xl font-semibold tracking-[-0.03em]" data-map-detail-label>${escapeHtml(initialFeature?.label ?? "")}</h3>
        <p class="text-sm leading-7 text-app-text-soft" data-map-detail-summary>${escapeHtml(initialFeature?.summary ?? "")}</p>
        <p class="text-sm leading-7 text-app-text" data-map-detail-evidence>${escapeHtml(initialFeature?.evidenceSummary ?? "")}</p>
      </div>
      <div>
        <p class="text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-app-text-soft">${escapeHtml(screen.mapView.legendTitle)}</p>
        <ul class="mt-3 grid gap-3">
          ${screen.mapView.features
            .map(
              (feature) =>
                `<li>
                  <button
                    class="w-full rounded-[1.3rem] border border-app-line bg-app-canvas px-4 py-4 text-left"
                    type="button"
                    data-map-item="${escapeHtml(feature.id)}"
                    data-map-label="${escapeHtml(feature.label)}"
                    data-map-kind="${escapeHtml(feature.kind)}"
                    data-map-source="${escapeHtml(feature.sourceSection)}"
                    data-map-summary="${escapeHtml(feature.summary)}"
                    data-map-evidence="${escapeHtml(feature.evidenceSummary)}"
                    data-map-active="${feature.id === initialFeature?.id ? "true" : "false"}"
                    aria-pressed="${feature.id === initialFeature?.id ? "true" : "false"}"
                  >
                    <p class="text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-app-text-soft">${escapeHtml(
                      `${feature.kind} / ${feature.sourceSection}`,
                    )}</p>
                    <p class="mt-2 font-medium text-app-text">${escapeHtml(feature.label)}</p>
                    <p class="mt-2 text-sm leading-6 text-app-text-soft">${escapeHtml(feature.evidenceSummary)}</p>
                  </button>
                </li>`,
            )
            .join("")}
        </ul>
      </div>
      <div class="rounded-[1.3rem] border border-app-line bg-app-canvas px-4 py-4">
        <p class="text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-app-text-soft">${escapeHtml(screen.mapView.basemap.label)}</p>
        <p class="mt-2 text-sm leading-6 text-app-text-soft">${escapeHtml(formatBoundsLabel(screen.mapView.viewport.bounds))}</p>
        ${
          overlay
            ? `<p class="mt-3 text-sm leading-6 text-app-text-soft">${escapeHtml(`${overlay.label} / ${overlay.provider}: ${overlay.note}`)}</p>`
            : ""
        }
      </div>
      ${renderCompactCandidateCards(screen, 2)}
    </aside>
  </div>`;
}

function renderCardsPresentation(screen: HomeScreenModel): string {
  if (screen.candidateCards.length === 0) {
    return renderEmptyState(screen);
  }

  return `<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    ${screen.candidateCards.map((card) => renderCandidateCard(card, screen)).join("")}
  </div>`;
}

function renderTablePresentation(screen: HomeScreenModel): string {
  if (!screen.presentation.table) {
    return renderCardsPresentation(screen);
  }

  return `<div class="grid gap-5">
    <div class="overflow-hidden rounded-[1.8rem] border border-app-line bg-app-surface">
      <div class="border-b border-app-line px-5 py-4">
        <p class="text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-app-text-soft">${escapeHtml(screen.presentation.table.title)}</p>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-app-text-soft">${escapeHtml(screen.presentation.table.description)}</p>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full text-left">
          <thead>
            <tr class="border-b border-app-line text-[0.72rem] uppercase tracking-[0.24em] text-app-text-soft">
              <th class="px-5 py-4 font-semibold">Species</th>
              ${screen.presentation.table.columns.map((column) => renderTableHeaderCell(column)).join("")}
            </tr>
          </thead>
          <tbody>
            ${screen.presentation.table.rows
              .map(
                (row) =>
                  `<tr class="border-b border-app-line last:border-b-0" data-table-row="${escapeHtml(row.id)}">
                    <th class="px-5 py-4 text-sm font-semibold text-app-text">${escapeHtml(row.label)}</th>
                    ${screen.presentation.table?.columns.map((column) => renderTableValueCell(column, row.cells[column.key] ?? "")).join("")}
                  </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
    ${renderCompactCandidateCards(screen, 3)}
  </div>`;
}

function renderTableHeaderCell(column: SemanticTableColumn): string {
  return `<th class="px-5 py-4 font-semibold ${column.align === "end" ? "text-right" : "text-left"}">${escapeHtml(column.label)}</th>`;
}

function renderTableValueCell(column: SemanticTableColumn, value: string): string {
  return `<td class="px-5 py-4 text-sm leading-6 text-app-text-soft ${column.align === "end" ? "text-right" : "text-left"}">${escapeHtml(
    value,
  )}</td>`;
}

function renderProsePresentation(screen: HomeScreenModel): string {
  return `<div class="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_22rem]">
    <div class="grid gap-4 rounded-[1.8rem] border border-app-line bg-app-surface p-6">
      ${screen.presentation.prose
        .map((paragraph) => `<p class="max-w-3xl text-base leading-8 text-app-text-soft">${escapeHtml(paragraph)}</p>`)
        .join("")}
    </div>
    <aside class="grid gap-4">
      ${renderCompactCandidateCards(screen, 3)}
    </aside>
  </div>`;
}

function renderCompactCandidateCards(screen: HomeScreenModel, limit: number): string {
  if (screen.candidateCards.length === 0) {
    return "";
  }

  return `<div class="grid gap-3">
    ${screen.candidateCards
      .slice(0, limit)
      .map((card) => renderCandidateCard(card, screen, true))
      .join("")}
  </div>`;
}

function renderCandidateCard(card: HomeScreenModel["candidateCards"][number], screen: HomeScreenModel, compact = false): string {
  const completedIntent =
    screen.intentWorkbench.latestSubmission?.workflow.state === "completed" ? screen.intentWorkbench.latestSubmission : null;

  return `<article class="grid gap-4 rounded-[1.5rem] border border-app-line bg-app-surface p-5" data-card-id="${escapeHtml(card.id)}">
    <div class="flex flex-wrap items-center gap-2 text-sm">
      <span class="rounded-full bg-app-accent-ghost px-3 py-1 font-medium text-app-accent-strong">${escapeHtml(card.kind)}</span>
      <span class="text-app-text-soft">${escapeHtml(card.statusLabel)}</span>
    </div>
    <div>
      <h3 class="text-xl font-semibold tracking-[-0.03em]">${escapeHtml(card.title)}</h3>
      <p class="mt-2 text-sm leading-7 text-app-text-soft">${escapeHtml(card.summary)}</p>
    </div>
    ${compact ? "" : renderEvidenceList(card.evidence)}
    ${renderArtifactSaveForm(card, completedIntent, screen.artifactWorkbench.saveActionPath)}
  </article>`;
}

function renderEvidenceList(evidence: HomeScreenModel["candidateCards"][number]["evidence"]): string {
  if (evidence.length === 0) {
    return "";
  }

  return `<dl class="grid gap-3">
    ${evidence
      .map(
        (note) =>
          `<div class="border-l-2 border-app-line pl-4">
            <dt class="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-app-text-soft">${escapeHtml(note.label)}</dt>
            <dd class="mt-1 text-sm leading-7 text-app-text">${escapeHtml(note.detail)}</dd>
          </div>`,
      )
      .join("")}
  </dl>`;
}

function renderSupportRail(screen: HomeScreenModel): string {
  if (
    screen.savedArtifacts.length === 0 &&
    screen.recentSessions.length === 0 &&
    screen.explanationWorkbench.latestSubmission === undefined &&
    screen.explanationWorkbench.titleValue.length === 0 &&
    screen.explanationWorkbench.factsValue.length === 0
  ) {
    return "";
  }

  return `<section class="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_22rem]">
    <div class="grid gap-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-app-text-soft">${escapeHtml(screen.savedArtifactsTitle)}</p>
          <h2 class="mt-2 text-2xl font-semibold tracking-[-0.04em] text-app-text">Saved artifacts</h2>
        </div>
      </div>
      ${screen.savedArtifacts.length > 0 ? renderSavedArtifacts(screen) : `<p class="text-sm text-app-text-soft">${escapeHtml(screen.savedArtifactsEmptyState)}</p>`}
      ${renderExplanationWorkbench(screen)}
    </div>
    <aside class="grid gap-4 rounded-[1.8rem] border border-app-line bg-app-surface p-5">
      <div>
        <p class="text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-app-text-soft">${escapeHtml(screen.recentSessionsTitle)}</p>
        <h2 class="mt-2 text-2xl font-semibold tracking-[-0.04em] text-app-text">Recent searches</h2>
      </div>
      ${
        screen.recentSessions.length > 0
          ? `<ul class="grid gap-3">
              ${screen.recentSessions
                .map(
                  (session) =>
                    `<li class="rounded-[1.3rem] border border-app-line bg-app-canvas px-4 py-4">
                      <p class="text-sm font-medium text-app-text">${escapeHtml(session.title)}</p>
                      <p class="mt-2 text-sm leading-6 text-app-text-soft">${escapeHtml(session.summary)}</p>
                      <p class="mt-3 text-xs uppercase tracking-[0.22em] text-app-text-soft">${escapeHtml(formatSavedAtLabel(session.savedAt))}</p>
                    </li>`,
                )
                .join("")}
            </ul>`
          : `<p class="text-sm text-app-text-soft">${escapeHtml(screen.recentSessionsEmptyState)}</p>`
      }
    </aside>
  </section>`;
}

function renderSavedArtifacts(screen: HomeScreenModel): string {
  return `<div class="grid gap-4">
    ${screen.savedArtifacts
      .map(
        (artifact) =>
          `<details class="rounded-[1.5rem] border border-app-line bg-app-surface p-5" ${artifact === screen.savedArtifacts[0] ? "open" : ""}>
            <summary class="cursor-pointer list-none">
              <div class="flex flex-wrap items-center gap-2 text-sm">
                <span class="rounded-full bg-app-accent-ghost px-3 py-1 font-medium text-app-accent-strong">${escapeHtml(artifact.kind)}</span>
                <span class="text-app-text-soft">${escapeHtml(artifact.sourceIntent)}</span>
                <span class="text-app-text-soft">${escapeHtml(formatSavedAtLabel(artifact.savedAt))}</span>
                ${artifact.updatedAt && artifact.updatedAt !== artifact.savedAt ? `<span class="text-app-text-soft">${escapeHtml(formatUpdatedAtLabel(artifact.updatedAt))}</span>` : ""}
              </div>
              <h3 class="mt-3 text-xl font-semibold tracking-[-0.03em]">${escapeHtml(artifact.title)}</h3>
              <p class="mt-2 max-w-3xl text-sm leading-7 text-app-text-soft">${escapeHtml(artifact.summary)}</p>
            </summary>
            <div class="mt-4 grid gap-4">
              ${artifact.notes ? `<p class="text-sm leading-7 text-app-text">${escapeHtml(artifact.notes)}</p>` : ""}
              ${artifact.evidence.length > 0 ? renderEvidenceList(artifact.evidence) : ""}
              <div class="flex flex-wrap items-center gap-3">
                <form method="post" action="${escapeHtml(screen.artifactWorkbench.useActionPath)}">
                  <input type="hidden" name="artifactId" value="${escapeHtml(artifact.artifactId)}">
                  <button class="rounded-full border border-app-line bg-app-canvas px-4 py-2 text-sm font-medium text-app-text" type="submit">Use in workbench</button>
                </form>
              </div>
              <form class="grid gap-3 rounded-[1.3rem] border border-app-line bg-app-canvas px-4 py-4" method="post" action="${escapeHtml(
                screen.artifactWorkbench.refineActionPath,
              )}">
                <input type="hidden" name="artifactId" value="${escapeHtml(artifact.artifactId)}">
                <label class="grid gap-2">
                  <span class="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-app-text-soft">Title</span>
                  <input class="rounded-[1rem] border border-app-line bg-app-surface px-4 py-3 text-sm text-app-text" type="text" name="title" value="${escapeHtml(
                    artifact.title,
                  )}">
                </label>
                <label class="grid gap-2">
                  <span class="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-app-text-soft">Summary</span>
                  <textarea class="min-h-24 rounded-[1rem] border border-app-line bg-app-surface px-4 py-3 text-sm leading-7 text-app-text" name="summary">${escapeHtml(
                    artifact.summary,
                  )}</textarea>
                </label>
                <label class="grid gap-2">
                  <span class="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-app-text-soft">Notes</span>
                  <textarea class="min-h-24 rounded-[1rem] border border-app-line bg-app-surface px-4 py-3 text-sm leading-7 text-app-text" name="notes">${escapeHtml(
                    artifact.notes ?? "",
                  )}</textarea>
                </label>
                <div>
                  <button class="rounded-full bg-app-ink px-4 py-2 text-sm font-semibold text-app-ink-text" type="submit">Update artifact</button>
                </div>
              </form>
              ${
                artifact.revisions.length > 1
                  ? `<div class="grid gap-3">
                      <p class="text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-app-text-soft">Revision history</p>
                      <ul class="grid gap-3">
                        ${artifact.revisions
                          .slice(-3)
                          .reverse()
                          .map(
                            (revision) =>
                              `<li class="rounded-[1.2rem] border border-app-line bg-app-canvas px-4 py-4">
                                <p class="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-app-text-soft">${escapeHtml(
                                  `${revision.kind} / ${formatRecordedAtLabel(revision.recordedAt)}`,
                                )}</p>
                                <p class="mt-2 font-medium text-app-text">${escapeHtml(revision.title)}</p>
                                <p class="mt-2 text-sm leading-6 text-app-text-soft">${escapeHtml(revision.summary)}</p>
                                ${
                                  revision.notes
                                    ? `<p class="mt-2 text-sm leading-6 text-app-text-soft">${escapeHtml(revision.notes)}</p>`
                                    : ""
                                }
                                <p class="mt-3 text-xs uppercase tracking-[0.22em] text-app-text-soft">${escapeHtml(
                                  `Diff to current: ${describeArtifactRevisionChanges(artifact, revision).join(", ")}`,
                                )}</p>
                                <div class="mt-3 flex flex-wrap gap-3">
                                  <form method="post" action="${escapeHtml(screen.artifactWorkbench.restoreActionPath)}">
                                    <input type="hidden" name="artifactId" value="${escapeHtml(artifact.artifactId)}">
                                    <input type="hidden" name="recordedAt" value="${escapeHtml(revision.recordedAt)}">
                                    <button class="rounded-full border border-app-line bg-app-surface px-4 py-2 text-sm font-medium text-app-text" type="submit">Restore revision</button>
                                  </form>
                                  <form method="post" action="${escapeHtml(screen.artifactWorkbench.useActionPath)}">
                                    <input type="hidden" name="artifactId" value="${escapeHtml(artifact.artifactId)}">
                                    <input type="hidden" name="recordedAt" value="${escapeHtml(revision.recordedAt)}">
                                    <button class="rounded-full border border-app-line bg-app-surface px-4 py-2 text-sm font-medium text-app-text" type="submit">Use revision in workbench</button>
                                  </form>
                                </div>
                              </li>`,
                          )
                          .join("")}
                      </ul>
                    </div>`
                  : ""
              }
            </div>
          </details>`,
      )
      .join("")}
  </div>`;
}

function renderExplanationWorkbench(screen: HomeScreenModel): string {
  const hasSeededValues =
    screen.explanationWorkbench.titleValue.length > 0 ||
    screen.explanationWorkbench.factsValue.length > 0 ||
    screen.explanationWorkbench.latestSubmission !== undefined;

  if (!hasSeededValues) {
    return "";
  }

  const latest = screen.explanationWorkbench.latestSubmission;

  return `<div class="grid gap-4 rounded-[1.5rem] border border-app-line bg-app-surface p-5">
    <div>
      <p class="text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-app-text-soft">Prepared explanation</p>
      <h3 class="mt-2 text-xl font-semibold tracking-[-0.03em] text-app-text">Explanation draft</h3>
    </div>
    <form class="grid gap-3" method="post" action="${escapeHtml(screen.explanationWorkbench.actionPath)}">
      <label class="grid gap-2">
        <span class="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-app-text-soft">${escapeHtml(
          screen.explanationWorkbench.titleLabel,
        )}</span>
        <input
          class="rounded-[1rem] border border-app-line bg-app-canvas px-4 py-3 text-sm text-app-text"
          type="text"
          name="${escapeHtml(screen.explanationWorkbench.titleName)}"
          value="${escapeHtml(screen.explanationWorkbench.titleValue)}"
          placeholder="${escapeHtml(screen.explanationWorkbench.titlePlaceholder)}"
        >
      </label>
      <label class="grid gap-2">
        <span class="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-app-text-soft">${escapeHtml(
          screen.explanationWorkbench.factsLabel,
        )}</span>
        <textarea
          class="min-h-24 rounded-[1rem] border border-app-line bg-app-canvas px-4 py-3 text-sm leading-7 text-app-text"
          name="${escapeHtml(screen.explanationWorkbench.factsName)}"
          placeholder="${escapeHtml(screen.explanationWorkbench.factsPlaceholder)}"
        >${escapeHtml(screen.explanationWorkbench.factsValue)}</textarea>
      </label>
      <div>
        <button class="rounded-full bg-app-ink px-4 py-2 text-sm font-semibold text-app-ink-text" type="submit">${escapeHtml(
          screen.explanationWorkbench.submitLabel,
        )}</button>
      </div>
    </form>
    ${
      latest
        ? `<div class="rounded-[1.2rem] border border-app-line bg-app-canvas px-4 py-4">
            <p class="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-app-text-soft">Latest explanation</p>
            <p class="mt-2 font-medium text-app-text">${escapeHtml(latest.title)}</p>
            <p class="mt-2 text-sm leading-7 text-app-text-soft">${escapeHtml(latest.explanation)}</p>
          </div>`
        : ""
    }
  </div>`;
}

function summarizeCues(
  cues: HomeScreenModel["intentWorkbench"]["latestSubmission"] extends infer T
    ? T extends { classification: { cues: infer C } }
      ? C
      : never
    : never,
): string {
  const parts = [
    cues.species.length > 0 ? `species ${cues.species.join(", ")}` : "",
    cues.habitat.length > 0 ? `habitat ${cues.habitat.join(", ")}` : "",
    cues.region.length > 0 ? `region ${cues.region.join(", ")}` : "",
    cues.season.length > 0 ? `season ${cues.season.join(", ")}` : "",
  ].filter(Boolean);

  return parts.join(" · ");
}

function formatSavedAtLabel(savedAt: string): string {
  const date = new Date(savedAt);

  if (Number.isNaN(date.getTime())) {
    return savedAt;
  }

  return `Saved ${date.toISOString().slice(0, 16).replace("T", " ")}`;
}

function formatUpdatedAtLabel(updatedAt: string): string {
  const date = new Date(updatedAt);

  if (Number.isNaN(date.getTime())) {
    return updatedAt;
  }

  return `Updated ${date.toISOString().slice(0, 16).replace("T", " ")}`;
}

function formatRecordedAtLabel(recordedAt: string): string {
  const date = new Date(recordedAt);

  if (Number.isNaN(date.getTime())) {
    return recordedAt;
  }

  return `Recorded ${date.toISOString().slice(0, 16).replace("T", " ")}`;
}

function renderMapFeature(
  feature: HomeScreenModel["mapView"]["features"][number],
  width: number,
  height: number,
  bounds: HomeScreenModel["mapView"]["viewport"]["bounds"],
  isActive: boolean,
): string {
  const tone = feature.sourceSection === "recent-sessions" ? "#005bbb" : "#10253f";
  const sharedAttributes = `tabindex="0" role="button" data-map-feature="${escapeHtml(feature.id)}" data-map-label="${escapeHtml(feature.label)}" data-map-kind="${escapeHtml(feature.kind)}" data-map-source="${escapeHtml(feature.sourceSection)}" data-map-summary="${escapeHtml(feature.summary)}" data-map-evidence="${escapeHtml(feature.evidenceSummary)}" data-map-active="${isActive ? "true" : "false"}"`;

  switch (feature.geometry.kind) {
    case "point": {
      const x = longitudeToFrame(feature.geometry.point.longitude, bounds, width);
      const y = latitudeToFrame(feature.geometry.point.latitude, bounds, height);

      return `<g ${sharedAttributes}>
        <circle data-map-marker-ring cx="${x}" cy="${y}" r="14" fill="white" fill-opacity="0.82" stroke="${tone}" stroke-width="2"/>
        <circle data-map-marker-core cx="${x}" cy="${y}" r="6" fill="${tone}"/>
        <text x="${x + 18}" y="${y - 10}" fill="rgba(30,26,22,0.8)" font-size="12">${escapeHtml(feature.label)}</text>
      </g>`;
    }
    case "area": {
      const ring = feature.geometry.ring
        .map((point) => `${longitudeToFrame(point.longitude, bounds, width)} ${latitudeToFrame(point.latitude, bounds, height)}`)
        .join(" L ");
      const x = longitudeToFrame(feature.geometry.center.longitude, bounds, width);
      const y = latitudeToFrame(feature.geometry.center.latitude, bounds, height);

      return `<g ${sharedAttributes}>
        <path data-map-marker-ring d="M ${ring}" fill="rgba(0,91,187,0.12)" stroke="${tone}" stroke-width="2"/>
        <circle data-map-marker-core cx="${x}" cy="${y}" r="5" fill="${tone}"/>
        <text x="${x + 22}" y="${y - 14}" fill="rgba(30,26,22,0.8)" font-size="12">${escapeHtml(feature.label)}</text>
      </g>`;
    }
    case "trail": {
      const [first, second, third] = feature.geometry.points;
      const firstX = longitudeToFrame(first.longitude, bounds, width);
      const firstY = latitudeToFrame(first.latitude, bounds, height);
      const secondX = longitudeToFrame(second.longitude, bounds, width);
      const secondY = latitudeToFrame(second.latitude, bounds, height);
      const thirdX = longitudeToFrame(third.longitude, bounds, width);
      const thirdY = latitudeToFrame(third.latitude, bounds, height);

      return `<g ${sharedAttributes}>
        <path data-map-marker-path d="M ${firstX} ${firstY} Q ${secondX} ${secondY} ${thirdX} ${thirdY}" fill="none" stroke="${tone}" stroke-width="4" stroke-linecap="round"/>
        <circle data-map-marker-core cx="${secondX}" cy="${secondY}" r="6" fill="${tone}"/>
        <text x="${secondX + 16}" y="${secondY - 14}" fill="rgba(30,26,22,0.8)" font-size="12">${escapeHtml(feature.label)}</text>
      </g>`;
    }
  }
}

function renderOverlayPoint(
  point: HomeScreenModel["mapView"]["overlays"][number]["points"][number],
  width: number,
  height: number,
  bounds: HomeScreenModel["mapView"]["viewport"]["bounds"],
): string {
  const x = longitudeToFrame(point.point.longitude, bounds, width);
  const y = latitudeToFrame(point.point.latitude, bounds, height);

  return `<g opacity="0.55">
    <circle cx="${x}" cy="${y}" r="4" fill="rgba(0,91,187,0.42)"/>
  </g>`;
}

function renderMapGraticule(width: number, height: number, bounds: HomeScreenModel["mapView"]["viewport"]["bounds"]): string {
  const longitudeStep = Math.max(1, Math.round((bounds.east - bounds.west) / 4));
  const latitudeStep = Math.max(1, Math.round((bounds.north - bounds.south) / 4));
  const longitudeLines: string[] = [];
  const latitudeLines: string[] = [];

  for (let longitude = Math.ceil(bounds.west); longitude < bounds.east; longitude += longitudeStep) {
    const x = longitudeToFrame(longitude, bounds, width);
    longitudeLines.push(`<line x1="${x}" y1="32" x2="${x}" y2="${height - 24}" />`);
    longitudeLines.push(`<text x="${x + 6}" y="48">${escapeHtml(`${longitude}°E`)}</text>`);
  }

  for (let latitude = Math.ceil(bounds.south); latitude < bounds.north; latitude += latitudeStep) {
    const y = latitudeToFrame(latitude, bounds, height);
    latitudeLines.push(`<line x1="36" y1="${y}" x2="${width - 32}" y2="${y}" />`);
    latitudeLines.push(`<text x="44" y="${y - 6}">${escapeHtml(`${latitude}°N`)}</text>`);
  }

  return `<g stroke="rgba(30,26,22,0.08)" stroke-dasharray="4 8" fill="rgba(30,26,22,0.45)" font-size="12">
    ${longitudeLines.join("")}
    ${latitudeLines.join("")}
  </g>`;
}

function formatBoundsLabel(bounds: HomeScreenModel["mapView"]["viewport"]["bounds"]): string {
  return `${bounds.west.toFixed(2)}°E to ${bounds.east.toFixed(2)}°E / ${bounds.south.toFixed(2)}°N to ${bounds.north.toFixed(2)}°N`;
}

function formatMapDetailMeta(feature: HomeScreenModel["mapView"]["features"][number] | null): string {
  if (!feature) {
    return "";
  }

  return `${feature.kind} / ${feature.sourceSection}`;
}

function renderArtifactSaveForm(
  card: HomeScreenModel["candidateCards"][number],
  completedIntent: HomeScreenModel["intentWorkbench"]["latestSubmission"] | null,
  actionPath: string,
): string {
  if (!completedIntent || !supportsArtifactSave(card.kind)) {
    return "";
  }

  return `<form class="flex flex-wrap items-center gap-3" method="post" action="${escapeHtml(actionPath)}">
    <input type="hidden" name="candidate" value="${escapeHtml(JSON.stringify(card))}">
    <input type="hidden" name="sourceIntent" value="${escapeHtml(completedIntent.classification.intent)}">
    <input type="hidden" name="intentSubmission" value="${escapeHtml(JSON.stringify(completedIntent))}">
    <button class="rounded-full bg-app-ink px-4 py-2 text-sm font-semibold text-app-ink-text" type="submit">${escapeHtml(
      getArtifactSaveLabel(card.kind),
    )}</button>
  </form>`;
}

function supportsArtifactSave(kind: HomeScreenModel["candidateCards"][number]["kind"]): boolean {
  return kind === "field-note" || kind === "trail" || kind === "patch";
}

function getArtifactSaveLabel(kind: HomeScreenModel["candidateCards"][number]["kind"]): string {
  switch (kind) {
    case "field-note":
      return "Save field note";
    case "trail":
      return "Save trail";
    case "patch":
      return "Save inspection";
    case "observation":
    case "session":
      return "Save artifact";
  }
}

function serializeMapClientState(mapView: HomeScreenModel["mapView"]): string {
  return JSON.stringify({
    basemap: mapView.basemap,
    viewport: mapView.viewport,
    features: mapView.features,
    overlays: mapView.overlays,
    locationControl: mapView.locationControl,
  });
}

function renderMapEnhancementScript(): string {
  return `
(() => {
  window.__semanticForagingInitMap = () => {
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const leaflet = window.L;
  const collectOverlayPoints = (overlays) => overlays.flatMap((overlay) => (overlay.status === "ready" ? overlay.points : []));
  const formatCoordinate = (value, positiveSuffix, negativeSuffix) =>
    \`\${Math.abs(value).toFixed(4)}°\${value >= 0 ? positiveSuffix : negativeSuffix}\`;
  const formatLocationMessage = (control, point) =>
    \`\${control.activeLabel} \${formatCoordinate(point.latitude, "N", "S")}, \${formatCoordinate(point.longitude, "E", "W")}\`;
  const toLatLng = (point) => [point.latitude, point.longitude];
  const featureStyle = (feature, active) => {
    const tone = feature.sourceSection === "recent-sessions" ? "#005bbb" : "#10253f";

    switch (feature.geometry.kind) {
      case "point":
        return {
          color: tone,
          fillColor: active ? tone : "#ffffff",
          fillOpacity: active ? 0.95 : 0.82,
          radius: active ? 10 : 8,
          weight: active ? 3 : 2,
        };
      case "area":
        return {
          color: tone,
          fillColor: "#005bbb",
          fillOpacity: active ? 0.22 : 0.12,
          weight: active ? 3 : 2,
        };
      case "trail":
        return {
          color: tone,
          weight: active ? 5 : 4,
          opacity: active ? 1 : 0.88,
        };
    }
  };
  const createFeatureLayer = (feature, active, onSelect) => {
    if (!leaflet) {
      return null;
    }

    let layer;

    switch (feature.geometry.kind) {
      case "point":
        layer = leaflet.circleMarker(toLatLng(feature.geometry.point), featureStyle(feature, active));
        break;
      case "area":
        layer = leaflet.polygon(feature.geometry.ring.map(toLatLng), featureStyle(feature, active));
        break;
      case "trail":
        layer = leaflet.polyline(feature.geometry.points.map(toLatLng), featureStyle(feature, active));
        break;
    }

    layer.on("click", () => onSelect(feature.id));
    layer.bindTooltip(feature.label, {
      direction: "top",
      offset: [0, -10],
      opacity: active ? 0.95 : 0.82,
      permanent: active,
      className: "leaflet-feature-tooltip",
    });

    return layer;
  };

  for (const root of document.querySelectorAll("[data-map-root]")) {
    if (root.getAttribute("data-map-interactive") === "true") {
      continue;
    }

    root.setAttribute("data-map-interactive", "true");
    const featureNodes = Array.from(root.querySelectorAll("[data-map-feature]"));
    const itemNodes = Array.from(root.querySelectorAll("[data-map-item]"));
    const detailMeta = root.querySelector("[data-map-detail-meta]");
    const detailLabel = root.querySelector("[data-map-detail-label]");
    const detailSummary = root.querySelector("[data-map-detail-summary]");
    const detailEvidence = root.querySelector("[data-map-detail-evidence]");
    const browserFrame = root.querySelector("[data-map-browser-frame]");
    const leafletHost = root.querySelector("[data-map-leaflet]");
    const browserSource = root.querySelector("[data-map-browser-source]");
    const browserAttribution = root.querySelector("[data-map-browser-attribution]");
    const browserZoom = root.querySelector("[data-map-browser-zoom]");
    const locateButton = root.querySelector("[data-map-locate]");
    const locationStatus = root.querySelector("[data-map-location-status]");
    const zoomControls = root.querySelector("[data-map-zoom-controls]");
    const zoomOut = root.querySelector("[data-map-zoom-out]");
    const zoomIn = root.querySelector("[data-map-zoom-in]");
    const fallbackFrame = root.querySelector("[data-map-fallback]");
    const rawState = root.getAttribute("data-map-state");
    const state = rawState ? JSON.parse(rawState) : null;
    let activeZoom = null;
    let activeCenter = state?.viewport?.center ?? null;
    let browserReady = false;
    let currentLocation = null;
    let map = null;
    let featureGroup = null;
    let overlayGroup = null;
    let locationGroup = null;
    const control = state?.locationControl ?? {
      idleLabel: "",
      loadingLabel: "",
      activeLabel: "",
      deniedLabel: "",
      unsupportedLabel: "",
      errorLabel: "",
    };
    const setLocationState = (nextState, message) => {
      root.setAttribute("data-map-location", nextState);

      if (locationStatus) {
        locationStatus.textContent = message;
      }

      if (locateButton) {
        locateButton.disabled = nextState === "loading";
        locateButton.setAttribute("aria-busy", nextState === "loading" ? "true" : "false");
      }
    };
    const requestCurrentLocation = () => {
      if (!state?.basemap?.available || !state?.basemap?.tileTemplateUrl) {
        setLocationState("error", control.errorLabel);
        return;
      }

      if (!navigator.geolocation) {
        setLocationState("unsupported", control.unsupportedLabel);
        return;
      }

      if (root.getAttribute("data-map-location") === "loading") {
        return;
      }

      setLocationState("loading", control.loadingLabel);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          currentLocation = {
            point: {
              longitude: position.coords.longitude,
              latitude: position.coords.latitude,
            },
            accuracyMeters: position.coords.accuracy,
          };
          activeCenter = currentLocation.point;
          activeZoom = clamp(
            Math.max(activeZoom ?? Math.round(state.viewport.zoom ?? state.basemap.minZoom ?? 0), 12),
            state.basemap.minZoom ?? 0,
            state.basemap.maxZoom ?? 19,
          );
          setLocationState("active", formatLocationMessage(control, currentLocation.point));
          renderBrowserMap(root.getAttribute("data-map-active-id"));
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setLocationState("denied", control.deniedLabel);
            return;
          }

          setLocationState("error", control.errorLabel);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 300000,
          timeout: 10000,
        },
      );
    };
    const renderBrowserMap = (activeId) => {
      if (
        !leaflet ||
        !state ||
        !state.basemap ||
        !state.basemap.available ||
        !state.basemap.tileTemplateUrl ||
        !browserFrame ||
        !leafletHost ||
        !fallbackFrame
      ) {
        return;
      }

      const minZoom = Number.isFinite(state.basemap.minZoom) ? state.basemap.minZoom : 0;
      const maxZoom = Number.isFinite(state.basemap.maxZoom) ? state.basemap.maxZoom : 16;

      if (activeZoom === null) {
        activeZoom = clamp(Math.round(state.viewport.zoom ?? minZoom), minZoom, maxZoom);
      }

      if (!activeCenter) {
        activeCenter = state.viewport.center;
      }

      if (!map) {
        map = leaflet.map(leafletHost, {
          zoomControl: false,
          attributionControl: false,
        });
        leaflet.tileLayer(state.basemap.tileTemplateUrl, {
          minZoom,
          maxZoom,
          attribution: state.basemap.attribution ?? "",
        }).addTo(map);
        featureGroup = leaflet.layerGroup().addTo(map);
        overlayGroup = leaflet.layerGroup().addTo(map);
        locationGroup = leaflet.layerGroup().addTo(map);
        map.on("zoomend", () => {
          activeZoom = map.getZoom();

          if (browserZoom) {
            browserZoom.textContent = \`Zoom \${activeZoom}\`;
          }
        });
        map.on("moveend", () => {
          const center = map.getCenter();
          activeCenter = {
            latitude: center.lat,
            longitude: center.lng,
          };
        });
      }

      map.setView(toLatLng(activeCenter), activeZoom, { animate: false });
      featureGroup.clearLayers();
      overlayGroup.clearLayers();
      locationGroup.clearLayers();

      for (const overlayPoint of collectOverlayPoints(state.overlays ?? [])) {
        leaflet
          .circleMarker(toLatLng(overlayPoint.point), {
            radius: 4,
            color: "#a05a2a",
            fillColor: "#a05a2a",
            fillOpacity: 0.72,
            weight: 1,
          })
          .bindTooltip(overlayPoint.label, {
            direction: "top",
            offset: [0, -8],
          })
          .addTo(overlayGroup);
      }

      for (const feature of state.features) {
        createFeatureLayer(feature, feature.id === activeId, activate)?.addTo(featureGroup);
      }

      if (currentLocation) {
        leaflet
          .circle(toLatLng(currentLocation.point), {
            radius: currentLocation.accuracyMeters ?? 0,
            color: "#1e63ec",
            fillColor: "#1e63ec",
            fillOpacity: 0.12,
            weight: 1.5,
          })
          .addTo(locationGroup);
        leaflet
          .circleMarker(toLatLng(currentLocation.point), {
            radius: 8,
            color: "#1e63ec",
            fillColor: "#ffffff",
            fillOpacity: 0.94,
            weight: 3,
          })
          .bindTooltip("Current location", {
            direction: "top",
            offset: [0, -10],
            permanent: true,
            className: "leaflet-feature-tooltip",
          })
          .addTo(locationGroup);
      }

      browserFrame.removeAttribute("hidden");
      browserFrame.classList.remove("hidden");
      browserFrame.setAttribute("data-map-mode", "browser");
      fallbackFrame.setAttribute("hidden", "");

      if (!browserReady) {
        root.setAttribute("data-map-browser", "true");
        zoomControls?.removeAttribute("hidden");
        zoomControls?.classList.remove("hidden");

        zoomOut?.addEventListener("click", () => {
          map?.zoomOut();
        });

        zoomIn?.addEventListener("click", () => {
          map?.zoomIn();
        });

        browserReady = true;
      }

      if (browserSource) {
        const overlayLabel = (state.overlays ?? []).find((overlay) => overlay.status === "ready")?.label ?? "Deterministic overlays";

        browserSource.textContent = \`\${state.basemap.label} + \${overlayLabel}\`;
      }

      if (browserAttribution) {
        browserAttribution.textContent = state.basemap.attribution ?? "";
      }

      if (browserZoom) {
        browserZoom.textContent = \`Zoom \${activeZoom}\`;
      }

      map.invalidateSize(false);
    };
    const activate = (id) => {
      if (!id) return;

      root.setAttribute("data-map-enhanced", "true");
      root.setAttribute("data-map-active-id", id);

      for (const node of featureNodes) {
        const isActive = node.getAttribute("data-map-feature") === id;

        node.setAttribute("data-map-active", isActive ? "true" : "false");
      }

      for (const node of itemNodes) {
        const isActive = node.getAttribute("data-map-item") === id;

        node.setAttribute("data-map-active", isActive ? "true" : "false");
        node.setAttribute("aria-pressed", isActive ? "true" : "false");
      }

      const source =
        featureNodes.find((node) => node.getAttribute("data-map-feature") === id) ??
        itemNodes.find((node) => node.getAttribute("data-map-item") === id);

      if (!source) return;

      if (detailMeta) {
        detailMeta.textContent = \`\${source.getAttribute("data-map-kind") ?? ""} / \${source.getAttribute("data-map-source") ?? ""}\`;
      }

      if (detailLabel) {
        detailLabel.textContent = source.getAttribute("data-map-label") ?? "";
      }

      if (detailSummary) {
        detailSummary.textContent = source.getAttribute("data-map-summary") ?? "";
      }

      if (detailEvidence) {
        detailEvidence.textContent = source.getAttribute("data-map-evidence") ?? "";
      }

      renderBrowserMap(id);
    };

    for (const node of featureNodes) {
      node.addEventListener("click", () => activate(node.getAttribute("data-map-feature")));
      node.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate(node.getAttribute("data-map-feature"));
        }
      });
    }

    for (const node of itemNodes) {
      node.addEventListener("click", () => activate(node.getAttribute("data-map-item")));
    }

    if (locateButton) {
      locateButton.addEventListener("click", requestCurrentLocation);
    }

    const initialId =
      root.getAttribute("data-map-active-id") ??
      itemNodes[0]?.getAttribute("data-map-item") ??
      featureNodes[0]?.getAttribute("data-map-feature");

    setLocationState("idle", control.idleLabel);
    activate(initialId);
    requestCurrentLocation();
  }
  };

  window.__semanticForagingInitMap();
})();
`.trim();
}

function longitudeToFrame(longitude: number, bounds: HomeScreenModel["mapView"]["viewport"]["bounds"], frameWidth: number): number {
  return ((longitude - bounds.west) / (bounds.east - bounds.west)) * frameWidth;
}

function latitudeToFrame(latitude: number, bounds: HomeScreenModel["mapView"]["viewport"]["bounds"], frameHeight: number): number {
  return ((bounds.north - latitude) / (bounds.north - bounds.south)) * frameHeight;
}
