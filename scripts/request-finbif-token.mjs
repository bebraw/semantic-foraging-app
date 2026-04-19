const requestPath = "/v0/api-users";
const usage = `Usage:
  npm run finbif:request-token -- you@example.com

This requests a FinBIF access token email using the documented finbif flow.
After the token arrives, add FINBIF_ACCESS_TOKEN=... to .dev.vars.`;

const email = process.argv[2]?.trim();

if (!email) {
  console.error(usage);
  process.exitCode = 1;
} else {
  await requestFinbifToken(email);
}

async function requestFinbifToken(emailAddress) {
  const response = await fetch(`https://api.laji.fi${requestPath}`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "user-agent": "semantic-foraging-app/request-finbif-token",
    },
    body: JSON.stringify({ email: emailAddress }),
  });

  const payload = await readPayload(response);

  if (!response.ok) {
    const message = readErrorMessage(payload) ?? `FinBIF token request failed with HTTP ${response.status}.`;
    throw new Error(message);
  }

  console.log(`Requested a FinBIF access token for ${emailAddress}.`);
  console.log("Check that inbox, then add FINBIF_ACCESS_TOKEN=... to .dev.vars.");
}

async function readPayload(response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

function readErrorMessage(payload) {
  if (!payload || typeof payload !== "object") {
    return typeof payload === "string" && payload.trim() ? payload : null;
  }

  if ("error" in payload && payload.error && typeof payload.error === "object" && "message" in payload.error) {
    const message = payload.error.message;
    return typeof message === "string" && message.trim() ? message : null;
  }

  if ("message" in payload) {
    const message = payload.message;
    return typeof message === "string" && message.trim() ? message : null;
  }

  return null;
}
