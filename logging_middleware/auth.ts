// Authentication service module for managing access tokens and API credentials
// Responsibilities: config validation, token lifecycle (acquisition, caching, refresh)

interface UserCredentials {
  email: string;
  name: string;
  rollNo: string;
  accessCode: string;
  clientID: string;
  clientSecret: string;
}

interface AppConfig {
  apiBaseUrl: string;
  userCredentials: UserCredentials;
}

interface TokenStorage {
  token: string | null;
  expiryTimestamp: number;
}

interface AuthResponse {
  access_token?: string;
  expires_in?: number;
  expiresAt?: number;
  message?: string;
  error?: string;
}

interface TokenOptions {
  forceRefresh?: boolean;
}

interface FetchResponse extends Response {
  json(): Promise<AuthResponse>;
}

const DEFAULT_BASE_URL: string = "";
const AUTH_ENDPOINT: string = "/evaluation-service/auth";

// Runtime configuration state - stores API base URL and user credentials for authentication
let appConfig: AppConfig = {
  apiBaseUrl: DEFAULT_BASE_URL,
  userCredentials: {
    email: "",
    name: "",
    rollNo: "",
    accessCode: "",
    clientID: "",
    clientSecret: "",
  },
};

// Token storage with expiry tracking to prevent use of stale/expired tokens
let tokenStorage: TokenStorage = {
  token: null,
  expiryTimestamp: 0,
};

// Normalize API base URL by removing trailing slash if present
// This ensures consistent endpoint construction in downstream calls
function trimUrlTrailingSlash(url: string | undefined): string {
  if (!url || typeof url !== "string") {
    return "";
  }
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

// Merge provided credentials with defaults to ensure all required fields exist
// Returns normalized credential object with empty strings for undefined values
function normalizeCredentials(incomingCredentials: Partial<UserCredentials> | undefined): UserCredentials {
  if (!incomingCredentials || typeof incomingCredentials !== "object") {
    incomingCredentials = {};
  }
  return {
    email: incomingCredentials.email || "",
    name: incomingCredentials.name || "",
    rollNo: incomingCredentials.rollNo || "",
    accessCode: incomingCredentials.accessCode || "",
    clientID: incomingCredentials.clientID || "",
    clientSecret: incomingCredentials.clientSecret || "",
  };
}

// Validate that all required authentication fields are present and non-empty
// Throws descriptive error if validation fails
function checkCredentialsValidity(creds: UserCredentials): void {
  const requiredAuthFields: (keyof UserCredentials)[] = [
    "email",
    "name",
    "rollNo",
    "accessCode",
    "clientID",
    "clientSecret",
  ];

  for (const fieldName of requiredAuthFields) {
    const fieldValue = creds[fieldName];
    // Check if field is missing or contains only whitespace
    if (!fieldValue || (typeof fieldValue === "string" && fieldValue.trim().length === 0)) {
      throw new Error(
        `Authentication validation error: required field '${fieldName}' is missing or empty`
      );
    }
  }
}

// Initialize authentication module with API endpoint and user credentials
// Clears any cached token on reconfiguration to force fresh authentication flow
export function configureAuth({
  baseUrl,
  credentials,
}: {
  baseUrl?: string;
  credentials?: Partial<UserCredentials>;
}): void {
  appConfig = {
    apiBaseUrl: trimUrlTrailingSlash(baseUrl ?? appConfig.apiBaseUrl),
    userCredentials: normalizeCredentials(credentials ?? appConfig.userCredentials),
  };
  // Reset token cache to ensure next auth request fetches a new token
  discardTokenCache();
}

// Retrieve current authentication configuration (for debugging/inspection)
// Returns a copy to prevent external mutation of internal state
export function getAuthConfig(): {
  apiBaseUrl: string;
  userCredentials: UserCredentials;
} {
  return {
    apiBaseUrl: appConfig.apiBaseUrl,
    userCredentials: { ...appConfig.userCredentials },
  };
}

// Check if cached token is still valid for use
// A token is considered usable if it exists and its expiry time is beyond the refresh buffer period
// This prevents using tokens that are about to expire during request processing
function isTokenStillValid(): boolean {
  if (!tokenStorage.token || typeof tokenStorage.token !== "string") {
    return false;
  }

  const nowMs: number = Date.now();
  // Refresh buffer ensures we don't use tokens that may expire mid-request (30 seconds)
  const expiryBufferMs: number = 30 * 1000;
  const tokenExpiresInMs: number = tokenStorage.expiryTimestamp - nowMs;

  return tokenExpiresInMs > expiryBufferMs;
}

// Parse the API auth response to determine when the token expires
// Handles multiple expiry formats: expires_in (seconds), expiresAt (timestamp), or default TTL
function calculateTokenExpiryTime(authResponse: AuthResponse | undefined): number {
  const currentTimeMs: number = Date.now();

  // Format 1: API returns seconds-until-expiry (common pattern)
  if (typeof authResponse?.expires_in === "number" && authResponse.expires_in > 0) {
    return currentTimeMs + authResponse.expires_in * 1000;
  }

  // Format 2: API returns absolute Unix timestamp in milliseconds
  if (typeof authResponse?.expiresAt === "number" && authResponse.expiresAt > currentTimeMs) {
    return authResponse.expiresAt;
  }

  // Format 3: Default to 55 minutes (common OAuth token TTL, with 5-min safety margin)
  const defaultTokenTtlMs: number = 55 * 60 * 1000;
  return currentTimeMs + defaultTokenTtlMs;
}

// Discard the cached access token, forcing acquisition of a new token on next request
export function discardTokenCache(): void {
  tokenStorage = {
    token: null,
    expiryTimestamp: 0,
  };
}

// Perform HTTP request to authentication endpoint
// Sends credentials and stores the returned access token with expiry information
// Throws descriptive errors for network, parsing, and API failures
export async function requestAccessToken(fetchImpl: typeof fetch = fetch): Promise<string> {
  // Validate that all required credentials are configured before making auth request
  checkCredentialsValidity(appConfig.userCredentials);

  const authUrl: string = `${appConfig.apiBaseUrl}${AUTH_ENDPOINT}`;

  let httpResponse: Response;
  try {
    httpResponse = await fetchImpl(authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(appConfig.userCredentials),
    });
  } catch (networkError) {
    throw new Error(
      `Authentication request failed due to network error: ${networkError instanceof Error ? networkError.message : String(networkError)}`
    );
  }

  // Parse response body as JSON
  let parsedResponse: AuthResponse;
  try {
    parsedResponse = await (httpResponse as FetchResponse).json();
  } catch (parseError) {
    throw new Error(
      `Authentication service returned invalid JSON response. Status: ${httpResponse.status}`
    );
  }

  // Check for HTTP error status codes
  if (!httpResponse.ok) {
    const serverErrorMsg: string =
      parsedResponse?.message || parsedResponse?.error || httpResponse.statusText || "Unknown error";
    throw new Error(
      `Authentication service rejected request (HTTP ${httpResponse.status}): ${serverErrorMsg}`
    );
  }

  // Verify that response contains the required access_token field
  const accessTokenValue: string | undefined = parsedResponse?.access_token;
  if (!accessTokenValue || typeof accessTokenValue !== "string") {
    throw new Error(
      "Authentication service response missing or invalid access_token field"
    );
  }

  // Store token with calculated expiry time for later validation
  tokenStorage = {
    token: accessTokenValue,
    expiryTimestamp: calculateTokenExpiryTime(parsedResponse),
  };

  return tokenStorage.token as string;
}

// Acquire or reuse an access token for API authentication
// Implements smart caching: uses cached token if valid, otherwise requests a fresh one
// Supports forced refresh (useful for 401 retry scenarios)
export async function getAccessToken(
  options: TokenOptions = {},
  fetchImpl: typeof fetch = fetch
): Promise<string> {
  const shouldForceRefresh: boolean = Boolean(options?.forceRefresh);

  // If not forcing refresh and cached token is still valid, reuse it immediately
  if (!shouldForceRefresh && isTokenStillValid()) {
    return tokenStorage.token as string;
  }

  // Otherwise, perform full authentication flow to get a new token
  return requestAccessToken(fetchImpl);
}
