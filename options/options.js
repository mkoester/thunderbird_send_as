/**
 * Options page script for Send As Alias extension
 */

let settings = {
  accountSettings: {},
  offerIdentityCreation: true,
  skipIdentityCreation: [],
  debugLogging: false
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
    feature1Enabled: false,
    aliasMethod: 'plus',
    feature2Enabled: false,
    feature2DontAskList: []
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
      'debugLogging'
    ]);

    if (stored.accountSettings) settings.accountSettings = stored.accountSettings;
    if (stored.offerIdentityCreation !== undefined) settings.offerIdentityCreation = stored.offerIdentityCreation;
    if (stored.skipIdentityCreation) settings.skipIdentityCreation = stored.skipIdentityCreation;
    if (stored.debugLogging !== undefined) settings.debugLogging = stored.debugLogging;

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
      debugLogging: settings.debugLogging
    });

    console.log('Global settings saved');
    showStatus('Settings saved successfully!');
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Error saving settings', 'error');
  }
}

/**
 * Extract domain from email address
 */
function extractDomain(email) {
  const match = email.match(/@(.+)$/);
  return match ? match[1] : null;
}

/**
 * Get identity by ID
 */
function getIdentityById(identityId) {
  return identities.find(id => id.id === identityId);
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
    const feature1Checkbox = row.querySelector('.feature1-enabled');

    if (feature1Checkbox.checked &&
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
    const feature1Checkbox = row.querySelector('.feature1-enabled');
    const warning = row.querySelector('.domain-conflict-warning');
    const radioButtons = row.querySelectorAll('input[type="radio"]');

    // Check if another identity owns this domain
    const ownersOfDomain = domainMap.get(domain) || [];
    const otherOwner = ownersOfDomain.find(id => id !== identityId);

    const feature2Checkbox = row.querySelector('.feature2-enabled');

    if (otherOwner) {
      // Another identity is using own-domain for this domain
      feature1Checkbox.disabled = true;
      warning.style.display = 'inline-block';

      // Disable radio buttons (keep their state)
      radioButtons.forEach(radio => radio.disabled = true);

      // Disable Feature 2 checkbox (keep its state)
      feature2Checkbox.disabled = true;
    } else {
      // No conflict
      feature1Checkbox.disabled = false;
      warning.style.display = 'none';

      // Enable/disable radio buttons based on Feature 1 checkbox
      radioButtons.forEach(radio => radio.disabled = !feature1Checkbox.checked);

      // Enable/disable Feature 2 checkbox based on Feature 1 checkbox
      feature2Checkbox.disabled = !feature1Checkbox.checked;
    }
  });
}

/**
 * Render a single account table row
 */
function renderAccountRow(identity) {
  const accountSettings = getAccountSettings(identity.id);

  const row = document.createElement('tr');
  row.dataset.identityId = identity.id;

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

  // Column 3: Auto-reply checkbox
  const autoReplyCell = document.createElement('td');
  autoReplyCell.className = 'checkbox-cell';
  const autoReplyCheckbox = document.createElement('input');
  autoReplyCheckbox.type = 'checkbox';
  autoReplyCheckbox.className = 'feature1-enabled';
  autoReplyCheckbox.checked = accountSettings.feature1Enabled;
  autoReplyCheckbox.addEventListener('change', async (e) => {
    const newSettings = getAccountSettings(identity.id);
    newSettings.feature1Enabled = e.target.checked;

    await saveAccountSettings(identity.id, newSettings);

    // Enable/disable method radios (keep their state)
    const methodCell = row.querySelector('.method-cell');
    const radios = methodCell.querySelectorAll('input[type="radio"]');
    radios.forEach(radio => {
      radio.disabled = !e.target.checked;
    });

    // Enable/disable Feature 2 checkbox (keep its state)
    const feature2Checkbox = row.querySelector('.feature2-enabled');
    feature2Checkbox.disabled = !e.target.checked;

    // Update domain conflicts
    updateDomainConflicts();
  });
  autoReplyCell.appendChild(autoReplyCheckbox);
  row.appendChild(autoReplyCell);

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
    !accountSettings.feature1Enabled
  );
  methodOptions.appendChild(plusOption);

  // Method 2: Own domain
  const ownDomainOption = createMethodOption(
    identity.id,
    'own-domain',
    'Own domain',
    'alias@yourdomain.com',
    accountSettings.aliasMethod === 'own-domain',
    !accountSettings.feature1Enabled
  );
  methodOptions.appendChild(ownDomainOption);

  // Method 3: Catchall
  const catchallOption = createMethodOption(
    identity.id,
    'catchall',
    'Catchall',
    'anything@yourdomain.com',
    accountSettings.aliasMethod === 'catchall',
    !accountSettings.feature1Enabled
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

  // Column 5: Feature 2 checkbox
  const feature2Cell = document.createElement('td');
  feature2Cell.className = 'checkbox-cell';
  const feature2Checkbox = document.createElement('input');
  feature2Checkbox.type = 'checkbox';
  feature2Checkbox.className = 'feature2-enabled';
  feature2Checkbox.checked = accountSettings.feature2Enabled;
  feature2Checkbox.disabled = !accountSettings.feature1Enabled; // Disabled if Auto-Reply is off
  feature2Checkbox.addEventListener('change', async (e) => {
    const newSettings = getAccountSettings(identity.id);
    newSettings.feature2Enabled = e.target.checked;
    await saveAccountSettings(identity.id, newSettings);
  });
  feature2Cell.appendChild(feature2Checkbox);
  row.appendChild(feature2Cell);

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
 * Load identities and render account table
 */
async function loadAccounts() {
  try {
    identities = await messenger.identities.list();
    console.log('Loaded identities:', identities);

    const tbody = document.getElementById('accountTableBody');

    if (identities.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No accounts found</td></tr>';
      return;
    }

    tbody.innerHTML = '';

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
 * Render skip list for Feature 3
 */
function renderSkipList() {
  const container = document.getElementById('skipListItems');

  if (settings.skipIdentityCreation.length === 0) {
    container.innerHTML = '<div class="empty-state">No aliases skipped</div>';
    return;
  }

  container.innerHTML = '';

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

  // Load settings and identities
  await loadSettings();
  await loadAccounts();

  // Set up Feature 3 checkbox
  const checkbox = document.getElementById('offerIdentityCreation');
  checkbox.checked = settings.offerIdentityCreation;
  checkbox.addEventListener('change', async (e) => {
    settings.offerIdentityCreation = e.target.checked;
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
