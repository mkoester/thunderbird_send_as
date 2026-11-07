/**
 * Send As Alias - pure helpers (alias/email parsing, settings migration)
 *
 * Loaded as a plain script before background.js (see manifest.json
 * background.scripts order) where it attaches to globalThis, and required
 * directly by the unit tests in tests/ under Node (module.exports).
 */
(function (exports) {
  'use strict';

  /**
   * Extract email address from various formats
   * Handles: "Name <email@domain.com>" or "email@domain.com"
   */
  function extractEmail(recipient) {
    if (!recipient) return null;

    // Handle string or object format
    const str = typeof recipient === 'string' ? recipient : recipient.address || '';

    // Extract email from "Name <email>" format
    const match = str.match(/<(.+?)>/);
    if (match) {
      return match[1].toLowerCase();
    }

    return str.trim().toLowerCase();
  }

  /**
   * Extract domain from email address
   */
  function extractDomain(email) {
    const match = email.match(/@(.+)$/);
    return match ? match[1] : null;
  }

  /**
   * Extract base based on method
   * For plus-addressing: strips +alias part
   * For own-domain/catchall: returns domain only
   */
  function extractBase(email, method) {
    if (method === 'plus') {
      // Strip +alias part
      const match = email.match(/^([^+@]+)(\+[^@]+)?@(.+)$/);
      return match ? `${match[1]}@${match[3]}` : email;
    } else if (method === 'own-domain' || method === 'catchall') {
      // Extract just the domain
      return extractDomain(email);
    }
    return email;
  }

  /**
   * Parse the user's alias patterns (one per line, or comma separated) into
   * a clean, lower-cased list. Entries without an "@" are dropped.
   */
  function parseAliasPatterns(text) {
    const list = Array.isArray(text) ? text : String(text || '').split(/[\n,]/);
    return list
      .map((p) => String(p).trim().toLowerCase())
      .filter((p) => p.includes('@'));
  }

  /**
   * Compile an alias pattern to an anchored RegExp: "*" matches one or more
   * characters other than "@" (so it never spans local part and domain) and is
   * captured; everything else is literal.
   * "user+*@example.com" matches "user+shop@example.com";
   * "*@me.example.com" matches "anything@me.example.com".
   */
  function patternToRegExp(pattern) {
    const body = String(pattern)
      .trim()
      .toLowerCase()
      .split('*')
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
      .join('([^@]+)');
    return new RegExp(`^${body}$`);
  }

  /**
   * First of the patterns that matches email, as { pattern, captured } where
   * captured is the text the first "*" matched (null for a literal pattern).
   */
  function matchPattern(email, patterns) {
    for (const pattern of parseAliasPatterns(patterns)) {
      const m = email.match(patternToRegExp(pattern));
      if (m) return { pattern, captured: m[1] ?? null };
    }
    return null;
  }

  /**
   * Check if email matches identity base for given method. patterns is only
   * used by the 'patterns' method (the account's configured alias patterns).
   * email is expected lower case (extractEmail); identity addresses are
   * compared case-insensitively, as Thunderbird keeps them as typed.
   */
  function matchesBase(email, identity, method, patterns) {
    const identityEmail = (identity.email || '').toLowerCase();
    if (method === 'plus') {
      // Traditional plus-addressing
      const emailBase = extractBase(email, 'plus');
      return emailBase === identityEmail && emailBase !== email;
    } else if (method === 'own-domain' || method === 'catchall') {
      // Domain matching
      const emailDomain = extractDomain(email);
      const identityDomain = extractDomain(identityEmail);
      return emailDomain === identityDomain && email !== identityEmail;
    } else if (method === 'patterns') {
      // Explicit, user-configured address patterns
      return email !== identityEmail && matchPattern(email, patterns) !== null;
    }
    return false;
  }

  /**
   * Human-readable alias part of an alias address, for identity naming:
   * plus-addressing: "shopping" from "user+shopping@domain.com"
   * own-domain/catchall: "sales" from "sales@domain.com" (the local part)
   * patterns: what the pattern's "*" matched ("shop" from
   *   "user+shop@example.com" via "user+*@example.com"), else the
   *   local part
   */
  function aliasNamePart(aliasEmail, method, patterns) {
    if (method === 'plus') {
      const match = aliasEmail.match(/\+([^@]+)@/);
      return match ? match[1] : null;
    }
    if (method === 'patterns') {
      const m = matchPattern(aliasEmail.toLowerCase(), patterns);
      if (m && m.captured) return m.captured;
    }
    return aliasEmail.split('@')[0] || null;
  }

  /**
   * The pattern Alias Suggestion builds new aliases from: the first one with
   * exactly one "*" (e.g. "user+*@example.com"), or null if there is none.
   */
  function suggestionTemplate(patterns) {
    return parseAliasPatterns(patterns).find((p) => p.split('*').length === 2) || null;
  }

  /**
   * REPLY AS ALIAS core: the first candidate (in candidate order — most
   * reliable first, see collectRecipientCandidates) that matches the alias
   * method of an account with Reply as Alias enabled.
   * getSettings(identityId) returns that identity's account settings.
   * Returns { alias, email, identity, method } (alias formatted for a From
   * header, keeping the recipient's display name) or null.
   */
  function findAliasMatch(candidates, identities, getSettings) {
    for (const candidate of candidates || []) {
      const email = extractEmail(candidate);
      if (!email) continue;
      for (const identity of identities || []) {
        const s = getSettings(identity.id);
        if (!s || !s.replyAsAliasEnabled) continue;
        if (matchesBase(email, identity, s.aliasMethod, s.aliasPatterns)) {
          return {
            alias: displayAddress(candidate, identity.name),
            email,
            identity,
            method: s.aliasMethod
          };
        }
      }
    }
    return null;
  }

  // Headers written by the delivering MTA that record which address a message
  // was actually delivered to (Postfix/qmail: X-Original-To, Delivered-To;
  // Exim: Envelope-To). More reliable than To/CC for alias detection: the
  // alias may not appear in To/CC at all (BCC, mailing lists, forwarding).
  // Reading these was inspired by the ReplyAsOriginalRecipientUp extension.
  const DELIVERY_HEADERS = ['x-original-to', 'delivered-to', 'envelope-to'];

  /**
   * All recipient candidates of a received message, most reliable first:
   * delivery headers (see above), then the parsed To and CC lists.
   * headers: raw header map from messages.getFull() (keys are lower case);
   * parsedRecipients/parsedCc: MessageHeader.recipients/.ccList from
   * messages.get() (one array entry per mailbox, RFC 2047 decoded).
   */
  function collectRecipientCandidates(headers, parsedRecipients, parsedCc) {
    const delivery = DELIVERY_HEADERS.flatMap((h) => (headers && headers[h]) || []);
    return [...delivery, ...(parsedRecipients || []), ...(parsedCc || [])];
  }

  /**
   * Format a recipient for use in a From header: keep it as-is when it
   * already carries a display name, otherwise prepend fallbackName (usually
   * the identity's name). Returns null when no email can be extracted.
   */
  function displayAddress(recipient, fallbackName) {
    const email = extractEmail(recipient);
    if (!email) return null;
    const str = (typeof recipient === 'string' ? recipient : recipient.address || '').trim();
    if (/<.+?>/.test(str)) return str;
    return fallbackName ? `${fallbackName} <${email}>` : email;
  }

  /**
   * Rename the historical featureN keys in per-account settings to their
   * descriptive names (feature1 → replyAsAlias, feature2 → suggestAlias).
   * Pure: returns { accountSettings, changed } without touching the input;
   * the caller persists to storage.local when changed is true.
   */
  function migrateAccountSettings(accountSettings) {
    let changed = false;
    const migrated = {};

    for (const [identityId, s] of Object.entries(accountSettings || {})) {
      if ('feature1Enabled' in s || 'feature2Enabled' in s || 'feature2DontAskList' in s) {
        changed = true;
        const { feature1Enabled, feature2Enabled, feature2DontAskList, ...rest } = s;
        migrated[identityId] = {
          ...rest,
          replyAsAliasEnabled: feature1Enabled ?? false,
          suggestAliasEnabled: feature2Enabled ?? false,
          suggestAliasDontAskList: feature2DontAskList ?? []
        };
      } else {
        migrated[identityId] = s;
      }
    }

    return { accountSettings: migrated, changed };
  }

  /**
   * Whether runtime.onInstalled should open the settings page: always on a
   * fresh install, and on an update while no account has Reply as Alias
   * enabled — the extension is inert until then. The update case matters
   * because reinstalling while the old copy is still pending uninstall (the
   * Add-ons Manager's "Undo" state) is reported as an update, not an install.
   */
  function shouldOpenSetup(reason, accountSettings) {
    if (reason === 'install') return true;
    if (reason !== 'update') return false;
    return !Object.values(accountSettings || {}).some((s) => s && (s.replyAsAliasEnabled || s.feature1Enabled));
  }

  exports.shouldOpenSetup = shouldOpenSetup;
  exports.extractEmail = extractEmail;
  exports.extractDomain = extractDomain;
  exports.extractBase = extractBase;
  exports.matchesBase = matchesBase;
  exports.aliasNamePart = aliasNamePart;
  exports.parseAliasPatterns = parseAliasPatterns;
  exports.patternToRegExp = patternToRegExp;
  exports.matchPattern = matchPattern;
  exports.suggestionTemplate = suggestionTemplate;
  exports.findAliasMatch = findAliasMatch;
  exports.collectRecipientCandidates = collectRecipientCandidates;
  exports.displayAddress = displayAddress;
  exports.migrateAccountSettings = migrateAccountSettings;
})(typeof module !== 'undefined' ? module.exports : globalThis);
