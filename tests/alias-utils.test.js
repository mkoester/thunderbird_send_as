// Unit tests for the pure helpers in shared/alias-utils.js (node --test tests/)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  extractEmail,
  extractDomain,
  extractBase,
  matchesBase,
  aliasNamePart,
  migrateAccountSettings
} = require('../shared/alias-utils.js');

test('extractEmail handles plain, angle-bracket and object formats', () => {
  assert.equal(extractEmail('user@example.com'), 'user@example.com');
  assert.equal(extractEmail('Some Name <User@Example.com>'), 'user@example.com');
  assert.equal(extractEmail({ address: 'USER@example.com' }), 'user@example.com');
  assert.equal(extractEmail('  user@example.com  '), 'user@example.com');
  assert.equal(extractEmail(null), null);
  assert.equal(extractEmail(''), null);
});

test('extractDomain returns the part after @', () => {
  assert.equal(extractDomain('user@example.com'), 'example.com');
  assert.equal(extractDomain('user+tag@sub.example.com'), 'sub.example.com');
  assert.equal(extractDomain('no-at-sign'), null);
});

test('extractBase strips the +alias for plus-addressing', () => {
  assert.equal(extractBase('user+shop@example.com', 'plus'), 'user@example.com');
  assert.equal(extractBase('user@example.com', 'plus'), 'user@example.com');
});

test('extractBase returns the domain for own-domain and catchall', () => {
  assert.equal(extractBase('sales@example.com', 'own-domain'), 'example.com');
  assert.equal(extractBase('anything@example.com', 'catchall'), 'example.com');
});

test('matchesBase: plus-addressing matches only real aliases of the identity', () => {
  const identity = { email: 'user@example.com' };
  assert.equal(matchesBase('user+shop@example.com', identity, 'plus'), true);
  assert.equal(matchesBase('user@example.com', identity, 'plus'), false); // base itself
  assert.equal(matchesBase('other+x@example.com', identity, 'plus'), false);
  assert.equal(matchesBase('user+shop@other.com', identity, 'plus'), false);
});

test('matchesBase: own-domain/catchall matches same-domain addresses except the base', () => {
  const identity = { email: 'me@mydomain.com' };
  assert.equal(matchesBase('sales@mydomain.com', identity, 'own-domain'), true);
  assert.equal(matchesBase('me@mydomain.com', identity, 'own-domain'), false); // base itself
  assert.equal(matchesBase('sales@elsewhere.com', identity, 'catchall'), false);
});

test('matchesBase returns false for unknown methods', () => {
  assert.equal(matchesBase('a@b.c', { email: 'a@b.c' }, 'bogus'), false);
});

// These cases crashed / misbehaved before the method-aware Identity Creation fix:
// the old code did aliasEmail.split('+')[1].split('@')[0]
test('aliasNamePart: plus-addressing extracts the +part', () => {
  assert.equal(aliasNamePart('user+shopping@example.com', 'plus'), 'shopping');
  assert.equal(aliasNamePart('user@example.com', 'plus'), null); // no + → no alias part
});

test('aliasNamePart: own-domain/catchall uses the local part (no "+" required)', () => {
  assert.equal(aliasNamePart('sales@mydomain.com', 'own-domain'), 'sales');
  assert.equal(aliasNamePart('support@mydomain.com', 'catchall'), 'support');
});

test('migrateAccountSettings renames featureN keys and preserves values', () => {
  const { accountSettings, changed } = migrateAccountSettings({
    id1: {
      feature1Enabled: true,
      aliasMethod: 'own-domain',
      feature2Enabled: true,
      feature2DontAskList: ['a@b.com']
    }
  });
  assert.equal(changed, true);
  assert.deepEqual(accountSettings.id1, {
    aliasMethod: 'own-domain',
    replyAsAliasEnabled: true,
    suggestAliasEnabled: true,
    suggestAliasDontAskList: ['a@b.com']
  });
});

test('migrateAccountSettings leaves already-migrated settings untouched', () => {
  const input = {
    id1: {
      replyAsAliasEnabled: false,
      aliasMethod: 'plus',
      suggestAliasEnabled: true,
      suggestAliasDontAskList: []
    }
  };
  const { accountSettings, changed } = migrateAccountSettings(input);
  assert.equal(changed, false);
  assert.deepEqual(accountSettings, input);
});

test('migrateAccountSettings handles empty/missing input and partial old keys', () => {
  assert.deepEqual(migrateAccountSettings(undefined), { accountSettings: {}, changed: false });
  assert.deepEqual(migrateAccountSettings({}), { accountSettings: {}, changed: false });

  // Old entry that never stored a don't-ask list gets the defaults
  const { accountSettings, changed } = migrateAccountSettings({
    id1: { feature1Enabled: true, aliasMethod: 'plus' }
  });
  assert.equal(changed, true);
  assert.deepEqual(accountSettings.id1, {
    aliasMethod: 'plus',
    replyAsAliasEnabled: true,
    suggestAliasEnabled: false,
    suggestAliasDontAskList: []
  });
});
