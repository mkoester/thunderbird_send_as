/**
 * Options page script for Send As Alias extension
 */

let settings = {
  promptForAlias: {},
  dontAskAgain: {},
  offerIdentityCreation: true,
  skipIdentityCreation: []
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
 * Load settings from storage
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

    console.log('Loaded settings:', settings);
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Error loading settings', 'error');
  }
}

/**
 * Save settings to storage
 */
async function saveSettings() {
  try {
    await messenger.storage.local.set({
      promptForAlias: settings.promptForAlias,
      dontAskAgain: settings.dontAskAgain,
      offerIdentityCreation: settings.offerIdentityCreation,
      skipIdentityCreation: settings.skipIdentityCreation
    });

    console.log('Settings saved:', settings);
    showStatus('Settings saved successfully!');
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Error saving settings', 'error');
  }
}

/**
 * Load identities and render account list
 */
async function loadIdentities() {
  try {
    identities = await messenger.identities.list();
    console.log('Loaded identities:', identities);
    renderAccountList();
  } catch (error) {
    console.error('Error loading identities:', error);
    showStatus('Error loading identities', 'error');
  }
}

/**
 * Render account list for Feature 2
 */
function renderAccountList() {
  const container = document.getElementById('accountList');

  if (identities.length === 0) {
    container.innerHTML = '<div class="empty-state">No accounts found</div>';
    return;
  }

  container.innerHTML = '';

  identities.forEach(identity => {
    const email = identity.email;

    const item = document.createElement('div');
    item.className = 'account-item';

    const label = document.createElement('label');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = settings.promptForAlias[email] || false;
    checkbox.addEventListener('change', (e) => {
      settings.promptForAlias[email] = e.target.checked;
      saveSettings();
    });

    const emailSpan = document.createElement('span');
    emailSpan.className = 'account-email';
    emailSpan.textContent = email;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'account-name';
    nameSpan.textContent = identity.name ? `(${identity.name})` : '';

    label.appendChild(checkbox);
    label.appendChild(emailSpan);
    if (identity.name) {
      label.appendChild(nameSpan);
    }

    item.appendChild(label);
    container.appendChild(item);
  });
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
    removeBtn.addEventListener('click', () => {
      settings.skipIdentityCreation.splice(index, 1);
      saveSettings();
      renderSkipList();
    });

    item.appendChild(text);
    item.appendChild(removeBtn);
    container.appendChild(item);
  });
}

/**
 * Show exceptions management dialog
 */
function showExceptionsDialog() {
  // Simple implementation - could be enhanced with a modal
  let message = 'Per-Account "Don\'t Ask Again" Lists:\n\n';

  const accounts = Object.keys(settings.dontAskAgain);

  if (accounts.length === 0) {
    alert('No exceptions configured yet.');
    return;
  }

  accounts.forEach(account => {
    const recipients = settings.dontAskAgain[account];
    message += `${account}:\n`;

    if (recipients.length === 0) {
      message += '  (none)\n';
    } else {
      recipients.forEach(recipient => {
        message += `  - ${recipient}\n`;
      });
    }
    message += '\n';
  });

  const clearAll = confirm(
    message + '\nClear all exceptions?'
  );

  if (clearAll) {
    settings.dontAskAgain = {};
    saveSettings();
    showStatus('All exceptions cleared');
  }
}

/**
 * Initialize options page
 */
async function initialize() {
  console.log('Options page initializing...');

  // Load settings and identities
  await loadSettings();
  await loadIdentities();

  // Set up Feature 3 checkbox
  const checkbox = document.getElementById('offerIdentityCreation');
  checkbox.checked = settings.offerIdentityCreation;
  checkbox.addEventListener('change', (e) => {
    settings.offerIdentityCreation = e.target.checked;
    saveSettings();
  });

  // Render skip list
  renderSkipList();

  // Set up exceptions button
  document.getElementById('manageExceptions').addEventListener('click', showExceptionsDialog);

  console.log('Options page initialized');
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initialize);
