/**
 * Dev-build ribbon for all Send As Alias pages (options + both prompt popups),
 * ported from the Bookmarks+ extension.
 *
 * build.sh decorates the manifest version for non-release builds (clean off-main
 * → 1.0.9-<hash>, dirty tree → …-SNAPSHOT; clean main stays 1.0.9). This reads
 * that version back at runtime and, for a decorated build, sets data-build on
 * <html> (tokens.css tints the ribbon per kind) and injects the ribbon showing the
 * version. No-op on release builds, so store XPIs stay clean.
 *
 * NOTE: build.sh only rewrites the version inside the packaged XPI, so the ribbon
 * shows for an installed dev XPI — not for a temporary unpacked load of the source
 * folder (whose manifest carries the plain base version).
 *
 * Loaded as a plain script in each page's <head> (after theme.js); self-runs once
 * the DOM is ready. buildKind is also exported for the unit tests under Node (same
 * dual-mode pattern as shared/alias-utils.js).
 */
(function (exports) {
  'use strict';

  // How a build relates to a shippable release, derived purely from the manifest
  // version string (see build.sh):
  //   - "release": clean main — store-safe, dot-separated integers only.
  //   - "branch":  clean off-main — committed, decorated with -<hash>.
  //   - "dirty":   uncommitted working tree — decorated with -SNAPSHOT.
  function buildKind(version) {
    if (typeof version !== 'string' || !version.includes('-')) return 'release';
    return version.includes('-SNAPSHOT') ? 'dirty' : 'branch';
  }

  function installedVersion() {
    try {
      return messenger.runtime.getManifest().version;
    } catch (error) {
      return undefined;
    }
  }

  function applyBuildBadge() {
    const version = installedVersion();
    const kind = buildKind(version);
    if (kind === 'release') return;
    document.documentElement.dataset.build = kind;
    if (document.querySelector('.build-ribbon')) return;
    const ribbon = document.createElement('div');
    ribbon.className = 'build-ribbon';
    ribbon.setAttribute('role', 'status');
    ribbon.textContent = `DEV BUILD · ${version}`;
    document.body.prepend(ribbon);
  }

  exports.buildKind = buildKind;

  // Browser only: inject once the DOM is ready (this script runs from <head>).
  if (typeof document !== 'undefined') {
    globalThis.applyBuildBadge = applyBuildBadge;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyBuildBadge);
    } else {
      applyBuildBadge();
    }
  }
})(typeof module !== 'undefined' ? module.exports : globalThis);
