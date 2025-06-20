import {
  diag,
  type DiagLogger,
  type HrTime,
  type Span,
  trace,
} from '@opentelemetry/api';
import { ATTR_SESSION_ID } from '@opentelemetry/semantic-conventions/incubating';
import type { ReasonSessionEnded } from '../../api-sessions/index.js';
import {
  KEY_EMB_SESSION_REASON_ENDED,
  KEY_PREFIX_EMB_PROPERTIES,
} from '../../constants/attributes.js';
import {
  EMB_STATES,
  EMB_TYPES,
  KEY_EMB_STATE,
  KEY_EMB_TYPE,
} from '../../constants/index.js';
import type { PerformanceManager } from '../../utils/index.js';
import { generateUUID, OTelPerformanceManager } from '../../utils/index.js';
import type {
  EmbraceSpanSessionManagerArgs,
  SessionEndedListener,
  SessionStartedListener,
  SpanSessionManagerInternal,
} from './types.js';
import type { VisibilityStateDocument } from '../../common/index.js';

export class EmbraceSpanSessionManager implements SpanSessionManagerInternal {
  private _activeSessionId: string | null = null;
  private _activeSessionStartTime: HrTime | null = null;
  private _sessionSpan: Span | null = null;
  private _activeSessionCounts: Record<string, number> | null = null;
  private readonly _sessionStartedListeners: Array<SessionStartedListener> = [];
  private readonly _sessionEndedListeners: Array<SessionEndedListener> = [];

  private readonly _diag: DiagLogger;
  private readonly _perf: PerformanceManager;
  private readonly _visibilityDoc: VisibilityStateDocument;

  public constructor({
    diag: diagParam,
    perf,
    visibilityDoc = window.document,
  }: EmbraceSpanSessionManagerArgs = {}) {
    this._diag =
      diagParam ??
      diag.createComponentLogger({
        namespace: 'EmbraceSpanSessionManager',
      });
    this._perf = perf ?? new OTelPerformanceManager();
    this._visibilityDoc = visibilityDoc;
  }

  // the external api doesn't include a reason, and if a users uses it to end a session, the reason will be 'user_ended'

  public addBreadcrumb(name: string) {
    if (!this._sessionSpan) {
      this._diag.debug(
        'trying to add breadcrumb to a session, but there is no session in progress. This is a no-op.'
      );
      return;
    }
    this._sessionSpan.addEvent(
      'emb-breadcrumb',
      {
        message: name,
      },
      this._perf.getNowMillis()
    );
  }

  public addProperty(key: string, value: string) {
    if (!this._sessionSpan) {
      this._diag.debug(
        'trying to add properties to a session, but there is no session in progress. This is a no-op.'
      );
      return;
    }
    this._sessionSpan.setAttribute(KEY_PREFIX_EMB_PROPERTIES + key, value);
  }

  // note: don't use this internally, this is just for user facing APIs. Use this.endSessionSpanInternal instead.
  public endSessionSpan() {
    this.endSessionSpanInternal('manual');
  }

  // endSessionSpanInternal is not part of the public API, but is used internally to end a session span adding a specific reason
  public endSessionSpanInternal(reason: ReasonSessionEnded) {
    if (!this._sessionSpan) {
      this._diag.debug(
        'trying to end a session, but there is no session in progress. This is a no-op.'
      );
      return;
    }

    this._sessionSpan.setAttributes({
      [KEY_EMB_SESSION_REASON_ENDED]: reason,
      ...this._activeSessionCounts,
    });

    this._sessionSpan.end();
    this._sessionSpan = null;
    this._activeSessionStartTime = null;
    this._activeSessionId = null;
    this._activeSessionCounts = null;

    for (const listener of this._sessionEndedListeners) {
      try {
        listener();
      } catch (error) {
        this._diag.warn('Error while executing session ended listener', error);
      }
    }
  }

  public getSessionId(): string | null {
    return this._activeSessionId;
  }

  public getSessionSpan(): Span | null {
    return this._sessionSpan;
  }

  public getSessionStartTime(): HrTime | null {
    return this._activeSessionStartTime;
  }

  public startSessionSpan() {
    //if there was a session in progress already, finish it first.
    if (this._sessionSpan) {
      this.endSessionSpanInternal('manual');
    }
    const tracer = trace.getTracer('embrace-web-sdk-sessions');
    this._activeSessionId = generateUUID();
    this._activeSessionStartTime = this._perf.getNowHRTime();
    this._activeSessionCounts = {};
    this._sessionSpan = tracer.startSpan('emb-session', {
      attributes: {
        [KEY_EMB_TYPE]: EMB_TYPES.Session,
        [KEY_EMB_STATE]:
          this._visibilityDoc.visibilityState === 'hidden'
            ? EMB_STATES.Background
            : EMB_STATES.Foreground,
        [ATTR_SESSION_ID]: this._activeSessionId,
      },
    });

    for (const listener of this._sessionStartedListeners) {
      try {
        listener();
      } catch (error) {
        this._diag.warn(
          'Error while executing session started listener',
          error
        );
      }
    }
  }

  public incrSessionCountForKey(key: string) {
    if (!this._sessionSpan || !this._activeSessionCounts) {
      this._diag.debug(
        'trying to increment a count for the active session, but there is no session in progress. This is a no-op.'
      );
      return;
    }

    this._activeSessionCounts[key] = (this._activeSessionCounts[key] || 0) + 1;
  }

  public addSessionStartedListener(listener: SessionStartedListener) {
    const listenerIndex = this._sessionStartedListeners.push(listener);

    return () => {
      this._sessionStartedListeners.splice(listenerIndex - 1, 1);
    };
  }

  public addSessionEndedListener(listener: SessionEndedListener) {
    const listenerIndex = this._sessionEndedListeners.push(listener);

    return () => {
      this._sessionEndedListeners.splice(listenerIndex - 1, 1);
    };
  }
}
