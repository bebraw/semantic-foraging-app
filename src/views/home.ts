import type { HomeScreenModel } from "../domain/contracts/screen";
import { escapeHtml } from "./shared";
import { renderPage } from "./render-page";

export function renderHomePage(screen: HomeScreenModel): string {
  const alertList = screen.alerts
    .map(
      (alert) =>
        `<li class="rounded-xl border px-4 py-3 ${alert.tone === "error" ? "border-rose-200 bg-rose-50/70 text-rose-950" : "border-sky-200 bg-sky-50/70 text-sky-950"}">
          <p class="text-[11px] font-semibold uppercase tracking-[0.18em]">${escapeHtml(alert.title)}</p>
          <p class="mt-2 leading-7">${escapeHtml(alert.body)}</p>
        </li>`,
    )
    .join("");
  const latestIntent = screen.intentWorkbench.latestSubmission;
  const latestExplanation = screen.explanationWorkbench.latestSubmission;
  const completedIntent = latestIntent?.workflow.state === "completed" ? latestIntent : null;
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
            class="w-full rounded-xl border border-app-line/80 bg-app-surface px-4 py-3 text-left"
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
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text-soft">${escapeHtml(feature.kind)} / ${escapeHtml(feature.sourceSection)}</p>
            <p class="mt-2 font-medium">${escapeHtml(feature.label)}</p>
            <p class="mt-2 text-sm leading-6 text-app-text-soft">${escapeHtml(feature.evidenceSummary)}</p>
          </button>
        </li>`,
    )
    .join("");
  const overlayStatusMarkup = overlay
    ? `<div class="border-t border-app-line/80 pt-3">
        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text-soft">${escapeHtml(overlay.label)} / ${escapeHtml(overlay.provider)}</p>
        <p class="mt-2 text-sm leading-6 text-app-text-soft">${escapeHtml(overlay.note)}</p>
      </div>`
    : "";
  const recentSessionMarkup = screen.recentSessions
    .map(
      (session) =>
        `<li class="grid gap-3 border-b border-app-line/80 py-4 last:border-b-0 last:pb-0 first:pt-0">
          <div class="flex flex-wrap items-center gap-3">
            <p class="rounded-full bg-app-accent-ghost px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-app-accent-strong">${escapeHtml(session.sourceIntent)}</p>
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
  const savedArtifactMarkup = screen.savedArtifacts
    .map(
      (artifact) =>
        `<li class="grid gap-3 border-b border-app-line/80 py-4 last:border-b-0 last:pb-0 first:pt-0">
          <div class="flex flex-wrap items-center gap-3">
            <p class="rounded-full bg-app-accent-ghost px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-app-accent-strong">${escapeHtml(artifact.kind)}</p>
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text-soft">${escapeHtml(artifact.sourceIntent)}</p>
            <p class="text-sm text-app-text-soft">${escapeHtml(formatSavedAtLabel(artifact.savedAt))}</p>
          </div>
          <div>
            <h3 class="text-lg font-semibold tracking-[-0.02em]">${escapeHtml(artifact.title)}</h3>
            <p class="mt-2 leading-7 text-app-text-soft">${escapeHtml(artifact.summary)}</p>
          </div>
          <p class="text-sm text-app-text-soft">Detected cues: ${escapeHtml(formatCueSummary(artifact.cues))}</p>
          <form class="flex flex-wrap items-center gap-3" method="post" action="${escapeHtml(screen.artifactWorkbench.useActionPath)}">
            <input type="hidden" name="artifactId" value="${escapeHtml(artifact.artifactId)}">
            <button class="inline-flex w-fit items-center rounded-lg bg-app-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-text" type="submit">Use in workbench</button>
          </form>
        </li>`,
    )
    .join("");
  const candidateMarkup = screen.candidateCards
    .map(
      (card) =>
        `<li class="grid gap-4 border-b border-app-line/80 py-4 last:border-b-0 last:pb-0 first:pt-0">
          <div class="flex flex-wrap items-center gap-3">
            <p class="rounded-full bg-app-accent-ghost px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-app-accent-strong">${escapeHtml(card.kind)}</p>
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
                  `<div class="border-l-2 border-app-line pl-4">
                    <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-text-soft">${escapeHtml(note.label)}</dt>
                    <dd class="mt-1 leading-7">${escapeHtml(note.detail)}</dd>
                  </div>`,
              )
              .join("")}
          </dl>
          ${renderArtifactSaveForm(card, completedIntent, screen.artifactWorkbench.saveActionPath)}
        </li>`,
    )
    .join("");
  const latestIntentMarkup = latestIntent
    ? `<div class="grid gap-3 border-t border-app-line/80 pt-4">
        <h3 class="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text-soft">Latest intent result</h3>
        <dl class="grid gap-3 sm:grid-cols-2">
          <div>
            <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-text-soft">Input</dt>
            <dd class="mt-1 font-medium">${escapeHtml(latestIntent.input)}</dd>
          </div>
          <div>
            <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-text-soft">Intent</dt>
            <dd class="mt-1 font-medium">${escapeHtml(latestIntent.classification.intent)}</dd>
          </div>
          <div>
            <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-text-soft">Confidence</dt>
            <dd class="mt-1 font-medium">${escapeHtml(`${latestIntent.confidenceBand} (${latestIntent.classification.confidence.toFixed(2)})`)}</dd>
          </div>
          <div>
            <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-text-soft">Workflow</dt>
            <dd class="mt-1 font-medium">${escapeHtml(latestIntent.workflow.state)}</dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-text-soft">Provenance</dt>
            <dd class="mt-1 font-medium">${escapeHtml(`${latestIntent.provenance.source} / ${latestIntent.provenance.reason ?? "n/a"}`)}</dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-text-soft">Detected cues</dt>
            <dd class="mt-1 font-medium">${escapeHtml(formatCueSummary(latestIntent.classification.cues))}</dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-text-soft">Clarification focus</dt>
            <dd class="mt-1 font-medium">${escapeHtml(formatMissingSummary(latestIntent.classification.missing))}</dd>
          </div>
        </dl>
      </div>`
    : "";
  const clarificationMarkup = clarificationWorkflow
    ? `<div class="grid gap-3 border-l-2 border-amber-300 pl-4">
        <h3 class="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-950">Clarification needed</h3>
        <p class="leading-7 text-amber-950">${escapeHtml(clarificationWorkflow.question)}</p>
        <p class="text-sm text-amber-900">Allowed intents: ${clarificationWorkflow.options.map((option) => escapeHtml(option)).join(", ")}</p>
        <form class="grid gap-4" method="post" action="${escapeHtml(screen.intentWorkbench.clarificationActionPath)}">
          <input type="hidden" name="${escapeHtml(screen.intentWorkbench.clarificationWorkflowIdName)}" value="${escapeHtml(clarificationWorkflow.workflowId)}">
          <label class="grid gap-2">
            <span class="text-sm font-semibold">${escapeHtml(screen.intentWorkbench.clarificationLabel)}</span>
            <textarea name="${escapeHtml(screen.intentWorkbench.clarificationName)}" class="min-h-24 rounded-xl border border-amber-200 bg-white px-4 py-3 leading-7 text-app-text" placeholder="${escapeHtml(screen.intentWorkbench.clarificationPlaceholder)}">${escapeHtml(screen.intentWorkbench.clarificationValue)}</textarea>
          </label>
          <button class="inline-flex w-fit items-center rounded-lg bg-app-ink px-4 py-2 text-sm font-semibold text-app-ink-text" type="submit">Continue workflow</button>
        </form>
      </div>`
    : "";
  const latestExplanationMarkup = latestExplanation
    ? `<div class="grid gap-3 border-t border-app-line/80 pt-4">
        <h3 class="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text-soft">Latest explanation</h3>
        <p class="font-medium">${escapeHtml(latestExplanation.title)}</p>
        <p class="leading-7 text-app-text-soft">${escapeHtml(latestExplanation.explanation)}</p>
        <p class="text-sm text-app-text-soft">Provenance: ${escapeHtml(`${latestExplanation.provenance.source} / ${latestExplanation.provenance.reason ?? "n/a"}`)}</p>
      </div>`
    : "";

  return renderPage({
    title: screen.title,
    traceId: screen.meta.traceId,
    stylesheets: screen.mapView.features.length > 0 ? ["/vendor/leaflet.css"] : [],
    scriptUrls: screen.mapView.features.length > 0 ? ["/vendor/leaflet.js"] : [],
    scripts: screen.mapView.features.length > 0 ? [renderMapEnhancementScript()] : [],
    body: `<main class="mx-auto w-[min(58rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-app-line bg-app-surface shadow-panel py-10 sm:py-12">
        <section class="border-b border-app-line px-5 py-8 sm:px-8 sm:py-10">
          <p class="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-app-accent">${escapeHtml(screen.eyebrow)}</p>
          <h1 class="max-w-[14ch] text-4xl leading-tight font-semibold tracking-[-0.04em] sm:text-5xl">${escapeHtml(screen.title)}</h1>
          ${screen.description ? `<p class="mt-4 max-w-3xl text-lg leading-8 text-app-text-soft">${escapeHtml(screen.description)}</p>` : ""}
          ${
            screen.overviewTitle || screen.overviewBody
              ? `<div class="mt-6 border-l-2 border-app-accent pl-4">
            ${screen.overviewTitle ? `<p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text-soft">${escapeHtml(screen.overviewTitle)}</p>` : ""}
            ${screen.overviewBody ? `<p class="mt-2 max-w-3xl leading-7 text-app-text-soft">${escapeHtml(screen.overviewBody)}</p>` : ""}
          </div>`
              : ""
          }
        </section>
        <div class="grid gap-5 px-5 py-6 sm:px-8 sm:py-8">
          ${screen.alerts.length > 0 ? `<ul class="grid gap-3">${alertList}</ul>` : ""}
          <section class="grid gap-5">
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-accent">${escapeHtml(screen.workbenchTitle)}</p>
            <div>
              <h2 class="text-2xl font-semibold tracking-[-0.03em]">${escapeHtml(screen.intentWorkbench.title)}</h2>
              ${screen.workbenchBody ? `<p class="mt-2 max-w-3xl leading-7 text-app-text-soft">${escapeHtml(screen.workbenchBody)}</p>` : ""}
              ${
                screen.intentWorkbench.description
                  ? `<p class="${screen.workbenchBody ? "mt-3" : "mt-2"} max-w-3xl leading-7 text-app-text-soft">${escapeHtml(screen.intentWorkbench.description)}</p>`
                  : ""
              }
            </div>
            <form class="grid gap-4" method="post" action="${escapeHtml(screen.intentWorkbench.actionPath)}">
              <label class="grid gap-2">
                <span class="text-sm font-semibold">${escapeHtml(screen.intentWorkbench.rawInputLabel)}</span>
                <textarea name="${escapeHtml(screen.intentWorkbench.rawInputName)}" class="min-h-32 rounded-xl border border-app-line bg-app-canvas px-4 py-4 leading-7 text-app-text" placeholder="${escapeHtml(screen.intentWorkbench.rawInputPlaceholder)}">${escapeHtml(screen.intentWorkbench.rawInputValue)}</textarea>
              </label>
              <div class="flex flex-wrap items-center gap-3">
                <button class="inline-flex w-fit items-center rounded-lg bg-app-ink px-4 py-2 text-sm font-semibold text-app-ink-text" type="submit">${escapeHtml(screen.intentWorkbench.submitLabel)}</button>
              </div>
            </form>
            ${latestIntentMarkup}
            ${clarificationMarkup}
          </section>
          <section class="grid gap-5 border-t border-app-line pt-6">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text-soft">${escapeHtml(screen.explanationWorkbench.title)}</p>
              ${
                screen.explanationWorkbench.description
                  ? `<p class="mt-2 max-w-3xl leading-7 text-app-text-soft">${escapeHtml(screen.explanationWorkbench.description)}</p>`
                  : ""
              }
            </div>
            <form class="mt-5 grid gap-4" method="post" action="${escapeHtml(screen.explanationWorkbench.actionPath)}">
              <label class="grid gap-2">
                <span class="text-sm font-semibold">${escapeHtml(screen.explanationWorkbench.titleLabel)}</span>
                <input name="${escapeHtml(screen.explanationWorkbench.titleName)}" class="rounded-xl border border-app-line bg-app-canvas px-4 py-3 text-app-text" placeholder="${escapeHtml(screen.explanationWorkbench.titlePlaceholder)}" value="${escapeHtml(screen.explanationWorkbench.titleValue)}">
              </label>
              <label class="grid gap-2">
                <span class="text-sm font-semibold">${escapeHtml(screen.explanationWorkbench.factsLabel)}</span>
                <textarea name="${escapeHtml(screen.explanationWorkbench.factsName)}" class="min-h-28 rounded-xl border border-app-line bg-app-canvas px-4 py-3 leading-7 text-app-text" placeholder="${escapeHtml(screen.explanationWorkbench.factsPlaceholder)}">${escapeHtml(screen.explanationWorkbench.factsValue)}</textarea>
              </label>
              <button class="inline-flex w-fit items-center rounded-lg bg-app-ink px-4 py-2 text-sm font-semibold text-app-ink-text" type="submit">${escapeHtml(screen.explanationWorkbench.submitLabel)}</button>
            </form>
            <div class="mt-5">
              ${latestExplanationMarkup}
            </div>
          </section>
          <section class="border-t border-app-line pt-6">
            <h2 class="mb-3 text-lg font-semibold tracking-[-0.02em]">${escapeHtml(screen.mapView.title)}</h2>
            <p class="leading-7 text-app-text-soft">${escapeHtml(screen.mapView.description)}</p>
            ${
              screen.mapView.features.length > 0
                ? `<div class="mt-6 grid gap-5" data-map-root data-map-active-id="${escapeHtml(initialMapFeature?.id ?? "")}" data-map-state="${escapeHtml(serializedMapState)}">
                    <figure class="overflow-hidden rounded-xl border border-app-line bg-app-canvas p-4">
                      <div class="relative aspect-[16/9]">
                        <div class="absolute inset-0 hidden overflow-hidden rounded-[0.9rem] border border-app-line bg-[#edf4fb]" data-map-browser-frame aria-hidden="true">
                          <div class="absolute inset-0" data-map-leaflet></div>
                          <div class="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap items-end justify-between gap-3" data-map-browser-chrome>
                            <p class="max-w-[18rem] rounded-full border border-app-line bg-white/96 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-app-text-soft" data-map-browser-source></p>
                            <p class="rounded-full border border-app-line bg-white/96 px-3 py-1 text-[11px] font-semibold text-app-text-soft" data-map-browser-attribution></p>
                            <p class="rounded-full border border-app-line bg-white/96 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-app-text-soft" data-map-browser-zoom></p>
                          </div>
                        </div>
                        <svg viewBox="0 0 ${screen.mapView.viewport.width} ${screen.mapView.viewport.height}" class="absolute inset-0 h-full w-full rounded-[0.9rem] border border-app-line bg-app-canvas" role="img" aria-label="${escapeHtml(screen.mapView.viewport.frameLabel)}" data-map-fallback>
                          <rect x="18" y="22" width="604" height="316" rx="26" fill="rgba(255,255,255,0.42)" stroke="rgba(30,26,22,0.08)"/>
                          ${renderMapGraticule(screen.mapView.viewport.width, screen.mapView.viewport.height, screen.mapView.viewport.bounds)}
                          ${overlayMarkup}
                          ${mapMarkup}
                        </svg>
                        <div class="absolute right-3 top-3 hidden gap-2" data-map-zoom-controls>
                          <button class="rounded-full border border-app-line bg-white/96 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-app-text" type="button" data-map-zoom-out aria-label="Zoom out">-</button>
                          <button class="rounded-full border border-app-line bg-white/96 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-app-text" type="button" data-map-zoom-in aria-label="Zoom in">+</button>
                        </div>
                      </div>
                    </figure>
                    <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)]">
                      <div class="grid gap-3">
                        <div class="border-t border-app-line/80 pt-3">
                          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text-soft">Focused lead</p>
                          <p class="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-app-accent" data-map-detail-meta>${escapeHtml(formatMapDetailMeta(initialMapFeature))}</p>
                          <h3 class="mt-3 text-lg font-semibold tracking-[-0.02em]" data-map-detail-label>${escapeHtml(initialMapFeature?.label ?? "")}</h3>
                          <p class="mt-3 leading-7 text-app-text-soft" data-map-detail-summary>${escapeHtml(initialMapFeature?.summary ?? "")}</p>
                          <p class="mt-3 text-sm leading-6 text-app-text-soft" data-map-detail-evidence>${escapeHtml(initialMapFeature?.evidenceSummary ?? "")}</p>
                        </div>
                        <div class="border-t border-app-line/80 pt-3">
                          <h3 class="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text-soft">${escapeHtml(screen.mapView.legendTitle)}</h3>
                          <ul class="mt-3 grid gap-3">${mapLegendMarkup}</ul>
                        </div>
                      </div>
                      <div class="grid gap-3">
                      <div class="border-t border-app-line/80 pt-3">
                        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text-soft">${escapeHtml(screen.mapView.basemap.label)}</p>
                        <p class="mt-2 text-sm leading-6 text-app-text-soft">${escapeHtml(screen.mapView.basemap.note)}</p>
                        <p class="mt-3 text-[11px] uppercase tracking-[0.16em] text-app-text-soft">Bounds: ${escapeHtml(formatBoundsLabel(screen.mapView.viewport.bounds))}</p>
                      </div>
                      <div class="border-t border-app-line/80 pt-3">
                        <div class="flex flex-wrap items-center justify-between gap-3">
                          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-text-soft">${escapeHtml(
                            screen.mapView.locationControl.title,
                          )}</p>
                          <button class="inline-flex items-center rounded-lg bg-app-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-text" type="button" data-map-locate>
                            ${escapeHtml(screen.mapView.locationControl.actionLabel)}
                          </button>
                        </div>
                        <p class="mt-3 text-sm leading-6 text-app-text-soft" role="status" aria-live="polite" data-map-location-status>${escapeHtml(
                          screen.mapView.locationControl.idleLabel,
                        )}</p>
                        <p class="mt-3 text-xs leading-5 text-app-text-soft" data-map-location-privacy>${escapeHtml(
                          screen.mapView.locationControl.privacyNote,
                        )}</p>
                      </div>
                      ${overlayStatusMarkup}
                      </div>
                    </div>
                  </div>`
                : `<p class="mt-4 rounded-xl border border-dashed border-app-line px-4 py-4 leading-7 text-app-text-soft">${escapeHtml(screen.mapView.emptyState)}</p>`
            }
          </section>
          <section class="border-t border-app-line pt-6">
            <h2 class="mb-3 text-lg font-semibold tracking-[-0.02em]">${escapeHtml(screen.retrievalTitle)}</h2>
            ${screen.retrievalBody ? `<p class="leading-7 text-app-text-soft">${escapeHtml(screen.retrievalBody)}</p>` : ""}
            ${
              screen.candidateCards.length > 0
                ? `<ul class="${screen.retrievalBody ? "mt-4" : ""}">${candidateMarkup}</ul>`
                : `<p class="${screen.retrievalBody ? "mt-4 " : ""}rounded-xl border border-dashed border-app-line px-4 py-4 leading-7 text-app-text-soft">${escapeHtml(screen.retrievalEmptyState)}</p>`
            }
          </section>
          <section class="border-t border-app-line pt-6">
            <h2 class="mb-3 text-lg font-semibold tracking-[-0.02em]">${escapeHtml(screen.savedArtifactsTitle)}</h2>
            ${screen.savedArtifactsBody ? `<p class="leading-7 text-app-text-soft">${escapeHtml(screen.savedArtifactsBody)}</p>` : ""}
            ${
              screen.savedArtifacts.length > 0
                ? `<ul class="${screen.savedArtifactsBody ? "mt-4" : ""}">${savedArtifactMarkup}</ul>`
                : `<p class="${screen.savedArtifactsBody ? "mt-4 " : ""}rounded-xl border border-dashed border-app-line px-4 py-4 leading-7 text-app-text-soft">${escapeHtml(screen.savedArtifactsEmptyState)}</p>`
            }
          </section>
          <section class="border-t border-app-line pt-6">
            <h2 class="mb-3 text-lg font-semibold tracking-[-0.02em]">${escapeHtml(screen.recentSessionsTitle)}</h2>
            ${screen.recentSessionsBody ? `<p class="leading-7 text-app-text-soft">${escapeHtml(screen.recentSessionsBody)}</p>` : ""}
            ${
              screen.recentSessions.length > 0
                ? `<ul class="${screen.recentSessionsBody ? "mt-4" : ""}">${recentSessionMarkup}</ul>`
                : `<p class="${screen.recentSessionsBody ? "mt-4 " : ""}rounded-xl border border-dashed border-app-line px-4 py-4 leading-7 text-app-text-soft">${escapeHtml(screen.recentSessionsEmptyState)}</p>`
            }
          </section>
        </div>
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
    <button class="inline-flex w-fit items-center rounded-lg bg-app-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-text" type="submit">${escapeHtml(getArtifactSaveLabel(card.kind))}</button>
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
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const leaflet = window.L;
  const collectOverlayPoints = (overlays) => overlays.flatMap((overlay) => (overlay.status === "ready" ? overlay.points : []));
  const formatCoordinate = (value, positiveSuffix, negativeSuffix) =>
    \`\${Math.abs(value).toFixed(4)}°\${value >= 0 ? positiveSuffix : negativeSuffix}\`;
  const formatLocationMessage = (control, point) =>
    \`\${control.activeLabel} \${formatCoordinate(point.latitude, "N", "S")}, \${formatCoordinate(point.longitude, "E", "W")}\`;
  const toLatLng = (point) => [point.latitude, point.longitude];
  const featureAnchor = (feature) => {
    switch (feature.geometry.kind) {
      case "point":
        return feature.geometry.point;
      case "area":
        return feature.geometry.center;
      case "trail":
        return feature.geometry.points[1];
    }
  };
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
})();
`.trim();
}

function longitudeToFrame(longitude: number, bounds: HomeScreenModel["mapView"]["viewport"]["bounds"], frameWidth: number): number {
  return ((longitude - bounds.west) / (bounds.east - bounds.west)) * frameWidth;
}

function latitudeToFrame(latitude: number, bounds: HomeScreenModel["mapView"]["viewport"]["bounds"], frameHeight: number): number {
  return ((bounds.north - latitude) / (bounds.north - bounds.south)) * frameHeight;
}
