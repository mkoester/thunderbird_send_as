/**
 * Options page script for Send As Alias extension
 */

let settings = {
  accountSettings: {},
  offerIdentityCreation: true,
  skipIdentityCreation: [],
  debugLogging: false,
  theme: 'system'
};

let identities = [];

/**
 * Show status message
 */
function showStatus(message, type = 'success') {
  const statusEl = document.getElementById('statusMessage');
  statusEl.textContent = message;
  statusEl.className = `status-message ${type}`;
  statusEl.style.display = 'block';

  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 3000);
}

/**
 * Get account settings with defaults
 */
function getAccountSettings(identityId) {
  if (settings.accountSettings[identityId]) {
    return settings.accountSettings[identityId];
  }

  // Return default settings if not configured
  return {
    replyAsAliasEnabled: false,
    aliasMethod: 'plus',
    suggestAliasEnabled: false,
    suggestAliasDontAskList: []
  };
}

/**
 * Load settings from storage
 */
async function loadSettings() {
  try {
    const stored = await messenger.storage.local.get([
      'accountSettings',
      'offerIdentityCreation',
      'skipIdentityCreation',
      'debugLogging',
      'theme'
    ]);

    // Normalize historical featureN keys in memory; the background script owns
    // persisting the rename (shared helper from ../shared/alias-utils.js)
    if (stored.accountSettings) settings.accountSettings = migrateAccountSettings(stored.accountSettings).accountSettings;
    if (stored.offerIdentityCreation !== undefined) settings.offerIdentityCreation = stored.offerIdentityCreation;
    if (stored.skipIdentityCreation) settings.skipIdentityCreation = stored.skipIdentityCreation;
    if (stored.debugLogging !== undefined) settings.debugLogging = stored.debugLogging;
    if (stored.theme) settings.theme = stored.theme;

    console.log('Loaded settings:', settings);
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Error loading settings', 'error');
  }
}

/**
 * Save account settings for a specific identity
 */
async function saveAccountSettings(identityId, accountSettings) {
  try {
    settings.accountSettings[identityId] = accountSettings;

    await messenger.storage.local.set({
      accountSettings: settings.accountSettings
    });

    console.log(`Settings saved for identity ${identityId}:`, accountSettings);
    showStatus('Settings saved successfully!');

    // Re-check domain conflicts after save
    updateDomainConflicts();
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Error saving settings', 'error');
  }
}

/**
 * Save global settings
 */
async function saveGlobalSettings() {
  try {
    await messenger.storage.local.set({
      offerIdentityCreation: settings.offerIdentityCreation,
      skipIdentityCreation: settings.skipIdentityCreation,
      debugLogging: settings.debugLogging,
      theme: settings.theme
    });

    console.log('Global settings saved');
    showStatus('Settings saved successfully!');
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Error saving settings', 'error');
  }
}

// extractDomain comes from ../shared/alias-utils.js (loaded before this file)

/**
 * Get identity by ID
 */
function getIdentityById(identityId) {
  return identities.find(id => id.id === identityId);
}

/**
 * Show the setup hint while no account has Reply as Alias enabled — without it
 * the extension is entirely inactive (all features are per-account opt-in)
 */
function updateSetupHint() {
  const anyEnabled = document.querySelector('#accountTableBody .reply-as-alias-enabled:checked') !== null;
  document.getElementById('setupHint').hidden = anyEnabled;
}

/**
 * Update domain conflict warnings
 */
function updateDomainConflicts() {
  // Map domains to identities using own-domain methods
  const domainMap = new Map(); // domain -> [identityIds]

  // Find all identities using own-domain or catchall
  document.querySelectorAll('#accountTableBody tr').forEach(row => {
    const identityId = row.dataset.identityId;
    const identity = getIdentityById(identityId);
    if (!identity) return;

    const accountSettings = getAccountSettings(identityId);
    const replyAsAliasCheckbox = row.querySelector('.reply-as-alias-enabled');

    if (replyAsAliasCheckbox.checked &&
        (accountSettings.aliasMethod === 'own-domain' || accountSettings.aliasMethod === 'catchall')) {
      const domain = extractDomain(identity.email);
      if (domain) {
        if (!domainMap.has(domain)) {
          domainMap.set(domain, []);
        }
        domainMap.get(domain).push(identityId);
      }
    }
  });

  // Update all rows to show/hide conflicts
  document.querySelectorAll('#accountTableBody tr').forEach(row => {
    const identityId = row.dataset.identityId;
    const identity = getIdentityById(identityId);
    if (!identity) return;

    const domain = extractDomain(identity.email);
    const replyAsAliasCheckbox = row.querySelector('.reply-as-alias-enabled');
    const warning = row.querySelector('.domain-conflict-warning');
    const radioButtons = row.querySelectorAll('input[type="radio"]');

    // Check if another identity owns this domain
    const ownersOfDomain = domainMap.get(domain) || [];
    const otherOwner = ownersOfDomain.find(id => id !== identityId);

    const suggestAliasCheckbox = row.querySelector('.suggest-alias-enabled');

    if (otherOwner) {
      // Another identity is using own-domain for this domain
      replyAsAliasCheckbox.disabled = true;
      warning.style.display = 'inline-block';

      // Disable radio buttons (keep their state)
      radioButtons.forEach(radio => radio.disabled = true);

      // Disable Suggest-Alias checkbox (keep its state)
      suggestAliasCheckbox.disabled = true;
    } else {
      // No conflict
      replyAsAliasCheckbox.disabled = false;
      warning.style.display = 'none';

      // Enable/disable radio buttons based on Reply as Alias checkbox
      radioButtons.forEach(radio => radio.disabled = !replyAsAliasCheckbox.checked);

      // Enable/disable Suggest-Alias checkbox based on Reply as Alias checkbox
      suggestAliasCheckbox.disabled = !replyAsAliasCheckbox.checked;
    }
  });

  updateSetupHint();
}

/**
 * Render a single account table row
 */
function renderAccountRow(identity) {
  const accountSettings = getAccountSettings(identity.id);

  const row = document.createElement('tr');
  row.dataset.identityId = identity.id;
  // Reply as Alias off → collapse the row: the dependent controls (method
  // radios, Suggest Alias) are hidden via CSS instead of shown disabled
  row.classList.toggle('reply-disabled', !accountSettings.replyAsAliasEnabled);

  // Column 1: Account email
  const emailCell = document.createElement('td');
  const emailDiv = document.createElement('div');
  emailDiv.className = 'account-email';
  emailDiv.textContent = identity.email;
  emailCell.appendChild(emailDiv);
  row.appendChild(emailCell);

  // Column 2: Display name
  const nameCell = document.createElement('td');
  const nameDiv = document.createElement('div');
  nameDiv.className = 'account-name';
  nameDiv.textContent = identity.name || '-';
  nameCell.appendChild(nameDiv);
  row.appendChild(nameCell);

  // Column 3: Reply-as-Alias checkbox
  const replyAsAliasCell = document.createElement('td');
  replyAsAliasCell.className = 'checkbox-cell';
  const replyAsAliasCheckbox = document.createElement('input');
  replyAsAliasCheckbox.type = 'checkbox';
  replyAsAliasCheckbox.className = 'reply-as-alias-enabled';
  replyAsAliasCheckbox.checked = accountSettings.replyAsAliasEnabled;
  replyAsAliasCheckbox.addEventListener('change', async (e) => {
    const newSettings = getAccountSettings(identity.id);
    newSettings.replyAsAliasEnabled = e.target.checked;

    await saveAccountSettings(identity.id, newSettings);

    // Collapse/expand the dependent controls
    row.classList.toggle('reply-disabled', !e.target.checked);

    // Enable/disable method radios (keep their state)
    const methodCell = row.querySelector('.method-cell');
    const radios = methodCell.querySelectorAll('input[type="radio"]');
    radios.forEach(radio => {
      radio.disabled = !e.target.checked;
    });

    // Enable/disable Suggest-Alias checkbox (keep its state)
    const suggestAliasCheckbox = row.querySelector('.suggest-alias-enabled');
    suggestAliasCheckbox.disabled = !e.target.checked;

    // Update domain conflicts
    updateDomainConflicts();
  });
  replyAsAliasCell.appendChild(replyAsAliasCheckbox);
  row.appendChild(replyAsAliasCell);

  // Column 4: Alias method (radio buttons)
  const methodCell = document.createElement('td');
  methodCell.className = 'method-cell';

  const methodOptions = document.createElement('div');
  methodOptions.className = 'method-options';

  // Method 1: Plus-addressing
  const plusOption = createMethodOption(
    identity.id,
    'plus',
    'Plus-addressing',
    'user+alias@domain.com',
    accountSettings.aliasMethod === 'plus',
    !accountSettings.replyAsAliasEnabled
  );
  methodOptions.appendChild(plusOption);

  // Method 2: Own domain
  const ownDomainOption = createMethodOption(
    identity.id,
    'own-domain',
    'Own domain',
    'alias@yourdomain.com',
    accountSettings.aliasMethod === 'own-domain',
    !accountSettings.replyAsAliasEnabled
  );
  methodOptions.appendChild(ownDomainOption);

  // Method 3: Catchall
  const catchallOption = createMethodOption(
    identity.id,
    'catchall',
    'Catchall',
    'anything@yourdomain.com',
    accountSettings.aliasMethod === 'catchall',
    !accountSettings.replyAsAliasEnabled
  );
  methodOptions.appendChild(catchallOption);

  methodCell.appendChild(methodOptions);

  // Domain conflict warning
  const warning = document.createElement('div');
  warning.className = 'domain-conflict-warning';
  warning.style.display = 'none';
  warning.textContent = '⚠️ Domain conflict';
  methodCell.appendChild(warning);

  row.appendChild(methodCell);

  // Column 5: Suggest-Alias checkbox
  const suggestAliasCell = document.createElement('td');
  suggestAliasCell.className = 'checkbox-cell';
  const suggestAliasCheckbox = document.createElement('input');
  suggestAliasCheckbox.type = 'checkbox';
  suggestAliasCheckbox.className = 'suggest-alias-enabled';
  suggestAliasCheckbox.checked = accountSettings.suggestAliasEnabled;
  suggestAliasCheckbox.disabled = !accountSettings.replyAsAliasEnabled; // Disabled if Reply as Alias is off
  suggestAliasCheckbox.addEventListener('change', async (e) => {
    const newSettings = getAccountSettings(identity.id);
    newSettings.suggestAliasEnabled = e.target.checked;
    await saveAccountSettings(identity.id, newSettings);
  });
  suggestAliasCell.appendChild(suggestAliasCheckbox);
  row.appendChild(suggestAliasCell);

  return row;
}

/**
 * Create a method option radio button with label and help text
 */
function createMethodOption(identityId, methodValue, labelText, helpText, checked, disabled) {
  const option = document.createElement('div');
  option.className = 'method-option';

  const radio = document.createElement('input');
  radio.type = 'radio';
  radio.name = `method-${identityId}`;
  radio.value = methodValue;
  radio.checked = checked;
  radio.disabled = disabled;
  radio.addEventListener('change', async (e) => {
    if (e.target.checked) {
      const newSettings = getAccountSettings(identityId);
      newSettings.aliasMethod = methodValue;
      await saveAccountSettings(identityId, newSettings);
    }
  });

  const label = document.createElement('label');
  label.className = disabled ? 'disabled' : '';
  label.setAttribute('for', radio.id);

  const labelSpan = document.createElement('span');
  labelSpan.textContent = labelText;

  const help = document.createElement('div');
  help.className = 'method-help';
  help.textContent = helpText;

  option.appendChild(radio);
  option.appendChild(label);
  label.appendChild(labelSpan);
  label.appendChild(help);

  return option;
}

/**
 * Load the default identity of each account and render the account table.
 * Non-default identities (e.g. those created by Identity Creation for aliases)
 * are not shown; they keep default settings, so the background logic skips them.
 */
async function loadAccounts() {
  try {
    const accounts = await messenger.accounts.list();
    identities = [];
    for (const account of accounts) {
      const defaultIdentity = await messenger.identities.getDefault(account.id);
      if (defaultIdentity) identities.push(defaultIdentity);
    }
    console.log('Loaded default identities:', identities);

    const tbody = document.getElementById('accountTableBody');

    if (identities.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = 5;
      emptyCell.className = 'empty-state';
      emptyCell.textContent = 'No accounts found';
      emptyRow.appendChild(emptyCell);
      tbody.replaceChildren(emptyRow);
      return;
    }

    tbody.replaceChildren();

    identities.forEach(identity => {
      const row = renderAccountRow(identity);
      tbody.appendChild(row);
    });

    // Check for domain conflicts after rendering
    updateDomainConflicts();

  } catch (error) {
    console.error('Error loading identities:', error);
    showStatus('Error loading identities', 'error');
  }
}

/**
 * Render skip list for Identity Creation
 */
function renderSkipList() {
  const container = document.getElementById('skipListItems');

  if (settings.skipIdentityCreation.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No aliases skipped';
    container.replaceChildren(empty);
    return;
  }

  container.replaceChildren();

  settings.skipIdentityCreation.forEach((alias, index) => {
    const item = document.createElement('div');
    item.className = 'list-item';

    const text = document.createElement('span');
    text.className = 'list-item-text';
    text.textContent = alias;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'secondary';
    removeBtn.addEventListener('click', async () => {
      settings.skipIdentityCreation.splice(index, 1);
      await saveGlobalSettings();
      renderSkipList();
    });

    item.appendChild(text);
    item.appendChild(removeBtn);
    container.appendChild(item);
  });
}

/**
 * Initialize options page
 */
async function initialize() {
  console.log('Options page initializing...');

  // Shows the installed build's version (build.sh rewrites it in the manifest)
  document.getElementById('version').textContent = `v${messenger.runtime.getManifest().version}`;

  // Load settings and identities
  await loadSettings();
  await loadAccounts();

  // Set up Identity Creation checkbox
  const checkbox = document.getElementById('offerIdentityCreation');
  checkbox.checked = settings.offerIdentityCreation;
  checkbox.addEventListener('change', async (e) => {
    settings.offerIdentityCreation = e.target.checked;
    await saveGlobalSettings();
  });

  // Set up Theme select (applied live via theme/theme.js)
  const themeSelect = document.getElementById('themeSelect');
  themeSelect.value = settings.theme;
  themeSelect.addEventListener('change', async (e) => {
    settings.theme = e.target.value;
    applyTheme(settings.theme);
    await saveGlobalSettings();
  });

  // Set up Debug logging checkbox
  const debugCheckbox = document.getElementById('debugLogging');
  debugCheckbox.checked = settings.debugLogging;
  debugCheckbox.addEventListener('change', async (e) => {
    settings.debugLogging = e.target.checked;
    await saveGlobalSettings();
  });

  // Render skip list
  renderSkipList();

  console.log('Options page initialized');
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initialize);
