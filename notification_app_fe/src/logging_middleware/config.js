// Frontend-local logging config and validation helpers

export const frontendLoggingConfig = {
  apiBaseUrl: process.env.REACT_APP_API_BASE_URL || "http://localhost:5000",
  allowedStacks: ["frontend"],
  allowedLevels: ["debug", "info", "warn", "error", "fatal"],
  allowedPackages: ["api", "component", "hook", "page", "state", "style", "auth", "config", "middleware", "utils"],
};

export function isValidStack(stack) {
  return frontendLoggingConfig.allowedStacks.includes(stack);
}

export function isValidLevel(level) {
  return frontendLoggingConfig.allowedLevels.includes(level);
}

export function isValidPackage(packageName) {
  return frontendLoggingConfig.allowedPackages.includes(packageName);
}
