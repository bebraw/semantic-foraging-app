import { escapeHtml } from "./shared";

export type PageRenderInput = {
  title: string;
  body: string;
  traceId: string;
  stylesheets?: string[];
  scriptUrls?: string[];
  scripts?: string[];
};

export function renderPage(input: PageRenderInput): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(input.title)}</title>
    <link rel="stylesheet" href="/styles.css">
    ${(input.stylesheets ?? []).map((href) => `<link rel="stylesheet" href="${escapeHtml(href)}">`).join("")}
  </head>
  <body class="min-h-screen bg-app-canvas text-app-text antialiased">
    ${input.body}
    <footer class="mx-auto mt-4 w-[min(64rem,calc(100vw-2rem))] px-1 pb-8 text-[11px] uppercase tracking-[0.2em] text-app-text-soft">
      Trace ID: <span class="font-semibold text-app-accent-strong">${escapeHtml(input.traceId)}</span>
    </footer>
    ${(input.scriptUrls ?? []).map((src) => `<script src="${escapeHtml(src)}"></script>`).join("")}
    ${(input.scripts ?? []).map((script) => `<script>${script}</script>`).join("")}
  </body>
</html>`;
}
