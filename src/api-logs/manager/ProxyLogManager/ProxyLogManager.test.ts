import * as chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import type { LogManager } from '../index.js';
import { NoOpLogManager } from '../NoOpLogManager/index.js';
import { ProxyLogManager } from './ProxyLogManager.js';

chai.use(sinonChai);
const { expect } = chai;

describe('ProxyLogManager', () => {
  let proxyLogManager: ProxyLogManager;
  let mockDelegate: LogManager;

  beforeEach(() => {
    proxyLogManager = new ProxyLogManager();
    mockDelegate = {
      message: sinon.stub(),
      logException: sinon.stub(),
    };
  });

  it('should return NoOpLogManager as default delegate', () => {
    const delegate = proxyLogManager.getDelegate();
    expect(delegate).to.be.instanceOf(NoOpLogManager);
  });

  it('should set and get the delegate', () => {
    proxyLogManager.setDelegate(mockDelegate);
    const delegate = proxyLogManager.getDelegate();
    expect(delegate).to.equal(mockDelegate);
  });

  it('should delegate message to the delegate', () => {
    proxyLogManager.setDelegate(mockDelegate);
    proxyLogManager.message('logging a log', 'info', {
      attributes: {
        key1: 'value1',
      },
    });
    void expect(mockDelegate.message).to.have.been.calledOnce;
  });

  it('should delegate logException to the delegate', () => {
    proxyLogManager.setDelegate(mockDelegate);
    proxyLogManager.logException(new Error(), {
      handled: true,
      attributes: {
        key1: 'value1',
      },
      timestamp: Date.now(),
    });
    void expect(mockDelegate.logException).to.have.been.calledOnce;
  });
});
