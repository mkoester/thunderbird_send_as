// Get parameters from URL
const params = new URLSearchParams(window.location.search);
const email = params.get('email');
const baseName = params.get('baseName');
const baseEmail = params.get('baseEmail');
// Alias name is derived method-aware in the background (aliasNamePart) and
// passed along — plus: "shopping" from user+shopping@…, own-domain/catchall:
// the local part (e.g. "sales" from sales@…)
const aliasName = params.get('aliasName');

// The response carries everything the background needs to create the identity
// (it is handled statelessly there — no in-memory state has to survive from
// when this window was opened)
function sendResponse(create, identityName) {
  browser.runtime.sendMessage({
    type: 'identityPromptResponse',
    create: create,
    identityName: identityName,
    aliasEmail: email,
    baseEmail: baseEmail,
    dontAskAgain: document.getElementById('dontAskAgain').checked
  }).finally(() => window.close());
}

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

  if (!identityName) {
    alert('Please enter a name for the identity');
    return;
  }

  sendResponse(true, identityName);
});

// Handle "Add alias in name" button (Option 2)
document.getElementById('useNameWithAliasBtn').addEventListener('click', () => {
  sendResponse(true, nameWithAlias);
});

// Handle "Skip" button
document.getElementById('skipBtn').addEventListener('click', () => {
  sendResponse(false, null);
});

// Handle Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('skipBtn').click();
  }
});
