# Debugging Log - Thunderbird Send As Alias Extension

## Session Date: 2026-01-08

This document captures all debugging work done to get Features 1, 2, and 3 working.

## Session Summary

**Result**: ✅ **All 3 features fully working and tested!**

**Issues Fixed**: 9 major issues resolved
1. Wrong event listener (`onBeforeSend` → `onComposeStateChanged`)
2. Wrong state property check (`isComposing` → `canSendNow/canSendLater`)
3. Empty recipients array (`messages.get()` → `messages.getFull()`)
4. Wrong property path (found recipients in `fullMessage.headers.to/cc`)
5. Display name lost (preserve full recipient string)
6. Native dialogs don't work (created popup windows)
7. Identity creation failed (fixed `usedAlias` extraction)
8. Confusing wording (updated checkbox text)
9. Identity name preference (made Option 1 editable)

**Files Modified**:
- `background.js` - Fixed APIs, event handlers, added popup support
- `popup/alias-prompt.html` - Created alias suggestion UI
- `popup/alias-prompt.js` - Created alias suggestion logic
- `popup/identity-prompt.html` - Created identity creation UI
- `popup/identity-prompt.js` - Created identity creation logic

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

**Status**: ✅ Fixed and tested - Display names preserved

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

**Status**: ✅ Fixed and tested - Popup dialogs working

---

## Issue #7: Feature 3 Not Creating Identities

### Problem
User reported: Feature 2 popup shows, but no identity is created after entering an alias.

### Root Cause
When Feature 1 was fixed to preserve display names (Issue #5), `usedAlias` was being set to the full recipient string (e.g., `"Name" <user+alias@domain.com>`).

Feature 3 expects just the email address to:
1. Extract the alias name from the email
2. Find the base identity
3. Create the new identity with correct email

### Solution
Extract just the email address when setting `usedAlias` in Feature 1 (line 301):

```javascript
// Extract just the email for Feature 3 (matchedAlias might be "Name" <email@domain.com>)
usedAlias = extractEmail(matchedAlias);
```

This way:
- The From field gets the full string with display name (correct!)
- The `usedAlias` variable contains just the email for Feature 3 (correct!)

Added comprehensive logging to Feature 3 to debug identity creation flow.

**Status**: ✅ Fixed and tested - Identities now created

---

## Issue #8: Confusing Wording in Alias Prompt

### Problem
User reported: Checkbox says "Don't ask again for this recipient" but it should refer to the sender address, not the recipient.

### Solution
1. Removed the "To:" field display (not needed in this context)
2. Changed checkbox text from "Don't ask again for this recipient" to "Don't ask again when using this sender address"
3. Updated [popup/alias-prompt.html](popup/alias-prompt.html) lines 96-109

**Status**: ✅ Fixed and tested - Wording improved

---

## Issue #9: Identity Name Format Preference

### Problem
User reported: When creating a new identity, the suggested name is "Name (shopping)" but user prefers just "Name".

### User Request
Offer two options in the identity creation popup:
- Option 1 (default/preferred): Keep original name ("Name")
- Option 2: Add alias in parentheses ("Name (shopping)")

### Solution
Redesigned the identity creation popup to show two options:

1. **Updated [popup/identity-prompt.html](popup/identity-prompt.html)**:
   - Option 1 (preferred): Editable text input with user's original name
   - Option 2: Read-only text input showing "Name (alias)" format
   - Each option has its own "Use this" button
   - Layout: Two rows, each with label, input field, and button

2. **Updated [popup/identity-prompt.js](popup/identity-prompt.js)**:
   - Populate Option 1 with base name (editable)
   - Populate Option 2 with "Name (alias)" format (read-only)
   - Focus and select text in Option 1 input for easy editing
   - Handle Enter key on Option 1 input
   - Validate that Option 1 is not empty before creating identity

3. **Updated [background.js](background.js)**:
   - Changed URL parameter from `suggestedName` to `baseName` (line 176)
   - Reduced popup height from 350px to 300px

**Status**: ✅ Fixed and tested - User can now edit identity name

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

6. **Background Script Lifecycle**: Background scripts in Manifest V3 can be stopped when idle and restarted when needed
   - This is **normal and expected behavior** for event-driven extensions
   - The script will show "stopped" status when idle
   - It automatically restarts when events fire (e.g., `onComposeStateChanged`)
   - State is preserved in `messenger.storage.local`
   - No action needed - this is how modern extensions conserve resources

### Debugging Tips

1. Add comprehensive logging at every step
2. Log the actual object structures to see what properties exist
3. Check Thunderbird WebExtension API docs for correct method usage
4. Use Browser Console (Ctrl+Shift+J) for debugging background scripts

---

## Extension Status

**Current State**: ✅ **All three features fully working and tested!**

- ✅ **Feature 1: Auto-reply with alias detection** - Working perfectly
  - Detects aliases in original recipients
  - Sets From field automatically when replying
  - Preserves display names

- ✅ **Feature 2: Alias suggestion prompts** - Working perfectly
  - Popup dialog appears when composing from base address
  - User-friendly UI with clear options
  - Per-account configuration

- ✅ **Feature 3: Auto-create identities** - Working perfectly
  - Offers to save new aliases as identities
  - Two naming options: editable "Name" or "Name (alias)"
  - Copies settings from base identity

**Completed Improvements**:
1. ✅ Replaced native `prompt()` dialogs with proper popup windows
2. ✅ Fixed all Thunderbird API issues
3. ✅ Added comprehensive error logging
4. ✅ Improved UX with editable identity names

**Future Enhancements** (optional):
1. Create actual icon files (currently placeholders)
2. Add LICENSE file
3. Consider publishing to Thunderbird Add-ons

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
