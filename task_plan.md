# Task Plan: Thunderbird Send As Alias Extension

## Goal
Build a Thunderbird extension with two features:
1. **Auto-reply with alias**: Automatically set the "From" address to match the alias used in the original recipient address when replying to emails sent to user+alias@posteo.de addresses.
2. **Alias suggestion (optional)**: When composing ANY email (new, reply, forward) from a base address, prompt user to consider using an alias instead (disabled by default per account).

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
- [ ] Phase 3: Implement core functionality
  - Create manifest.json with all permissions
  - Implement background.js:
    - Feature 1: Auto-reply with alias (identity loading, event handlers, alias detection)
    - Feature 2: Alias suggestion for new emails (optional, disabled by default)
  - Create options UI (for enabling/disabling Feature 2)
  - Create alias prompt dialog (for Feature 2)
  - Implement settings storage
  - Handle edge cases
- [ ] Phase 4: Testing and refinement
  - Test Feature 1 (auto-reply) scenarios
  - Test Feature 2 (alias suggestion) scenarios
  - Add error handling
  - Write documentation (README.md)
  - Create usage guide for both features

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
4. Should the extension work only for posteo.de or be configurable for other providers?
5. Should this work for "Reply All" and "Forward" as well?
6. What if multiple To/CC addresses match the +alias pattern?
7. Should we use `onBeforeSend` event or an earlier compose event?

## Technical Requirements
- Thunderbird version: 115+ (modern WebExtension API, Manifest V3)
- Required permissions:
  - `accountsRead` - to access configured identities
  - `messagesRead` - to read original message recipients
  - `compose` - to modify compose details
  - `storage` - to store settings and preferences
- Key APIs:
  - `identities` API - to get user's configured email addresses
  - `compose` API - for accessing/modifying compose window
  - `messages` API - for reading original message details
  - `storage` API - for persisting settings
- File structure:
  - manifest.json
  - background.js
  - options/ (settings UI)
  - popup/ (alias prompt dialog)
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

### General
- **User level**: Beginner-friendly development approach
- **Manifest version**: V3 (modern Thunderbird standard)
- **Implementation**: Use WebExtension APIs (not legacy WindowListener)
- **Event**: Use `compose.onBeforeSend` for both features

## Reference Extensions Found
- Custom Sender Address and Reply (Cusedar) - active, similar functionality
- Reply As Original Recipient - GitHub available, may be outdated

## Errors Encountered
(None yet)

## Status
**Currently between Phase 2 and Phase 3** - Design complete, ready to implement when approved by user
