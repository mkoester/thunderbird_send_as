# Task Plan: Thunderbird Send As Alias Extension

## Goal
Build a Thunderbird extension that automatically sets the "From" address to match the alias used in the original recipient address when replying to emails sent to user+alias@posteo.de addresses.

## Phases
- [x] Phase 1: Research and setup
  - ✅ Understand Thunderbird WebExtension APIs
  - ✅ Research compose window manipulation
  - ✅ Found existing similar extensions for reference
  - ✅ Documented API capabilities in notes.md
- [ ] Phase 2: Design the solution
  - Determine how to detect reply actions
  - Figure out how to extract alias from original recipient
  - Plan how to set the From address
  - Decide on user configuration needs
  - Answer remaining open questions
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
  - `messagesRead` - to read original message recipients
  - `compose` - to modify compose details
- Key APIs:
  - `compose` API - for accessing/modifying compose window
  - `messages` API - for reading original message details
- File structure:
  - manifest.json
  - background.js

## Decisions Made
- Target: Posteo.de plus-addressing pattern (user+alias@posteo.de)
- Trigger: Reply actions (Reply All TBD in Phase 2)
- User level: Beginner-friendly development approach
- Manifest version: V3 (modern Thunderbird standard)
- Implementation: Use WebExtension APIs (not legacy WindowListener)

## Reference Extensions Found
- Custom Sender Address and Reply (Cusedar) - active, similar functionality
- Reply As Original Recipient - GitHub available, may be outdated

## Errors Encountered
(None yet)

## Status
**Currently in Phase 2** - Ready to design the solution and answer remaining questions
