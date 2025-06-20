import type { HrTime, Span } from '@opentelemetry/api';

export interface SpanSessionManager {
  getSessionId: () => string | null;

  getSessionStartTime: () => HrTime | null;

  getSessionSpan: () => Span | null;

  startSessionSpan: () => void;

  endSessionSpan: () => void;

  addBreadcrumb: (name: string) => void;

  addProperty: (key: string, value: string) => void;

  // todo move this to another class SpanSessionManagerInternal that is only accessible from within our code, but expose the external one without the method to the users.
  endSessionSpanInternal: (reason: ReasonSessionEnded) => void;

  addSessionStartedListener: (listener: () => void) => () => void;

  addSessionEndedListener: (listener: () => void) => () => void;
}

export type ReasonSessionEnded =
  | 'unknown'
  | 'inactivity' // inactivity timer
  | 'timer' // max_time_reached limit
  | 'manual' // using the public api
  | 'max_size_reached'
  | 'state_changed'; // visibility change
