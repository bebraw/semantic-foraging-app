import type { HomeScreenModel } from "../domain/contracts/screen";
import { escapeHtml } from "./shared";
import { renderPage } from "./render-page";

export function renderHomePage(screen: HomeScreenModel): string {
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
          <section class="rounded-[1rem] border border-app-line/70 bg-white/72 p-6 shadow-[0_16px_40px_-30px_rgba(30,26,22,0.3)]">
            <h2 class="mb-3 text-lg font-semibold tracking-[-0.02em]">${escapeHtml(screen.overviewTitle)}</h2>
            <p class="leading-7 text-app-text-soft">${escapeHtml(screen.overviewBody)}</p>
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
