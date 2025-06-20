import {
  DEFAULT_EMBRACE_EXPORTER_CONFIG,
  getEmbraceHeaders,
} from '../index.js';
import { OTLPFetchTraceExporter } from './OTLPFetchTraceExporter.js';
import type { EmbraceTraceExporterArgs } from './types.js';
import { getTraceEndpoint } from './utils.js';

export class EmbraceTraceExporter extends OTLPFetchTraceExporter {
  public constructor({ appID, userID }: EmbraceTraceExporterArgs) {
    super({
      ...DEFAULT_EMBRACE_EXPORTER_CONFIG,
      headers: getEmbraceHeaders(appID, userID),
      url: getTraceEndpoint(appID),
    });
  }
}
