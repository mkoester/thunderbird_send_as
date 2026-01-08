# Technical Design: Own Domain / Catchall Support

## Overview

This document specifies the technical implementation for adding own-domain and catchall alias methods to the Send As Alias extension.

## Architecture Changes

### 1. Data Structure

#### New Storage Schema

```javascript
{
  // NEW: Per-account settings (replaces old feature2EnabledAccounts array)
  "accountSettings": {
    "<account-id>": {
      "feature1Enabled": true,           // Default: true
      "aliasMethod": "plus",             // "plus" | "own-domain" | "catchall"
      "feature2Enabled": false,          // Default: false
      "feature2DontAskList": []          // Per-account don't-ask list
    }
  },

  // UNCHANGED: Global Feature 3 settings
  "feature3Enabled": true,
  "feature3SkipList": []
}
```

#### Old Storage Schema (for migration)

```javascript
{
  "feature2EnabledAccounts": ["user@posteo.de", "info@mydomain.com"],
  "feature3Enabled": true,
  "feature3SkipList": []
}
```

### 2. Algorithm Changes

#### Current: Plus-Addressing Only

```javascript
// Extract base email by stripping +alias
function extractBaseEmail(email) {
  const match = email.match(/^([^+@]+)(\+[^@]+)?@(.+)$/);
  return match ? `${match[1]}@${match[3]}` : email;
}

// Find matching alias
function findMatchingAlias(recipients, baseEmails) {
  for (let recipient of recipients) {
    const email = extractEmail(recipient);
    const base = extractBaseEmail(email);
    if (baseEmails.includes(base) && base !== email) {
      return recipient; // Found alias
    }
  }
  return null;
}
```

#### New: Multi-Method Support

```javascript
// Get account settings for an identity
async function getAccountSettings(identityId) {
  const stored = await messenger.storage.local.get('accountSettings');
  const accountSettings = stored.accountSettings || {};
  return accountSettings[identityId] || {
    feature1Enabled: true,
    aliasMethod: 'plus',
    feature2Enabled: false,
    feature2DontAskList: []
  };
}

// Extract base based on method
function extractBase(email, method) {
  if (method === 'plus') {
    // Strip +alias part
    const match = email.match(/^([^+@]+)(\+[^@]+)?@(.+)$/);
    return match ? `${match[1]}@${match[3]}` : email;
  } else if (method === 'own-domain' || method === 'catchall') {
    // Extract just the domain
    const match = email.match(/@(.+)$/);
    return match ? match[1] : null; // Return domain only
  }
  return email;
}

// Check if email matches base for given method
function matchesBase(email, identity, method) {
  if (method === 'plus') {
    // Traditional plus-addressing
    const emailBase = extractBase(email, 'plus');
    return emailBase === identity.email && emailBase !== email;
  } else if (method === 'own-domain' || method === 'catchall') {
    // Domain matching
    const emailDomain = extractBase(email, 'own-domain');
    const identityDomain = extractBase(identity.email, 'own-domain');
    return emailDomain === identityDomain && email !== identity.email;
  }
  return false;
}

// NEW: Find matching alias with method awareness
async function findMatchingAlias(recipients, identities) {
  for (let identity of identities) {
    const settings = await getAccountSettings(identity.id);

    if (!settings.feature1Enabled) continue;

    for (let recipient of recipients) {
      const email = extractEmail(recipient);
      if (matchesBase(email, identity, settings.aliasMethod)) {
        return {
          alias: recipient,
          identity: identity,
          method: settings.aliasMethod
        };
      }
    }
  }
  return null;
}
```

### 3. Feature-Specific Changes

#### Feature 1: Auto-Reply

**Current behavior:**
```javascript
const match = await findMatchingAlias(recipients, baseEmails);
if (match) {
  await messenger.compose.setComposeDetails(tab.id, {
    from: match
  });
}
```

**New behavior:**
```javascript
const match = await findMatchingAlias(recipients, identities);
if (match) {
  // match.alias contains the full recipient string
  // match.identity contains the matched identity
  // match.method contains the method used
  await messenger.compose.setComposeDetails(tab.id, {
    from: match.alias
  });
}
```

#### Feature 2: Alias Suggestion

**Current behavior:**
```javascript
// Prompt shows: "Enter alias name to use user+___@posteo.de"
const aliasName = await showAliasPrompt(fromEmail, toEmail);
if (aliasName) {
  const [localPart, domain] = fromEmail.split('@');
  const newFrom = `${localPart}+${aliasName}@${domain}`;
  await messenger.compose.setComposeDetails(tab.id, { from: newFrom });
}
```

**New behavior:**
```javascript
const settings = await getAccountSettings(currentIdentity.id);

if (!settings.feature2Enabled) return;

if (settings.aliasMethod === 'plus') {
  // Existing: "Enter alias name to use user+___@posteo.de"
  const aliasName = await showAliasPrompt(fromEmail, toEmail, 'plus');
  if (aliasName) {
    const [localPart, domain] = fromEmail.split('@');
    const newFrom = `${localPart}+${aliasName}@${domain}`;
    await messenger.compose.setComposeDetails(tab.id, { from: newFrom });
  }
} else if (settings.aliasMethod === 'own-domain' || settings.aliasMethod === 'catchall') {
  // New: "Enter alias for @domain.com:"
  const domain = fromEmail.split('@')[1];
  const aliasName = await showAliasPrompt(fromEmail, toEmail, settings.aliasMethod, domain);
  if (aliasName) {
    const newFrom = `${aliasName}@${domain}`;
    await messenger.compose.setComposeDetails(tab.id, { from: newFrom });
  }
}
```

#### Feature 3: Auto-Create Identity

No changes needed - works the same regardless of method.

### 4. UI Changes

#### Options Page (options/options.html)

**Current Structure:**
```html
<h2>Feature 2: Alias Suggestion</h2>
<div id="feature2-accounts"></div>

<h2>Feature 3: Auto-Create Identity</h2>
<input type="checkbox" id="feature3-enabled">
```

**New Structure:**
```html
<h1>Account Settings</h1>
<div id="account-settings">
  <!-- Will be populated per-account -->
</div>

<hr>

<h1>Identity Creation (Feature 3)</h1>
<input type="checkbox" id="feature3-enabled">
<button id="manage-skip-list">Manage Skip List</button>
```

**Per-Account Block Template:**
```html
<div class="account-block" data-identity-id="{{identityId}}">
  <h3>📧 {{email}}</h3>

  <!-- Feature 1 -->
  <div class="feature-section">
    <label>
      <input type="checkbox" class="feature1-enabled" data-identity-id="{{identityId}}">
      Enable auto-reply with alias (Feature 1)
    </label>

    <!-- Alias method (only shown if Feature 1 enabled) -->
    <div class="alias-method-section" style="display: none;">
      <p style="margin-left: 20px; margin-top: 10px;">Alias method:</p>
      <div style="margin-left: 40px;">
        <label>
          <input type="radio" name="method-{{identityId}}" value="plus">
          Plus-addressing (user+alias@domain.com)
          <div class="method-help">Supported by Gmail, Posteo, and many providers</div>
        </label>

        <label>
          <input type="radio" name="method-{{identityId}}" value="own-domain">
          Own domain (alias@yourdomain.com)
          <div class="method-help">For domains you own with pre-created aliases</div>
        </label>

        <label>
          <input type="radio" name="method-{{identityId}}" value="catchall">
          Own domain with catchall (anything@yourdomain.com)
          <div class="method-help">For domains with catchall forwarding enabled</div>
        </label>
      </div>
    </div>

    <!-- Domain conflict warning -->
    <div class="domain-conflict-warning" style="display: none; color: #999; margin-left: 20px;">
      ⚠️ Another identity is already using own-domain for this domain
    </div>
  </div>

  <!-- Feature 2 -->
  <div class="feature-section">
    <label>
      <input type="checkbox" class="feature2-enabled" data-identity-id="{{identityId}}">
      Suggest alias when composing (Feature 2)
    </label>
  </div>
</div>
```

#### Options Logic (options/options.js)

**Key Functions:**

```javascript
// Load and display all accounts
async function loadAccounts() {
  const accounts = await messenger.accounts.list();
  const stored = await messenger.storage.local.get('accountSettings');
  const accountSettings = stored.accountSettings || {};

  for (let account of accounts) {
    for (let identity of account.identities) {
      const settings = accountSettings[identity.id] || getDefaultSettings();
      renderAccountBlock(identity, settings);
    }
  }

  updateDomainConflicts();
}

// Check for domain conflicts and disable conflicting checkboxes
function updateDomainConflicts() {
  const ownDomainIdentities = {};

  // Find all identities using own-domain methods
  document.querySelectorAll('.account-block').forEach(block => {
    const identityId = block.dataset.identityId;
    const method = getSelectedMethod(identityId);
    const feature1Enabled = block.querySelector('.feature1-enabled').checked;

    if (feature1Enabled && (method === 'own-domain' || method === 'catchall')) {
      const email = getIdentityEmail(identityId);
      const domain = email.split('@')[1];

      if (!ownDomainIdentities[domain]) {
        ownDomainIdentities[domain] = [];
      }
      ownDomainIdentities[domain].push(identityId);
    }
  });

  // Disable checkboxes for conflicting identities
  document.querySelectorAll('.account-block').forEach(block => {
    const identityId = block.dataset.identityId;
    const email = getIdentityEmail(identityId);
    const domain = email.split('@')[1];
    const checkbox = block.querySelector('.feature1-enabled');
    const warning = block.querySelector('.domain-conflict-warning');

    // If another identity owns this domain, disable this checkbox
    if (ownDomainIdentities[domain] &&
        ownDomainIdentities[domain].length > 0 &&
        !ownDomainIdentities[domain].includes(identityId)) {
      checkbox.disabled = true;
      warning.style.display = 'block';
    } else {
      checkbox.disabled = false;
      warning.style.display = 'none';
    }
  });
}

// Save settings when changed
async function saveAccountSettings(identityId, settings) {
  const stored = await messenger.storage.local.get('accountSettings');
  const accountSettings = stored.accountSettings || {};

  accountSettings[identityId] = settings;

  await messenger.storage.local.set({ accountSettings });

  // Re-check conflicts
  updateDomainConflicts();
}
```

#### Popup Changes (popup/alias-prompt.html)

**Update prompt text based on method:**

```javascript
// In alias-prompt.js
const urlParams = new URLSearchParams(window.location.search);
const fromEmail = urlParams.get('from');
const method = urlParams.get('method') || 'plus';
const domain = urlParams.get('domain');

if (method === 'plus') {
  document.getElementById('prompt-text').textContent =
    `Enter alias name to use ${fromEmail.replace('@', '+___@')}`;
} else if (method === 'own-domain' || method === 'catchall') {
  document.getElementById('prompt-text').textContent =
    `Enter alias for @${domain}:`;
  document.getElementById('example').textContent =
    `Example: sales → sales@${domain}`;
}
```

### 5. Migration Strategy

```javascript
// Run on extension load/update
async function migrateSettings() {
  const stored = await messenger.storage.local.get(['accountSettings', 'feature2EnabledAccounts']);

  // If new format already exists, no migration needed
  if (stored.accountSettings) {
    return;
  }

  // Migrate from old format
  const oldEnabledAccounts = stored.feature2EnabledAccounts || [];
  const accounts = await messenger.accounts.list();
  const newSettings = {};

  for (let account of accounts) {
    for (let identity of account.identities) {
      newSettings[identity.id] = {
        feature1Enabled: true,              // Default enabled
        aliasMethod: 'plus',                // Default to plus-addressing
        feature2Enabled: oldEnabledAccounts.includes(identity.email),
        feature2DontAskList: []
      };
    }
  }

  await messenger.storage.local.set({ accountSettings: newSettings });

  // Optionally remove old format
  await messenger.storage.local.remove('feature2EnabledAccounts');

  console.log('Settings migrated to new format');
}

// Call on extension startup
messenger.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'update') {
    await migrateSettings();
  }
});
```

## Implementation Plan

### Phase 3: Implementation Steps

1. **Update Data Structures** (background.js)
   - Add migration logic
   - Update storage getters/setters
   - Add `getAccountSettings()` helper

2. **Update Algorithm Functions** (background.js)
   - Modify `extractBaseEmail()` → `extractBase(email, method)`
   - Modify `findMatchingAlias()` to be method-aware
   - Add `matchesBase(email, identity, method)` helper

3. **Update Feature 1** (background.js)
   - Use new `findMatchingAlias()` return format
   - Check `feature1Enabled` setting per account

4. **Update Feature 2** (background.js)
   - Check account settings for method
   - Pass method to `showAliasPrompt()`
   - Generate alias based on method

5. **Update Options UI** (options/options.html + options.js)
   - Redesign HTML structure
   - Implement per-account blocks
   - Add domain conflict detection
   - Add event handlers for checkboxes/radios

6. **Update Popup UI** (popup/alias-prompt.html + popup/alias-prompt.js)
   - Accept method parameter
   - Update prompt text based on method
   - Handle input differently per method

7. **Testing**
   - Test migration from old to new settings
   - Test all three methods
   - Test domain conflict detection
   - Test all three features with each method

## Files to Modify

1. **background.js** - Core logic changes
2. **options/options.html** - UI redesign
3. **options/options.js** - Settings management
4. **popup/alias-prompt.html** - Prompt text
5. **popup/alias-prompt.js** - Method-aware prompts
6. **README.md** - Update documentation
7. **DESIGN.md** - Update technical docs (optional)

## Testing Checklist

### Migration Testing
- [ ] Fresh install creates default settings
- [ ] Update from old version migrates settings correctly
- [ ] Old Feature 2 enabled state preserved

### Plus-Addressing Method
- [ ] Feature 1: Auto-reply works
- [ ] Feature 2: Alias suggestion works
- [ ] Feature 3: Identity creation works

### Own-Domain Method
- [ ] Feature 1: Domain matching works
- [ ] Feature 2: Alias suggestion with domain
- [ ] Feature 3: Identity creation works
- [ ] Domain conflict prevents multiple identities

### Own-Domain with Catchall Method
- [ ] Feature 1: Domain matching works
- [ ] Feature 2: Alias suggestion with domain
- [ ] Feature 3: Identity creation works
- [ ] Domain conflict prevents multiple identities

### UI Testing
- [ ] Settings page loads all accounts
- [ ] Checkboxes save correctly
- [ ] Radio buttons save correctly
- [ ] Domain conflict disables checkboxes
- [ ] Help text displays correctly
- [ ] Method section shows/hides based on Feature 1 checkbox

### Edge Cases
- [ ] Multiple accounts with same domain (only one can use own-domain)
- [ ] Switching methods updates behavior immediately
- [ ] Disabling Feature 1 hides method selection
- [ ] No identities configured (edge case)

## Backwards Compatibility

- Old settings format automatically migrated
- No data loss during migration
- Extension continues working during migration
- Users can downgrade (will use plus-addressing only)

## Performance Considerations

- Domain conflict check runs only on settings page
- No performance impact on message handling
- Settings cached per compose window (no repeated lookups)

## Security Considerations

- No new permissions required
- Settings stored locally only
- No external API calls
- User-controlled alias generation (no validation needed)
