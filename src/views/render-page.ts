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
  <body class="min-h-screen bg-app-canvas text-app-text antialiased" data-trace-id="${escapeHtml(input.traceId)}">
    ${input.body}
    ${(input.scriptUrls ?? []).map((src) => `<script src="${escapeHtml(src)}"></script>`).join("")}
    ${(input.scripts ?? []).map((script) => `<script>${script}</script>`).join("")}
  </body>
</html>`;
}
