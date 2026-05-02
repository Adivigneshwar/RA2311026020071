


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


let tokenStorage: TokenStorage = {
  token: null,
  expiryTimestamp: 0,
};



function trimUrlTrailingSlash(url: string | undefined): string {
  if (!url || typeof url !== "string") {
    return "";
  }
  return url.endsWith("/") ? url.slice(0, -1) : url;
}



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
    
    if (!fieldValue || (typeof fieldValue === "string" && fieldValue.trim().length === 0)) {
      throw new Error(
        `Authentication validation error: required field '${fieldName}' is missing or empty`
      );
    }
  }
}



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
  
  discardTokenCache();
}



export function getAuthConfig(): {
  apiBaseUrl: string;
  userCredentials: UserCredentials;
} {
  return {
    apiBaseUrl: appConfig.apiBaseUrl,
    userCredentials: { ...appConfig.userCredentials },
  };
}




function isTokenStillValid(): boolean {
  if (!tokenStorage.token || typeof tokenStorage.token !== "string") {
    return false;
  }

  const nowMs: number = Date.now();
  
  const expiryBufferMs: number = 30 * 1000;
  const tokenExpiresInMs: number = tokenStorage.expiryTimestamp - nowMs;

  return tokenExpiresInMs > expiryBufferMs;
}



function calculateTokenExpiryTime(authResponse: AuthResponse | undefined): number {
  const currentTimeMs: number = Date.now();

  
  if (typeof authResponse?.expires_in === "number" && authResponse.expires_in > 0) {
    return currentTimeMs + authResponse.expires_in * 1000;
  }

  
  if (typeof authResponse?.expiresAt === "number" && authResponse.expiresAt > currentTimeMs) {
    return authResponse.expiresAt;
  }

  
  const defaultTokenTtlMs: number = 55 * 60 * 1000;
  return currentTimeMs + defaultTokenTtlMs;
}


export function discardTokenCache(): void {
  tokenStorage = {
    token: null,
    expiryTimestamp: 0,
  };
}




export async function requestAccessToken(fetchImpl: typeof fetch = fetch): Promise<string> {
  
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

  
  let parsedResponse: AuthResponse;
  try {
    parsedResponse = await (httpResponse as FetchResponse).json();
  } catch (parseError) {
    throw new Error(
      `Authentication service returned invalid JSON response. Status: ${httpResponse.status}`
    );
  }

  
  if (!httpResponse.ok) {
    const serverErrorMsg: string =
      parsedResponse?.message || parsedResponse?.error || httpResponse.statusText || "Unknown error";
    throw new Error(
      `Authentication service rejected request (HTTP ${httpResponse.status}): ${serverErrorMsg}`
    );
  }

  
  const accessTokenValue: string | undefined = parsedResponse?.access_token;
  if (!accessTokenValue || typeof accessTokenValue !== "string") {
    throw new Error(
      "Authentication service response missing or invalid access_token field"
    );
  }

  
  tokenStorage = {
    token: accessTokenValue,
    expiryTimestamp: calculateTokenExpiryTime(parsedResponse),
  };

  return tokenStorage.token as string;
}




export async function getAccessToken(
  options: TokenOptions = {},
  fetchImpl: typeof fetch = fetch
): Promise<string> {
  const shouldForceRefresh: boolean = Boolean(options?.forceRefresh);

  
  if (!shouldForceRefresh && isTokenStillValid()) {
    return tokenStorage.token as string;
  }

  
  return requestAccessToken(fetchImpl);
}
