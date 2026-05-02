// Frontend logging wrapper - bridges logging middleware with React components
// Ensures all API calls and state changes are tracked without using console.log

import { Log } from '../logging_middleware/logger.js';

class FrontendNotificationLogger {
  constructor() {
    this.isConfigured = false;
    this.fetchImpl = typeof fetch !== 'undefined' ? fetch : null;
  }

  async ensureConfig() {
    if (!this.isConfigured) {
      this.isConfigured = true;
    }
  }

  async logApiCall(endpoint, method = 'GET', statusCode = null) {
    await this.ensureConfig();
    const eventName = statusCode ? `API ${method} to ${endpoint} returned ${statusCode}` : `API ${method} to ${endpoint}`;
    try {
      await Log('frontend', 'debug', 'api', eventName, { endpoint, method }, { fetchImpl: this.fetchImpl });
    } catch (e) {
      // silent fail on logging error
    }
  }

  async logApiError(endpoint, method = 'GET', errorMessage, statusCode = null) {
    await this.ensureConfig();
    const msg = `API error: ${method} ${endpoint} - ${errorMessage}${statusCode ? ` (${statusCode})` : ''}`;
    try {
      await Log('frontend', 'error', 'api', msg, { statusCode }, { fetchImpl: this.fetchImpl });
    } catch (e) {
      // silent fail
    }
  }

  async logComponentLifecycle(componentName, event) {
    await this.ensureConfig();
    try {
      await Log('frontend', 'debug', 'component', `Component ${componentName}: ${event}`, {}, { fetchImpl: this.fetchImpl });
    } catch (e) {
      // silent fail
    }
  }

  async logStateChange(source, changeDescription, metadata = {}) {
    await this.ensureConfig();
    try {
      await Log('frontend', 'debug', 'state', changeDescription, { source, ...metadata }, { fetchImpl: this.fetchImpl });
    } catch (e) {
      // silent fail
    }
  }

  async logUserAction(actionName, metadata = {}) {
    await this.ensureConfig();
    try {
      await Log('frontend', 'info', 'component', `User action: ${actionName}`, metadata, { fetchImpl: this.fetchImpl });
    } catch (e) {
      // silent fail
    }
  }

  async logUIError(componentName, errorMessage, details = {}) {
    await this.ensureConfig();
    try {
      await Log('frontend', 'error', 'component', `UI Error in ${componentName}: ${errorMessage}`, details, { fetchImpl: this.fetchImpl });
    } catch (e) {
      // silent fail
    }
  }
}

export const notificationLogger = new FrontendNotificationLogger();
