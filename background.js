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
        // IMPORTANT: Return the FULL aliased address from the recipient
        return email;
      }
    }
  }

  return null;
}

/**
 * FEATURE 2: Show alias suggestion prompt
 */
async function showAliasPrompt(fromEmail, toEmail) {
  // For now, return a simple prompt using native dialog
  // TODO: Replace with proper UI dialog
  const aliasName = prompt(
    `You're sending from ${fromEmail}.\n\n` +
    `Enter an alias name to use ${fromEmail.split('@')[0]}+ALIAS@${fromEmail.split('@')[1]}:\n\n` +
    `(Leave empty to continue with base address)`
  );

  if (aliasName === null) {
    // User cancelled
    return { useAlias: false, dontAskAgain: false };
  }

  if (aliasName.trim() === '') {
    // User wants to continue with base address
    // Ask if they want to skip this recipient
    const skip = confirm(
      `Continue with base address ${fromEmail}.\n\n` +
      `Don't ask again for recipient ${toEmail}?`
    );
    return { useAlias: false, dontAskAgain: skip };
  }

  // User entered an alias
  return { useAlias: true, aliasName: aliasName.trim(), dontAskAgain: false };
}

/**
 * FEATURE 3: Show identity creation prompt
 */
async function showCreateIdentityPrompt(options) {
  // For now, return a simple prompt using native dialog
  // TODO: Replace with proper UI dialog
  const response = prompt(
    `Save ${options.email} as a new identity?\n\n` +
    `Suggested name: ${options.suggestedName}\n\n` +
    `Enter a custom name, or leave as-is to accept suggestion:\n` +
    `(Cancel to skip)`
  );

  if (response === null) {
    // User cancelled - ask if they want to skip this alias permanently
    const skip = confirm(
      `Don't ask again to create identity for ${options.email}?`
    );
    return { create: false, dontAskAgain: skip };
  }

  // User wants to create the identity
  const name = response.trim() || options.suggestedName;
  return { create: true, name: name, dontAskAgain: false };
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
        name: result.name || suggestedName,
        replyTo: baseIdentity.replyTo || '',
        composeHtml: baseIdentity.composeHtml,
        signature: baseIdentity.signature || ''
      });

      console.log(`Send As Alias: Created new identity: ${result.name} <${aliasEmail}>`);

      // Reload base emails to include the new identity
      await loadBaseEmails();
    } else if (result.dontAskAgain) {
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
    console.log('Send As Alias: Handling compose event');

    const fromEmail = extractEmail(composeDetails.from);
    let aliasWasSet = false;
    let usedAlias = null;

    // FEATURE 1: Auto-detect alias for replies/forwards
    if (composeDetails.relatedMessageId) {
      console.log('Send As Alias: Detected reply/forward, checking for alias...');

      try {
        // Get original message
        const originalMessage = await messenger.messages.get(composeDetails.relatedMessageId);
        const recipients = [
          ...(originalMessage.to || []),
          ...(originalMessage.cc || [])
        ];

        // Try to find matching alias
        const matchedAlias = findMatchingAlias(recipients, baseEmails);

        if (matchedAlias) {
          await messenger.compose.setComposeDetails(tab.id, { from: matchedAlias });
          console.log(`Send As Alias: Set From to ${matchedAlias}`);
          aliasWasSet = true;
          usedAlias = matchedAlias;
        }
      } catch (error) {
        console.error('Send As Alias: Error in Feature 1:', error);
      }
    }

    // FEATURE 2: Prompt for alias if not already set
    if (!aliasWasSet && settings.promptForAlias[fromEmail]) {
      console.log('Send As Alias: Feature 2 enabled for this account, checking...');

      // Check if from is a base address (no + sign)
      if (!fromEmail.includes('+') && baseEmails.includes(fromEmail)) {
        // Get recipient for "don't ask again" check
        const toEmail = extractEmail(composeDetails.to && composeDetails.to[0]);

        // Check if we should skip this recipient
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
        }
      }
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

// Event listeners
messenger.compose.onBeforeSend.addListener(async (tab, details) => {
  console.log('Send As Alias: onBeforeSend triggered');
  await handleCompose(tab, details);
  // Return empty object to allow send to proceed
  return {};
});

// Listen for settings changes
messenger.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    console.log('Send As Alias: Settings changed, reloading...');
    loadSettings();
  }
});

// Initialize when extension loads
initialize();

console.log('Send As Alias: Background script loaded');
