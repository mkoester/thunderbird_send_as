// Get parameters from URL
const params = new URLSearchParams(window.location.search);
const email = params.get('email');
const baseName = params.get('baseName');

// Extract alias name from email (e.g., "shopping" from "user+shopping@domain.com")
const aliasName = email.split('+')[1].split('@')[0];

// Calculate the two name options
const nameOnly = baseName;
const nameWithAlias = `${baseName} (${aliasName})`;

// Populate the UI
document.getElementById('aliasEmail').textContent = email;
document.getElementById('nameOnlyInput').value = nameOnly;
document.getElementById('nameWithAliasInput').value = nameWithAlias;

// Focus on the editable input
const nameOnlyInput = document.getElementById('nameOnlyInput');
nameOnlyInput.focus();
nameOnlyInput.select();

// Handle Enter key on the editable input
nameOnlyInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('useNameOnlyBtn').click();
  }
});

// Handle "Keep original name" button (Option 1)
document.getElementById('useNameOnlyBtn').addEventListener('click', () => {
  const identityName = document.getElementById('nameOnlyInput').value.trim();
  const dontAskAgain = document.getElementById('dontAskAgain').checked;

  if (!identityName) {
    alert('Please enter a name for the identity');
    return;
  }

  window.close();
  browser.runtime.sendMessage({
    type: 'identityPromptResponse',
    create: true,
    identityName: identityName,
    dontAskAgain: dontAskAgain
  });
});

// Handle "Add alias in name" button (Option 2)
document.getElementById('useNameWithAliasBtn').addEventListener('click', () => {
  const dontAskAgain = document.getElementById('dontAskAgain').checked;
  window.close();
  browser.runtime.sendMessage({
    type: 'identityPromptResponse',
    create: true,
    identityName: nameWithAlias,
    dontAskAgain: dontAskAgain
  });
});

// Handle "Skip" button
document.getElementById('skipBtn').addEventListener('click', () => {
  const dontAskAgain = document.getElementById('dontAskAgain').checked;
  window.close();
  browser.runtime.sendMessage({
    type: 'identityPromptResponse',
    create: false,
    dontAskAgain: dontAskAgain
  });
});

// Handle Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('skipBtn').click();
  }
});
