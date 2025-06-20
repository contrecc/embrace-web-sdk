export const KEY_EMB_TYPE = 'emb.type';
export const KEY_EMB_STATE = 'emb.state';
export const KEY_PREFIX_EMB_PROPERTIES = 'emb.properties.';
export const KEY_EMB_SESSION_REASON_ENDED = 'emb.session_end_type';
export const KEY_EMB_JS_EXCEPTION_STACKTRACE = 'emb.stacktrace.js';
export const KEY_EMB_EXCEPTION_HANDLING = 'emb.exception_handling';
export const KEY_EMB_ERROR_CODE = 'emb.error_code';
export const KEY_EMB_APP_INSTANCE_ID = 'emb.app_instance_id';
export const KEY_EMB_ERROR_LOG_COUNT = 'emb.error_log_count';
export const KEY_EMB_INSTRUMENTATION = 'emb.instrumentation';
export const KEY_EMB_UNHANDLED_EXCEPTIONS_COUNT =
  'emb.unhandled_exceptions_count';
export const KEY_VIEW_NAME = 'view.name';

export enum EMB_TYPES {
  Session = 'ux.session',
  View = 'ux.view',
  Network = 'perf.network_request',
  Perf = 'perf',
  SystemLog = 'sys.log', // SystemLog is a log emb type that tells the Embrace BE to treat this as an Embrace Log to be shown in the dashboard.
  SystemException = 'sys.exception',
  WebVital = 'ux.web_vital',
}

export enum EMB_STATES {
  Foreground = 'foreground',
  Background = 'background',
}

export enum EMB_NAVIGATION_INSTRUMENTATIONS {
  DeclarativeLegacy = 'react_router_declarative_legacy',
  Declarative = 'react_router_declarative',
  Data = 'react_router_data',
}

export enum EMB_ERROR_INSTRUMENTATIONS {
  ReactErrorBoundary = 'react_error_boundary',
}

export type EMB_INSTRUMENTATIONS =
  | EMB_NAVIGATION_INSTRUMENTATIONS
  | EMB_ERROR_INSTRUMENTATIONS;
