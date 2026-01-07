# Send As Alias - Feature Summary

This Thunderbird extension helps manage email aliases (plus-addressing) with two complementary features.

## Feature 1: Auto-Reply with Alias (Always Active)

**What it does**: Automatically matches your reply address to the alias used in the original email.

**Example**:
- You have `user@posteo.de` configured in Thunderbird
- Someone emails you at `user+shopping@posteo.de`
- You click Reply
- Extension automatically sets From to `user+shopping@posteo.de`

**Works for**:
- Reply
- Reply All
- Forward

**How it works**:
1. Extracts base addresses from your configured Thunderbird identities
2. When you reply/forward, checks if the original recipient had a `+alias`
3. If the base address (without alias) matches one of your identities, uses the full aliased address

**No configuration needed** - just works based on your existing Thunderbird identities!

---

## Feature 2: Alias Suggestion for All Emails (Optional)

**What it does**: Prompts you to consider using an alias when composing ANY email (new, reply, forward) from a base address.

**Examples**:

*Scenario 1: New email*
- You start composing a new email
- Your From address is set to `user@posteo.de` (base address)
- Extension shows a prompt: "Would you like to use an alias instead?"
- You enter "shopping" → From becomes `user+shopping@posteo.de`

*Scenario 2: Reply to email sent to base address*
- You received email at `user@posteo.de` (no alias)
- You click Reply
- Feature 1 doesn't find an alias to auto-set
- Feature 2 prompts: "Would you like to use an alias instead?"
- You can enter an alias or continue with base address

*Scenario 3: Reply to email sent to alias*
- You received email at `user+shopping@posteo.de`
- You click Reply
- Feature 1 automatically sets From to `user+shopping@posteo.de`
- Feature 2 doesn't prompt (already handled!)

**Default**: Disabled per account (opt-in via extension settings)

**Per-Account Configuration**:
- Configure independently for each email account
- Example: Enable for `work@company.com`, disable for `personal@gmail.com`
- Each account has its own "don't ask again" list

**Why use this?**:
- Privacy: Keep your base address private
- Organization: Track where emails come from
- Filtering: Create filters based on aliases
- Spam management: Disable compromised aliases
- Flexibility: Different behavior for work vs personal accounts

**Settings available**:
- Enable/disable per email account
- Manage per-account "don't ask again" lists

---

## Technical Details

**Supported patterns**:
- Any email with `+` character (user+alias@domain.com)
- Works with any domain (posteo.de, gmail.com, etc.)
- Only activates for addresses matching your configured identities

**Privacy**:
- All processing done locally
- No data sent to external servers
- Settings stored in Thunderbird's local storage

**Compatibility**:
- Thunderbird 115+
- Manifest V3 (modern WebExtension API)

---

## Use Cases

### Feature 1 Use Cases:
- Maintain conversation consistency (reply from the same alias you were contacted at)
- Professional communication (different aliases for different clients/projects)
- Privacy protection (automatically use the alias you gave to that contact)

### Feature 2 Use Cases:
- Never accidentally expose your base address
- Create new aliases on-the-fly when contacting new services
- Build a habit of using aliases for better email management

---

## Quick Start

1. Install the extension
2. Configure your base email address(es) in Thunderbird (you probably already have)
3. Feature 1 works automatically - just reply to emails sent to your aliases
4. Feature 2 is optional - enable in extension settings if you want alias suggestions
