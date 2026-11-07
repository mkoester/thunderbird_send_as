// Unit tests for the pure helpers in shared/alias-utils.js (node --test tests/)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  extractEmail,
  extractDomain,
  extractBase,
  matchesBase,
  aliasNamePart,
  collectRecipientCandidates,
  displayAddress,
  migrateAccountSettings,
  parseAliasPatterns,
  patternToRegExp,
  matchPattern,
  suggestionTemplate,
  findAliasMatch,
  shouldOpenSetup
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

// Delivery-header handling inspired by the ReplyAsOriginalRecipientUp add-on
test('collectRecipientCandidates puts delivery headers before To and CC', () => {
  const headers = {
    'x-original-to': ['alias@mydomain.com'],
    'delivered-to': ['user@example.com'],
    to: ['A <a@b.com>, C <c@d.com>'] // raw header: one string, two mailboxes
  };
  assert.deepEqual(
    collectRecipientCandidates(headers, ['A <a@b.com>', 'C <c@d.com>'], ['cc@e.com']),
    ['alias@mydomain.com', 'user@example.com', 'A <a@b.com>', 'C <c@d.com>', 'cc@e.com']
  );
});

test('collectRecipientCandidates handles missing headers and lists', () => {
  assert.deepEqual(collectRecipientCandidates({}, undefined, undefined), []);
  assert.deepEqual(collectRecipientCandidates(undefined, ['a@b.com'], undefined), ['a@b.com']);
});

test('displayAddress keeps existing display names, adds a fallback name otherwise', () => {
  assert.equal(displayAddress('Shop <user+shop@e.com>', 'Me'), 'Shop <user+shop@e.com>');
  assert.equal(displayAddress('user+shop@e.com', 'Me'), 'Me <user+shop@e.com>');
  assert.equal(displayAddress('User+Shop@E.com', null), 'user+shop@e.com');
  assert.equal(displayAddress('', 'Me'), null);
  assert.equal(displayAddress(null, 'Me'), null);
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

test('matchesBase compares identity addresses case-insensitively', () => {
  const identity = { email: 'Jane.Doe@Example.com' };
  assert.equal(matchesBase('jane.doe+shop@example.com', identity, 'plus'), true);
  assert.equal(matchesBase('jane.doe@example.com', identity, 'plus'), false);
  assert.equal(matchesBase('sales@example.com', identity, 'own-domain'), true);
  assert.equal(matchesBase('jane.doe@example.com', identity, 'catchall'), false);
});

test('parseAliasPatterns normalizes lines/commas and drops junk', () => {
  assert.deepEqual(
    parseAliasPatterns(' User+*@Example.com \n\n*@me.example.com, nonsense '),
    ['user+*@example.com', '*@me.example.com']
  );
  assert.deepEqual(parseAliasPatterns(['A@B.c', '']), ['a@b.c']);
  assert.deepEqual(parseAliasPatterns(undefined), []);
});

test('patternToRegExp: "*" never spans the @ and regex characters are literal', () => {
  assert.ok(patternToRegExp('user+*@example.com').test('user+shop@example.com'));
  assert.ok(!patternToRegExp('user+*@example.com').test('user+@example.com'));
  assert.ok(!patternToRegExp('user+*@example.com').test('user+x@evil.com@example.com'));
  assert.ok(!patternToRegExp('user+*@example.com').test('user+shop@exampleXcom'));
  assert.ok(!patternToRegExp('*@me.example.com').test('a@b.me.example.com'));
  assert.ok(patternToRegExp('u+*@example.com').test('u+tag@example.com'));
});

// The setup this method was built for: +labels on two local parts plus a
// catch-all subdomain per mailbox, all configured on one account
const PATTERNS = ['alice+*@example.com', 'bob@example.com', 'bob+*@example.com',
  '*@alice.example.com', '*@bob.example.com'];

test('matchesBase: patterns method matches only the configured addresses', () => {
  const identity = { email: 'alice@example.com' };
  const m = (e) => matchesBase(e, identity, 'patterns', PATTERNS);
  assert.equal(m('alice+shop@example.com'), true);
  assert.equal(m('bob@example.com'), true);
  assert.equal(m('bob+news@example.com'), true);
  assert.equal(m('webshop@bob.example.com'), true);
  assert.equal(m('webshop@alice.example.com'), true);
  assert.equal(m('alice-shop@example.com'), false); // "-" is not "+"
  assert.equal(m('webshop@other.example.com'), false); // someone else's mailbox
  assert.equal(m('alice@example.com'), false); // the identity itself
  assert.equal(m('someoneelse@example.com'), false); // shared domain, not mine
  assert.equal(m('alicex@example.com'), false);
  assert.equal(matchesBase('alice+shop@example.com', identity, 'patterns', []), false);
});

test('matchPattern / aliasNamePart / suggestionTemplate for patterns', () => {
  assert.deepEqual(matchPattern('alice+shop@example.com', PATTERNS),
    { pattern: 'alice+*@example.com', captured: 'shop' });
  assert.deepEqual(matchPattern('bob@example.com', PATTERNS),
    { pattern: 'bob@example.com', captured: null });
  assert.equal(aliasNamePart('alice+shop@example.com', 'patterns', PATTERNS), 'shop');
  assert.equal(aliasNamePart('webshop@bob.example.com', 'patterns', PATTERNS), 'webshop');
  assert.equal(aliasNamePart('bob@example.com', 'patterns', PATTERNS), 'bob');
  assert.equal(suggestionTemplate(PATTERNS), 'alice+*@example.com');
  assert.equal(suggestionTemplate(['a@b.c', '*-*@b.c']), null);
});

test('findAliasMatch tries candidates in order across all enabled accounts', () => {
  const ids = [
    { id: 'a', email: 'me@a.com', name: 'A' },
    { id: 'b', email: 'alice@example.com', name: 'Alice' },
    { id: 'c', email: 'off@c.com', name: 'Off' }
  ];
  const cfg = {
    a: { replyAsAliasEnabled: true, aliasMethod: 'catchall' },
    b: { replyAsAliasEnabled: true, aliasMethod: 'patterns', aliasPatterns: PATTERNS },
    c: { replyAsAliasEnabled: false, aliasMethod: 'plus' }
  };
  const get = (id) => cfg[id];

  // Delivery header (first candidate) names b's alias; a's alias in To must not win
  const m = findAliasMatch(['alice+bcc@example.com', 'Shop <x@a.com>'], ids, get);
  assert.equal(m.email, 'alice+bcc@example.com');
  assert.equal(m.identity.id, 'b');
  assert.equal(m.alias, 'Alice <alice+bcc@example.com>');
  assert.equal(m.method, 'patterns');

  assert.equal(findAliasMatch(['Shop <x@a.com>'], ids, get).alias, 'Shop <x@a.com>');
  assert.equal(findAliasMatch(['off+x@c.com', 'nobody@z.com'], ids, get), null);
  assert.equal(findAliasMatch([], ids, get), null);
});

test('shouldOpenSetup: install always, update only while nothing is enabled', () => {
  const off = { id1: { replyAsAliasEnabled: false } };
  const on = { id1: { replyAsAliasEnabled: false }, id2: { replyAsAliasEnabled: true } };
  assert.equal(shouldOpenSetup('install', on), true);
  assert.equal(shouldOpenSetup('update', undefined), true); // reinstall during "Undo"
  assert.equal(shouldOpenSetup('update', off), true);
  assert.equal(shouldOpenSetup('update', on), false);
  assert.equal(shouldOpenSetup('update', { id1: { feature1Enabled: true } }), false); // pre-rename key
  assert.equal(shouldOpenSetup('browser_update', undefined), false);
});
