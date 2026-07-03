# Notes: Thunderbird Send As Alias Extension

## Research Areas

### 1. Thunderbird WebExtension Architecture
- Modern Thunderbird uses WebExtension APIs (Manifest V3 is current as of 2025)
- Extensions are packaged as .xpi files (ZIP archives)
- Basic structure: manifest.json + background scripts + optional UI components
- Reference: https://developer.thunderbird.net/add-ons/mailextensions

### 2. Relevant APIs

#### Compose API
- **Purpose**: Manipulate compose windows and message composition
- **Key method**: `compose.setComposeDetails()` - modify compose details including from address
- **Key event**: `compose.onBeforeSend` - fires before message is sent, allows modification or cancellation
- **Important**: `ComposeDetails.from` overrides the From header but doesn't change the identity
- **Warning**: Many servers reject emails where From header doesn't match sender identity
- **Reference**: https://webextension-api.thunderbird.net/en/mv3/compose.html

#### Messages API
- **Purpose**: Access message data including headers and recipients
- **Key methods**:
  - `messages.getFull()` - get full message with all headers and MIME parts
  - Access to `to`, `cc`, `bcc` recipients
- **Permissions needed**: `messagesRead`
- **Reference**: https://webextension-api.thunderbird.net/en/mv3/messages.html

#### Compose Detection
- `ComposeDetails.relatedMessageId` - identifies if message is reply/forward/draft
- If undefined = new message
- If present = reply, forward, or draft of existing message

#### Identities API
- **Purpose**: Access user's configured email identities
- **Key method**: `identities.list()` - get all identities or for specific account
- **MailIdentity properties**:
  - `email` - the email address for this identity
  - `name` - display name
  - `accountId` - parent account
- **Permissions needed**: `accountsRead`
- **Use case**: Extract all configured identity email addresses to build pattern matching
- **Reference**: https://webextension-api.thunderbird.net/en/mv3/identities.html

### 3. Plus-Addressing Pattern
- Format: `user+alias@posteo.de`
- Main address: `user@posteo.de`
- Alias examples: `user+shopping@posteo.de`, `user+newsletters@posteo.de`
- Pattern: Everything between `+` and `@` is the alias

### 4. Extension Structure
```
my-extension/
├── manifest.json          # Extension metadata and permissions
├── background.js          # Background script (event handlers)
├── icons/                 # Extension icons (optional)
└── _locales/             # Internationalization (optional)
```

### 5. Existing Extensions Doing Similar Things

#### Custom Sender Address and Reply (Cusedar)
- **URL**: https://addons.thunderbird.net/en-US/thunderbird/addon/custom-sender-address-reply/
- **Description**: Checks To-address of received mail, uses regex match to set From-address in reply
- **Status**: Active extension

#### Reply As Original Recipient
- **URL**: https://addons.thunderbird.net/en-US/thunderbird/addon/reply-as-original-recipient/
- **GitHub**: https://github.com/qiqitori/reply_as_original_recipient
- **Description**: Auto-changes From field to match original To/CC if pattern matches
- **Pattern Support**: Configurable, specifically supports + in email addresses
- **Status**: v1.0 from 2018, may need updating for modern Thunderbird

## Key Findings

1. **Setting From Address**:
   - Can use `ComposeDetails.from` property via `compose.setComposeDetails()`
   - This overrides the header but doesn't change the identity
   - Server compatibility: Posteo.de should accept this since alias is valid for the account

2. **Detecting Replies**:
   - Use `ComposeDetails.relatedMessageId` to identify if composing a reply
   - If present, it's a reply/forward/draft; if undefined, it's new

3. **Getting Original Recipient**:
   - Use `messages.get()` or `messages.getFull()` with the `relatedMessageId`
   - Access `to` and `cc` fields from the MessageHeader
   - Parse for plus-addressing pattern

4. **Implementation Approach**:
   - Listen to compose window events (could use `compose.onBeforeSend` or earlier)
   - When reply detected, fetch original message
   - Extract recipient addresses
   - Find address matching user+alias@posteo.de pattern
   - Set as From address if found

## Open Questions

### Answered:
- ✅ Does Thunderbird require creating separate identities for each alias?
  - **No**, we can override the From header directly
- ✅ What's the best event to hook into for detecting replies?
  - **`compose.onBeforeSend`** or potentially an earlier compose event

### Still Open:
- Should we use `onBeforeSend` or is there an earlier event to set From address?

### User Decisions Made:
- ✅ Work with any domain that has + pattern (not just posteo.de)
- ✅ Support Reply, Reply All, AND Forward
- ✅ Use Thunderbird's configured identities to determine valid patterns
- ✅ Multiple matches: User wants configurable pattern OR extract from identities
- ✅ **NEW FEATURE**: Alias suggestion for ALL emails
  - Optional (disabled by default per account)
  - **Configured per account** - enable/disable independently for each email address
  - **Triggers on ANY composition**: new, reply, reply all, forward
  - **Works with Feature 1**: Feature 1 auto-detects first (for replies/forwards), Feature 2 only prompts if no alias was found
  - Prompt user when composing from base address
  - Ask if they want to use an alias instead
  - Include "don't ask again for this recipient" option
  - "Don't ask again" list is also per-account

## Proposed Smart Solution

**Approach**: Extract base addresses from all configured identities, then auto-detect aliases

1. On extension load, get all identities via `identities.list()`
2. Extract email addresses from each identity (these are the BASE addresses)
3. When replying/forwarding:
   - Get original recipient addresses from To/CC
   - For each recipient that contains `+`:
     - Strip the alias to get base address (e.g., `user+shopping@posteo.de` → `user@posteo.de`)
     - Check if this base matches any configured identity
     - If YES: Use the FULL aliased address (e.g., `user+shopping@posteo.de`) as From
4. This works automatically with user's existing identity configuration!

**Example**:
- Identity configured: `user@posteo.de` (no alias)
- Email received at: `user+shopping@posteo.de`
- Reply From will be: `user+shopping@posteo.de` ✓

**Benefits**:
- No manual configuration needed - just configure base addresses
- Don't need to create identities for every alias
- Works with multiple accounts
- Respects user's existing Thunderbird setup
- Automatically supports any domain the user has configured
- Dynamic - works with any alias pattern automatically
