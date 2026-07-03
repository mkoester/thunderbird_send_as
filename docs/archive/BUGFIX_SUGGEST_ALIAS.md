# Bug Fix: Suggest Alias Issues

Date: 2026-01-08
Version: 1.0.3

## Issues Reported

### Issue 1: Suggest Alias not triggering on new compose
When composing a new email with an account that has Auto-Reply, Plus-addressing, and Suggest Alias enabled, the Suggest Alias prompt did not appear.

### Issue 2: Name part erased when selecting alias
When using "Edit as New" on an existing email and selecting an alias through the Suggest Alias prompt, the display name portion of the From address was being erased, leaving only the email address.

## Root Causes

### Issue 1: Multiple Problems

1. **Incorrect Feature Dependency** (Line 479)
   - The code required BOTH `feature1Enabled` (Auto-Reply) AND `feature2Enabled` (Suggest Alias) to be enabled
   - This was incorrect logic - Feature 2 should work independently
   ```javascript
   // WRONG:
   if (accountSettings.feature2Enabled && accountSettings.feature1Enabled) {

   // CORRECT:
   if (accountSettings.feature2Enabled) {
   ```

2. **"Don't Ask Again" Logic Issue** (Line 499)
   - The condition `if (toEmail && !dontAskList.includes(toEmail))` prevented the prompt from showing when there was no recipient
   - For new compose windows, `toEmail` is undefined/null, causing the condition to fail
   ```javascript
   // WRONG:
   if (toEmail && !dontAskList.includes(toEmail)) {

   // CORRECT:
   const shouldSkipRecipient = toEmail && dontAskList.includes(toEmail);
   if (!shouldSkipRecipient) {
   ```

3. **Event Listener Reliability Issue**
   - The `onComposeStateChanged` event was not reliably firing for new compose windows
   - The event would fire once with `canSendNow=false, canSendLater=false`, but never fire again
   - The "process once" check happened before the state validation, preventing retry

### Issue 2: Missing Display Name Preservation

The code constructed the alias email address but didn't preserve the display name from the identity:

```javascript
// WRONG:
await messenger.compose.setComposeDetails(tab.id, { from: alias });

// CORRECT:
let aliasWithName = aliasEmail;
if (currentIdentity.name) {
  aliasWithName = `${currentIdentity.name} <${aliasEmail}>`;
}
await messenger.compose.setComposeDetails(tab.id, { from: aliasWithName });
```

## Solutions Implemented

### Issue 1 Fixes

1. **Removed incorrect feature dependency** (background.js:479)
   - Changed condition to only check `feature2Enabled`

2. **Fixed "don't ask again" logic** (background.js:497-500)
   - Inverted the logic to only skip when recipient exists AND is in the list
   - Allows prompt to show when no recipient is present

3. **Added `windows.onCreated` listener** (background.js:638-656)
   - Listens for new compose windows being created
   - More reliable than relying solely on `onComposeStateChanged`
   - Implements polling mechanism to wait for window readiness

4. **Implemented compose window polling** (background.js:580-606)
   - Polls `getComposeDetails()` every 100ms for up to 5 seconds
   - Checks for valid `from` address to determine readiness
   - More reliable than checking `getComposeState()` which returned `undefined`

### Issue 2 Fix

**Preserved display name when setting alias** (background.js:515-519)
- Formats alias as `"Name <email>"` instead of just `email`
- Preserves the identity's name from `currentIdentity.name`

## Technical Details

### Why `onComposeStateChanged` Wasn't Working

The event fires with this sequence:
1. First fire: `canSendNow=false, canSendLater=false` (window not ready)
2. No subsequent fires observed for new compose windows
3. The original code would mark the tab as "processed" before checking readiness, preventing retry

### Why `getComposeState()` Failed

When polling with `messenger.compose.getComposeState()`, the API returned:
- `canSendNow=undefined`
- `canSendLater=undefined`

This suggests the API is not yet initialized or available. Using `getComposeDetails()` instead proved more reliable.

### Window Creation Event Flow

```
User clicks "New Message"
  ↓
windows.onCreated fires (type=messageCompose)
  ↓
Query for tabs in window
  ↓
Mark tab as processed (prevent duplicate handling)
  ↓
Start polling loop (50 iterations × 100ms)
  ↓
Wait for composeDetails.from to be populated
  ↓
Process compose window (Feature 2)
  ↓
Show alias prompt if conditions met
```

## Testing

Both issues were verified fixed:
1. New compose windows now show the Suggest Alias prompt
2. Display names are preserved when selecting an alias
3. "Edit as New" works correctly with name preservation
4. Debug logging confirms proper event flow

## Files Modified

- `background.js`: Main logic fixes (lines 433, 479, 497-523, 555-656)

## Debug Logging Added

For troubleshooting, extensive debug logging was added:
- Window creation events
- Compose state changes
- Polling progress
- Handler invocations
- Feature 2 prompt triggers

These logs can be viewed in the Browser Console when `debugLogging` is enabled in settings.
