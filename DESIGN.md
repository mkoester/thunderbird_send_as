# Design Document: Thunderbird Send As Alias Extension

## Overview
Automatically set the "From" address to match email aliases when replying to or forwarding messages sent to plus-addressed email addresses (e.g., `user+alias@domain.com`).

## Core Concept

When a user has an identity configured as `user@posteo.de` and receives an email sent to `user+shopping@posteo.de`, replying should automatically set the From address to `user+shopping@posteo.de`.

**Key principle**: The extension extracts only *base* email addresses from configured identities (e.g., `user@posteo.de`). When replying to an aliased address (e.g., `user+shopping@posteo.de`), it:
1. Strips the alias to get the base (`user@posteo.de`)
2. Checks if this base matches any configured identity
3. If match found, uses the *full aliased address* from the original recipient as the From address

This means users don't need to configure every alias - just their base addresses!

## Technical Design

### Architecture

```
Extension Load
    ↓
Load all identities → Build base email list
    ↓
Listen for compose events
    ↓
When compose detected (reply/forward)
    ↓
Get original message → Extract To/CC recipients
    ↓
Match against identity patterns
    ↓
If alias found → Set From address
```

### Algorithm

1. **Initialization** (on extension load):
   ```javascript
   identities = await messenger.identities.list()
   baseEmails = identities.map(i => i.email)
   // e.g., ["user@posteo.de", "john@example.com"]
   ```

2. **Compose Event Handler** (when user replies/forwards):
   ```javascript
   // Get compose details
   composeDetails = await messenger.compose.getComposeDetails(tab.id)

   // Check if reply/forward
   if (composeDetails.relatedMessageId) {
     // Get original message
     originalMessage = await messenger.messages.get(composeDetails.relatedMessageId)

     // Extract all recipients
     recipients = [...originalMessage.to, ...originalMessage.cc]

     // Find matching alias
     alias = findMatchingAlias(recipients, baseEmails)

     // Set From if alias found
     if (alias) {
       await messenger.compose.setComposeDetails(tab.id, { from: alias })
     }
   }
   ```

3. **Alias Matching Logic**:
   ```javascript
   function findMatchingAlias(recipients, baseEmails) {
     for (const recipient of recipients) {
       const email = extractEmail(recipient) // Handle "Name <email>" format

       // Check if email contains +
       if (email.includes('+')) {
         // Extract base address (remove +alias part)
         const [localPart, domain] = email.split('@')
         const baseLocal = localPart.split('+')[0]
         const baseEmail = `${baseLocal}@${domain}`

         // Check if base matches any configured identity
         if (baseEmails.includes(baseEmail)) {
           // IMPORTANT: Return the FULL aliased address from the recipient
           // NOT the base address from the identity
           return email // e.g., returns "user+shopping@posteo.de"
         }
       }
     }
     return null
   }
   ```

### Events to Use

**Option 1: `compose.onBeforeSend`**
- Fires right before sending
- Can modify or cancel send
- Con: User sees default From initially, changes at last moment

**Option 2: Earlier compose events (if available)**
- Would set From immediately when compose window opens
- Better UX - user sees correct From from start
- Need to research if such event exists

**Decision**: Start with `onBeforeSend` for MVP, investigate earlier events for v2

### Handling Edge Cases

1. **Multiple aliases in To/CC**:
   - Take first match found
   - Could add preference setting in future

2. **No matching identity**:
   - Do nothing, let Thunderbird use default

3. **Alias without + sign**:
   - Only match addresses with + pattern
   - Explicit and predictable behavior

4. **Multiple identities with same domain**:
   - Check all base emails
   - Use first match found

## Required Permissions

```json
{
  "permissions": [
    "accountsRead",       // Access identities (read)
    "accountsIdentities", // Create/modify identities (Feature 3)
    "messagesRead",       // Read original message recipients
    "compose",            // Modify compose details
    "storage"             // Store settings and preferences
  ]
}
```

## File Structure

```
thunderbird_send_as/
├── manifest.json           # Extension metadata and permissions
├── background.js           # Main extension logic
├── options/                # Settings UI (for Feature 2)
│   ├── options.html
│   └── options.js
├── popup/                  # Alias prompt dialog (for Feature 2)
│   ├── prompt.html
│   └── prompt.js
├── icons/                  # Extension icons (optional)
│   ├── icon-48.png
│   └── icon-96.png
├── README.md              # User documentation
└── LICENSE                # License file
```

## Manifest V3 Structure

```json
{
  "manifest_version": 3,
  "name": "Send As Alias",
  "version": "1.0",
  "description": "Automatically set From address to match email aliases in replies",
  "permissions": [
    "accountsRead",
    "accountsIdentities",
    "messagesRead",
    "compose",
    "storage"
  ],
  "background": {
    "scripts": ["background.js"]
  },
  "options_ui": {
    "page": "options/options.html",
    "open_in_tab": true
  },
  "icons": {
    "48": "icons/icon-48.png",
    "96": "icons/icon-96.png"
  }
}
```

## Feature 2: Alias Suggestion for All Emails (Optional)

**Purpose**: Prompt user to consider using an alias when composing from base address

**Behavior**:
- **Configured per account** (opt-in via options)
- When enabled for a specific account and user composes ANY email (new, reply, reply all, forward):
  - Detect if From address is a base identity (has no `+` alias)
  - **Priority**: Feature 1 runs first for replies/forwards (auto-detects alias), Feature 2 only prompts if Feature 1 didn't find a match
  - Show confirmation dialog: "You're sending from [base address]. Would you like to use an alias instead?"
  - Options:
    - "Use alias: [input field]" - user can type alias name
    - "Continue with base address"
    - "Don't ask again for this recipient"
- Only triggers for accounts where the feature is enabled
- "Don't ask again" list is also per-account

**Implementation**:
```javascript
// In compose.onBeforeSend handler
async function handleCompose(tab, composeDetails) {
  const fromEmail = extractEmail(composeDetails.from)
  let aliasWasSet = false

  // FEATURE 1: Auto-detect alias for replies/forwards
  if (composeDetails.relatedMessageId) {
    // Get original message
    const originalMessage = await messenger.messages.get(composeDetails.relatedMessageId)
    const recipients = [...(originalMessage.to || []), ...(originalMessage.cc || [])]

    // Try to find matching alias
    const matchedAlias = findMatchingAlias(recipients, baseEmails)

    if (matchedAlias) {
      await messenger.compose.setComposeDetails(tab.id, { from: matchedAlias })
      aliasWasSet = true
    }
  }

  // FEATURE 2: Prompt for alias if:
  // - Feature is enabled for this account
  // - From is still a base address (Feature 1 didn't set an alias)
  // - Not in "don't ask again" list
  if (!aliasWasSet && settings.promptForAlias[fromEmail]) {
    if (!fromEmail.includes('+') && baseEmails.includes(fromEmail)) {
      // Get recipient for "don't ask again" check
      const toEmail = extractEmail(composeDetails.to[0])

      // Check if we should skip this recipient
      if (!settings.dontAskAgain[fromEmail]?.includes(toEmail)) {
        // Prompt user for alias
        const result = await showAliasPrompt(fromEmail, toEmail)

        if (result.useAlias) {
          const alias = `${fromEmail.split('@')[0]}+${result.aliasName}@${fromEmail.split('@')[1]}`
          await messenger.compose.setComposeDetails(tab.id, { from: alias })
        } else if (result.dontAskAgain) {
          // Save to dontAskAgain list for this account
          if (!settings.dontAskAgain[fromEmail]) {
            settings.dontAskAgain[fromEmail] = []
          }
          settings.dontAskAgain[fromEmail].push(toEmail)
          await browser.storage.local.set({ dontAskAgain: settings.dontAskAgain })
        }
      }
    }
  }
}
```

**Settings Required**:
- `promptForAlias` (object, per-account configuration):
  ```javascript
  {
    "account1@posteo.de": true,      // Enabled for this account
    "account2@gmail.com": false,     // Disabled for this account
    "account3@example.com": true     // Enabled for this account
  }
  ```
- `dontAskAgain` (object, per-account arrays of recipient addresses):
  ```javascript
  {
    "account1@posteo.de": ["recipient1@example.com", "recipient2@example.com"],
    "account2@gmail.com": []
  }
  ```

**UI Considerations**:
- Dialog should be non-intrusive
- Quick keyboard access (Enter to accept, Esc to skip)
- Remember previous aliases used with same recipient domain

## Feature 3: Auto-Create Identity for New Aliases (Optional)

**Purpose**: Automatically offer to create a Thunderbird identity when using a new alias for the first time

**Behavior**:
- When the extension sets a From address with an alias (via Feature 1 or Feature 2)
- Check if this exact aliased address exists as a configured identity
- If NOT found, prompt: "Would you like to save `user+shopping@posteo.de` as a new identity?"
- Suggest identity name based on base identity (e.g., if base is "John Doe", suggest "John Doe (shopping)")
- User can:
  - Accept with suggested name
  - Modify the identity name
  - Skip (just use alias this time)
  - "Don't ask again for this alias" (remember the decision)

**Implementation**:
```javascript
async function maybeCreateIdentity(aliasEmail, baseEmail) {
  // Check if this alias already exists as an identity
  const allIdentities = await messenger.identities.list()
  const exists = allIdentities.some(id => id.email === aliasEmail)

  if (exists) {
    return // Already an identity, nothing to do
  }

  // Check if we should skip this alias
  if (settings.skipIdentityCreation?.includes(aliasEmail)) {
    return
  }

  // Find the base identity to copy settings from
  const baseIdentity = allIdentities.find(id => id.email === baseEmail)

  if (!baseIdentity) {
    return // Can't find base, skip
  }

  // Extract alias name from email
  const aliasName = aliasEmail.split('+')[1].split('@')[0]
  const suggestedName = `${baseIdentity.name} (${aliasName})`

  // Prompt user
  const result = await showCreateIdentityPrompt({
    email: aliasEmail,
    suggestedName: suggestedName,
    baseName: baseIdentity.name
  })

  if (result.create) {
    // Create new identity
    await messenger.identities.create(baseIdentity.accountId, {
      email: aliasEmail,
      name: result.name || suggestedName,
      replyTo: baseIdentity.replyTo,
      composeHtml: baseIdentity.composeHtml,
      signature: baseIdentity.signature
      // Copy other relevant settings from base identity
    })

    console.log(`Created new identity: ${result.name} <${aliasEmail}>`)
  } else if (result.dontAskAgain) {
    // Remember not to ask for this alias
    if (!settings.skipIdentityCreation) {
      settings.skipIdentityCreation = []
    }
    settings.skipIdentityCreation.push(aliasEmail)
    await browser.storage.local.set({ skipIdentityCreation: settings.skipIdentityCreation })
  }
}

// Call after setting From address
async function handleCompose(tab, composeDetails) {
  const fromEmail = extractEmail(composeDetails.from)
  let aliasWasSet = false
  let usedAlias = null

  // FEATURE 1: Auto-detect alias for replies/forwards
  if (composeDetails.relatedMessageId) {
    const originalMessage = await messenger.messages.get(composeDetails.relatedMessageId)
    const recipients = [...(originalMessage.to || []), ...(originalMessage.cc || [])]
    const matchedAlias = findMatchingAlias(recipients, baseEmails)

    if (matchedAlias) {
      await messenger.compose.setComposeDetails(tab.id, { from: matchedAlias })
      aliasWasSet = true
      usedAlias = matchedAlias
    }
  }

  // FEATURE 2: Prompt for alias
  if (!aliasWasSet && settings.promptForAlias[fromEmail]) {
    if (!fromEmail.includes('+') && baseEmails.includes(fromEmail)) {
      const toEmail = extractEmail(composeDetails.to[0])
      if (!settings.dontAskAgain[fromEmail]?.includes(toEmail)) {
        const result = await showAliasPrompt(fromEmail, toEmail)
        if (result.useAlias) {
          const alias = `${fromEmail.split('@')[0]}+${result.aliasName}@${fromEmail.split('@')[1]}`
          await messenger.compose.setComposeDetails(tab.id, { from: alias })
          usedAlias = alias
        }
      }
    }
  }

  // FEATURE 3: Offer to create identity for new alias
  if (usedAlias && settings.offerIdentityCreation) {
    // Extract base email from the alias
    const [localPart, domain] = usedAlias.split('@')
    const baseLocal = localPart.split('+')[0]
    const baseEmail = `${baseLocal}@${domain}`

    await maybeCreateIdentity(usedAlias, baseEmail)
  }
}
```

**Settings Required**:
- `offerIdentityCreation` (boolean, default: true) - Global on/off for this feature
- `skipIdentityCreation` (array of email addresses) - Aliases user chose not to save
  ```javascript
  ["user+temp@posteo.de", "user+test@posteo.de"]
  ```

**Required Permission**:
- `accountsIdentities` - To create new identities

**Benefits**:
- Gradually builds up your identity list automatically
- Preserves settings from base identity (signature, HTML compose, etc.)
- After first use, alias becomes a "real" identity in Thunderbird
- User maintains full control (can skip or customize)

**Use Cases**:
- First time using `user+shopping@posteo.de` → Creates identity "John Doe (shopping)"
- Next time Thunderbird natively recognizes it as an identity
- Useful for frequently-used aliases that you want to send from directly
- Can skip for one-time or temporary aliases

## Future Enhancements

1. **Options UI**:
   - Toggle for Reply vs Reply All vs Forward
   - **Per-account toggle for alias suggestion on new emails** ✓
   - **Toggle for identity auto-creation** ✓
   - **Manage "skip identity creation" list** ✓
   - Custom pattern matching
   - Whitelist/blacklist domains
   - **Per-account "don't ask again" list management** ✓

2. **Better Events**:
   - Hook earlier in compose process
   - Update From when compose window opens

3. **Visual Feedback**:
   - Notification when alias is auto-detected
   - Icon badge showing active

4. **Multiple Match Handling**:
   - UI to select which alias to use
   - Remember user preferences

5. **Alias History**:
   - Remember commonly used aliases
   - Quick-select from dropdown
   - Suggest aliases based on recipient domain

## Testing Plan

### Feature 1: Auto-Reply with Alias
1. Reply to email sent to `user+test@posteo.de`
2. Reply All with multiple aliases in To/CC
3. Forward message with alias
4. Reply to normal email (no alias)
5. Multiple Thunderbird identities configured
6. Different domains
7. Edge cases: malformed addresses, multiple + signs

### Feature 2: Alias Suggestion for All Emails
1. **New emails**: Compose from base address with feature enabled (should prompt)
2. **Reply without alias in original**: Reply to email sent to base address (should prompt if enabled)
3. **Reply with alias in original**: Reply to email sent to alias (Feature 1 auto-sets, Feature 2 doesn't prompt)
4. **Feature disabled**: Compose any email with feature disabled (no prompt)
5. **From aliased address**: Compose from aliased address (should not prompt)
6. **Don't ask again**: Test per-recipient skip functionality
7. **Cancel/skip**: User dismisses prompt without entering alias
8. **Enter alias**: User enters alias and confirms
9. **Multiple accounts**: Different settings per account

### Feature 3: Auto-Create Identity for New Aliases
1. **First use of alias**: Use new alias `user+shopping@posteo.de` (should prompt to create identity)
2. **Already an identity**: Use alias that's already configured (no prompt)
3. **Accept with suggested name**: Create identity with default "Name (alias)" format
4. **Customize name**: User changes suggested name before creating
5. **Skip**: User declines to create identity
6. **Don't ask for this alias**: User marks alias to never prompt again
7. **Feature disabled**: Global setting off (no prompts)
8. **Settings copied**: Verify new identity inherits signature, HTML mode, etc. from base
9. **Second use**: Use same alias again (should be recognized as identity, no prompt)

## References

- [Compose API](https://webextension-api.thunderbird.net/en/mv3/compose.html)
- [Messages API](https://webextension-api.thunderbird.net/en/mv3/messages.html)
- [Identities API](https://webextension-api.thunderbird.net/en/mv3/identities.html)
- Existing extensions: [Cusedar](https://addons.thunderbird.net/en-US/thunderbird/addon/custom-sender-address-reply/), [Reply As Original Recipient](https://github.com/qiqitori/reply_as_original_recipient)
