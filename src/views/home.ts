import type { HomeScreenModel } from "../domain/contracts/screen";
import { escapeHtml } from "./shared";
import { renderPage } from "./render-page";

export function renderHomePage(screen: HomeScreenModel): string {
  const alertList = screen.alerts
    .map(
      (alert) =>
        `<li class="rounded-[1rem] border px-4 py-3 ${alert.tone === "error" ? "border-rose-300 bg-rose-50 text-rose-950" : "border-sky-300 bg-sky-50 text-sky-950"}">
          <p class="text-sm font-semibold uppercase tracking-[0.18em]">${escapeHtml(alert.title)}</p>
          <p class="mt-2 leading-7">${escapeHtml(alert.body)}</p>
        </li>`,
    )
    .join("");
  const routeList = screen.routes
    .map(
      (route) =>
        `<li class="flex items-baseline gap-3 rounded-2xl border border-app-line/70 bg-white/70 px-4 py-3 shadow-[0_12px_30px_-26px_rgba(30,26,22,0.35)]">
          <code class="rounded-full bg-app-accent/10 px-3 py-1 text-sm font-semibold text-app-accent-strong">${escapeHtml(route.path)}</code>
          <span>${escapeHtml(route.purpose)}</span>
        </li>`,
    )
    .join("");
  const runtimeProvider = screen.runtime.provider ?? "none";
  const runtimeAvailable = screen.runtime.available ? "available" : "fallback active";
  const runtimeStructuredOutput = screen.runtime.supportsStructuredOutput ? "yes" : "no";
  const runtimeStreaming = screen.runtime.supportsStreaming ? "yes" : "no";
  const latestIntent = screen.intentWorkbench.latestSubmission;
  const latestExplanation = screen.explanationWorkbench.latestSubmission;
  const clarificationWorkflow = latestIntent?.workflow.state === "awaiting_clarification" ? latestIntent.workflow : null;
  const initialMapFeature = screen.mapView.features[0] ?? null;
  const overlay = screen.mapView.overlays[0];
  const serializedMapState = serializeMapClientState(screen.mapView);
  const mapMarkup = screen.mapView.features
    .map((feature) =>
      renderMapFeature(
        feature,
        screen.mapView.viewport.width,
        screen.mapView.viewport.height,
        screen.mapView.viewport.bounds,
        feature.id === initialMapFeature?.id,
      ),
    )
    .join("");
  const overlayMarkup =
    overlay?.status === "ready"
      ? overlay.points
          .map((point) =>
            renderOverlayPoint(point, screen.mapView.viewport.width, screen.mapView.viewport.height, screen.mapView.viewport.bounds),
          )
          .join("")
      : "";
  const mapLegendMarkup = screen.mapView.features
    .map(
      (feature) =>
        `<li>
          <button
            class="w-full rounded-2xl border border-app-line/70 bg-app-canvas/45 px-4 py-3 text-left"
            type="button"
            data-map-item="${escapeHtml(feature.id)}"
            data-map-label="${escapeHtml(feature.label)}"
            data-map-kind="${escapeHtml(feature.kind)}"
            data-map-source="${escapeHtml(feature.sourceSection)}"
            data-map-summary="${escapeHtml(feature.summary)}"
            data-map-evidence="${escapeHtml(feature.evidenceSummary)}"
            data-map-active="${feature.id === initialMapFeature?.id ? "true" : "false"}"
            aria-pressed="${feature.id === initialMapFeature?.id ? "true" : "false"}"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-soft">${escapeHtml(feature.kind)} / ${escapeHtml(feature.sourceSection)}</p>
            <p class="mt-2 font-medium">${escapeHtml(feature.label)}</p>
            <p class="mt-2 text-sm leading-6 text-app-text-soft">${escapeHtml(feature.evidenceSummary)}</p>
          </button>
        </li>`,
    )
    .join("");
  const overlayStatusMarkup = overlay
    ? `<section class="rounded-[1rem] border border-app-line/70 bg-app-canvas/45 px-4 py-3">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-soft">${escapeHtml(overlay.label)} / ${escapeHtml(overlay.provider)}</p>
        <p class="mt-2 text-sm leading-6 text-app-text-soft">${escapeHtml(overlay.note)}</p>
      </section>`
    : "";
  const recentSessionMarkup = screen.recentSessions
    .map(
      (session) =>
        `<li class="grid gap-3 rounded-[1rem] border border-app-line/70 bg-white/80 p-5 shadow-[0_16px_40px_-30px_rgba(30,26,22,0.3)]">
          <div class="flex flex-wrap items-center gap-3">
            <p class="rounded-full bg-app-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-app-accent-strong">${escapeHtml(session.sourceIntent)}</p>
            <p class="text-sm text-app-text-soft">${escapeHtml(formatSavedAtLabel(session.savedAt))}</p>
          </div>
          <div>
            <h3 class="text-lg font-semibold tracking-[-0.02em]">${escapeHtml(session.title)}</h3>
            <p class="mt-2 leading-7 text-app-text-soft">${escapeHtml(session.summary)}</p>
          </div>
          <p class="text-sm text-app-text-soft">Detected cues: ${escapeHtml(formatCueSummary(session.cues))}</p>
        </li>`,
    )
    .join("");
  const candidateMarkup = screen.candidateCards
    .map(
      (card) =>
        `<li class="grid gap-4 rounded-[1rem] border border-app-line/70 bg-white/80 p-5 shadow-[0_16px_40px_-30px_rgba(30,26,22,0.3)]">
          <div class="flex flex-wrap items-center gap-3">
            <p class="rounded-full bg-app-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-app-accent-strong">${escapeHtml(card.kind)}</p>
            <p class="text-sm font-semibold text-app-text-soft">${escapeHtml(card.statusLabel)}</p>
          </div>
          <div>
            <h3 class="text-lg font-semibold tracking-[-0.02em]">${escapeHtml(card.title)}</h3>
            <p class="mt-2 leading-7 text-app-text-soft">${escapeHtml(card.summary)}</p>
          </div>
          <dl class="grid gap-3">
            ${card.evidence
              .map(
                (note) =>
                  `<div class="rounded-2xl border border-app-line/70 bg-app-canvas/45 px-4 py-3">
                    <dt class="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-soft">${escapeHtml(note.label)}</dt>
                    <dd class="mt-1 leading-7">${escapeHtml(note.detail)}</dd>
                  </div>`,
              )
              .join("")}
          </dl>
        </li>`,
    )
    .join("");
  const latestIntentMarkup = latestIntent
    ? `<section class="rounded-2xl border border-app-line/70 bg-app-canvas/55 p-4">
        <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-app-text-soft">Latest intent result</h3>
        <dl class="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <dt class="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-soft">Input</dt>
            <dd class="mt-1 font-medium">${escapeHtml(latestIntent.input)}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-soft">Intent</dt>
            <dd class="mt-1 font-medium">${escapeHtml(latestIntent.classification.intent)}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-soft">Confidence</dt>
            <dd class="mt-1 font-medium">${escapeHtml(`${latestIntent.confidenceBand} (${latestIntent.classification.confidence.toFixed(2)})`)}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-soft">Workflow</dt>
            <dd class="mt-1 font-medium">${escapeHtml(latestIntent.workflow.state)}</dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-soft">Provenance</dt>
            <dd class="mt-1 font-medium">${escapeHtml(`${latestIntent.provenance.source} / ${latestIntent.provenance.reason ?? "n/a"}`)}</dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-soft">Detected cues</dt>
            <dd class="mt-1 font-medium">${escapeHtml(formatCueSummary(latestIntent.classification.cues))}</dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-xs font-semibold uppercase tracking-[0.16em] text-app-text-soft">Clarification focus</dt>
            <dd class="mt-1 font-medium">${escapeHtml(formatMissingSummary(latestIntent.classification.missing))}</dd>
          </div>
        </dl>
      </section>`
    : "";
  const clarificationMarkup = clarificationWorkflow
    ? `<section class="rounded-2xl border border-amber-300 bg-amber-50/80 p-4">
        <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-amber-950">Clarification needed</h3>
        <p class="mt-2 leading-7 text-amber-950">${escapeHtml(clarificationWorkflow.question)}</p>
        <p class="mt-2 text-sm text-amber-900">Allowed intents: ${clarificationWorkflow.options.map((option) => escapeHtml(option)).join(", ")}</p>
        <form class="mt-4 grid gap-4" method="post" action="${escapeHtml(screen.intentWorkbench.clarificationActionPath)}">
          <input type="hidden" name="${escapeHtml(screen.intentWorkbench.clarificationWorkflowIdName)}" value="${escapeHtml(clarificationWorkflow.workflowId)}">
          <label class="grid gap-2">
            <span class="text-sm font-semibold">${escapeHtml(screen.intentWorkbench.clarificationLabel)}</span>
            <textarea name="${escapeHtml(screen.intentWorkbench.clarificationName)}" class="min-h-24 rounded-2xl border border-amber-300 bg-white px-4 py-3 leading-7 text-app-text" placeholder="${escapeHtml(screen.intentWorkbench.clarificationPlaceholder)}">${escapeHtml(screen.intentWorkbench.clarificationValue)}</textarea>
          </label>
          <button class="inline-flex w-fit items-center rounded-full bg-app-accent px-5 py-2 text-sm font-semibold text-white shadow-[0_16px_30px_-20px_rgba(160,90,42,0.85)]" type="submit">Continue workflow</button>
        </form>
      </section>`
    : "";
  const latestExplanationMarkup = latestExplanation
    ? `<section class="rounded-2xl border border-app-line/70 bg-app-canvas/55 p-4">
        <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-app-text-soft">Latest explanation</h3>
        <p class="mt-3 font-medium">${escapeHtml(latestExplanation.title)}</p>
        <p class="mt-3 leading-7 text-app-text-soft">${escapeHtml(latestExplanation.explanation)}</p>
        <p class="mt-3 text-sm text-app-text-soft">Provenance: ${escapeHtml(`${latestExplanation.provenance.source} / ${latestExplanation.provenance.reason ?? "n/a"}`)}</p>
      </section>`
    : "";

  return renderPage({
    title: screen.title,
    traceId: screen.meta.traceId,
    scripts: screen.mapView.features.length > 0 ? [renderMapEnhancementScript()] : [],
    body: `<main class="mx-auto w-[min(56rem,calc(100vw-2rem))] px-0 py-16">
      <article class="overflow-hidden rounded-[1.5rem] border border-app-line/80 bg-app-surface/95 shadow-panel backdrop-blur">
        <section class="border-b border-app-line/80 px-5 py-10 sm:px-8">
          <p class="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-app-accent">${escapeHtml(screen.eyebrow)}</p>
          <h1 class="max-w-[12ch] text-5xl leading-none font-semibold tracking-[-0.04em] sm:text-7xl">${escapeHtml(screen.title)}</h1>
          <p class="mt-4 max-w-2xl text-lg leading-8 text-app-text-soft">${escapeHtml(screen.description)}</p>
        </section>
        <div class="grid gap-6 px-5 py-8 sm:px-8 sm:py-10">
          ${screen.alerts.length > 0 ? `<ul class="grid gap-3">${alertList}</ul>` : ""}
          <section class="rounded-[1rem] border border-app-line/70 bg-white/72 p-6 shadow-[0_16px_40px_-30px_rgba(30,26,22,0.3)]">
            <h2 class="mb-3 text-lg font-semibold tracking-[-0.02em]">${escapeHtml(screen.overviewTitle)}</h2>
            <p class="leading-7 text-app-text-soft">${escapeHtml(screen.overviewBody)}</p>
          </section>
          <section class="rounded-[1rem] border border-app-line/70 bg-white/72 p-6 shadow-[0_16px_40px_-30px_rgba(30,26,22,0.3)]">
            <h2 class="mb-3 text-lg font-semibold tracking-[-0.02em]">${escapeHtml(screen.workbenchTitle)}</h2>
            <p class="leading-7 text-app-text-soft">${escapeHtml(screen.workbenchBody)}</p>
            <div class="mt-6 grid gap-6 lg:grid-cols-2">
              <section class="grid gap-4 rounded-[1rem] border border-app-line/70 bg-white/80 p-5">
                <div>
                  <h3 class="text-base font-semibold tracking-[-0.02em]">${escapeHtml(screen.intentWorkbench.title)}</h3>
                  <p class="mt-2 leading-7 text-app-text-soft">${escapeHtml(screen.intentWorkbench.description)}</p>
                </div>
                <form class="grid gap-4" method="post" action="${escapeHtml(screen.intentWorkbench.actionPath)}">
                  <label class="grid gap-2">
                    <span class="text-sm font-semibold">${escapeHtml(screen.intentWorkbench.rawInputLabel)}</span>
                    <textarea name="${escapeHtml(screen.intentWorkbench.rawInputName)}" class="min-h-28 rounded-2xl border border-app-line/70 bg-app-canvas/40 px-4 py-3 leading-7 text-app-text" placeholder="${escapeHtml(screen.intentWorkbench.rawInputPlaceholder)}">${escapeHtml(screen.intentWorkbench.rawInputValue)}</textarea>
                  </label>
                  <button class="inline-flex w-fit items-center rounded-full bg-app-accent px-5 py-2 text-sm font-semibold text-white shadow-[0_16px_30px_-20px_rgba(160,90,42,0.85)]" type="submit">${escapeHtml(screen.intentWorkbench.submitLabel)}</button>
                </form>
                ${latestIntentMarkup}
                ${clarificationMarkup}
              </section>
              <section class="grid gap-4 rounded-[1rem] border border-app-line/70 bg-white/80 p-5">
                <div>
                  <h3 class="text-base font-semibold tracking-[-0.02em]">${escapeHtml(screen.explanationWorkbench.title)}</h3>
                  <p class="mt-2 leading-7 text-app-text-soft">${escapeHtml(screen.explanationWorkbench.description)}</p>
                </div>
                <form class="grid gap-4" method="post" action="${escapeHtml(screen.explanationWorkbench.actionPath)}">
                  <label class="grid gap-2">
                    <span class="text-sm font-semibold">${escapeHtml(screen.explanationWorkbench.titleLabel)}</span>
                    <input name="${escapeHtml(screen.explanationWorkbench.titleName)}" class="rounded-2xl border border-app-line/70 bg-app-canvas/40 px-4 py-3 text-app-text" placeholder="${escapeHtml(screen.explanationWorkbench.titlePlaceholder)}" value="${escapeHtml(screen.explanationWorkbench.titleValue)}">
                  </label>
                  <label class="grid gap-2">
                    <span class="text-sm font-semibold">${escapeHtml(screen.explanationWorkbench.factsLabel)}</span>
                    <textarea name="${escapeHtml(screen.explanationWorkbench.factsName)}" class="min-h-28 rounded-2xl border border-app-line/70 bg-app-canvas/40 px-4 py-3 leading-7 text-app-text" placeholder="${escapeHtml(screen.explanationWorkbench.factsPlaceholder)}">${escapeHtml(screen.explanationWorkbench.factsValue)}</textarea>
                  </label>
                  <button class="inline-flex w-fit items-center rounded-full bg-app-accent px-5 py-2 text-sm font-semibold text-white shadow-[0_16px_30px_-20px_rgba(160,90,42,0.85)]" type="submit">${escapeHtml(screen.explanationWorkbench.submitLabel)}</button>
                </form>
                ${latestExplanationMarkup}
              </section>
            </div>
          </section>
          <section class="rounded-[1rem] border border-app-line/70 bg-white/72 p-6 shadow-[0_16px_40px_-30px_rgba(30,26,22,0.3)]">
            <h2 class="mb-3 text-lg font-semibold tracking-[-0.02em]">${escapeHtml(screen.mapView.title)}</h2>
            <p class="leading-7 text-app-text-soft">${escapeHtml(screen.mapView.description)}</p>
            ${
              screen.mapView.features.length > 0
                ? `<div class="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.9fr)]" data-map-root data-map-active-id="${escapeHtml(initialMapFeature?.id ?? "")}" data-map-state="${escapeHtml(serializedMapState)}">
                    <figure class="overflow-hidden rounded-[1rem] border border-app-line/70 bg-[linear-gradient(180deg,rgba(11,110,79,0.09),rgba(255,255,255,0.6)),linear-gradient(135deg,rgba(255,255,255,0.75),rgba(245,239,230,0.95))] p-4">
                      <div class="relative aspect-[16/9]">
                        <div class="absolute inset-0 hidden overflow-hidden rounded-[0.9rem] border border-app-line/60 bg-[#d9e5dc]" data-map-browser-frame aria-hidden="true">
                          <div class="absolute inset-0" data-map-tiles></div>
                          <svg class="absolute inset-0 h-full w-full" viewBox="0 0 ${screen.mapView.viewport.width} ${screen.mapView.viewport.height}" data-map-browser-overlay aria-hidden="true"></svg>
                          <div class="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap items-end justify-between gap-3">
                            <p class="max-w-[18rem] rounded-full bg-white/88 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-app-text-soft shadow-[0_12px_24px_-20px_rgba(30,26,22,0.5)]" data-map-browser-source></p>
                            <p class="rounded-full bg-white/88 px-3 py-1 text-[11px] font-semibold text-app-text-soft shadow-[0_12px_24px_-20px_rgba(30,26,22,0.5)]" data-map-browser-attribution></p>
                            <p class="rounded-full bg-white/88 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-app-text-soft shadow-[0_12px_24px_-20px_rgba(30,26,22,0.5)]" data-map-browser-zoom></p>
                          </div>
                        </div>
                        <svg viewBox="0 0 ${screen.mapView.viewport.width} ${screen.mapView.viewport.height}" class="absolute inset-0 h-full w-full rounded-[0.9rem] border border-app-line/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(244,236,226,0.96))]" role="img" aria-label="${escapeHtml(screen.mapView.viewport.frameLabel)}" data-map-fallback>
                          <rect x="18" y="22" width="604" height="316" rx="26" fill="rgba(255,255,255,0.42)" stroke="rgba(30,26,22,0.08)"/>
                          ${renderMapGraticule(screen.mapView.viewport.width, screen.mapView.viewport.height, screen.mapView.viewport.bounds)}
                          ${overlayMarkup}
                          ${mapMarkup}
                        </svg>
                        <div class="absolute right-3 top-3 hidden gap-2" data-map-zoom-controls>
                          <button class="rounded-full border border-app-line/70 bg-white/90 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-app-text shadow-[0_12px_24px_-20px_rgba(30,26,22,0.45)]" type="button" data-map-zoom-out aria-label="Zoom out">-</button>
                          <button class="rounded-full border border-app-line/70 bg-white/90 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-app-text shadow-[0_12px_24px_-20px_rgba(30,26,22,0.45)]" type="button" data-map-zoom-in aria-label="Zoom in">+</button>
                        </div>
                      </div>
                    </figure>
                    <div class="grid gap-3">
                      <section class="rounded-[1rem] border border-app-line/70 bg-app-canvas/45 px-4 py-3">
                        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-soft">${escapeHtml(screen.mapView.basemap.label)}</p>
                        <p class="mt-2 text-sm leading-6 text-app-text-soft">${escapeHtml(screen.mapView.basemap.note)}</p>
                        <p class="mt-3 text-xs uppercase tracking-[0.16em] text-app-text-soft">Bounds: ${escapeHtml(formatBoundsLabel(screen.mapView.viewport.bounds))}</p>
                      </section>
                      ${overlayStatusMarkup}
                      <section class="rounded-[1rem] border border-app-line/70 bg-white/80 p-4 shadow-[0_12px_30px_-26px_rgba(30,26,22,0.32)]">
                        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-soft">Focused lead</p>
                        <p class="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-app-accent" data-map-detail-meta>${escapeHtml(formatMapDetailMeta(initialMapFeature))}</p>
                        <h3 class="mt-3 text-lg font-semibold tracking-[-0.02em]" data-map-detail-label>${escapeHtml(initialMapFeature?.label ?? "")}</h3>
                        <p class="mt-3 leading-7 text-app-text-soft" data-map-detail-summary>${escapeHtml(initialMapFeature?.summary ?? "")}</p>
                        <p class="mt-3 text-sm leading-6 text-app-text-soft" data-map-detail-evidence>${escapeHtml(initialMapFeature?.evidenceSummary ?? "")}</p>
                      </section>
                      <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-app-text-soft">${escapeHtml(screen.mapView.legendTitle)}</h3>
                      <ul class="grid gap-3">${mapLegendMarkup}</ul>
                    </div>
                  </div>`
                : `<p class="mt-4 rounded-2xl border border-dashed border-app-line/80 bg-app-canvas/40 px-4 py-4 leading-7 text-app-text-soft">${escapeHtml(screen.mapView.emptyState)}</p>`
            }
          </section>
          <section class="rounded-[1rem] border border-app-line/70 bg-white/72 p-6 shadow-[0_16px_40px_-30px_rgba(30,26,22,0.3)]">
            <h2 class="mb-3 text-lg font-semibold tracking-[-0.02em]">${escapeHtml(screen.retrievalTitle)}</h2>
            <p class="leading-7 text-app-text-soft">${escapeHtml(screen.retrievalBody)}</p>
            ${
              screen.candidateCards.length > 0
                ? `<ul class="mt-6 grid gap-4 lg:grid-cols-2">${candidateMarkup}</ul>`
                : `<p class="mt-4 rounded-2xl border border-dashed border-app-line/80 bg-app-canvas/40 px-4 py-4 leading-7 text-app-text-soft">${escapeHtml(screen.retrievalEmptyState)}</p>`
            }
          </section>
          <section class="rounded-[1rem] border border-app-line/70 bg-white/72 p-6 shadow-[0_16px_40px_-30px_rgba(30,26,22,0.3)]">
            <h2 class="mb-3 text-lg font-semibold tracking-[-0.02em]">${escapeHtml(screen.recentSessionsTitle)}</h2>
            <p class="leading-7 text-app-text-soft">${escapeHtml(screen.recentSessionsBody)}</p>
            ${
              screen.recentSessions.length > 0
                ? `<ul class="mt-6 grid gap-4 lg:grid-cols-2">${recentSessionMarkup}</ul>`
                : `<p class="mt-4 rounded-2xl border border-dashed border-app-line/80 bg-app-canvas/40 px-4 py-4 leading-7 text-app-text-soft">${escapeHtml(screen.recentSessionsEmptyState)}</p>`
            }
          </section>
          <section class="rounded-[1rem] border border-app-line/70 bg-white/72 p-6 shadow-[0_16px_40px_-30px_rgba(30,26,22,0.3)]">
            <div class="flex flex-wrap items-center gap-3">
              <h2 class="text-lg font-semibold tracking-[-0.02em]">${escapeHtml(screen.runtimeTitle)}</h2>
              <span class="rounded-full bg-app-accent/10 px-3 py-1 text-sm font-semibold text-app-accent-strong">${escapeHtml(screen.runtimeModeLabel)}</span>
            </div>
            <p class="mt-3 leading-7 text-app-text-soft">${escapeHtml(screen.runtimeSummary)}</p>
            <dl class="mt-5 grid gap-3 sm:grid-cols-2">
              <div class="rounded-2xl border border-app-line/70 bg-app-canvas/55 px-4 py-3">
                <dt class="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-soft">Provider</dt>
                <dd class="mt-1 font-medium">${escapeHtml(runtimeProvider)}</dd>
              </div>
              <div class="rounded-2xl border border-app-line/70 bg-app-canvas/55 px-4 py-3">
                <dt class="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-soft">Availability</dt>
                <dd class="mt-1 font-medium">${escapeHtml(runtimeAvailable)}</dd>
              </div>
              <div class="rounded-2xl border border-app-line/70 bg-app-canvas/55 px-4 py-3">
                <dt class="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-soft">Structured output</dt>
                <dd class="mt-1 font-medium">${escapeHtml(runtimeStructuredOutput)}</dd>
              </div>
              <div class="rounded-2xl border border-app-line/70 bg-app-canvas/55 px-4 py-3">
                <dt class="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-soft">Streaming</dt>
                <dd class="mt-1 font-medium">${escapeHtml(runtimeStreaming)}</dd>
              </div>
              <div class="rounded-2xl border border-app-line/70 bg-app-canvas/55 px-4 py-3 sm:col-span-2">
                <dt class="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-soft">Context class</dt>
                <dd class="mt-1 font-medium">${escapeHtml(screen.runtime.maxContextClass)}</dd>
              </div>
            </dl>
          </section>
          <section class="rounded-[1rem] border border-app-line/70 bg-white/72 p-6 shadow-[0_16px_40px_-30px_rgba(30,26,22,0.3)]">
            <h2 class="mb-3 text-lg font-semibold tracking-[-0.02em]">${escapeHtml(screen.routesTitle)}</h2>
            <ul class="grid gap-3 text-app-text-soft">${routeList}</ul>
          </section>
          <section class="rounded-[1rem] border border-app-line/70 bg-white/72 p-6 shadow-[0_16px_40px_-30px_rgba(30,26,22,0.3)]">
            <h2 class="mb-3 text-lg font-semibold tracking-[-0.02em]">${escapeHtml(screen.nextStepsTitle)}</h2>
            <p class="leading-7 text-app-text-soft">${escapeHtml(screen.nextStepsBody)}</p>
            <p class="mt-4 leading-7 text-app-text-soft">Health probe: <a class="font-semibold text-app-accent-strong underline decoration-app-accent/30 underline-offset-4" href="${escapeHtml(screen.healthPath)}">${escapeHtml(screen.healthPath)}</a></p>
          </section>
        </div>
      </article>
    </main>`,
  });
}

function formatCueSummary(cues: { species: string[]; habitat: string[]; region: string[]; season: string[] }): string {
  const segments = [
    formatCueGroup("species", cues.species),
    formatCueGroup("habitat", cues.habitat),
    formatCueGroup("region", cues.region),
    formatCueGroup("season", cues.season),
  ].filter(Boolean);

  return segments.join(" | ") || "No grounded cues detected yet.";
}

function formatCueGroup(label: string, values: string[]): string {
  if (values.length === 0) {
    return "";
  }

  return `${label}: ${values.join(", ")}`;
}

function formatMissingSummary(missing: string[]): string {
  return missing.length > 0 ? missing.join(", ") : "No clarification needed.";
}

function formatSavedAtLabel(savedAt: string): string {
  const date = new Date(savedAt);

  if (Number.isNaN(date.getTime())) {
    return savedAt;
  }

  return `Saved ${date.toISOString().slice(0, 16).replace("T", " ")}`;
}

function renderMapFeature(
  feature: HomeScreenModel["mapView"]["features"][number],
  width: number,
  height: number,
  bounds: HomeScreenModel["mapView"]["viewport"]["bounds"],
  isActive: boolean,
): string {
  const tone = feature.sourceSection === "recent-sessions" ? "#0b6e4f" : "#1e1a16";
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
        <path data-map-marker-ring d="M ${ring}" fill="rgba(11,110,79,0.12)" stroke="${tone}" stroke-width="2"/>
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
    <circle cx="${x}" cy="${y}" r="4" fill="rgba(160,90,42,0.75)"/>
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

function serializeMapClientState(mapView: HomeScreenModel["mapView"]): string {
  return JSON.stringify({
    basemap: mapView.basemap,
    viewport: mapView.viewport,
    features: mapView.features,
    overlays: mapView.overlays,
  });
}

function renderMapEnhancementScript(): string {
  return `
(() => {
  const svgNamespace = "http://www.w3.org/2000/svg";
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const clampLatitude = (latitude) => clamp(latitude, -85.05112878, 85.05112878);
  const createSvgNode = (name) => document.createElementNS(svgNamespace, name);
  const setAttributes = (element, attributes) => {
    for (const [name, value] of Object.entries(attributes)) {
      if (value === null || value === undefined) continue;

      element.setAttribute(name, String(value));
    }

    return element;
  };
  const projectWorldPoint = (point, zoom) => {
    const size = 256 * 2 ** zoom;
    const latitude = clampLatitude(point.latitude);
    const x = ((point.longitude + 180) / 360) * size;
    const sinLatitude = Math.sin((latitude * Math.PI) / 180);
    const y = (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) * size;

    return { x, y };
  };
  const createProjector = (center, zoom, width, height) => {
    const centerWorld = projectWorldPoint(center, zoom);
    const topLeft = {
      x: centerWorld.x - width / 2,
      y: centerWorld.y - height / 2,
    };

    return (point) => {
      const world = projectWorldPoint(point, zoom);

      return {
        x: world.x - topLeft.x,
        y: world.y - topLeft.y,
      };
    };
  };
  const createTileUrl = (template, zoom, x, y) =>
    template.replaceAll("{z}", String(zoom)).replaceAll("{x}", String(x)).replaceAll("{y}", String(y));
  const collectOverlayPoints = (overlays) =>
    overlays.flatMap((overlay) => (overlay.status === "ready" ? overlay.points : []));
  const renderTiles = (container, template, center, zoom, width, height) => {
    const centerWorld = projectWorldPoint(center, zoom);
    const topLeft = {
      x: centerWorld.x - width / 2,
      y: centerWorld.y - height / 2,
    };
    const maxTileIndex = 2 ** zoom - 1;
    const startX = Math.floor(topLeft.x / 256);
    const startY = Math.floor(topLeft.y / 256);
    const endX = Math.floor((topLeft.x + width) / 256);
    const endY = Math.floor((topLeft.y + height) / 256);

    container.textContent = "";

    for (let tileX = startX; tileX <= endX; tileX += 1) {
      for (let tileY = startY; tileY <= endY; tileY += 1) {
        if (tileY < 0 || tileY > maxTileIndex) {
          continue;
        }

        const wrappedX = ((tileX % (maxTileIndex + 1)) + (maxTileIndex + 1)) % (maxTileIndex + 1);
        const tile = document.createElement("img");

        tile.alt = "";
        tile.loading = "lazy";
        tile.decoding = "async";
        tile.src = createTileUrl(template, zoom, wrappedX, tileY);
        tile.width = 256;
        tile.height = 256;
        tile.style.left = \`\${tileX * 256 - topLeft.x}px\`;
        tile.style.top = \`\${tileY * 256 - topLeft.y}px\`;
        tile.style.position = "absolute";
        tile.style.width = "256px";
        tile.style.height = "256px";
        container.appendChild(tile);
      }
    }
  };
  const renderBrowserOverlay = (layer, features, overlayPoints, projector, activeId, width, height) => {
    layer.textContent = "";
    layer.setAttribute("viewBox", \`0 0 \${width} \${height}\`);

    for (const overlayPoint of overlayPoints) {
      const position = projector(overlayPoint.point);
      const node = setAttributes(createSvgNode("circle"), {
        cx: position.x,
        cy: position.y,
        r: 4,
        fill: "rgba(160,90,42,0.72)",
      });

      layer.appendChild(node);
    }

    for (const feature of features) {
      const active = feature.id === activeId;
      const tone = feature.sourceSection === "recent-sessions" ? "#0b6e4f" : "#1e1a16";
      const group = setAttributes(createSvgNode("g"), {
        "data-browser-feature-id": feature.id,
        "data-map-active": active ? "true" : "false",
      });
      let labelPosition = null;

      switch (feature.geometry.kind) {
        case "point": {
          const position = projector(feature.geometry.point);

          group.appendChild(
            setAttributes(createSvgNode("circle"), {
              cx: position.x,
              cy: position.y,
              r: active ? 15 : 12,
              fill: "rgba(255,255,255,0.82)",
              stroke: tone,
              "stroke-width": active ? 3 : 2,
            }),
          );
          group.appendChild(
            setAttributes(createSvgNode("circle"), {
              cx: position.x,
              cy: position.y,
              r: active ? 6 : 5,
              fill: tone,
            }),
          );
          labelPosition = position;
          break;
        }
        case "area": {
          const ring = feature.geometry.ring.map((point) => projector(point));
          const center = projector(feature.geometry.center);

          group.appendChild(
            setAttributes(createSvgNode("path"), {
              d: \`M \${ring.map((point) => \`\${point.x} \${point.y}\`).join(" L ")} Z\`,
              fill: active ? "rgba(11,110,79,0.22)" : "rgba(11,110,79,0.12)",
              stroke: tone,
              "stroke-width": active ? 3 : 2,
            }),
          );
          group.appendChild(
            setAttributes(createSvgNode("circle"), {
              cx: center.x,
              cy: center.y,
              r: active ? 6 : 5,
              fill: tone,
            }),
          );
          labelPosition = center;
          break;
        }
        case "trail": {
          const points = feature.geometry.points.map((point) => projector(point));

          group.appendChild(
            setAttributes(createSvgNode("path"), {
              d: \`M \${points[0].x} \${points[0].y} Q \${points[1].x} \${points[1].y} \${points[2].x} \${points[2].y}\`,
              fill: "none",
              stroke: tone,
              "stroke-width": active ? 5 : 4,
              "stroke-linecap": "round",
            }),
          );
          group.appendChild(
            setAttributes(createSvgNode("circle"), {
              cx: points[1].x,
              cy: points[1].y,
              r: active ? 7 : 6,
              fill: tone,
            }),
          );
          labelPosition = points[1];
          break;
        }
      }

      if (active && labelPosition) {
        const label = setAttributes(createSvgNode("text"), {
          x: labelPosition.x + 16,
          y: labelPosition.y - 12,
          fill: "rgba(30,26,22,0.88)",
          "font-size": 12,
          "font-weight": 600,
        });

        label.textContent = feature.label;
        group.appendChild(label);
      }

      layer.appendChild(group);
    }
  };

  for (const root of document.querySelectorAll("[data-map-root]")) {
    const featureNodes = Array.from(root.querySelectorAll("[data-map-feature]"));
    const itemNodes = Array.from(root.querySelectorAll("[data-map-item]"));
    const detailMeta = root.querySelector("[data-map-detail-meta]");
    const detailLabel = root.querySelector("[data-map-detail-label]");
    const detailSummary = root.querySelector("[data-map-detail-summary]");
    const detailEvidence = root.querySelector("[data-map-detail-evidence]");
    const browserFrame = root.querySelector("[data-map-browser-frame]");
    const tileLayer = root.querySelector("[data-map-tiles]");
    const browserOverlay = root.querySelector("[data-map-browser-overlay]");
    const browserSource = root.querySelector("[data-map-browser-source]");
    const browserAttribution = root.querySelector("[data-map-browser-attribution]");
    const browserZoom = root.querySelector("[data-map-browser-zoom]");
    const zoomControls = root.querySelector("[data-map-zoom-controls]");
    const zoomOut = root.querySelector("[data-map-zoom-out]");
    const zoomIn = root.querySelector("[data-map-zoom-in]");
    const fallbackFrame = root.querySelector("[data-map-fallback]");
    const rawState = root.getAttribute("data-map-state");
    const state = rawState ? JSON.parse(rawState) : null;
    let activeZoom = null;
    let browserReady = false;
    const renderBrowserMap = (activeId) => {
      if (
        !state ||
        !state.basemap ||
        !state.basemap.available ||
        !state.basemap.tileTemplateUrl ||
        !browserFrame ||
        !tileLayer ||
        !browserOverlay ||
        !fallbackFrame
      ) {
        return;
      }

      const frameWidth = browserFrame.clientWidth || state.viewport.width;
      const frameHeight = browserFrame.clientHeight || state.viewport.height;
      const minZoom = Number.isFinite(state.basemap.minZoom) ? state.basemap.minZoom : 0;
      const maxZoom = Number.isFinite(state.basemap.maxZoom) ? state.basemap.maxZoom : 16;

      if (activeZoom === null) {
        activeZoom = clamp(Math.round(state.viewport.zoom ?? minZoom), minZoom, maxZoom);
      }

      renderTiles(tileLayer, state.basemap.tileTemplateUrl, state.viewport.center, activeZoom, frameWidth, frameHeight);
      renderBrowserOverlay(
        browserOverlay,
        state.features,
        collectOverlayPoints(state.overlays ?? []),
        createProjector(state.viewport.center, activeZoom, frameWidth, frameHeight),
        activeId,
        frameWidth,
        frameHeight,
      );

      browserFrame.removeAttribute("hidden");
      browserFrame.setAttribute("data-map-mode", "browser");
      fallbackFrame.setAttribute("hidden", "");

      if (!browserReady) {
        root.setAttribute("data-map-browser", "true");
        zoomControls?.removeAttribute("hidden");

        zoomOut?.addEventListener("click", () => {
          activeZoom = clamp((activeZoom ?? minZoom) - 1, minZoom, maxZoom);
          renderBrowserMap(root.getAttribute("data-map-active-id"));
        });

        zoomIn?.addEventListener("click", () => {
          activeZoom = clamp((activeZoom ?? minZoom) + 1, minZoom, maxZoom);
          renderBrowserMap(root.getAttribute("data-map-active-id"));
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

      for (const node of root.querySelectorAll("[data-browser-feature-id]")) {
        const isActive = node.getAttribute("data-browser-feature-id") === id;

        node.setAttribute("data-map-active", isActive ? "true" : "false");
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

    const initialId =
      root.getAttribute("data-map-active-id") ??
      itemNodes[0]?.getAttribute("data-map-item") ??
      featureNodes[0]?.getAttribute("data-map-feature");

    activate(initialId);
  }
})();
`.trim();
}

function longitudeToFrame(longitude: number, bounds: HomeScreenModel["mapView"]["viewport"]["bounds"], frameWidth: number): number {
  return ((longitude - bounds.west) / (bounds.east - bounds.west)) * frameWidth;
}

function latitudeToFrame(latitude: number, bounds: HomeScreenModel["mapView"]["viewport"]["bounds"], frameHeight: number): number {
  return ((bounds.north - latitude) / (bounds.north - bounds.south)) * frameHeight;
}
