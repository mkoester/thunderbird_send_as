/**
 * Send As Alias - Thunderbird Extension
 * Automatically manage email aliases for plus-addressing
 */

// Global state
let baseEmails = [];
let identities = []; // Store all identities for method-aware matching
let settings = {
  // NEW: Per-account settings (by identity ID)
  accountSettings: {},       // { "identityId": { feature1Enabled, aliasMethod, feature2Enabled, feature2DontAskList } }

  // UNCHANGED: Global Feature 3 settings
  offerIdentityCreation: true, // Global setting
  skipIdentityCreation: [],  // Array of aliases to skip: ["user+temp@domain.com"]
  debugLogging: false        // Enable debug console logging (default: false)
};

// Track which compose windows we've already processed (to avoid duplicate handling)
const processedComposeTabs = new Set();

/**
 * Handle messages from popup windows
 */
messenger.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'aliasPromptResponse') {
    // Call the stored resolve function from showAliasPrompt
    if (window.pendingAliasPromptResolve) {
      window.pendingAliasPromptResolve(message);
      window.pendingAliasPromptResolve = null;
    }
  }
  if (message.type === 'identityPromptResponse') {
    // Call the stored resolve function from showCreateIdentityPrompt
    if (window.pendingIdentityPromptResolve) {
      window.pendingIdentityPromptResolve(message);
      window.pendingIdentityPromptResolve = null;
    }
  }
});

/**
 * Initialize extension
 */
async function initialize() {
  infoLog('Send As Alias: Initializing...');

  // Load settings from storage
  await loadSettings();

  // Load base email addresses from configured identities
  await loadBaseEmails();

  infoLog('Send As Alias: Initialized with base emails:', baseEmails);
}

/**
 * Load settings from browser storage
 */
async function loadSettings() {
  try {
    const stored = await messenger.storage.local.get([
      'accountSettings',
      'promptForAlias',
      'dontAskAgain',
      'offerIdentityCreation',
      'skipIdentityCreation',
      'debugLogging'
    ]);

    // Migrate from old format if needed
    if (!stored.accountSettings && (stored.promptForAlias || stored.dontAskAgain)) {
      infoLog('Send As Alias: Migrating settings from old format...');
      await migrateSettings(stored);
      // Reload after migration
      const newStored = await messenger.storage.local.get([
        'accountSettings',
        'offerIdentityCreation',
        'skipIdentityCreation',
        'debugLogging'
      ]);
      Object.assign(stored, newStored);
    }

    if (stored.accountSettings) settings.accountSettings = stored.accountSettings;
    if (stored.offerIdentityCreation !== undefined) settings.offerIdentityCreation = stored.offerIdentityCreation;
    if (stored.skipIdentityCreation) settings.skipIdentityCreation = stored.skipIdentityCreation;
    if (stored.debugLogging !== undefined) settings.debugLogging = stored.debugLogging;

    debugLog('Send As Alias: Settings loaded:', settings);
  } catch (error) {
    errorLog('Send As Alias: Error loading settings:', error);
  }
}

/**
 * Migrate settings from old format to new per-account format
 * Old format:
 *   - promptForAlias: ["user@domain.com", ...]  (emails where Feature 2 was enabled)
 *   - dontAskAgain: [["from@domain.com", "to@domain.com"], ...]  (pairs to skip)
 * New format:
 *   - accountSettings: { "identityId": { feature1Enabled, aliasMethod, feature2Enabled, feature2DontAskList } }
 */
async function migrateSettings(stored) {
  try {
    const oldPromptForAlias = stored.promptForAlias || [];
    const oldDontAskAgain = stored.dontAskAgain || [];

    // Get all identities to map emails to IDs
    const allIdentities = await messenger.identities.list();
    const accountSettings = {};

    for (const identity of allIdentities) {
      const wasFeature2Enabled = oldPromptForAlias.includes(identity.email);

      // Build don't-ask list for this identity from old format
      const dontAskList = [];
      for (const [fromEmail, toEmail] of oldDontAskAgain) {
        if (fromEmail === identity.email) {
          dontAskList.push(toEmail);
        }
      }

      // Create settings for this identity
      accountSettings[identity.id] = {
        feature1Enabled: false,              // Default: disabled (opt-in)
        aliasMethod: 'plus',                 // Default: plus-addressing
        feature2Enabled: wasFeature2Enabled, // Preserve old Feature 2 state
        feature2DontAskList: dontAskList     // Migrate don't-ask list
      };
    }

    // Save new format
    await messenger.storage.local.set({ accountSettings });

    // Remove old format keys
    await messenger.storage.local.remove(['promptForAlias', 'dontAskAgain']);

    infoLog('Send As Alias: Migration complete -', Object.keys(accountSettings).length, 'identities migrated');
  } catch (error) {
    errorLog('Send As Alias: Error during migration:', error);
  }
}

/**
 * Get account settings for an identity (with defaults)
 */
function getAccountSettings(identityId) {
  if (settings.accountSettings[identityId]) {
    return settings.accountSettings[identityId];
  }

  // Return default settings if not configured
  return {
    feature1Enabled: false,
    aliasMethod: 'plus',
    feature2Enabled: false,
    feature2DontAskList: []
  };
}

/**
 * Conditional debug logging - only logs if debug mode is enabled
 */
function debugLog(...args) {
  if (settings.debugLogging) {
    console.log(...args);
  }
}

/**
 * Info-level logging - always logs (for important events)
 */
function infoLog(...args) {
  console.log(...args);
}

/**
 * Error logging - always logs
 */
function errorLog(...args) {
  console.error(...args);
}

/**
 * Load base email addresses from all configured identities
 */
async function loadBaseEmails() {
  try {
    // IMPORTANT: Assign to global identities variable, not a local one!
    identities = await messenger.identities.list();
    baseEmails = identities.map(identity => identity.email);
    debugLog('Send As Alias: Loaded identities:', identities);
    debugLog('Send As Alias: Loaded base emails:', baseEmails);
  } catch (error) {
    errorLog('Send As Alias: Error loading identities:', error);
  }
}

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
 * FEATURE 1: Find matching alias in recipients (method-aware)
 * Returns { alias: recipient, identity: identity, method: method } or null
 */
async function findMatchingAlias(recipients) {
  if (!recipients || !Array.isArray(recipients)) {
    return null;
  }

  debugLog(`Send As Alias: Searching for alias match in ${recipients.length} recipient(s)`);

  for (const identity of identities) {
    const accountSettings = getAccountSettings(identity.id);

    // Skip if Feature 1 is disabled for this account
    if (!accountSettings.feature1Enabled) {
      continue;
    }

    for (const recipient of recipients) {
      const email = extractEmail(recipient);
      if (!email) continue;

      // Check if this email matches the identity's base using configured method
      if (matchesBase(email, identity, accountSettings.aliasMethod)) {
        // Format the alias address with identity's name if available
        let formattedAlias = recipient;

        // If recipient has no display name but identity does, use identity's name
        if (recipient === email && identity.name) {
          formattedAlias = `${identity.name} <${email}>`;
        }

        debugLog(`Send As Alias: ✓ Match found: ${email} (method: ${accountSettings.aliasMethod}, identity: ${identity.email})`);

        return {
          alias: formattedAlias,
          identity: identity,
          method: accountSettings.aliasMethod
        };
      }
    }
  }

  return null;
}

/**
 * FEATURE 2: Show alias suggestion prompt (method-aware)
 * Opens a popup window and waits for user response
 */
async function showAliasPrompt(fromEmail, toEmail, method, domain) {
  return new Promise((resolve) => {
    // Store the resolve function so we can call it when we get the response
    window.pendingAliasPromptResolve = resolve;

    // Build URL with method and domain parameters
    let url = `popup/alias-prompt.html?from=${encodeURIComponent(fromEmail)}&to=${encodeURIComponent(toEmail || '')}&method=${encodeURIComponent(method)}`;
    if (domain) {
      url += `&domain=${encodeURIComponent(domain)}`;
    }

    messenger.windows.create({
      url: url,
      type: 'popup',
      width: 550,
      height: 400
    });
  });
}

/**
 * FEATURE 3: Show identity creation prompt
 * Opens a popup window and waits for user response
 */
async function showCreateIdentityPrompt(options) {
  return new Promise((resolve) => {
    // Store the resolve function so we can call it when we get the response
    window.pendingIdentityPromptResolve = resolve;

    // Open popup window
    const url = `popup/identity-prompt.html?email=${encodeURIComponent(options.email)}&baseName=${encodeURIComponent(options.baseName)}`;
    messenger.windows.create({
      url: url,
      type: 'popup',
      width: 550,
      height: 300
    });
  });
}

/**
 * FEATURE 3: Maybe create identity for new alias
 */
async function maybeCreateIdentity(aliasEmail, baseEmail) {
  debugLog(`Send As Alias: maybeCreateIdentity called with aliasEmail: ${aliasEmail}, baseEmail: ${baseEmail}`);

  try {
    // Check if this alias already exists as an identity
    const allIdentities = await messenger.identities.list();
    debugLog(`Send As Alias: Loaded ${allIdentities.length} identities`);
    const exists = allIdentities.some(id => id.email.toLowerCase() === aliasEmail.toLowerCase());

    if (exists) {
      debugLog(`Send As Alias: Identity already exists for ${aliasEmail}`);
      return;
    }

    // Check if we should skip this alias
    if (settings.skipIdentityCreation.includes(aliasEmail)) {
      debugLog(`Send As Alias: Skipping identity creation for ${aliasEmail} (user preference)`);
      return;
    }

    // Find the base identity to copy settings from
    const baseIdentity = allIdentities.find(id => id.email.toLowerCase() === baseEmail.toLowerCase());

    if (!baseIdentity) {
      errorLog(`Send As Alias: Can't find base identity for ${baseEmail}`);
      return;
    }

    debugLog(`Send As Alias: Found base identity: ${baseIdentity.name} <${baseIdentity.email}>`);

    // Extract alias name from email
    const aliasName = aliasEmail.split('+')[1].split('@')[0];
    const suggestedName = `${baseIdentity.name} (${aliasName})`;

    debugLog(`Send As Alias: Prompting to create identity: ${suggestedName}`);

    // Prompt user
    const result = await showCreateIdentityPrompt({
      email: aliasEmail,
      suggestedName: suggestedName,
      baseName: baseIdentity.name
    });

    debugLog(`Send As Alias: Identity prompt result:`, result);

    if (result.create) {
      // Create new identity
      const newIdentity = await messenger.identities.create(baseIdentity.accountId, {
        email: aliasEmail,
        name: result.identityName || suggestedName,
        replyTo: baseIdentity.replyTo || '',
        composeHtml: baseIdentity.composeHtml,
        signature: baseIdentity.signature || ''
      });

      infoLog(`Send As Alias: Created new identity: ${result.identityName} <${aliasEmail}>`);

      // Reload base emails to include the new identity
      await loadBaseEmails();
    }

    if (result.dontAskAgain) {
      // Remember not to ask for this alias
      settings.skipIdentityCreation.push(aliasEmail);
      await messenger.storage.local.set({ skipIdentityCreation: settings.skipIdentityCreation });
      debugLog(`Send As Alias: Added ${aliasEmail} to skip list`);
    }
  } catch (error) {
    errorLog(`Send As Alias: Error creating identity for ${aliasEmail}:`, error);
  }
}

/**
 * Main compose handler - orchestrates all three features
 */
async function handleCompose(tab, composeDetails) {
  try {
    const fromEmail = extractEmail(composeDetails.from);

    let aliasWasSet = false;
    let usedAlias = null;

    // FEATURE 1: Auto-detect alias for replies/forwards
    if (composeDetails.relatedMessageId) {
      try {
        // Get original message with full headers
        const fullMessage = await messenger.messages.getFull(composeDetails.relatedMessageId);

        // Extract recipients from headers
        const toHeader = fullMessage.headers.to || [];
        const ccHeader = fullMessage.headers.cc || [];
        const recipients = [
          ...toHeader,
          ...ccHeader
        ];

        // Try to find matching alias (method-aware)
        const match = await findMatchingAlias(recipients);

        if (match) {
          debugLog(`Send As Alias: Feature 1 - Setting From to "${match.alias}" (method: ${match.method})`);

          try {
            await messenger.compose.setComposeDetails(tab.id, { from: match.alias });
            aliasWasSet = true;
            // Extract just the email for Feature 3 (match.alias might be "Name" <email@domain.com>)
            usedAlias = extractEmail(match.alias);
          } catch (setError) {
            errorLog('Send As Alias: Feature 1 - Error setting From:', setError);
          }
        }
      } catch (error) {
        errorLog('Send As Alias: Error in Feature 1:', error);
      }
    }

    // FEATURE 2: Prompt for alias if not already set
    if (!aliasWasSet) {
      // Find the identity for this fromEmail
      const currentIdentity = identities.find(id => id.email === fromEmail);

      if (currentIdentity) {
        const accountSettings = getAccountSettings(currentIdentity.id);

        if (accountSettings.feature2Enabled && accountSettings.feature1Enabled) {
          const method = accountSettings.aliasMethod;
          let shouldPrompt = false;

          // Check if from is a base address based on method
          if (method === 'plus') {
            // For plus-addressing: check if email doesn't have + sign
            shouldPrompt = !fromEmail.includes('+');
          } else if (method === 'own-domain' || method === 'catchall') {
            // For own-domain: check if from matches the configured identity
            shouldPrompt = (fromEmail === currentIdentity.email);
          }

          if (shouldPrompt) {
            // Get recipient for "don't ask again" check
            const toEmail = extractEmail(composeDetails.to && composeDetails.to[0]);

            // Check if we should skip this recipient
            const dontAskList = accountSettings.feature2DontAskList || [];

            if (toEmail && !dontAskList.includes(toEmail)) {
              debugLog(`Send As Alias: Feature 2 - Prompting for alias (method: ${method})`);

              try {
                const domain = extractDomain(fromEmail);
                const result = await showAliasPrompt(fromEmail, toEmail, method, domain);

                if (result.useAlias && result.aliasName) {
                  let alias;
                  if (method === 'plus') {
                    alias = `${fromEmail.split('@')[0]}+${result.aliasName}@${domain}`;
                  } else if (method === 'own-domain' || method === 'catchall') {
                    alias = `${result.aliasName}@${domain}`;
                  }

                  await messenger.compose.setComposeDetails(tab.id, { from: alias });
                  debugLog(`Send As Alias: Feature 2 - Set From to ${alias}`);
                  usedAlias = alias;
                } else if (result.dontAskAgain) {
                  // Save to dontAskAgain list for this account
                  accountSettings.feature2DontAskList = accountSettings.feature2DontAskList || [];
                  accountSettings.feature2DontAskList.push(toEmail);

                  // Update storage
                  const stored = await messenger.storage.local.get('accountSettings');
                  const allAccountSettings = stored.accountSettings || {};
                  allAccountSettings[currentIdentity.id] = accountSettings;
                  await messenger.storage.local.set({ accountSettings: allAccountSettings });
                }
              } catch (error) {
                errorLog('Send As Alias: Error in Feature 2:', error);
              }
            }
          }
        }
      }
    }

    // FEATURE 3: Offer to create identity for new alias
    if (usedAlias && settings.offerIdentityCreation) {
      try {
        // Extract base email from the alias
        const [localPart, domain] = usedAlias.split('@');
        const baseLocal = localPart.split('+')[0];
        const baseEmail = `${baseLocal}@${domain}`;

        await maybeCreateIdentity(usedAlias, baseEmail);
      } catch (error) {
        errorLog('Send As Alias: Error in Feature 3:', error);
      }
    }
  } catch (error) {
    errorLog('Send As Alias: Error in handleCompose:', error);
  }
}

/**
 * Event listener for compose.onComposeStateChanged
 * Fires when compose state changes (canSendNow, canSendLater)
 * We track processed tabs to only handle each window once when it opens
 */
messenger.compose.onComposeStateChanged.addListener(async (tab, state) => {
  // Only process each compose window once
  if (processedComposeTabs.has(tab.id)) {
    return;
  }

  // Ensure the compose window has loaded (when send options become available)
  if (!state.canSendNow && !state.canSendLater) {
    return;
  }

  // Mark this tab as processed
  processedComposeTabs.add(tab.id);

  try {
    // Ensure state is loaded (in case background script was restarted)
    if (baseEmails.length === 0) {
      await initialize();
    }

    // Get current compose details
    const composeDetails = await messenger.compose.getComposeDetails(tab.id);

    // Handle compose (same logic as before, now with tab object)
    await handleCompose(tab, composeDetails);

    debugLog('Send As Alias: Compose window intercepted and processed');
  } catch (error) {
    errorLog('Send As Alias: Error in onComposeStateChanged:', error);
  }
});

// Listen for settings changes
messenger.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    debugLog('Send As Alias: Settings changed:', changes);
    loadSettings();
  }
});

// Listen for identity changes (when user adds/removes identities)
messenger.identities.onCreated.addListener((_id, identity) => {
  infoLog('Send As Alias: Identity created:', identity.email);
  loadBaseEmails();
});

messenger.identities.onUpdated.addListener((_id, _changed) => {
  debugLog('Send As Alias: Identity updated');
  loadBaseEmails();
});

messenger.identities.onDeleted.addListener((_id) => {
  debugLog('Send As Alias: Identity deleted');
  loadBaseEmails();
});

// Initialize when extension loads
infoLog('Send As Alias: Background script starting...');
initialize().then(() => {
  infoLog('Send As Alias: Background script fully initialized');
}).catch(error => {
  errorLog('Send As Alias: Initialization error:', error);
});
