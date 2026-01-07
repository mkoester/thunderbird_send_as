/**
 * Send As Alias - Thunderbird Extension
 * Automatically manage email aliases for plus-addressing
 */

// Global state
let baseEmails = [];
let settings = {
  promptForAlias: {},        // Per-account: { "user@domain.com": true/false }
  dontAskAgain: {},          // Per-account: { "user@domain.com": ["recipient@example.com"] }
  offerIdentityCreation: true, // Global setting
  skipIdentityCreation: []   // Array of aliases to skip: ["user+temp@domain.com"]
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
  console.log('Send As Alias: Initializing...');

  // Load settings from storage
  await loadSettings();

  // Load base email addresses from configured identities
  await loadBaseEmails();

  console.log('Send As Alias: Initialized with base emails:', baseEmails);
}

/**
 * Load settings from browser storage
 */
async function loadSettings() {
  try {
    const stored = await messenger.storage.local.get([
      'promptForAlias',
      'dontAskAgain',
      'offerIdentityCreation',
      'skipIdentityCreation'
    ]);

    if (stored.promptForAlias) settings.promptForAlias = stored.promptForAlias;
    if (stored.dontAskAgain) settings.dontAskAgain = stored.dontAskAgain;
    if (stored.offerIdentityCreation !== undefined) settings.offerIdentityCreation = stored.offerIdentityCreation;
    if (stored.skipIdentityCreation) settings.skipIdentityCreation = stored.skipIdentityCreation;

    console.log('Send As Alias: Settings loaded:', settings);
  } catch (error) {
    console.error('Send As Alias: Error loading settings:', error);
  }
}

/**
 * Load base email addresses from all configured identities
 */
async function loadBaseEmails() {
  try {
    const identities = await messenger.identities.list();
    baseEmails = identities.map(identity => identity.email);
    console.log('Send As Alias: Loaded base emails:', baseEmails);
  } catch (error) {
    console.error('Send As Alias: Error loading identities:', error);
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
 * FEATURE 1: Find matching alias in recipients
 * Checks if any recipient has a +alias that matches our base identities
 * Returns the full recipient string (with display name if present)
 */
function findMatchingAlias(recipients, baseEmails) {
  if (!recipients || !Array.isArray(recipients)) {
    return null;
  }

  for (const recipient of recipients) {
    const email = extractEmail(recipient);

    if (!email) continue;

    // Check if email contains +
    if (email.includes('+')) {
      // Extract base address (remove +alias part)
      const parts = email.split('@');
      if (parts.length !== 2) continue;

      const [localPart, domain] = parts;
      const baseLocal = localPart.split('+')[0];
      const baseEmail = `${baseLocal}@${domain}`;

      // Check if base matches any configured identity
      if (baseEmails.includes(baseEmail)) {
        console.log(`Send As Alias: Found matching alias: ${email} (base: ${baseEmail})`);
        // IMPORTANT: Return the FULL recipient string (preserves display name if present)
        // e.g., "Name" <user+alias@domain.com> or just user+alias@domain.com
        return recipient;
      }
    }
  }

  return null;
}

/**
 * FEATURE 2: Show alias suggestion prompt
 * Opens a popup window and waits for user response
 */
async function showAliasPrompt(fromEmail, toEmail) {
  return new Promise((resolve) => {
    // Store the resolve function so we can call it when we get the response
    window.pendingAliasPromptResolve = resolve;

    // Open popup window
    const url = `popup/alias-prompt.html?from=${encodeURIComponent(fromEmail)}&to=${encodeURIComponent(toEmail || '')}`;
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
    const url = `popup/identity-prompt.html?email=${encodeURIComponent(options.email)}&name=${encodeURIComponent(options.suggestedName)}`;
    messenger.windows.create({
      url: url,
      type: 'popup',
      width: 550,
      height: 350
    });
  });
}

/**
 * FEATURE 3: Maybe create identity for new alias
 */
async function maybeCreateIdentity(aliasEmail, baseEmail) {
  try {
    // Check if this alias already exists as an identity
    const allIdentities = await messenger.identities.list();
    const exists = allIdentities.some(id => id.email.toLowerCase() === aliasEmail.toLowerCase());

    if (exists) {
      console.log(`Send As Alias: Identity already exists for ${aliasEmail}`);
      return;
    }

    // Check if we should skip this alias
    if (settings.skipIdentityCreation.includes(aliasEmail)) {
      console.log(`Send As Alias: Skipping identity creation for ${aliasEmail} (user preference)`);
      return;
    }

    // Find the base identity to copy settings from
    const baseIdentity = allIdentities.find(id => id.email.toLowerCase() === baseEmail.toLowerCase());

    if (!baseIdentity) {
      console.warn(`Send As Alias: Can't find base identity for ${baseEmail}`);
      return;
    }

    // Extract alias name from email
    const aliasName = aliasEmail.split('+')[1].split('@')[0];
    const suggestedName = `${baseIdentity.name} (${aliasName})`;

    // Prompt user
    const result = await showCreateIdentityPrompt({
      email: aliasEmail,
      suggestedName: suggestedName,
      baseName: baseIdentity.name
    });

    if (result.create) {
      // Create new identity
      const newIdentity = await messenger.identities.create(baseIdentity.accountId, {
        email: aliasEmail,
        name: result.identityName || suggestedName,
        replyTo: baseIdentity.replyTo || '',
        composeHtml: baseIdentity.composeHtml,
        signature: baseIdentity.signature || ''
      });

      console.log(`Send As Alias: Created new identity: ${result.identityName} <${aliasEmail}>`);

      // Reload base emails to include the new identity
      await loadBaseEmails();
    }

    if (result.dontAskAgain) {
      // Remember not to ask for this alias
      settings.skipIdentityCreation.push(aliasEmail);
      await messenger.storage.local.set({ skipIdentityCreation: settings.skipIdentityCreation });
      console.log(`Send As Alias: Added ${aliasEmail} to skip list`);
    }
  } catch (error) {
    console.error(`Send As Alias: Error creating identity for ${aliasEmail}:`, error);
  }
}

/**
 * Main compose handler - orchestrates all three features
 */
async function handleCompose(tab, composeDetails) {
  try {
    console.log('Send As Alias: ===== Handling compose event =====');
    console.log('Send As Alias: From:', composeDetails.from);
    console.log('Send As Alias: To:', composeDetails.to);
    console.log('Send As Alias: relatedMessageId:', composeDetails.relatedMessageId);
    console.log('Send As Alias: Base emails:', baseEmails);
    console.log('Send As Alias: Settings:', settings);

    const fromEmail = extractEmail(composeDetails.from);
    console.log('Send As Alias: Extracted from email:', fromEmail);

    let aliasWasSet = false;
    let usedAlias = null;

    // FEATURE 1: Auto-detect alias for replies/forwards
    if (composeDetails.relatedMessageId) {
      console.log('Send As Alias: Detected reply/forward, checking for alias...');

      try {
        // Get original message with full headers
        const fullMessage = await messenger.messages.getFull(composeDetails.relatedMessageId);
        console.log('Send As Alias: Full message:', fullMessage);
        console.log('Send As Alias: Headers:', fullMessage.headers);

        // Extract recipients from headers
        const toHeader = fullMessage.headers.to || [];
        const ccHeader = fullMessage.headers.cc || [];
        console.log('Send As Alias: To header:', toHeader);
        console.log('Send As Alias: CC header:', ccHeader);

        const recipients = [
          ...toHeader,
          ...ccHeader
        ];
        console.log('Send As Alias: Recipients to check:', recipients);

        // Try to find matching alias
        const matchedAlias = findMatchingAlias(recipients, baseEmails);
        console.log('Send As Alias: Matched alias:', matchedAlias);

        if (matchedAlias) {
          await messenger.compose.setComposeDetails(tab.id, { from: matchedAlias });
          console.log(`Send As Alias: Feature 1 - Set From to ${matchedAlias}`);
          aliasWasSet = true;
          usedAlias = matchedAlias;
        } else {
          console.log('Send As Alias: Feature 1 - No matching alias found');
        }
      } catch (error) {
        console.error('Send As Alias: Error in Feature 1:', error);
      }
    }

    // FEATURE 2: Prompt for alias if not already set
    console.log(`Send As Alias: Feature 2 check - aliasWasSet: ${aliasWasSet}, fromEmail: ${fromEmail}`);
    console.log(`Send As Alias: Feature 2 - promptForAlias settings:`, settings.promptForAlias);
    console.log(`Send As Alias: Feature 2 - enabled for ${fromEmail}?`, settings.promptForAlias[fromEmail]);

    if (!aliasWasSet && settings.promptForAlias[fromEmail]) {
      console.log('Send As Alias: Feature 2 enabled for this account, checking...');

      // Check if from is a base address (no + sign)
      console.log(`Send As Alias: Feature 2 - fromEmail includes +? ${fromEmail.includes('+')}`);
      console.log(`Send As Alias: Feature 2 - baseEmails includes fromEmail? ${baseEmails.includes(fromEmail)}`);

      if (!fromEmail.includes('+') && baseEmails.includes(fromEmail)) {
        // Get recipient for "don't ask again" check
        const toEmail = extractEmail(composeDetails.to && composeDetails.to[0]);
        console.log(`Send As Alias: Feature 2 - toEmail: ${toEmail}`);

        // Check if we should skip this recipient
        const dontAskList = settings.dontAskAgain[fromEmail] || [];
        console.log(`Send As Alias: Feature 2 - dontAskAgain list for ${fromEmail}:`, dontAskList);

        if (toEmail && !settings.dontAskAgain[fromEmail]?.includes(toEmail)) {
          console.log(`Send As Alias: Prompting for alias...`);

          try {
            const result = await showAliasPrompt(fromEmail, toEmail);

            if (result.useAlias && result.aliasName) {
              const alias = `${fromEmail.split('@')[0]}+${result.aliasName}@${fromEmail.split('@')[1]}`;
              await messenger.compose.setComposeDetails(tab.id, { from: alias });
              console.log(`Send As Alias: Set From to ${alias}`);
              usedAlias = alias;
            } else if (result.dontAskAgain) {
              // Save to dontAskAgain list for this account
              if (!settings.dontAskAgain[fromEmail]) {
                settings.dontAskAgain[fromEmail] = [];
              }
              settings.dontAskAgain[fromEmail].push(toEmail);
              await messenger.storage.local.set({ dontAskAgain: settings.dontAskAgain });
              console.log(`Send As Alias: Added ${toEmail} to don't ask list for ${fromEmail}`);
            }
          } catch (error) {
            console.error('Send As Alias: Error in Feature 2:', error);
          }
        } else {
          console.log(`Send As Alias: Feature 2 - Skipping (toEmail in don't ask list or toEmail is empty)`);
        }
      } else {
        console.log(`Send As Alias: Feature 2 - Skipping (from has + sign or not in base emails)`);
      }
    } else {
      console.log(`Send As Alias: Feature 2 - Skipping (alias was already set or not enabled for this account)`);
    }

    // FEATURE 3: Offer to create identity for new alias
    if (usedAlias && settings.offerIdentityCreation) {
      console.log('Send As Alias: Feature 3 enabled, checking if identity exists...');

      try {
        // Extract base email from the alias
        const [localPart, domain] = usedAlias.split('@');
        const baseLocal = localPart.split('+')[0];
        const baseEmail = `${baseLocal}@${domain}`;

        await maybeCreateIdentity(usedAlias, baseEmail);
      } catch (error) {
        console.error('Send As Alias: Error in Feature 3:', error);
      }
    }
  } catch (error) {
    console.error('Send As Alias: Error in handleCompose:', error);
  }
}

/**
 * Event listener for compose.onComposeStateChanged
 * Fires when compose state changes (canSendNow, canSendLater)
 * We track processed tabs to only handle each window once when it opens
 */
messenger.compose.onComposeStateChanged.addListener(async (tab, state) => {
  console.log('Send As Alias: Compose state changed, tab:', tab.id, 'state:', state);

  // Only process each compose window once
  if (processedComposeTabs.has(tab.id)) {
    console.log('Send As Alias: Already processed this compose window');
    return;
  }

  // Ensure the compose window has loaded (when send options become available)
  if (!state.canSendNow && !state.canSendLater) {
    console.log('Send As Alias: Compose window not yet ready (send options unavailable)');
    return;
  }

  // Mark this tab as processed
  processedComposeTabs.add(tab.id);
  console.log('Send As Alias: Processing compose window for first time');

  try {
    // Ensure state is loaded (in case background script was restarted)
    if (baseEmails.length === 0) {
      console.log('Send As Alias: State not loaded, reinitializing...');
      await initialize();
    }

    // Get current compose details
    const composeDetails = await messenger.compose.getComposeDetails(tab.id);
    console.log('Send As Alias: Compose details:', composeDetails);

    // Handle compose (same logic as before, now with tab object)
    await handleCompose(tab, composeDetails);

    console.log('Send As Alias: Compose window intercepted and processed');
  } catch (error) {
    console.error('Send As Alias: Error in onComposeStateChanged:', error);
  }
});

// Listen for settings changes
messenger.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    console.log('Send As Alias: Settings changed:', changes);
    loadSettings();
  }
});

// Listen for identity changes (when user adds/removes identities)
messenger.identities.onCreated.addListener((id, identity) => {
  console.log('Send As Alias: Identity created:', identity.email);
  loadBaseEmails();
});

messenger.identities.onUpdated.addListener((id, changed) => {
  console.log('Send As Alias: Identity updated:', id);
  loadBaseEmails();
});

messenger.identities.onDeleted.addListener((id) => {
  console.log('Send As Alias: Identity deleted:', id);
  loadBaseEmails();
});

// Initialize when extension loads
console.log('Send As Alias: Background script starting...');
initialize().then(() => {
  console.log('Send As Alias: Background script fully initialized');
}).catch(error => {
  console.error('Send As Alias: Initialization error:', error);
});
