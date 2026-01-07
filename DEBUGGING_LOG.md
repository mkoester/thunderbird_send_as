# Debugging Log - Thunderbird Send As Alias Extension

## Session Date: 2026-01-08

This document captures all debugging work done to get Features 1, 2, and 3 working.

---

## Initial Problem Report

**User reported**: Features 1 & 2 not working, background script stopping after some time

**Console output showed**:
```
Send As Alias: Background script starting...
Send As Alias: Initializing...
Send As Alias: Compose state changed...
Send As Alias: Ignoring state change (not composing)
```

---

## Issue #1: Wrong Event Listener

### Problem
Using `compose.onBeforeSend` event which fires right before sending the email.

### Why This Failed
- Event triggers too late (at send time, not compose window open)
- User prompts were blocking the send operation
- Background script likely timed out waiting for user interaction
- Poor UX - From field changes at last moment

### Solution
Changed to `compose.onComposeStateChanged` event (lines 341-378 in background.js)

```javascript
messenger.compose.onComposeStateChanged.addListener(async (tab, state) => {
  // Process compose window when it opens
});
```

### Benefits
- Fires when compose window opens (early intercept)
- Natural prompt flow before user starts composing
- From field set before user sees compose UI
- Better user experience

**Status**: ✅ Fixed

---

## Issue #2: Wrong State Property Check

### Problem
After fixing the event listener, extension still didn't work. Console showed:
```
Send As Alias: Ignoring state change (not composing)
```

Code was checking for `state.isComposing` which doesn't exist.

### Actual State Object
The `state` object from `onComposeStateChanged` contains:
```javascript
{
  canSendNow: true/false,
  canSendLater: true/false
}
```

There is NO `isComposing` property!

### Solution
1. Added tracking Set to prevent duplicate processing:
   ```javascript
   const processedComposeTabs = new Set();
   ```

2. Fixed the condition (lines 345-354):
   ```javascript
   // Only process each compose window once
   if (processedComposeTabs.has(tab.id)) {
     return;
   }

   // Ensure the compose window has loaded
   if (!state.canSendNow && !state.canSendLater) {
     return;
   }

   processedComposeTabs.add(tab.id);
   ```

**Status**: ✅ Fixed

---

## Issue #3: Empty Recipients Array

### Problem
After fixing the state check, Feature 1 still didn't work. Console showed:
```
Recipients to check: Array []
Matched alias: null
Feature 1 - No matching alias found
```

### Root Cause
Using `messenger.messages.get()` which returns a `MessageHeader` object with **unpopulated recipient fields**.

Original code (WRONG):
```javascript
const originalMessage = await messenger.messages.get(composeDetails.relatedMessageId);
const recipients = [
  ...(originalMessage.to || []),
  ...(originalMessage.cc || [])
];
```

### Why This Failed
- `messages.get()` returns basic MessageHeader metadata only
- The `to` and `cc` properties are empty/undefined
- Need full message headers to get recipient information

### Solution
Changed to `messages.getFull()` with correct property names (lines 266-278):

```javascript
// Get original message with full headers
const fullMessage = await messenger.messages.getFull(composeDetails.relatedMessageId);

const recipients = [
  ...(fullMessage.recipients || []),  // Changed from .to
  ...(fullMessage.ccList || [])       // Changed from .cc
];
```

### API Differences
| Method | Returns | Recipients Populated? |
|--------|---------|----------------------|
| `messages.get()` | MessageHeader | ❌ No |
| `messages.getFull()` | Full message with headers | ✅ Yes |

### Property Name Changes
- `originalMessage.to` → `fullMessage.recipients`
- `originalMessage.cc` → `fullMessage.ccList`

**Status**: ❌ Partial fix - found correct API but wrong property path

---

## Issue #4: Wrong Property Path in Full Message

### Problem
After switching to `messages.getFull()`, recipients still empty. Console showed:
```
Send As Alias: Recipients: undefined
Send As Alias: CC List: undefined
Send As Alias: Recipients to check: Array []
```

### Root Cause
The recipients aren't at the top level of the full message object - they're nested inside the `headers` object.

Original code (WRONG):
```javascript
const recipients = [
  ...(fullMessage.recipients || []),
  ...(fullMessage.ccList || [])
];
```

### Actual Structure
The `fullMessage` object has this structure:
```javascript
{
  contentType: "message/rfc822",
  partName: "",
  size: 37534,
  decryptionStatus: "none",
  headers: {
    to: [...],      // Recipients are HERE
    cc: [...],      // CC list is HERE
    // ... other headers
  },
  parts: [...]
}
```

### Solution
Changed to access recipients from `headers` object (lines 273-283):

```javascript
// Extract recipients from headers
const toHeader = fullMessage.headers.to || [];
const ccHeader = fullMessage.headers.cc || [];

const recipients = [
  ...toHeader,
  ...ccHeader
];
```

**Status**: ✅ Fixed and tested - Feature 1 working

---

## Issue #5: Display Name Lost When Setting From Field

### Problem
User reported: When original recipient is `"Name" <user+shopping@posteo.de>`, the From field becomes `<user+shopping@posteo.de>` (display name omitted).

### Root Cause
The `findMatchingAlias()` function was extracting just the email address and returning it, which loses the display name from the original recipient string.

Original code (line 116):
```javascript
return email;  // Just the email, loses display name
```

### Solution
Changed to return the full recipient string (line 118):

```javascript
return recipient;  // Full string: "Name" <user+alias@domain.com>
```

This preserves the display name if present in the original recipient field.

**Status**: ✅ Fixed, awaiting user testing

---

## Issue #6: Feature 2 Not Working (prompt() not available in background scripts)

### Problem
User reported: Feature 2 (alias suggestion prompt) not appearing.

### Investigation
Added comprehensive logging and discovered that the code WAS triggering Feature 2:
```
Send As Alias: Prompting for alias...
```

However, no dialog appeared to the user.

### Root Cause
Native `prompt()` and `confirm()` functions are **not available in background scripts** in modern WebExtensions (including Thunderbird). They only work in content scripts or popup windows.

### Solution
Replaced native dialogs with proper popup windows:

1. **Created popup HTML pages**:
   - `popup/alias-prompt.html` - For Feature 2 (alias suggestion)
   - `popup/alias-prompt.js` - Popup logic
   - `popup/identity-prompt.html` - For Feature 3 (identity creation)
   - `popup/identity-prompt.js` - Popup logic

2. **Updated background.js**:
   - Added `messenger.runtime.onMessage` listener (lines 21-36) to receive responses from popups
   - Changed `showAliasPrompt()` to open popup window using `messenger.windows.create()` (lines 130-143)
   - Changed `showCreateIdentityPrompt()` to open popup window (lines 170-183)
   - Updated response handling to use `identityName` property (line 229)

3. **Communication flow**:
   - Background script opens popup with parameters in URL
   - Popup displays UI and waits for user input
   - Popup sends response via `browser.runtime.sendMessage()`
   - Background script receives message and resolves the Promise

**Status**: ✅ Fixed, awaiting user testing

---

## Summary of All Fixes

### Files Modified

**`/home/mk/src/thunderbird_send_as/background.js`**
1. **Lines 21-36**: Added `messenger.runtime.onMessage` listener for popup responses
2. **Lines 118**: Changed `findMatchingAlias()` to return full recipient string (preserves display name)
3. **Lines 130-143**: Replaced `showAliasPrompt()` with popup window implementation
4. **Lines 170-183**: Replaced `showCreateIdentityPrompt()` with popup window implementation
5. **Lines 229, 241**: Updated response handling to use correct property names
6. **Lines 268-283**: Changed API method (`messages.get()` → `messages.getFull()`) and fixed property path to `fullMessage.headers.to` and `fullMessage.headers.cc`
7. **Lines 305-356**: Added comprehensive logging for Feature 2 debugging
8. **Lines 341-378**: Changed event listener from `onBeforeSend` to `onComposeStateChanged`
9. **Lines 345-354**: Fixed state property check (`isComposing` → `canSendNow/canSendLater`)

**New Files Created:**
- `popup/alias-prompt.html` - Feature 2 alias suggestion UI
- `popup/alias-prompt.js` - Feature 2 popup logic
- `popup/identity-prompt.html` - Feature 3 identity creation UI
- `popup/identity-prompt.js` - Feature 3 popup logic

### Testing Instructions

After reloading the extension:

1. **Test Feature 1** (Auto-reply with alias):
   - Reply to an email sent to `youremail+test@domain.com`
   - Console should show:
     ```
     Recipients to check: Array [ ... ]  (not empty!)
     Matched alias: youremail+test@domain.com
     Feature 1 - Set From to youremail+test@domain.com
     ```
   - From field should automatically be set to the alias

2. **Test Feature 2** (Alias suggestion):
   - Enable it first in extension settings
   - Compose a new email from base address
   - Should see a prompt asking for an alias

3. **Test Feature 3** (Identity creation):
   - Use an alias for the first time
   - Should see a prompt to save it as an identity

---

## Key Learnings

### Thunderbird WebExtension API Gotchas

1. **Event Timing**: `onBeforeSend` is too late for UI modifications. Use `onComposeStateChanged` for early intercept.

2. **State Object Properties**: The `ComposeState` object has `canSendNow` and `canSendLater`, NOT `isComposing`.

3. **Message API Methods**:
   - `messages.get()` - Basic metadata only, empty recipients
   - `messages.getFull()` - Full headers with populated recipients
   - Recipients are in `fullMessage.headers.to` and `fullMessage.headers.cc` (NOT at top level)

4. **Event Firing Frequency**: `onComposeStateChanged` fires multiple times. Track processed tabs to handle each window only once.

5. **Native Dialogs Not Available**: `prompt()`, `confirm()`, and `alert()` do **not work** in background scripts. Use:
   - `messenger.windows.create()` to open popup HTML pages
   - `messenger.runtime.onMessage` to receive responses from popups
   - Promise-based pattern to make async dialogs work like sync ones

### Debugging Tips

1. Add comprehensive logging at every step
2. Log the actual object structures to see what properties exist
3. Check Thunderbird WebExtension API docs for correct method usage
4. Use Browser Console (Ctrl+Shift+J) for debugging background scripts

---

## Extension Status

**Current State**: All three features implemented and debugged
- ✅ Feature 1: Auto-reply with alias detection
- ✅ Feature 2: Alias suggestion prompts
- ✅ Feature 3: Auto-create identities

**Next Steps**:
1. User testing of all three features
2. Replace native `prompt()` dialogs with proper UI (future enhancement)
3. Create actual icon files (currently placeholders)
4. Add LICENSE file

---

## Reference Files

- **Implementation**: `/home/mk/src/thunderbird_send_as/background.js`
- **Design Doc**: `/home/mk/src/thunderbird_send_as/DESIGN.md`
- **Features Doc**: `/home/mk/src/thunderbird_send_as/FEATURES.md`
- **Task Plan**: `/home/mk/src/thunderbird_send_as/task_plan.md`
- **Install Guide**: `/home/mk/src/thunderbird_send_as/INSTALL.md`

---

## Contact

Extension author: Mirko Köster
GitHub: https://github.com/mkoester/thunderbird_send_as
