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

## Feature 3: Auto-Create Identity for New Aliases (Optional)

**What it does**: Automatically offers to save new aliases as Thunderbird identities when you use them for the first time.

**Examples**:

*Scenario 1: First time using an alias*
- You reply to email sent to `user+shopping@posteo.de`
- Feature 1 sets From to `user+shopping@posteo.de`
- Feature 3 prompts: "Save `user+shopping@posteo.de` as a new identity?"
- Suggested name: "John Doe (shopping)" (based on your base identity "John Doe")
- You click "Create" → New identity is saved in Thunderbird

*Scenario 2: Second time using the same alias*
- You use `user+shopping@posteo.de` again
- It's now a recognized identity in Thunderbird
- Feature 3 doesn't prompt (already exists)

*Scenario 3: Temporary alias*
- You use `user+temp123@posteo.de` for a one-time registration
- Feature 3 prompts to save as identity
- You click "Don't ask for this alias" → Never prompted again for this specific alias

**Default**: Enabled (opt-out via extension settings)

**What gets copied to the new identity:**
- Signature
- HTML compose preference
- Reply-to address
- Other compose settings from your base identity

**Why use this?**:
- Build up your identity list automatically as you use aliases
- After saving, Thunderbird natively recognizes the alias
- Can select saved aliases from Thunderbird's identity dropdown
- Keeps signature and settings consistent across aliases
- Skip feature for temporary/one-time aliases

**Settings available**:
- Enable/disable globally
- Manage list of aliases to never prompt for

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

## How Features Work Together

All three features complement each other:

1. **Feature 1** auto-detects aliases in replies/forwards
2. **Feature 2** prompts for aliases when Feature 1 doesn't apply
3. **Feature 3** offers to save frequently-used aliases as permanent identities

**Example workflow**:
1. First email to `user+shopping@posteo.de` arrives
2. You click Reply → Feature 1 sets From to `user+shopping@posteo.de`
3. Feature 3 prompts: "Save this as an identity?" → You click "Create"
4. Now `user+shopping@posteo.de` is a permanent Thunderbird identity
5. Next time you can select it directly from Thunderbird's identity dropdown

## Quick Start

1. Install the extension
2. Configure your base email address(es) in Thunderbird (you probably already have)
3. **Feature 1** works automatically - just reply to emails sent to your aliases
4. **Feature 2** (optional) - enable per account in settings if you want alias suggestions for all emails
5. **Feature 3** (enabled by default) - prompts to save new aliases as identities
