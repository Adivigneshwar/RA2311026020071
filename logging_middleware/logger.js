// Centralized logging module for tracking application events and diagnostics
// Features: structured logging with validation, automatic token management, retry on auth failure
// All log messages must follow strict schema: stack, level, package, message, metadata

import { getAccessToken, getAuthConfig } from "./auth.js";

// Define allowed values for each log field to enforce consistency across the application
const STACK_TYPES = new Set(["frontend"]);
const LOG_LEVELS = new Set(["debug", "info", "warn", "error", "fatal"]);
const FRONTEND_MODULES = new Set(["api", "component", "hook", "page", "state", "style"]);
const SHARED_MODULES = new Set(["auth", "config", "middleware", "utils"]);

// Verify that log stack parameter matches allowed values
function isStackTypeValid(stackParam) {
  return typeof stackParam === "string" && STACK_TYPES.has(stackParam);
}

// Verify that log level parameter matches allowed severity levels
function isLogLevelValid(levelParam) {
  return typeof levelParam === "string" && LOG_LEVELS.has(levelParam);
}

// Verify that package/module name matches either frontend or shared module categories
function isModuleNameValid(moduleParam) {
  return (
    typeof moduleParam === "string" &&
    (FRONTEND_MODULES.has(moduleParam) || SHARED_MODULES.has(moduleParam))
  );
}

// Construct a structured log entry with all required metadata
// Returns object ready for HTTP transmission to logging service
function createStructuredLogEntry(stack, level, moduleId, messageContent, metadata = {}) {
  return {
    stack,
    level,
    package: moduleId,
    message: typeof messageContent === "string" ? messageContent : JSON.stringify(messageContent),
    meta: metadata,
    timestamp: new Date().toISOString(),
  };
}

// Make HTTP POST request to central logging service
// Includes bearer token for authentication
async function transmitLogToServer(logEntry, bearerToken, fetchImpl = fetch) {
  const authSettings = getAuthConfig();
  const baseUrlForLogs = authSettings.apiBaseUrl;
  const loggingEndpoint = (baseUrlForLogs ? baseUrlForLogs.replace(/\/$/, "") : "") + "/evaluation-service/logs";

  const httpResponse = await fetchImpl(loggingEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
    },
    body: JSON.stringify(logEntry),
  });

  // Attempt to parse response as JSON, but don't fail if body is empty
  let responseData = null;
  try {
    responseData = await httpResponse.json();
  } catch (e) {
    // Empty response body is acceptable (e.g., 204 No Content)
  }

  return { statusOk: httpResponse.ok, statusCode: httpResponse.status, data: responseData };
}

// Main logging function: record structured events to central logging service
// Parameters:
//   - stack: "frontend" (required, specifies application tier)
//   - level: "debug|info|warn|error|fatal" (required, severity level)
//   - moduleId: package/module identifier (required, must be valid frontend or shared module)
//   - messageContent: descriptive message or error object (required, string or JSON-serializable)
//   - metadata: additional context object (optional, e.g. { userId, requestId, duration })
//   - options: configuration for this log call, including optional fetchImpl (optional)
// 
// Behavior: 
//   1. Validates all parameters against allowed values
//   2. Acquires/reuses access token for authentication
//   3. Sends log entry to remote service via HTTP POST
//   4. On 401 Unauthorized: refreshes token once and retries automatically
//   5. Throws descriptive errors if any step fails
//
// Returns: response data from logging service (or { success: true } if no response body)
export async function Log(stack, level, moduleId, messageContent, metadata = {}, options = {}) {
  // Validate input parameters before attempting to send
  if (!isStackTypeValid(stack)) {
    throw new Error(
      `Log validation failed: 'stack' parameter must be 'frontend', received: ${String(stack)}`
    );
  }
  if (!isLogLevelValid(level)) {
    throw new Error(
      `Log validation failed: 'level' must be one of [debug, info, warn, error, fatal], received: ${String(level)}`
    );
  }
  if (!isModuleNameValid(moduleId)) {
    const frontendList = Array.from(FRONTEND_MODULES).join(", ");
    const sharedList = Array.from(SHARED_MODULES).join(", ");
    throw new Error(
      `Log validation failed: 'package' must be frontend [${frontendList}] or shared [${sharedList}], received: ${String(moduleId)}`
    );
  }

  // Construct log entry with current timestamp and all metadata
  const logEntry = createStructuredLogEntry(stack, level, moduleId, messageContent, metadata);

  // Determine which fetch implementation to use (allows dependency injection for testing)
  const httpClient = options.fetchImpl || (typeof fetch !== "undefined" ? fetch : null);
  if (!httpClient) {
    throw new Error(
      "Fetch implementation not found. Provide 'fetchImpl' in options parameter for non-browser environments."
    );
  }

  // Step 1: Acquire access token for API authentication
  let accessToken;
  try {
    accessToken = await getAccessToken();
  } catch (authError) {
    throw new Error(
      `Failed to acquire authentication token for logging: ${authError.message}`
    );
  }

  // Step 2: Attempt to transmit log entry to server
  let transmissionResult;
  try {
    transmissionResult = await transmitLogToServer(logEntry, accessToken, httpClient);
  } catch (networkError) {
    throw new Error(`Network failure while transmitting log: ${networkError.message}`);
  }

  // Step 3: Handle 401 Unauthorized by refreshing token and retrying once
  if (transmissionResult.statusCode === 401) {
    try {
      // Force fresh token acquisition (clear cached token and request new one)
      accessToken = await getAccessToken({ forceRefresh: true });
    } catch (refreshError) {
      throw new Error(
        `Token refresh failed after server rejected auth: ${refreshError.message}`
      );
    }

    // Retry log transmission with refreshed token
    try {
      transmissionResult = await transmitLogToServer(logEntry, accessToken, httpClient);
    } catch (retryError) {
      throw new Error(
        `Log transmission retry failed after token refresh: ${retryError.message}`
      );
    }
  }

  // Step 4: Verify successful transmission
  if (!transmissionResult.statusOk) {
    const serverMsg =
      transmissionResult.data?.message ||
      `HTTP Error ${transmissionResult.statusCode}`;
    throw new Error(
      `Logging service returned error (${transmissionResult.statusCode}): ${serverMsg}`
    );
  }

  // Return response from server, or success indicator if no body
  return transmissionResult.data ?? { success: true };
}

export default {
  Log,
};
