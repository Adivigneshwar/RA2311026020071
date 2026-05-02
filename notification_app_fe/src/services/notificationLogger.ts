


import { Log } from '../logging_middleware/logger';
import type { LoggerMetadata } from '../types';

interface LoggerOptions {
  fetchImpl?: typeof fetch;
}

class FrontendNotificationLogger {
  private isConfigured: boolean;
  private fetchImpl: typeof fetch | null;

  constructor() {
    this.isConfigured = false;
    this.fetchImpl = typeof fetch !== 'undefined' ? fetch : null;
  }

  async ensureConfig(): Promise<void> {
    if (!this.isConfigured) {
      this.isConfigured = true;
    }
  }

  async logApiCall(endpoint: string, method: string = 'GET', statusCode: number | null = null): Promise<void> {
    await this.ensureConfig();
    const eventName: string = statusCode
      ? `API ${method} to ${endpoint} returned ${statusCode}`
      : `API ${method} to ${endpoint}`;
    try {
      await Log('frontend', 'debug', 'api', eventName, { endpoint, method }, { fetchImpl: this.fetchImpl });
    } catch (e) {
      
    }
  }

  async logApiError(
    endpoint: string,
    method: string = 'GET',
    errorMessage: string,
    statusCode: number | null = null
  ): Promise<void> {
    await this.ensureConfig();
    const msg: string = `API error: ${method} ${endpoint} - ${errorMessage}${statusCode ? ` (${statusCode})` : ''}`;
    try {
      await Log('frontend', 'error', 'api', msg, { statusCode }, { fetchImpl: this.fetchImpl });
    } catch (e) {
      
    }
  }

  async logComponentLifecycle(componentName: string, event: string): Promise<void> {
    await this.ensureConfig();
    try {
      await Log('frontend', 'debug', 'component', `Component ${componentName}: ${event}`, {}, { fetchImpl: this.fetchImpl });
    } catch (e) {
      
    }
  }

  async logStateChange(source: string, changeDescription: string, metadata: LoggerMetadata = {}): Promise<void> {
    await this.ensureConfig();
    try {
      await Log('frontend', 'debug', 'state', changeDescription, { source, ...metadata }, { fetchImpl: this.fetchImpl });
    } catch (e) {
      
    }
  }

  async logUserAction(actionName: string, metadata: LoggerMetadata = {}): Promise<void> {
    await this.ensureConfig();
    try {
      await Log('frontend', 'info', 'component', `User action: ${actionName}`, metadata, { fetchImpl: this.fetchImpl });
    } catch (e) {
      
    }
  }

  async logUIError(componentName: string, errorMessage: string, details: LoggerMetadata = {}): Promise<void> {
    await this.ensureConfig();
    try {
      await Log('frontend', 'error', 'component', `UI Error in ${componentName}: ${errorMessage}`, details, { fetchImpl: this.fetchImpl });
    } catch (e) {
      
    }
  }
}

export const notificationLogger = new FrontendNotificationLogger();
