const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildKind } = require('../theme/buildBadge.js');

test('buildKind: clean store-safe versions are release builds', () => {
  assert.equal(buildKind('1.0.9'), 'release');
  assert.equal(buildKind('2.0.0'), 'release');
  assert.equal(buildKind('10.20.30'), 'release');
});

test('buildKind: a clean off-main build (commit hash, no SNAPSHOT) is a branch build', () => {
  assert.equal(buildKind('1.0.9-76abf97'), 'branch');
});

test('buildKind: an uncommitted tree (-SNAPSHOT) is a dirty build', () => {
  assert.equal(buildKind('1.0.9-SNAPSHOT'), 'dirty'); // dirty on main
  assert.equal(buildKind('1.0.9-76abf97-SNAPSHOT'), 'dirty'); // dirty off main
});

test('buildKind: a missing version is a release build (harness / no manifest)', () => {
  assert.equal(buildKind(undefined), 'release');
});
