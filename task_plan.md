# Task Plan: Thunderbird Send As Alias Extension

## Goal
Build a Thunderbird extension that automatically sets the "From" address to match the alias used in the original recipient address when replying to emails sent to user+alias@posteo.de addresses.

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
  - Create manifest.json
  - Implement background.js with event listeners
  - Implement alias detection logic
  - Implement From address modification
  - Handle edge cases
- [ ] Phase 4: Testing and refinement
  - Test with various email scenarios
  - Add error handling
  - Create user configuration options if needed
  - Write documentation (README.md)

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
- Key APIs:
  - `identities` API - to get user's configured email addresses
  - `compose` API - for accessing/modifying compose window
  - `messages` API - for reading original message details
- File structure:
  - manifest.json
  - background.js
  - DESIGN.md (technical specification)

## Decisions Made
- **Scope**: Any domain with + pattern (not just posteo.de)
- **Triggers**: Reply, Reply All, AND Forward
- **Pattern detection**: Extract from configured Thunderbird identities
- **Multiple matches**: Use first match found
- **User level**: Beginner-friendly development approach
- **Manifest version**: V3 (modern Thunderbird standard)
- **Implementation**: Use WebExtension APIs (not legacy WindowListener)
- **Event**: Use `compose.onBeforeSend` for MVP
- **Smart approach**: Auto-detect base emails from identities, match aliases automatically

## Reference Extensions Found
- Custom Sender Address and Reply (Cusedar) - active, similar functionality
- Reply As Original Recipient - GitHub available, may be outdated

## Errors Encountered
(None yet)

## Status
**Currently between Phase 2 and Phase 3** - Design complete, ready to implement when approved by user
