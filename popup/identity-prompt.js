// Get parameters from URL
const params = new URLSearchParams(window.location.search);
const email = params.get('email');
const suggestedName = params.get('name');

// Populate the UI
document.getElementById('aliasEmail').textContent = email;
document.getElementById('nameInput').value = suggestedName;

// Focus the input and select all text
const nameInput = document.getElementById('nameInput');
nameInput.focus();
nameInput.select();

// Handle "Create Identity" button
document.getElementById('createBtn').addEventListener('click', () => {
  const identityName = nameInput.value.trim();
  const dontAskAgain = document.getElementById('dontAskAgain').checked;

  if (identityName) {
    window.close();
    browser.runtime.sendMessage({
      type: 'identityPromptResponse',
      create: true,
      identityName: identityName,
      dontAskAgain: dontAskAgain
    });
  } else {
    // No name entered, show error or just close
    alert('Please enter a name for the identity');
  }
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

// Handle Enter key
nameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('createBtn').click();
  }
});

// Handle Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('skipBtn').click();
  }
});
