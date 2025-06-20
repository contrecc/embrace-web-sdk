import * as chai from 'chai';
import sinonChai from 'sinon-chai';
import { KEY_ENDUSER_PSEUDO_ID } from '../../api-users/index.js';
import {
  InMemoryDiagLogger,
  InMemoryStorage,
  FailingStorage,
} from '../../testUtils/index.js';
import { EMBRACE_USER_STORAGE_KEY } from './constants.js';
import { EmbraceUserManager } from './EmbraceUserManager.js';

chai.use(sinonChai);
const { expect } = chai;

const VALID_UUID = 'aaaaBBBBccccDDDDeeeeFFFFggggHHHH';

describe('EmbraceUserManager', () => {
  let storage: InMemoryStorage;
  let diag: InMemoryDiagLogger;

  beforeEach(() => {
    storage = new InMemoryStorage();
    diag = new InMemoryDiagLogger();
  });

  it('should initialize a EmbraceUserManager', () => {
    const manager = new EmbraceUserManager({ diag, storage });
    expect(manager).to.be.instanceOf(EmbraceUserManager);
  });

  it('should generate an anonymous user if there is not one in storage', () => {
    const manager = new EmbraceUserManager({ diag, storage });
    expect(diag.getDebugLogs()).to.have.lengthOf(1);
    expect(diag.getDebugLogs()[0]).to.equal(
      'No existing user found in storage, creating a new one'
    );
    void expect(manager.getUser()?.['enduser.pseudo.id']).to.have.lengthOf(32);
  });

  it('should restore an anonymous user if there is one in storage', () => {
    storage.setItem(
      EMBRACE_USER_STORAGE_KEY,
      JSON.stringify({
        [KEY_ENDUSER_PSEUDO_ID]: VALID_UUID,
      })
    );

    const manager = new EmbraceUserManager({ diag, storage });
    void expect(manager.getUser()?.['enduser.pseudo.id']).to.be.equal(
      VALID_UUID
    );
  });

  it('should allow the anonymous user to be cleared', () => {
    storage.setItem(
      EMBRACE_USER_STORAGE_KEY,
      JSON.stringify({
        [KEY_ENDUSER_PSEUDO_ID]: VALID_UUID,
      })
    );

    const manager = new EmbraceUserManager({ diag, storage });
    void expect(manager.getUser()?.['enduser.pseudo.id']).to.be.equal(
      VALID_UUID
    );

    manager.clearUser();
    void expect(manager.getUser()).to.be.null;

    // Since the user was cleared from storage a new ID should be generated for the next manager
    const nextManager = new EmbraceUserManager({ diag, storage });
    void expect(manager.getUser()?.['enduser.pseudo.id']).not.to.equal(
      VALID_UUID
    );
    void expect(nextManager.getUser()?.['enduser.pseudo.id']).to.have.lengthOf(
      32
    );
  });

  it('should handle parsing an invalid user from storage', () => {
    storage.setItem(
      EMBRACE_USER_STORAGE_KEY,
      JSON.stringify({
        [KEY_ENDUSER_PSEUDO_ID]: 'some-invalid-uuid',
      })
    );

    const manager = new EmbraceUserManager({ diag, storage });
    expect(diag.getWarnLogs()).to.have.lengthOf(1);
    expect(diag.getWarnLogs()[0]).to.equal(
      'Invalid user object in storage, defaulting to a new one'
    );
    void expect(manager.getUser()?.['enduser.pseudo.id']).to.have.lengthOf(32);
  });

  it('should handle parsing invalid JSON from storage', () => {
    storage.setItem(EMBRACE_USER_STORAGE_KEY, '{...');

    const manager = new EmbraceUserManager({ diag, storage });
    expect(diag.getWarnLogs()).to.have.lengthOf(1);
    expect(diag.getWarnLogs()[0]).to.equal(
      'Failed to parse user from storage, defaulting to a new one'
    );
    void expect(manager.getUser()?.['enduser.pseudo.id']).to.have.lengthOf(32);
  });

  it('should handle being setup with a non-functional storage', () => {
    // @ts-expect-error dealing with potential restricted browser environments where storage APIs are unavailable
    const manager = new EmbraceUserManager({ diag, storage: null });
    void expect(manager.getUser()?.['enduser.pseudo.id']).to.have.lengthOf(32);
    manager.clearUser();
    expect(diag.getWarnLogs()).to.have.lengthOf(3);
    expect(diag.getWarnLogs()).to.deep.equal([
      'Failed to parse user from storage, defaulting to a new one',
      'Failed to persist user object for storage, keeping it in-memory only',
      'Failed to retrieve user object from storage',
    ]);
  });

  it('should handle its storage throwing errors', () => {
    const manager = new EmbraceUserManager({
      diag,
      storage: new FailingStorage(),
    });
    void expect(manager.getUser()?.['enduser.pseudo.id']).to.have.lengthOf(32);
    manager.clearUser();
    expect(diag.getWarnLogs()).to.have.lengthOf(3);
    expect(diag.getWarnLogs()).to.deep.equal([
      'Failed to parse user from storage, defaulting to a new one',
      'Failed to persist user object for storage, keeping it in-memory only',
      'Failed to retrieve user object from storage',
    ]);
  });
});
