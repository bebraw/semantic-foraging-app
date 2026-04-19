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
            <h2 class="mb-3 text-lg font-semibold tracking-[-0.02em]">${escapeHtml(screen.retrievalTitle)}</h2>
            <p class="leading-7 text-app-text-soft">${escapeHtml(screen.retrievalBody)}</p>
            ${
              screen.candidateCards.length > 0
                ? `<ul class="mt-6 grid gap-4 lg:grid-cols-2">${candidateMarkup}</ul>`
                : `<p class="mt-4 rounded-2xl border border-dashed border-app-line/80 bg-app-canvas/40 px-4 py-4 leading-7 text-app-text-soft">${escapeHtml(screen.retrievalEmptyState)}</p>`
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
