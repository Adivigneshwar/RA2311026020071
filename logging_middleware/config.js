// Configuration management module for centralized settings and validation
// Purpose: single source of truth for logging system constants, defaults, and validation rules
// Allows configuration changes without modifying business logic

// API Configuration: URL endpoints and transport settings
export const apiConfiguration = {
  // Base URL for all API calls (should be set at runtime via configureLoggingSystem)
  baseUrlForApis: "",
  
  // Specific endpoint paths
  endpoints: {
    authenticationPath: "/evaluation-service/auth",
    loggingPath: "/evaluation-service/logs",
  },

  // HTTP request timeout in milliseconds
  requestTimeoutMs: 15000,

  // Maximum number of retries on transient failures
  maxRetryAttempts: 2,
};

// Token Management Configuration: expiry and refresh strategy
export const tokenManagementConfig = {
  // How many seconds before actual expiry should we consider a token "too old"
  // This buffer prevents using tokens that expire mid-request
  refreshBufferSeconds: 30,

  // Default token time-to-live if API doesn't specify expiry (in minutes)
  defaultTokenTtlMinutes: 55,

  // Add safety margin to default TTL to avoid edge cases (in minutes)
  safetyMarginMinutes: 5,
};

// Logging Schema: allowed values and validation configuration
export const loggingSchemaConfig = {
  // Application stack/tier designations
  allowedStacks: ["frontend"],

  // Severity levels in order of importance
  severityLevels: ["debug", "info", "warn", "error", "fatal"],

  // Module/package categories
  categories: {
    // Frontend-specific modules (UI components, state, API integration, etc.)
    frontendModules: ["api", "component", "hook", "page", "state", "style"],
    
    // Shared/common modules (cross-stack utilities)
    sharedModules: ["auth", "config", "middleware", "utils"],
  },

  // Log message constraints
  messageConstraints: {
    maxCharacters: 5000,
    allowEmpty: false,
  },

  // Metadata field constraints
  metadataConstraints: {
    maxDepth: 5,
    maxProperties: 20,
  },
};

// Error Messages: user-friendly, consistent error reporting
export const errorMessages = {
  validation: {
    stackInvalid: (received) =>
      `Stack parameter is invalid. Expected 'frontend', received: '${received}'`,
    levelInvalid: (received) =>
      `Severity level is invalid. Allowed: [${loggingSchemaConfig.severityLevels.join(", ")}], received: '${received}'`,
    packageInvalid: (received) =>
      `Module/package name is invalid. Allowed: [${[...loggingSchemaConfig.categories.frontendModules, ...loggingSchemaConfig.categories.sharedModules].join(", ")}], received: '${received}'`,
  },
  authentication: {
    tokenAcquisitionFailed: (reason) =>
      `Unable to acquire authentication token. Reason: ${reason}`,
    tokenRefreshFailed: (reason) =>
      `Failed to refresh authentication token. Reason: ${reason}`,
    missingCredentials: (field) =>
      `Authentication configuration missing required field: '${field}'`,
  },
  network: {
    requestFailed: (reason) =>
      `Network request failed. Details: ${reason}`,
    responseParsingFailed: (statusCode) =>
      `Server response could not be parsed (HTTP ${statusCode})`,
    endpointUnreachable: (endpoint) =>
      `Unable to reach endpoint: ${endpoint}`,
  },
  logging: {
    transmissionFailed: (statusCode) =>
      `Log transmission failed with HTTP ${statusCode}`,
    retryFailed: () =>
      `All retry attempts for log transmission were exhausted`,
  },
};

// Runtime Configuration State: mutable config that changes at runtime
export const runtimeState = {
  isInitialized: false,
  authenticationIsConfigured: false,
  loggingIsConfigured: false,
};

// Validation Helper: ensure configuration object has required structure
export function validateConfigurationIntegrity(configObj) {
  if (!configObj || typeof configObj !== "object") {
    throw new Error("Configuration must be a non-null object");
  }

  const requiredKeys = ["apiBaseUrl", "userCredentials"];
  for (const keyName of requiredKeys) {
    if (!(keyName in configObj)) {
      throw new Error(`Configuration is missing required key: '${keyName}'`);
    }
  }

  if (typeof configObj.apiBaseUrl !== "string") {
    throw new Error("Configuration 'apiBaseUrl' must be a string");
  }

  if (typeof configObj.userCredentials !== "object" || configObj.userCredentials === null) {
    throw new Error("Configuration 'userCredentials' must be an object");
  }

  return true;
}

// Schema Validator: check if a log entry matches the expected schema
export function validateLogSchema(logEntry) {
  const validationErrors = [];

  if (!loggingSchemaConfig.allowedStacks.includes(logEntry.stack)) {
    validationErrors.push(
      errorMessages.validation.stackInvalid(logEntry.stack)
    );
  }

  if (!loggingSchemaConfig.severityLevels.includes(logEntry.level)) {
    validationErrors.push(
      errorMessages.validation.levelInvalid(logEntry.level)
    );
  }

  const allModules = [
    ...loggingSchemaConfig.categories.frontendModules,
    ...loggingSchemaConfig.categories.sharedModules,
  ];
  if (!allModules.includes(logEntry.package)) {
    validationErrors.push(
      errorMessages.validation.packageInvalid(logEntry.package)
    );
  }

  if (
    !logEntry.message ||
    (typeof logEntry.message === "string" && logEntry.message.length === 0)
  ) {
    validationErrors.push("Log message cannot be empty");
  }

  if (
    logEntry.message &&
    typeof logEntry.message === "string" &&
    logEntry.message.length > loggingSchemaConfig.messageConstraints.maxCharacters
  ) {
    validationErrors.push(
      `Log message exceeds maximum length of ${loggingSchemaConfig.messageConstraints.maxCharacters} characters`
    );
  }

  return {
    isValid: validationErrors.length === 0,
    errors: validationErrors,
  };
}

export default {
  apiConfiguration,
  tokenManagementConfig,
  loggingSchemaConfig,
  errorMessages,
  runtimeState,
  validateConfigurationIntegrity,
  validateLogSchema,
};
