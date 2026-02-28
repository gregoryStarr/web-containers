/**
 * Umami Analytics Tracking
 *
 * Simple wrapper around umami.track() for custom event tracking
 */

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, unknown>) => void;
    };
  }
}

/**
 * Track analytics events
 * Safe to call even if umami is not loaded
 */
export function trackEvent(
  event: string,
  data?: Record<string, unknown>
): void {
  if (typeof window !== 'undefined' && window.umami) {
    try {
      window.umami.track(event, data);
    } catch (error) {
      console.warn('[Analytics] Failed to track event:', error);
    }
  }
}

// Event names
export const AnalyticsEvents = {
  // Pipeline events
  PIPELINE_STARTED: 'Pipeline Started',
  PIPELINE_SUCCESS: 'Pipeline Success',
  PIPELINE_FAILURE: 'Pipeline Failure',

  // Export events
  ARTIFACT_EXPORTED: 'Artifact Exported',

  // PR events
  PR_MERGED: 'PR Merged',

  // App events
  APP_LOADED: 'App Loaded',
  GITHUB_CONNECTED: 'GitHub Connected',
  REPO_SELECTED: 'Repository Selected',
  PR_SELECTED: 'PR Selected',
} as const;
