import { type AttributeValue } from '@opentelemetry/api';
import type { Logger } from '@opentelemetry/api-logs';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import {
  ATTR_EXCEPTION_MESSAGE,
  ATTR_EXCEPTION_STACKTRACE,
  ATTR_EXCEPTION_TYPE,
} from '@opentelemetry/semantic-conventions';
import type { LogManager, LogSeverity } from '../../api-logs/index.js';
import {
  EMB_TYPES,
  KEY_EMB_EXCEPTION_HANDLING,
  KEY_EMB_JS_EXCEPTION_STACKTRACE,
  KEY_EMB_TYPE,
} from '../../constants/index.js';
import {
  OTelPerformanceManager,
  type PerformanceManager,
} from '../../utils/index.js';
import type { EmbraceLogManagerArgs } from './types.js';
import type {
  LogExceptionOptions,
  LogMessageOptions,
} from '../../api-logs/manager/index.js';
import type { SpanSessionManagerInternal } from '../EmbraceSpanSessionManager/index.js';
import {
  KEY_EMB_ERROR_LOG_COUNT,
  KEY_EMB_UNHANDLED_EXCEPTIONS_COUNT,
} from '../../constants/attributes.js';

export class EmbraceLogManager implements LogManager {
  private readonly _perf: PerformanceManager;
  private readonly _logger: Logger;
  private readonly _spanSessionManager: SpanSessionManagerInternal;

  public constructor({ perf, spanSessionManager }: EmbraceLogManagerArgs) {
    this._perf = perf ?? new OTelPerformanceManager();
    this._logger = logs.getLogger('embrace-web-sdk-logs');
    this._spanSessionManager = spanSessionManager;
  }

  private static _logSeverityToSeverityNumber(
    severity: LogSeverity
  ): SeverityNumber {
    switch (severity) {
      case 'info':
        return SeverityNumber.INFO;
      case 'warning':
        return SeverityNumber.WARN;
      default:
        return SeverityNumber.ERROR;
    }
  }

  public logException(
    error: Error,
    {
      handled = true,
      attributes = {},
      timestamp = this._perf.getNowMillis(),
    }: LogExceptionOptions = {}
  ) {
    if (!handled) {
      this._spanSessionManager.incrSessionCountForKey(
        KEY_EMB_UNHANDLED_EXCEPTIONS_COUNT
      );
    }

    this._logger.emit({
      timestamp,
      severityNumber: SeverityNumber.ERROR,
      severityText: 'ERROR',
      body: error.message || '',
      attributes: {
        ...attributes,
        [KEY_EMB_TYPE]: EMB_TYPES.SystemException,
        [KEY_EMB_EXCEPTION_HANDLING]: handled ? 'HANDLED' : 'UNHANDLED',
        [ATTR_EXCEPTION_TYPE]: error.constructor.name,
        ['exception.name']: error.name,
        [ATTR_EXCEPTION_MESSAGE]: error.message,
        [ATTR_EXCEPTION_STACKTRACE]: error.stack,
      },
    });
  }

  public message(
    message: string,
    severity: LogSeverity,
    { attributes = {}, includeStacktrace = true }: LogMessageOptions = {}
  ) {
    if (severity === 'error') {
      this._spanSessionManager.incrSessionCountForKey(KEY_EMB_ERROR_LOG_COUNT);
    }

    this._logMessage({
      message,
      severity,
      timestamp: this._perf.getNowMillis(),
      attributes,
      stackTrace:
        includeStacktrace && severity != 'info' ? new Error().stack : undefined,
    });
  }

  private _logMessage({
    message,
    severity,
    timestamp,
    attributes = {},
    stackTrace,
  }: {
    message: string;
    severity: LogSeverity;
    timestamp: number;
    attributes?: Record<string, AttributeValue | undefined>;
    stackTrace?: string;
  }) {
    this._logger.emit({
      timestamp,
      severityNumber: EmbraceLogManager._logSeverityToSeverityNumber(severity),
      severityText: severity.toUpperCase(),
      body: message,
      attributes: {
        ...attributes,
        [KEY_EMB_TYPE]: EMB_TYPES.SystemLog,
        ...(stackTrace
          ? {
              [KEY_EMB_JS_EXCEPTION_STACKTRACE]: stackTrace,
            }
          : {}),
      },
    });
  }
}
