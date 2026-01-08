# Notes: Own Domain / Catchall Feature

## User Requirements (2026-01-08)

### Multiple Methods Support
- **Goal**: Support multiple alias methods simultaneously, one method per account
- **Example**:
  - `personal@posteo.de` → Plus-addressing pattern
  - `info@mydomain.com` → Own domain (catchall)
  - `work@company.com` → Own domain (pre-created aliases only)

### Settings Page Redesign

#### Current Settings Structure
- Feature 2: Per-account checkboxes to enable alias suggestion
- Feature 3: Global enable/disable + skip list

#### New Settings Structure

**Section 1: Account Management**

For each account, display:
1. **Feature 1 (Auto-reply) - Checkbox**
   - Label: "Enable auto-reply with alias"
   - Default: **Enabled** ✓
   - What it does: Auto-set From address when replying to aliased emails

2. **Alias Method - Radio Buttons** (only shown if Feature 1 enabled)
   - Three options:
     - ○ **Plus-addressing** (e.g., `user+alias@domain.com`)
     - ○ **Own domain** (e.g., `alias@yourdomain.com`)
     - ○ **Own domain with catchall** (e.g., `anything@yourdomain.com`)
   - Default: Plus-addressing
   - Only one can be selected per account

3. **Feature 2 (Alias suggestion) - Checkbox**
   - Label: "Suggest alias when composing"
   - Default: **Disabled** ☐
   - What it does: Prompt for alias when composing from base address

**Section 2: Feature 3 (Auto-create Identity)**
- Keep existing global settings
- Works the same regardless of alias method
- Enable/disable toggle
- Skip list management

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Send As Alias - Settings                                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ ACCOUNT SETTINGS                                              │
│                                                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 📧 user@posteo.de                                      │   │
│ │                                                         │   │
│ │ ☑ Enable auto-reply with alias (Feature 1)            │   │
│ │                                                         │   │
│ │   Alias method:                                        │   │
│ │   ● Plus-addressing (user+alias@posteo.de)            │   │
│ │   ○ Own domain (alias@posteo.de)                      │   │
│ │   ○ Own domain with catchall                          │   │
│ │                                                         │   │
│ │ ☐ Suggest alias when composing (Feature 2)            │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 📧 info@mydomain.com                                   │   │
│ │                                                         │   │
│ │ ☑ Enable auto-reply with alias (Feature 1)            │   │
│ │                                                         │   │
│ │   Alias method:                                        │   │
│ │   ○ Plus-addressing (info+alias@mydomain.com)         │   │
│ │   ○ Own domain (alias@mydomain.com)                   │   │
│ │   ● Own domain with catchall                          │   │
│ │                                                         │   │
│ │ ☑ Suggest alias when composing (Feature 2)            │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                               │
│ ─────────────────────────────────────────────────────────── │
│                                                               │
│ IDENTITY CREATION (Feature 3)                                │
│                                                               │
│ ☑ Offer to create identity for new aliases                  │
│                                                               │
│ [Manage Skip List] [Clear All]                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Alias Method Details

### Method 1: Plus-addressing
**Pattern**: `user+alias@domain.com`
- **Base address**: `user@domain.com`
- **Example aliases**: `user+shopping@domain.com`, `user+work@domain.com`
- **Detection**: Look for `+` in email address
- **Extraction**: Strip `+alias` part to get base
- **Feature 2 behavior**: Prompt for alias name, construct `base+{input}@domain`

### Method 2: Own domain
**Pattern**: `alias@yourdomain.com`
- **Base address**: User's configured identity email
- **Example**: Base `info@mydomain.com`, aliases `sales@mydomain.com`, `support@mydomain.com`
- **Detection**: Must match the domain of the configured identity
- **Extraction**: Everything before `@` is the alias
- **Feature 2 behavior**: Prompt for alias name, construct `{input}@yourdomain.com`
- **Limitation**: Aliases must be pre-created in email provider

### Method 3: Own domain with catchall
**Pattern**: `anything@yourdomain.com`
- **Base address**: User's configured identity email
- **Example**: Any email to `@mydomain.com` works
- **Detection**: Same domain as configured identity
- **Extraction**: Everything before `@` is the alias
- **Feature 2 behavior**: Prompt for alias name, construct `{input}@yourdomain.com`
- **Difference from Method 2**: No need to pre-create aliases, catchall accepts everything

**Note**: Methods 2 and 3 behave identically from the extension's perspective. The difference is in the email provider configuration (catchall vs. specific aliases). We keep them separate for clarity to the user.

## Data Structure

### Storage Format

```javascript
{
  // Per-account settings
  "accountSettings": {
    "account1-id": {
      "feature1Enabled": true,        // Auto-reply enabled
      "aliasMethod": "plus",          // "plus" | "own-domain" | "catchall"
      "feature2Enabled": false,       // Alias suggestion enabled
      "feature2DontAskList": []       // Recipients to skip
    },
    "account2-id": {
      "feature1Enabled": true,
      "aliasMethod": "catchall",
      "feature2Enabled": true,
      "feature2DontAskList": ["specific@email.com"]
    }
  },

  // Global Feature 3 settings (unchanged)
  "feature3Enabled": true,
  "feature3SkipList": ["user+temp@posteo.de"]
}
```

## Implementation Notes

### Account Identification
- Use Thunderbird's `accounts.list()` API
- Each account has an `id` that persists
- Map settings to account ID (not email address, in case it changes)

### Default Values
- New accounts get:
  - `feature1Enabled: true`
  - `aliasMethod: "plus"`
  - `feature2Enabled: false`
  - `feature2DontAskList: []`

### Migration
- Existing installations need migration:
  - Old: Per-account Feature 2 enabled list (just email addresses)
  - New: Per-account settings object with method
  - Default all existing accounts to "plus" method
  - Preserve Feature 2 enabled state

## Questions Answered

1. ✅ Multiple methods at once? **Yes, one per account**
2. ✅ UI design? **Per-account sections with radio buttons**
3. ✅ Feature 1 configurable? **Yes, checkbox per account**
4. ✅ Feature 2 configurable? **Yes, checkbox per account (as before)**
5. ✅ Feature 3 changes? **No, stays global**

## Questions Answered (2026-01-08 - Continued)

### 1. Base Address for Own-Domain
**Q**: What is the "base" for own-domain methods?

**A**: **Option C - The domain `@mydomain.com` is the "base"**
- Not the full email address
- Just the domain part
- Matching logic: If domain matches, treat everything before `@` as an alias

### 2. Feature 1 (Auto-reply) with Own-Domain
**Q**: Should auto-reply work with domain matching?

**A**: **Yes, if configured as "own domain" or "own domain with catchall"**
- Email sent to: `sales@mydomain.com`
- User has identity: `info@mydomain.com` (configured as "own domain")
- Extension auto-replies from: `sales@mydomain.com`
- Logic: Everything before `@` is treated as an alias

### 3. Multiple Identities on Same Domain
**Q**: What if user has multiple identities with same domain?

**A**: **User should configure only ONE identity per domain with own-domain methods**
- Example scenario:
  - `info@mydomain.com` (configured as "own domain with catchall") ✓
  - `sales@mydomain.com` (configured as "plus-addressing" or disabled) ✓
- Reason: Different identities = different outgoing servers per account
- UI validation: Warn if user tries to enable own-domain for multiple identities with same domain?

### 4. Feature 2 (Alias Suggestion) Prompt
**Q**: What should the prompt ask for own-domain methods?

**A**: **Option A - "Enter alias for @mydomain.com"**
- User composes from: `info@mydomain.com`
- Prompt: "Enter alias for @mydomain.com:"
- User types: "sales"
- Result: `sales@mydomain.com`
- No validation needed (user knows their setup)

### 5. Help Text in UI
**Q**: Should we show help text explaining the three methods?

**A**: **Yes**
- Add brief explanations below each radio button option
- Format:
  ```
  ○ Plus-addressing (user+alias@domain.com)
    └─ Supported by Gmail, Posteo, and many providers

  ○ Own domain (alias@yourdomain.com)
    └─ For domains you own with pre-created aliases

  ○ Own domain with catchall (anything@yourdomain.com)
    └─ For domains with catchall forwarding enabled
  ```

### 6. Domain Conflict Handling
**Q**: What if user tries to use own-domain for multiple identities with same domain?

**A**: **Disable other checkboxes for the same domain**
- When user selects "own domain" or "own domain with catchall" for an identity
- Automatically disable Feature 1 checkboxes for OTHER identities with the same domain
- Show a note: "Another identity is already using own-domain for @mydomain.com"
- User must disable the first one before enabling another

**Implementation**:
- Real-time validation in settings UI
- When checkbox changes, scan all identities for domain conflicts
- Disable/enable checkboxes dynamically
- Visual feedback (grayed out + tooltip explaining why)

## All Questions Answered ✅

Phase 1 requirements gathering is complete!
