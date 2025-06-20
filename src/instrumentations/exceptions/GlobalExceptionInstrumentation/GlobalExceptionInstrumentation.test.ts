import * as chai from 'chai';
import * as sinon from 'sinon';
import {
  MockPerformanceManager,
  setupTestLogExporter,
} from '../../../testUtils/index.js';
import { GlobalExceptionInstrumentation } from './GlobalExceptionInstrumentation.js';
import type { InMemoryLogRecordExporter } from '@opentelemetry/sdk-logs';
import { SeverityNumber } from '@opentelemetry/api-logs';
import { timeInputToHrTime } from '@opentelemetry/core';
import {
  EmbraceLogManager,
  EmbraceSpanSessionManager,
} from '../../../managers/index.js';
import type { LogManager } from '../../../api-logs/index.js';
import { log } from '../../../api-logs/index.js';

const { expect } = chai;

class GlobalExceptionTestError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'GlobalExceptionTestErrorName';
  }
}

describe('GlobalExceptionInstrumentation', () => {
  let memoryExporter: InMemoryLogRecordExporter;
  let logManager: LogManager;
  let instrumentation: GlobalExceptionInstrumentation;
  let perf: MockPerformanceManager;
  let clock: sinon.SinonFakeTimers;
  let existingErrorHandler: OnErrorEventHandler;
  let existingRejectionHandler:
    | ((this: WindowEventHandlers, ev: PromiseRejectionEvent) => unknown)
    | null;

  before(() => {
    memoryExporter = setupTestLogExporter();
  });

  beforeEach(() => {
    memoryExporter.reset();
    logManager = new EmbraceLogManager({
      spanSessionManager: new EmbraceSpanSessionManager(),
    });
    log.setGlobalLogManager(logManager);
    clock = sinon.useFakeTimers();
    perf = new MockPerformanceManager(clock);
    instrumentation = new GlobalExceptionInstrumentation({
      perf,
    });
    // The runner will fail our tests if it detects an unhandled error / rejection, temporarily ignore the ones we're
    // artificially triggering from this suite
    existingRejectionHandler = window.onunhandledrejection;
    window.onunhandledrejection = null;
    existingErrorHandler = window.onerror;
    window.onerror = (
      event: Event | string,
      source?: string,
      lineno?: number,
      colno?: number,
      error?: Error
    ) => {
      if (error?.name !== 'GlobalExceptionTestErrorName') {
        existingErrorHandler?.call(window, event, source, lineno, colno, error);
      }
    };
  });

  afterEach(() => {
    instrumentation.disable();
    clock.restore();
    window.onerror = existingErrorHandler;
    window.onunhandledrejection = existingRejectionHandler;
  });

  it('should add a log when there is an unhandled error', () => {
    const err = new GlobalExceptionTestError('my custom error');
    const evt = new ErrorEvent('error', {
      error: err,
    });
    window.dispatchEvent(evt);

    const finishedLogs = memoryExporter.getFinishedLogRecords();
    expect(finishedLogs).to.have.lengthOf(1);
    const exceptionLog = finishedLogs[0];

    void expect(exceptionLog.hrTime).to.deep.equal(
      timeInputToHrTime(clock.now + evt.timeStamp)
    );
    void expect(exceptionLog.severityNumber).to.be.equal(SeverityNumber.ERROR);
    void expect(exceptionLog.severityText).to.be.equal('ERROR');
    void expect(exceptionLog.body).to.be.equal('my custom error');
    void expect(exceptionLog.attributes).to.deep.equal({
      'emb.type': 'sys.exception',
      'emb.exception_handling': 'UNHANDLED',
      'exception.type': 'GlobalExceptionTestError',
      'exception.name': 'GlobalExceptionTestErrorName',
      'exception.message': 'my custom error',
      'exception.stacktrace': err.stack,
    });
  });

  it('should add a log when there is an unhandled promise rejection with a string reason', () => {
    const evt = new PromiseRejectionEvent('unhandledrejection', {
      promise: new Promise(() => {}),
      reason: 'promise was rejected',
    });
    window.dispatchEvent(evt);

    const finishedLogs = memoryExporter.getFinishedLogRecords();
    expect(finishedLogs).to.have.lengthOf(1);
    const exceptionLog = finishedLogs[0];

    void expect(exceptionLog.hrTime).to.deep.equal(
      timeInputToHrTime(clock.now + evt.timeStamp)
    );
    void expect(exceptionLog.severityNumber).to.be.equal(SeverityNumber.ERROR);
    void expect(exceptionLog.severityText).to.be.equal('ERROR');
    void expect(exceptionLog.body).to.be.equal('promise was rejected');
    void expect(exceptionLog.attributes).to.deep.equal({
      'emb.type': 'sys.exception',
      'emb.exception_handling': 'UNHANDLED',
      'exception.type': 'Error',
      'exception.name': 'Error',
      'exception.message': 'promise was rejected',
      'exception.stacktrace': '',
    });
  });

  it('should add a log when there is an unhandled promise rejection with an error reason', () => {
    const err = new GlobalExceptionTestError('my custom error');
    const evt = new PromiseRejectionEvent('unhandledrejection', {
      promise: new Promise(() => {}),
      reason: err,
    });
    window.dispatchEvent(evt);

    const finishedLogs = memoryExporter.getFinishedLogRecords();
    expect(finishedLogs).to.have.lengthOf(1);
    const exceptionLog = finishedLogs[0];

    void expect(exceptionLog.hrTime).to.deep.equal(
      timeInputToHrTime(clock.now + evt.timeStamp)
    );
    void expect(exceptionLog.severityNumber).to.be.equal(SeverityNumber.ERROR);
    void expect(exceptionLog.severityText).to.be.equal('ERROR');
    void expect(exceptionLog.body).to.be.equal('my custom error');
    void expect(exceptionLog.attributes).to.deep.equal({
      'emb.type': 'sys.exception',
      'emb.exception_handling': 'UNHANDLED',
      'exception.type': 'GlobalExceptionTestError',
      'exception.name': 'GlobalExceptionTestErrorName',
      'exception.message': 'my custom error',
      'exception.stacktrace': err.stack,
    });
  });

  it('should add a log when there is an unhandled promise rejection with an unknown reason', () => {
    const evt = new PromiseRejectionEvent('unhandledrejection', {
      promise: new Promise(() => {}),
      reason: 1234,
    });
    window.dispatchEvent(evt);

    const finishedLogs = memoryExporter.getFinishedLogRecords();
    expect(finishedLogs).to.have.lengthOf(1);
    const exceptionLog = finishedLogs[0];

    void expect(exceptionLog.hrTime).to.deep.equal(
      timeInputToHrTime(clock.now + evt.timeStamp)
    );
    void expect(exceptionLog.severityNumber).to.be.equal(SeverityNumber.ERROR);
    void expect(exceptionLog.severityText).to.be.equal('ERROR');
    void expect(exceptionLog.body).to.be.equal('Unhandled Rejected Promise');
    void expect(exceptionLog.attributes).to.deep.equal({
      'emb.type': 'sys.exception',
      'emb.exception_handling': 'UNHANDLED',
      'exception.type': 'Error',
      'exception.name': 'Error',
      'exception.message': 'Unhandled Rejected Promise',
      'exception.stacktrace': '',
    });
  });
});
