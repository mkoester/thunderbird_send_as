/**
 * Send As Alias - pure alias/email helpers
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

  exports.extractEmail = extractEmail;
  exports.extractDomain = extractDomain;
  exports.extractBase = extractBase;
  exports.matchesBase = matchesBase;
  exports.aliasNamePart = aliasNamePart;
})(typeof module !== 'undefined' ? module.exports : globalThis);
