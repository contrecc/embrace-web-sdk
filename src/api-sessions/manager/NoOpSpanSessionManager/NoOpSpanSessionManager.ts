import type { HrTime, Span } from '@opentelemetry/api';
import type { SpanSessionManager } from '../index.js';

export class NoOpSpanSessionManager implements SpanSessionManager {
  public addBreadcrumb(_name: string): void {
    // do nothing.
  }

  public addProperty(_key: string, _value: string): void {
    // do nothing.
  }

  public endSessionSpan(): void {
    // do nothing.
  }

  public endSessionSpanInternal(): void {
    // do nothing.
  }

  public getSessionId = () => null;

  public getSessionSpan(): Span | null {
    return null;
  }

  public getSessionStartTime(): HrTime | null {
    return null;
  }

  public startSessionSpan(): void {
    // do nothing.
  }

  public addSessionStartedListener(_listener: () => void): () => void {
    return () => {};
  }

  public addSessionEndedListener(_listener: () => void): () => void {
    return () => {};
  }
}
