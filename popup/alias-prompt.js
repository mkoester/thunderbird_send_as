// Get parameters from URL
const params = new URLSearchParams(window.location.search);
const fromEmail = params.get('from');
const toEmail = params.get('to');
const method = params.get('method') || 'plus';
const domain = params.get('domain');

// Populate the UI
document.getElementById('fromEmail').textContent = fromEmail;

// Update UI text based on method
if (method === 'own-domain' || method === 'catchall') {
  document.getElementById('promptHeading').textContent = `Enter alias for @${domain}`;
  document.getElementById('inputLabel').textContent = 'Alias name:';
  document.getElementById('aliasInput').placeholder = 'e.g., sales, support, contact';
}

// Update example alias
const aliasInput = document.getElementById('aliasInput');
const exampleAlias = document.getElementById('exampleAlias');

function updateExample() {
  const value = aliasInput.value.trim();
  if (value) {
    if (method === 'plus') {
      const [localPart, domainPart] = fromEmail.split('@');
      exampleAlias.textContent = `Will use: ${localPart}+${value}@${domainPart}`;
    } else if (method === 'own-domain' || method === 'catchall') {
      exampleAlias.textContent = `Will use: ${value}@${domain}`;
    }
  } else {
    exampleAlias.textContent = 'Leave empty to continue with base address';
  }
}

aliasInput.addEventListener('input', updateExample);
updateExample();

// Focus the input
aliasInput.focus();

// Handle "Use alias" button
document.getElementById('useAliasBtn').addEventListener('click', () => {
  const aliasName = aliasInput.value.trim();
  const dontAskAgain = document.getElementById('dontAskAgain').checked;

  if (aliasName) {
    // User wants to use an alias
    window.close();
    browser.runtime.sendMessage({
      type: 'aliasPromptResponse',
      useAlias: true,
      aliasName: aliasName,
      dontAskAgain: false
    });
  } else {
    // No alias entered, just close with base address
    window.close();
    browser.runtime.sendMessage({
      type: 'aliasPromptResponse',
      useAlias: false,
      dontAskAgain: dontAskAgain
    });
  }
});

// Handle "Continue without alias" button
document.getElementById('skipBtn').addEventListener('click', () => {
  const dontAskAgain = document.getElementById('dontAskAgain').checked;
  window.close();
  browser.runtime.sendMessage({
    type: 'aliasPromptResponse',
    useAlias: false,
    dontAskAgain: dontAskAgain
  });
});

// Handle Enter key
aliasInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('useAliasBtn').click();
  }
});

// Handle Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('skipBtn').click();
  }
});
