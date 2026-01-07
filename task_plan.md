# Task Plan: Thunderbird Send As Alias Extension

## Goal
Build a Thunderbird extension with three features:
1. **Auto-reply with alias**: Automatically set the "From" address to match the alias used in the original recipient address when replying to emails sent to user+alias@posteo.de addresses.
2. **Alias suggestion (optional)**: When composing ANY email (new, reply, forward) from a base address, prompt user to consider using an alias instead (disabled by default per account).
3. **Auto-create identity (optional)**: When using a new alias for the first time, offer to save it as a Thunderbird identity with settings copied from the base identity (enabled by default).

## Phases
- [x] Phase 1: Research and setup
  - ✅ Understand Thunderbird WebExtension APIs
  - ✅ Research compose window manipulation
  - ✅ Found existing similar extensions for reference
  - ✅ Documented API capabilities in notes.md
- [x] Phase 2: Design the solution
  - ✅ Researched identities API for pattern extraction
  - ✅ Designed smart solution using configured identities
  - ✅ Created DESIGN.md with full technical specification
  - ✅ Answered user questions about scope and behavior
  - ✅ Decided on algorithm and architecture
- [x] Phase 3: Implement core functionality
  - ✅ Create manifest.json with all permissions
  - ✅ Implement background.js:
    - ✅ Feature 1: Auto-reply with alias (identity loading, event handlers, alias detection)
    - ✅ Feature 2: Alias suggestion for all emails (optional, disabled by default per account)
    - ✅ Feature 3: Auto-create identity for new aliases (optional, enabled by default)
  - ✅ Create options UI (for Features 2 & 3 settings)
  - ✅ Create alias prompt dialog (for Feature 2) - using native prompt() temporarily
  - ✅ Create identity creation dialog (for Feature 3) - using native prompt() temporarily
  - ✅ Implement settings storage
  - ✅ Handle edge cases
  - ✅ Write documentation (README.md, INSTALL.md, FEATURES.md)
- [ ] Phase 4: Testing and debugging
  - [ ] Debug Features 1 & 2 not working (IN PROGRESS)
  - [ ] Fix background script stopping issue (IN PROGRESS)
  - Test Feature 1 (auto-reply) scenarios
  - Test Feature 2 (alias suggestion) scenarios
  - Test Feature 3 (identity creation) scenarios
  - Add error handling
  - Create icon files (currently placeholders)

## Key Questions

### Answered (See notes.md for details):
1. ✅ How do we detect when a user is composing a reply vs. a new email?
   - Use `ComposeDetails.relatedMessageId` - present for replies, undefined for new messages
2. ✅ How do we access the original recipient address from the email being replied to?
   - Use `messages.get()` with `relatedMessageId` to fetch original message
   - Access `to` and `cc` fields from MessageHeader
3. ✅ How do we programmatically set the "From" address in the compose window?
   - Use `compose.setComposeDetails()` with `from` property
   - Note: Overrides header, doesn't change identity (but posteo.de should accept it)

### Still to Answer:
(All questions answered)

## Technical Requirements
- Thunderbird version: 115+ (modern WebExtension API, Manifest V3)
- Required permissions:
  - `accountsRead` - to access configured identities (read)
  - `accountsIdentities` - to create new identities (Feature 3)
  - `messagesRead` - to read original message recipients
  - `compose` - to modify compose details
  - `storage` - to store settings and preferences
- Key APIs:
  - `identities` API - to get/create user's email identities
  - `compose` API - for accessing/modifying compose window
  - `messages` API - for reading original message details
  - `storage` API - for persisting settings
- File structure:
  - manifest.json
  - background.js
  - options/ (settings UI for Features 2 & 3)
  - popup/ (alias prompt dialog for Feature 2, identity creation dialog for Feature 3)
  - DESIGN.md (technical specification)

## Decisions Made

### Feature 1: Auto-Reply with Alias
- **Scope**: Any domain with + pattern (not just posteo.de)
- **Triggers**: Reply, Reply All, AND Forward
- **Pattern detection**: Extract BASE addresses only from configured Thunderbird identities
- **Alias handling**: Use the full aliased address from original recipient (not from identity)
- **Multiple matches**: Use first match found
- **Smart approach**:
  - Extract base emails from identities (e.g., `user@posteo.de`)
  - Match against stripped aliases (e.g., `user+shop@posteo.de` → `user@posteo.de`)
  - Set From to FULL alias from original recipient (e.g., `user+shop@posteo.de`)

### Feature 2: Alias Suggestion for All Emails
- **Default state**: Disabled per account (opt-in)
- **Configuration level**: Per-account (e.g., enable for work@company.com, disable for personal@gmail.com)
- **Trigger**: ANY email composition (new, reply, reply all, forward) from base address
- **Priority**: Feature 1 runs first; Feature 2 only prompts if Feature 1 didn't find/set an alias
- **Behavior**: Prompt user with dialog to enter alias name
- **Options**:
  - Enter custom alias
  - Continue with base address
  - "Don't ask again for this recipient"
- **Storage**:
  - Per-account enabled/disabled state
  - Per-account "don't ask again" lists
- **Use cases**:
  - New emails: Always prompts (if enabled)
  - Replies to base address: Prompts (if enabled)
  - Replies to aliased address: Feature 1 auto-sets, no prompt needed

### Feature 3: Auto-Create Identity for New Aliases
- **Default state**: Enabled (opt-out)
- **Trigger**: After setting an aliased From address (via Feature 1 or 2)
- **Behavior**: Prompt to create Thunderbird identity for new alias
- **Suggested name format**: "Base Name (alias)" - e.g., "John Doe (shopping)"
- **Settings copied**: signature, HTML mode, reply-to, compose settings from base identity
- **Options**:
  - Create with suggested name
  - Customize name before creating
  - Skip this time
  - "Don't ask for this alias again"
- **Storage**: List of aliases to skip

### General
- **User level**: Beginner-friendly development approach
- **Manifest version**: V3 (modern Thunderbird standard)
- **Implementation**: Use WebExtension APIs (not legacy WindowListener)
- **Event**: Use `compose.onComposeStateChanged` for early intercept (changed from `onBeforeSend`)

## Reference Extensions Found
- Custom Sender Address and Reply (Cusedar) - active, similar functionality
- Reply As Original Recipient - GitHub available, may be outdated

## Errors Encountered

### Error 1: Wrong event listener (onBeforeSend)
**Reported**: User tested temporary add-on, features not working, background script goes from "running" to "stopped"

**Root Cause**: Using wrong event listener
- Used `compose.onBeforeSend` which fires right before sending (too late)
- Prompts were blocking at send time
- Background script may have timed out waiting for user interaction

**Solution**: Changed to `compose.onComposeStateChanged`
- Fires when compose window opens (early intercept)
- Allows natural prompt flow before user starts composing
- Better user experience - From field set before user sees compose UI
- Modified background.js lines 341-378

**Status**: ✅ Fixed

### Error 2: Wrong state property check (isComposing)
**Reported**: Extension still not working after event listener fix

**Root Cause**: Checking for `state.isComposing` which doesn't exist
- The state object has `canSendNow` and `canSendLater` properties
- `isComposing` property doesn't exist in ComposeState

**Solution**: Fixed the condition and added tab tracking
- Check for `canSendNow` or `canSendLater` becoming true
- Added `processedComposeTabs` Set to track which compose windows we've handled
- Only process each compose window once

**Status**: ✅ Fixed

### Error 3: Empty recipients array (messages.get())
**Reported**: Feature 1 still not working - recipients array is empty

**Root Cause**: Using `messages.get()` instead of `messages.getFull()`
- `messages.get()` returns MessageHeader with unpopulated recipient fields
- `originalMessage.to` and `originalMessage.cc` are empty

**Solution**: Changed to `messages.getFull()`
- Use `messenger.messages.getFull()` instead of `messages.get()`
- Modified background.js lines 268-283

**Status**: ❌ Partial fix - found correct API but wrong property path

### Error 4: Wrong property path in fullMessage
**Reported**: After switching to `messages.getFull()`, recipients still undefined

**Root Cause**: Recipients not at top level of fullMessage object
- Was accessing `fullMessage.recipients` and `fullMessage.ccList`
- These properties don't exist at top level
- Recipients are nested in `fullMessage.headers` object

**Solution**: Access recipients from headers object
- Changed to `fullMessage.headers.to` and `fullMessage.headers.cc`
- Modified background.js lines 273-283

**Status**: ✅ Fixed and tested - Feature 1 working

### Error 5: Display name lost when setting From field
**Reported**: When original recipient is `"Name" <user+alias@posteo.de>`, From field becomes `<user+alias@posteo.de>` (display name lost)

**Root Cause**: `findMatchingAlias()` returning just email address instead of full recipient string
- Was returning `email` (extracted email only)
- Lost display name from original recipient

**Solution**: Return full recipient string to preserve display name
- Changed return value from `email` to `recipient` (line 118)
- Now preserves format: `"Name" <user+alias@domain.com>`

**Status**: ✅ Fixed, awaiting user testing

### Error 6: Feature 2 not working (prompt() not available in background scripts)
**Reported**: Alias suggestion prompt not appearing

**Root Cause**: Native `prompt()` and `confirm()` not available in background scripts
- Modern WebExtensions don't support native dialogs in background scripts
- Code was triggering Feature 2 but dialog never appeared
- Functions like `prompt()` only work in content scripts or popup windows

**Solution**: Replaced native dialogs with popup windows
- Created `popup/alias-prompt.html` and `popup/alias-prompt.js`
- Created `popup/identity-prompt.html` and `popup/identity-prompt.js`
- Added `messenger.runtime.onMessage` listener to receive popup responses
- Changed `showAliasPrompt()` to use `messenger.windows.create()`
- Changed `showCreateIdentityPrompt()` to use `messenger.windows.create()`
- Updated response handling for both features

**Status**: ✅ Fixed, awaiting user testing

## Status
**Currently in Phase 4** - Debugging Features 1 & 2. Feature 1 working, investigating Feature 2 not triggering.
