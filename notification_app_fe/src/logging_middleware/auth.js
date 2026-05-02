// Frontend-local authentication helper for logging middleware
// Keeps the React app self-contained so CRA does not import files outside src

const AUTH_ENDPOINT = "/evaluation-service/auth";

let currentConfig = {
  apiBaseUrl: process.env.REACT_APP_API_BASE_URL || "http://localhost:5000",
  credentials: {
    email: "",
    name: "",
    rollNo: "",
    accessCode: "",
    clientID: "",
    clientSecret: "",
  },
};

let tokenState = {
  token: null,
  expiryMs: 0,
};

function normalizeBaseUrl(baseUrl) {
  if (!baseUrl || typeof baseUrl !== "string") {
    return "";
  }
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function normalizeCredentials(credentials) {
  const safeCredentials = credentials && typeof credentials === "object" ? credentials : {};
  return {
    email: safeCredentials.email || "",
    name: safeCredentials.name || "",
    rollNo: safeCredentials.rollNo || "",
    accessCode: safeCredentials.accessCode || "",
    clientID: safeCredentials.clientID || "",
    clientSecret: safeCredentials.clientSecret || "",
  };
}

function validateCredentials(credentials) {
  const required = ["email", "name", "rollNo", "accessCode", "clientID", "clientSecret"];
  for (const field of required) {
    if (!credentials[field] || String(credentials[field]).trim().length === 0) {
      throw new Error(`Missing auth field: ${field}`);
    }
  }
}

function computeExpiry(authBody) {
  const now = Date.now();
  if (typeof authBody?.expires_in === "number" && authBody.expires_in > 0) {
    return now + authBody.expires_in * 1000;
  }
  return now + 55 * 60 * 1000;
}

function tokenStillValid() {
  if (!tokenState.token) {
    return false;
  }
  const refreshBufferMs = 30 * 1000;
  return tokenState.expiryMs - refreshBufferMs > Date.now();
}

export function configureAuth({ baseUrl, credentials }) {
  currentConfig = {
    apiBaseUrl: normalizeBaseUrl(baseUrl ?? currentConfig.apiBaseUrl),
    credentials: normalizeCredentials(credentials ?? currentConfig.credentials),
  };
  clearCachedToken();
}

export function clearCachedToken() {
  tokenState = { token: null, expiryMs: 0 };
}

export function getAuthConfig() {
  return {
    apiBaseUrl: currentConfig.apiBaseUrl,
    credentials: { ...currentConfig.credentials },
  };
}

export async function requestAccessToken(fetchImpl = fetch) {
  validateCredentials(currentConfig.credentials);

  const response = await fetchImpl(`${currentConfig.apiBaseUrl}${AUTH_ENDPOINT}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(currentConfig.credentials),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.message || body?.error || response.statusText || "Auth failed";
    throw new Error(message);
  }

  const accessToken = body?.access_token;
  if (!accessToken) {
    throw new Error("Auth response missing access_token");
  }

  tokenState = {
    token: accessToken,
    expiryMs: computeExpiry(body),
  };

  return accessToken;
}

export async function getAccessToken(options = {}, fetchImpl = fetch) {
  const forceRefresh = Boolean(options?.forceRefresh);

  if (!forceRefresh && tokenStillValid()) {
    return tokenState.token;
  }

  return requestAccessToken(fetchImpl);
}
