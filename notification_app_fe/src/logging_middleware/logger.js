// Frontend-local structured logger used by the React app
// Keeps the app self-contained and compatible with Create React App restrictions

import { getAccessToken, getAuthConfig } from "./auth.js";

const VALID_STACKS = new Set(["frontend"]);
const VALID_LEVELS = new Set(["debug", "info", "warn", "error", "fatal"]);
const VALID_PACKAGES = new Set(["api", "component", "hook", "page", "state", "style", "auth", "config", "middleware", "utils"]);

function validateLogInput(stack, level, packageName, message) {
  if (!VALID_STACKS.has(stack)) {
    throw new Error(`Invalid stack: ${stack}`);
  }
  if (!VALID_LEVELS.has(level)) {
    throw new Error(`Invalid level: ${level}`);
  }
  if (!VALID_PACKAGES.has(packageName)) {
    throw new Error(`Invalid package: ${packageName}`);
  }
  if (message === undefined || message === null || String(message).trim().length === 0) {
    throw new Error("Log message is required");
  }
}

async function postLog(payload, token, fetchImpl) {
  const { apiBaseUrl } = getAuthConfig();
  const endpoint = `${apiBaseUrl.replace(/\/$/, "")}/evaluation-service/logs`;

  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, data };
}

export async function Log(stack, level, packageName, message, meta = {}, options = {}) {
  validateLogInput(stack, level, packageName, message);

  const fetchImpl = options.fetchImpl || (typeof fetch !== "undefined" ? fetch : null);
  if (!fetchImpl) {
    throw new Error("Fetch implementation is not available");
  }

  const payload = {
    stack,
    level,
    package: packageName,
    message: typeof message === "string" ? message : JSON.stringify(message),
    meta,
    timestamp: new Date().toISOString(),
  };

  let token = await getAccessToken({}, fetchImpl);
  let result = await postLog(payload, token, fetchImpl);

  if (result.status === 401) {
    token = await getAccessToken({ forceRefresh: true }, fetchImpl);
    result = await postLog(payload, token, fetchImpl);
  }

  if (!result.ok) {
    const apiMessage = result.data?.message || `HTTP ${result.status}`;
    throw new Error(apiMessage);
  }

  return result.data ?? { success: true };
}

export default { Log };
