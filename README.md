# Send As Alias - Thunderbird Extension

Automatically manage email aliases with support for multiple alias methods:
- **Plus-addressing**: `user+alias@domain.com` (Gmail, Posteo, etc.)
- **Own domain**: `alias@yourdomain.com` (domains you own)
- **Catchall**: `anything@yourdomain.com` (domains with catchall forwarding)

> **Initial setup required:** after installation the extension is inactive until
> you enable **Reply as Alias** for at least one account in the extension settings
> and select its alias method — all features are opt-in per account. The
> settings page opens automatically after installation; see
> [Configuration](#configuration).

## Features

### Reply as Alias 📧 Per-Account (Opt-In)

Automatically sets your "From" address to match aliases when replying to or forwarding emails.

**Examples:**

*Plus-addressing:*
- You receive an email sent to `user+shopping@posteo.de`
- You click Reply → From is set to `user+shopping@posteo.de`

*Own domain:*
- You receive an email sent to `sales@yourdomain.com`
- You click Reply → From is set to `sales@yourdomain.com`

**Works with:** Reply, Reply All, and Forward

**Configuration:** Enable per account in extension settings, then select your alias method (plus-addressing, own domain, or catchall)

**Detection:** The alias is looked for in the delivery headers written by the
mail server (`X-Original-To`, `Delivered-To`, `Envelope-To`) first, then in the
`To:` and `CC:` recipients — so aliases are found even when they don't appear
in `To:`/`CC:` at all (BCC, mailing lists, forwarded addresses). The delivery
headers are just another candidate source, not blindly trusted: every
candidate, wherever it came from, must match the account's alias method — an
address that isn't yours is never used.

---

### Alias Suggestion 📝 Per-Account (Optional)

Prompts you to use an alias when composing emails from your base address.

**Examples:**

*Plus-addressing:*
- You compose from `user@posteo.de`
- Extension prompts: "Enter alias name to use user+___@posteo.de"
- You enter "shopping" → From becomes `user+shopping@posteo.de`

*Own domain or catchall:*
- You compose from `info@yourdomain.com`
- Extension prompts: "Enter alias for @yourdomain.com"
- You enter "sales" → From becomes `sales@yourdomain.com`

**Configuration:** Enable per account in extension settings (requires Reply as Alias to be enabled)

**Benefits:**
- Never accidentally expose your base address
- Create aliases on-the-fly
- "Don't ask again" for specific recipients

---

### Identity Creation 🆕 Optional (Enabled by Default)

Offers to save new aliases as Thunderbird identities when you use them for the first time.

**Example:**
- You use `user+shopping@posteo.de` for the first time
- Extension prompts: "Save user+shopping@posteo.de as a new identity?"
- Suggested name: "John Doe (shopping)"
- You click Create → New identity saved with your signature and settings

**Benefits:**
- Build your identity list gradually
- New identities inherit signature, HTML mode, etc.
- After saving, Thunderbird natively recognizes the alias

---

## Installation

### From Thunderbird Add-ons (Recommended)

Install from the official add-on listing:
[addons.thunderbird.net/thunderbird/addon/send-as-alias](https://addons.thunderbird.net/thunderbird/addon/send-as-alias/)

### From Source (Development)

1. Clone or download this repository
2. Open Thunderbird
3. Go to Tools → Add-ons and Themes (or press Ctrl+Shift+A)
4. Click the gear icon → "Debug Add-ons"
5. Click "Load Temporary Add-on"
6. Navigate to the extension directory and select `manifest.json`

### Building for Distribution

```bash
./build.sh
```

The script runs the unit tests, applies git-based versioning (clean `main` →
manifest version; other branches/dirty tree get a commit-hash/`-SNAPSHOT`
suffix), and writes the XPI to the parent directory
(`../send-as-alias-<version>.xpi`). Then install the `.xpi` file in Thunderbird.

---

## Configuration

### Per-Account Settings (Reply as Alias & Alias Suggestion)

1. Open extension settings (Tools → Add-ons → Send As Alias → Preferences)
2. For each email account/identity:
   - **Enable Reply as Alias**: Check to set the From address automatically on replies/forwards
   - **Alias Method**: Choose your alias type:
     - **Plus-addressing**: `user+alias@domain.com` (Gmail, Posteo, etc.)
     - **Own domain**: `alias@yourdomain.com` (for domains you own)
     - **Own domain with catchall**: `anything@yourdomain.com` (catchall enabled)
   - **Enable Alias Suggestion**: Check to get alias prompts when composing
3. Hover the column headers for a short explanation of each setting

**Important Notes:**
- Reply as Alias is the per-account master switch: no feature works for an
  account without it (Alias Suggestion additionally has its own checkbox)
- Only ONE identity per domain can use "own domain" methods (conflict protection)
- Settings are preserved when features are disabled

### Global Settings (Identity Creation)

1. Open extension settings
2. Under "Identity Creation"
3. Uncheck to disable the feature globally
4. View/remove aliases in the "skip list"

---

## How It Works

### Alias Methods

The extension supports three alias methods (configured per-account):

#### 1. Plus-Addressing (Default)
- **Pattern**: `user+alias@domain.com`
- **Supported by**: Gmail, Posteo, Fastmail, and many others
- **How it works**:
  - Base address: `user@domain.com`
  - Aliases: `user+shopping@domain.com`, `user+work@domain.com`, etc.
  - Provider ignores everything between `+` and `@` for delivery

#### 2. Own Domain
- **Pattern**: `alias@yourdomain.com`
- **Use when**: You own a domain and create specific aliases
- **How it works**:
  - You manually create aliases at your email provider (e.g., `sales@yourdomain.com`, `support@yourdomain.com`)
  - Extension matches based on domain name
  - Each alias must exist at your provider

#### 3. Own Domain with Catchall
- **Pattern**: `anything@yourdomain.com`
- **Use when**: Your domain has catchall forwarding enabled
- **How it works**:
  - Any email to `*@yourdomain.com` reaches your mailbox
  - Extension matches based on domain name
  - No need to pre-create aliases

### Smart Detection

1. **Loads your Thunderbird identities** to know which addresses/domains you manage
2. **Collects recipient candidates** from the original message: delivery headers
   (`X-Original-To`, `Delivered-To`, `Envelope-To`) first — they record the real
   delivery address even when the alias isn't in `To:`/`CC:` — then the parsed
   `To:` and `CC:` lists
3. **Matches aliases** based on the configured method:
   - Plus-addressing: Strips `+alias` and compares to base
   - Own domain: Compares domain names
4. **Per-account configuration** lets you use different methods for different accounts

---

## Privacy

- **No data collection** — declared in the manifest
  (`data_collection_permissions: { required: ["none"] }`), see [PRIVACY.md](PRIVACY.md)
- All processing done locally in Thunderbird; the extension makes no network requests
- Settings stored in Thunderbird's local storage
- Open source - audit the code yourself!

---

## Requirements

- Thunderbird 128.0+ (Manifest V3 extensions require this minimum version)
- For **plus-addressing**: Email provider that supports it (Gmail, Posteo, Fastmail, etc.)
- For **own domain** methods: A domain you control (via registrar or email hosting)

**Note**: Thunderbird 128.0 is the minimum version required for Manifest V3 extensions. Earlier versions (115-127) had partial MV3 support but are not compatible with add-on store requirements.

**Wayland Users**: If you use a tiling window manager (Sway, Mango, Hyprland, etc.), see [WAYLAND.md](WAYLAND.md) for configuration to make popups float properly.

---

## Permissions Explained

- **`accountsRead`**: Read your configured email identities
- **`accountsIdentities`**: Create new identities (Identity Creation)
- **`messagesRead`**: Read original message recipients
- **`compose`**: Modify From address in compose window
- **`storage`**: Save your settings and preferences

---

## Troubleshooting

### Reply as Alias isn't working

**For plus-addressing:**
- Check that you have the base address configured as an identity in Thunderbird
- Example: For `user+shop@domain.com` to work, you need `user@domain.com` as an identity
- Ensure Reply as Alias is **enabled** for that account in settings

**For own domain:**
- Verify Reply as Alias is enabled for the account
- Check that the alias method is set correctly (own domain or catchall)
- Ensure only ONE identity per domain is using own-domain methods
- If you see a "Domain conflict" warning, disable Reply as Alias for other identities with the same domain

**General:**
- Reload the extension or restart Thunderbird
- Enable debug logging in settings and check the Browser Console (Ctrl+Shift+J)

### Alias Suggestion prompts aren't showing

- Check that Reply as Alias is enabled (Alias Suggestion requires it)
- Verify Alias Suggestion is enabled for the specific account in settings
- Make sure you're composing from a base address:
  - Plus-addressing: From address without `+` (e.g., `user@domain.com`)
  - Own domain: From address matching your configured identity
- Check the "Don't ask again" list isn't blocking the recipient

### Identity Creation isn't creating identities

- Check that the feature is enabled in global settings
- Verify the alias isn't in the "skip list"
- Check Thunderbird's error console (Ctrl+Shift+J) for errors

---

## Development

See [DESIGN_OWN_DOMAIN.md](DESIGN_OWN_DOMAIN.md) for technical specification and implementation details.

### File Structure

```
thunderbird_send_as/
├── manifest.json              # Extension metadata
├── background.js              # Main extension logic
├── shared/
│   └── alias-utils.js         # Pure alias/email helpers (unit-tested)
├── tests/
│   └── alias-utils.test.js    # Unit tests (node --test, run by build.sh)
├── options/
│   ├── options.html           # Settings UI
│   └── options.js             # Settings logic
├── popup/
│   ├── alias-prompt.html      # Alias suggestion popup
│   ├── alias-prompt.js        # Alias prompt logic
│   ├── identity-prompt.html   # Identity creation popup
│   └── identity-prompt.js     # Identity creation logic
├── icons/                     # Extension icons
├── build.sh                   # Build script (tests + versioned XPI)
├── README.md                  # This file
├── DESIGN_OWN_DOMAIN.md       # Technical specification
├── WAYLAND.md                 # Wayland configuration guide
└── docs/archive/              # Historical plan/design/debug notes
```

---

## Contributing

Issues and pull requests welcome!

---

## License

GPL-3.0 - See [LICENSE](LICENSE) file for details.

---

## Credits

Inspired by:
- [Custom Sender Address and Reply (Cusedar)](https://addons.thunderbird.net/thunderbird/addon/custom-sender-address-reply/)
- [Reply As Original Recipient](https://addons.thunderbird.net/thunderbird/addon/reply-as-original-recipient/)
- [ReplyAsOriginalRecipientUp](https://addons.thunderbird.net/thunderbird/addon/replyasoriginalrecipientup/) —
  its use of the `X-Original-To` header inspired the delivery-header detection
  in Reply as Alias

Built with the Thunderbird WebExtension API.

Icon created with https://deepai.org/machine-learning-model/text2img using this prompt:

```
I wrote a thunderbird extension for which I need icons now. I need two versions with the dimensions 48x48 pixels and 96x96 pixels.

The theme of the extensions are email address aliases.
When thinking about aliases, spies come to mind. Maybe in black/white.
```
