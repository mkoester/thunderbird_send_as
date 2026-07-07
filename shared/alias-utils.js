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
   * Check if email matches identity base for given method
   */
  function matchesBase(email, identity, method) {
    if (method === 'plus') {
      // Traditional plus-addressing
      const emailBase = extractBase(email, 'plus');
      return emailBase === identity.email && emailBase !== email;
    } else if (method === 'own-domain' || method === 'catchall') {
      // Domain matching
      const emailDomain = extractDomain(email);
      const identityDomain = extractDomain(identity.email);
      return emailDomain === identityDomain && email !== identity.email;
    }
    return false;
  }

  /**
   * Human-readable alias part of an alias address, for identity naming:
   * plus-addressing: "shopping" from "user+shopping@domain.com"
   * own-domain/catchall: "sales" from "sales@domain.com" (the local part)
   */
  function aliasNamePart(aliasEmail, method) {
    if (method === 'plus') {
      const match = aliasEmail.match(/\+([^@]+)@/);
      return match ? match[1] : null;
    }
    return aliasEmail.split('@')[0] || null;
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

  exports.extractEmail = extractEmail;
  exports.extractDomain = extractDomain;
  exports.extractBase = extractBase;
  exports.matchesBase = matchesBase;
  exports.aliasNamePart = aliasNamePart;
  exports.collectRecipientCandidates = collectRecipientCandidates;
  exports.displayAddress = displayAddress;
  exports.migrateAccountSettings = migrateAccountSettings;
})(typeof module !== 'undefined' ? module.exports : globalThis);
