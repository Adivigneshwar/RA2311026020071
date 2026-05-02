export const apiConfiguration = {
  baseUrlForApis: "",
  
  endpoints: {
    authenticationPath: "/evaluation-service/auth",
    loggingPath: "/evaluation-service/logs",
  },

  requestTimeoutMs: 15000,

  maxRetryAttempts: 2,
};

export const tokenManagementConfig = {
  refreshBufferSeconds: 30,

  defaultTokenTtlMinutes: 55,

  safetyMarginMinutes: 5,
};

export const loggingSchemaConfig = {
  allowedStacks: ["frontend"],

  severityLevels: ["debug", "info", "warn", "error", "fatal"],

  categories: {
    frontendModules: ["api", "component", "hook", "page", "state", "style"],
    
    sharedModules: ["auth", "config", "middleware", "utils"],
  },

  messageConstraints: {
    maxCharacters: 5000,
    allowEmpty: false,
  },

  metadataConstraints: {
    maxDepth: 5,
    maxProperties: 20,
  },
};

export const errorMessages = {
  validation: {
    stackInvalid: (received: string): string =>
      `Stack parameter is invalid. Expected 'frontend', received: '${received}'`,
    levelInvalid: (received: string): string =>
      `Severity level is invalid. Allowed: [${loggingSchemaConfig.severityLevels.join(", ")}], received: '${received}'`,
    packageInvalid: (received: string): string =>
      `Module/package name is invalid. Allowed: [${[...loggingSchemaConfig.categories.frontendModules, ...loggingSchemaConfig.categories.sharedModules].join(", ")}], received: '${received}'`,
  },
  authentication: {
    tokenAcquisitionFailed: (reason: string): string =>
      `Unable to acquire authentication token. Reason: ${reason}`,
    tokenRefreshFailed: (reason: string): string =>
      `Failed to refresh authentication token. Reason: ${reason}`,
    missingCredentials: (field: string): string =>
      `Authentication configuration missing required field: '${field}'`,
  },
  network: {
    requestFailed: (reason: string): string =>
      `Network request failed. Details: ${reason}`,
    responseParsingFailed: (statusCode: number): string =>
      `Server response could not be parsed (HTTP ${statusCode})`,
    endpointUnreachable: (endpoint: string): string =>
      `Unable to reach endpoint: ${endpoint}`,
  },
  logging: {
    transmissionFailed: (statusCode: number): string =>
      `Log transmission failed with HTTP ${statusCode}`,
    retryFailed: (): string =>
      `All retry attempts for log transmission were exhausted`,
  },
};

interface RuntimeState {
  isInitialized: boolean;
  authenticationIsConfigured: boolean;
  loggingIsConfigured: boolean;
}

export const runtimeState: RuntimeState = {
  isInitialized: false,
  authenticationIsConfigured: false,
  loggingIsConfigured: false,
};

interface ConfigurationObject {
  apiBaseUrl: string;
  userCredentials: Record<string, unknown>;
}

export function validateConfigurationIntegrity(configObj: unknown): boolean {
  if (!configObj || typeof configObj !== "object") {
    throw new Error("Configuration must be a non-null object");
  }

  const config = configObj as Record<string, unknown>;
  const requiredKeys: string[] = ["apiBaseUrl", "userCredentials"];
  for (const keyName of requiredKeys) {
    if (!(keyName in config)) {
      throw new Error(`Configuration is missing required key: '${keyName}'`);
    }
  }

  if (typeof config.apiBaseUrl !== "string") {
    throw new Error("Configuration 'apiBaseUrl' must be a string");
  }

  if (typeof config.userCredentials !== "object" || config.userCredentials === null) {
    throw new Error("Configuration 'userCredentials' must be an object");
  }

  return true;
}

interface LogEntryForValidation {
  stack: string;
  level: string;
  package: string;
  message: string;
  meta: Record<string, unknown>;
  timestamp: string;
}

export function validateLogSchema(logEntry: LogEntryForValidation): string[] {
  const validationErrors: string[] = [];

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

  const allModules: string[] = [
    ...loggingSchemaConfig.categories.frontendModules,
    ...loggingSchemaConfig.categories.sharedModules,
  ];

  if (!allModules.includes(logEntry.package)) {
    validationErrors.push(
      errorMessages.validation.packageInvalid(logEntry.package)
    );
  }

  if (typeof logEntry.message !== "string") {
    validationErrors.push("Message must be a string");
  }

  if (typeof logEntry.timestamp !== "string") {
    validationErrors.push("Timestamp must be a string (ISO 8601 format expected)");
  }

  return validationErrors;
}
