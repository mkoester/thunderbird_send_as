// Get parameters from URL
const params = new URLSearchParams(window.location.search);
const email = params.get('email');
const baseName = params.get('baseName');
// Alias name is derived method-aware in the background (aliasNamePart) and
// passed along — plus: "shopping" from user+shopping@…, own-domain/catchall:
// the local part (e.g. "sales" from sales@…)
const aliasName = params.get('aliasName');

// Calculate the two name options
const nameOnly = baseName;
const nameWithAlias = aliasName ? `${baseName} (${aliasName})` : baseName;

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

  // Send first, then close: closing first can tear the page down before the
  // message is delivered (the background then treats the prompt as cancelled)
  browser.runtime.sendMessage({
    type: 'identityPromptResponse',
    create: true,
    identityName: identityName,
    dontAskAgain: dontAskAgain
  }).finally(() => window.close());
});

// Handle "Add alias in name" button (Option 2)
document.getElementById('useNameWithAliasBtn').addEventListener('click', () => {
  const dontAskAgain = document.getElementById('dontAskAgain').checked;
  browser.runtime.sendMessage({
    type: 'identityPromptResponse',
    create: true,
    identityName: nameWithAlias,
    dontAskAgain: dontAskAgain
  }).finally(() => window.close());
});

// Handle "Skip" button
document.getElementById('skipBtn').addEventListener('click', () => {
  const dontAskAgain = document.getElementById('dontAskAgain').checked;
  browser.runtime.sendMessage({
    type: 'identityPromptResponse',
    create: false,
    dontAskAgain: dontAskAgain
  }).finally(() => window.close());
});

// Handle Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('skipBtn').click();
  }
});
