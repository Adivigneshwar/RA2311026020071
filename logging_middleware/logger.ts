



import { getAccessToken, getAuthConfig } from "./auth";


type StackType = "frontend";
type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";
type FrontendModule = "api" | "component" | "hook" | "page" | "state" | "style";
type SharedModule = "auth" | "config" | "middleware" | "utils";
type ModuleType = FrontendModule | SharedModule;

interface LogMetadata {
  [key: string]: string | number | boolean | object | null | undefined;
}

interface LogEntry {
  stack: StackType;
  level: LogLevel;
  package: ModuleType;
  message: string;
  meta: LogMetadata;
  timestamp: string;
}

interface LogResponse {
  statusOk: boolean;
  statusCode: number;
  data: unknown;
}

interface LogOptions {
  fetchImpl?: typeof fetch;
}

interface AuthConfig {
  apiBaseUrl: string;
  userCredentials: {
    email: string;
    name: string;
    rollNo: string;
    accessCode: string;
    clientID: string;
    clientSecret: string;
  };
}


const STACK_TYPES: Set<StackType> = new Set(["frontend"]);
const LOG_LEVELS: Set<LogLevel> = new Set(["debug", "info", "warn", "error", "fatal"]);
const FRONTEND_MODULES: Set<FrontendModule> = new Set(["api", "component", "hook", "page", "state", "style"]);
const SHARED_MODULES: Set<SharedModule> = new Set(["auth", "config", "middleware", "utils"]);


function isStackTypeValid(stackParam: unknown): stackParam is StackType {
  return typeof stackParam === "string" && STACK_TYPES.has(stackParam as StackType);
}


function isLogLevelValid(levelParam: unknown): levelParam is LogLevel {
  return typeof levelParam === "string" && LOG_LEVELS.has(levelParam as LogLevel);
}


function isModuleNameValid(moduleParam: unknown): moduleParam is ModuleType {
  return (
    typeof moduleParam === "string" &&
    (FRONTEND_MODULES.has(moduleParam as FrontendModule) || SHARED_MODULES.has(moduleParam as SharedModule))
  );
}



function createStructuredLogEntry(
  stack: StackType,
  level: LogLevel,
  moduleId: ModuleType,
  messageContent: string | object,
  metadata: LogMetadata = {}
): LogEntry {
  return {
    stack,
    level,
    package: moduleId,
    message: typeof messageContent === "string" ? messageContent : JSON.stringify(messageContent),
    meta: metadata,
    timestamp: new Date().toISOString(),
  };
}



async function transmitLogToServer(
  logEntry: LogEntry,
  bearerToken: string,
  fetchImpl: typeof fetch = fetch
): Promise<LogResponse> {
  const authSettings: AuthConfig = getAuthConfig() as AuthConfig;
  const baseUrlForLogs: string = authSettings.apiBaseUrl;
  const loggingEndpoint: string = (baseUrlForLogs ? baseUrlForLogs.replace(/\/$/, "") : "") + "/evaluation-service/logs";

  const httpResponse: Response = await fetchImpl(loggingEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
    },
    body: JSON.stringify(logEntry),
  });

  
  let responseData: unknown = null;
  try {
    responseData = await httpResponse.json();
  } catch (e) {
    
  }

  return { statusOk: httpResponse.ok, statusCode: httpResponse.status, data: responseData };
}


















export async function Log(
  stack: unknown,
  level: unknown,
  moduleId: unknown,
  messageContent: string | object,
  metadata: LogMetadata = {},
  options: LogOptions = {}
): Promise<unknown> {
  
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
    const frontendList: string = Array.from(FRONTEND_MODULES).join(", ");
    const sharedList: string = Array.from(SHARED_MODULES).join(", ");
    throw new Error(
      `Log validation failed: 'package' must be frontend [${frontendList}] or shared [${sharedList}], received: ${String(moduleId)}`
    );
  }

  
  const logEntry: LogEntry = createStructuredLogEntry(stack, level, moduleId, messageContent, metadata);

  
  const httpClient: typeof fetch | null = options.fetchImpl || (typeof fetch !== "undefined" ? fetch : null);
  if (!httpClient) {
    throw new Error(
      "Fetch implementation not found. Provide 'fetchImpl' in options parameter for non-browser environments."
    );
  }

  
  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (authError) {
    throw new Error(
      `Failed to acquire authentication token for logging: ${authError instanceof Error ? authError.message : String(authError)}`
    );
  }

  
  let transmissionResult: LogResponse;
  try {
    transmissionResult = await transmitLogToServer(logEntry, accessToken, httpClient);
  } catch (networkError) {
    throw new Error(
      `Network failure while transmitting log: ${networkError instanceof Error ? networkError.message : String(networkError)}`
    );
  }

  
  if (transmissionResult.statusCode === 401) {
    try {
      
      accessToken = await getAccessToken({ forceRefresh: true });
    } catch (refreshError) {
      throw new Error(
        `Token refresh failed after server rejected auth: ${refreshError instanceof Error ? refreshError.message : String(refreshError)}`
      );
    }

    
    try {
      transmissionResult = await transmitLogToServer(logEntry, accessToken, httpClient);
    } catch (retryError) {
      throw new Error(
        `Log transmission retry failed after token refresh: ${retryError instanceof Error ? retryError.message : String(retryError)}`
      );
    }
  }

  
  if (!transmissionResult.statusOk) {
    const serverMsg: string =
      (transmissionResult.data as Record<string, unknown>)?.message instanceof String
        ? String((transmissionResult.data as Record<string, unknown>).message)
        : `HTTP Error ${transmissionResult.statusCode}`;
    throw new Error(
      `Logging service returned error (${transmissionResult.statusCode}): ${serverMsg}`
    );
  }

  
  return transmissionResult.data ?? { success: true };
}

export default {
  Log,
};
