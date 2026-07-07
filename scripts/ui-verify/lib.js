/* Shared helpers for the headless UI-verification drivers (see
   scripts/verify-ui; pattern ported from the Bookmarks+ extension). Injected
   AFTER a page's own scripts and BEFORE the per-page driver. Exposes
   window.__verify. */
window.__verify = (() => {
  'use strict';

  const results = [];

  const check = (name, cond) => {
    results.push(`${cond ? 'PASS' : 'FAIL'}: ${name}`);
    return cond;
  };

  // TIMING (learned in the Bookmarks+ harness): chromium --dump-dom can fire
  // as soon as the task queue looks idle, so drivers must not park on timer
  // macrotasks. run() waits for DOMContentLoaded itself (a setTimeout(0) is
  // NOT equivalent — chromium may run the timer before the DCL task, and the
  // page's init hasn't even started then); afterwards everything stays
  // microtask-only. waitFor polls by flushing microtasks, which interleaves
  // fairly with the page's own await-chains (storage load, async click
  // handlers).
  async function waitFor(fn, maxMicro = 2000) {
    for (let m = 0; m < maxMicro; m++) {
      const v = fn();
      if (v) return v;
      await Promise.resolve();
    }
    return fn();
  }

  // Writes the <pre id="verify-result"> that scripts/verify-ui greps out of
  // the dumped DOM
  function finish() {
    const pre = document.createElement('pre');
    pre.id = 'verify-result';
    pre.textContent = results.join('\n');
    document.body.appendChild(pre);
  }

  // Wrap a driver body so a thrown error becomes a FAIL line instead of a
  // missing result block. Waits for DOMContentLoaded first: this driver is
  // the page's last script, so the page's own DCL listeners (options init)
  // run before the promise resolves; top-level-init pages (the popups) are
  // simply ready already.
  async function run(body) {
    try {
      if (document.readyState === 'loading') {
        await new Promise((r) => document.addEventListener('DOMContentLoaded', r));
      }
      await body(api);
    } catch (err) {
      check(`driver threw: ${(err && err.message) || err}`, false);
    }
    finish();
  }

  const api = { check, waitFor, finish, run };
  return api;
})();
