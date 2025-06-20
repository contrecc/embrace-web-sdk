import type { Context } from '@opentelemetry/api';
import { trace, context } from '@opentelemetry/api';
import type {
  TraceManager,
  ExtendedSpan,
  ExtendedSpanOptions,
} from '../../api-traces/index.js';
import { EMB_TYPES, KEY_EMB_TYPE } from '../../constants/index.js';
import { EmbraceExtendedSpan } from './EmbraceExtendedSpan.js';

export class EmbraceTraceManager implements TraceManager {
  public startSpan(
    name: string,
    options: ExtendedSpanOptions = {},
    ctx?: Context
  ): ExtendedSpan {
    const tracer = trace.getTracer('embrace-web-sdk-traces');

    options.attributes = options.attributes ? options.attributes : {};
    options.attributes[KEY_EMB_TYPE] = EMB_TYPES.Perf;

    const activeContext = options.parentSpan
      ? trace.setSpan(context.active(), options.parentSpan)
      : ctx;

    return new EmbraceExtendedSpan(
      tracer.startSpan(name, options, activeContext)
    );
  }

  public setSpan = trace.setSpan;

  public getSpan(context: Context) {
    const span = trace.getSpan(context);

    if (span) {
      return new EmbraceExtendedSpan(span);
    }

    return undefined;
  }
}
