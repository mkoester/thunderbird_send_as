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
    "accountsRead",  // Access identities
    "messagesRead",  // Read original message recipients
    "compose"        // Modify compose details
  ]
}
```

## File Structure

```
thunderbird_send_as/
├── manifest.json           # Extension metadata and permissions
├── background.js           # Main extension logic
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
  "permissions": ["accountsRead", "messagesRead", "compose"],
  "background": {
    "scripts": ["background.js"]
  },
  "icons": {
    "48": "icons/icon-48.png",
    "96": "icons/icon-96.png"
  }
}
```

## Future Enhancements

1. **Options UI**:
   - Toggle for Reply vs Reply All vs Forward
   - Custom pattern matching
   - Whitelist/blacklist domains

2. **Better Events**:
   - Hook earlier in compose process
   - Update From when compose window opens

3. **Visual Feedback**:
   - Notification when alias is auto-detected
   - Icon badge showing active

4. **Multiple Match Handling**:
   - UI to select which alias to use
   - Remember user preferences

## Testing Plan

Test scenarios:
1. Reply to email sent to `user+test@posteo.de`
2. Reply All with multiple aliases in To/CC
3. Forward message with alias
4. Reply to normal email (no alias)
5. Multiple Thunderbird identities configured
6. Different domains
7. Edge cases: malformed addresses, multiple + signs

## References

- [Compose API](https://webextension-api.thunderbird.net/en/mv3/compose.html)
- [Messages API](https://webextension-api.thunderbird.net/en/mv3/messages.html)
- [Identities API](https://webextension-api.thunderbird.net/en/mv3/identities.html)
- Existing extensions: [Cusedar](https://addons.thunderbird.net/en-US/thunderbird/addon/custom-sender-address-reply/), [Reply As Original Recipient](https://github.com/qiqitori/reply_as_original_recipient)
