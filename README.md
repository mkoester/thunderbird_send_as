# Send As Alias - Thunderbird Extension

Automatically manage email aliases with support for multiple alias methods:
- **Plus-addressing**: `user+alias@domain.com` (Gmail, Posteo, etc.)
- **Own domain**: `alias@yourdomain.com` (domains you own)
- **Catchall**: `anything@yourdomain.com` (domains with catchall forwarding)

## Features

### Feature 1: Auto-Reply with Alias 📧 Per-Account (Opt-In)

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

---

### Feature 2: Alias Suggestion 📝 Per-Account (Optional)

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

**Configuration:** Enable per account in extension settings (requires Feature 1 to be enabled)

**Benefits:**
- Never accidentally expose your base address
- Create aliases on-the-fly
- "Don't ask again" for specific recipients

---

### Feature 3: Auto-Create Identity 🆕 Optional (Enabled by Default)

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

### From Source (Development)

1. Clone or download this repository
2. Open Thunderbird
3. Go to Tools → Add-ons and Themes (or press Ctrl+Shift+A)
4. Click the gear icon → "Debug Add-ons"
5. Click "Load Temporary Add-on"
6. Navigate to the extension directory and select `manifest.json`

### Building for Distribution

```bash
# Create XPI file
cd thunderbird_send_as
zip -r ../send-as-alias.xpi * -x ".*" -x "*.md" -x "DESIGN.md" -x "notes.md" -x "task_plan.md" -x "FEATURES.md"
```

Then install the `.xpi` file in Thunderbird.

---

## Configuration

### Per-Account Settings (Features 1 & 2)

1. Open extension settings (Tools → Add-ons → Send As Alias → Preferences)
2. For each email account/identity:
   - **Enable Auto-Reply**: Check to enable Feature 1
   - **Alias Method**: Choose your alias type:
     - **Plus-addressing**: `user+alias@domain.com` (Gmail, Posteo, etc.)
     - **Own domain**: `alias@yourdomain.com` (for domains you own)
     - **Own domain with catchall**: `anything@yourdomain.com` (catchall enabled)
   - **Enable Alias Suggestion**: Check to enable Feature 2 prompts

**Important Notes:**
- Feature 1 must be enabled before Feature 2 can be used
- Only ONE identity per domain can use "own domain" methods (conflict protection)
- Settings are preserved when features are disabled

### Global Settings (Feature 3)

1. Open extension settings
2. Under "Feature 3: Auto-Create Identity"
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
2. **Matches aliases** based on the configured method:
   - Plus-addressing: Strips `+alias` and compares to base
   - Own domain: Compares domain names
3. **Per-account configuration** lets you use different methods for different accounts

---

## Privacy

- All processing done locally in Thunderbird
- No data sent to external servers
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
- **`accountsIdentities`**: Create new identities (Feature 3)
- **`messagesRead`**: Read original message recipients
- **`compose`**: Modify From address in compose window
- **`storage`**: Save your settings and preferences

---

## Troubleshooting

### Feature 1 isn't working

**For plus-addressing:**
- Check that you have the base address configured as an identity in Thunderbird
- Example: For `user+shop@domain.com` to work, you need `user@domain.com` as an identity
- Ensure Feature 1 is **enabled** for that account in settings

**For own domain:**
- Verify Feature 1 is enabled for the account
- Check that the alias method is set correctly (own domain or catchall)
- Ensure only ONE identity per domain is using own-domain methods
- If you see a "Domain conflict" warning, disable Feature 1 for other identities with the same domain

**General:**
- Reload the extension or restart Thunderbird
- Enable debug logging in settings and check the Browser Console (Ctrl+Shift+J)

### Feature 2 prompts aren't showing

- Check that Feature 1 is enabled (Feature 2 requires Feature 1)
- Verify Feature 2 is enabled for the specific account in settings
- Make sure you're composing from a base address:
  - Plus-addressing: From address without `+` (e.g., `user@domain.com`)
  - Own domain: From address matching your configured identity
- Check the "Don't ask again" list isn't blocking the recipient

### Feature 3 isn't creating identities

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
├── options/
│   ├── options.html           # Settings UI
│   └── options.js             # Settings logic
├── popup/
│   ├── alias-prompt.html      # Alias suggestion popup
│   ├── alias-prompt.js        # Alias prompt logic
│   ├── identity-prompt.html   # Identity creation popup
│   └── identity-prompt.js     # Identity creation logic
├── icons/                     # Extension icons
├── README.md                  # This file
├── DESIGN_OWN_DOMAIN.md       # Technical specification
└── WAYLAND.md                 # Wayland configuration guide
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

Built with the Thunderbird WebExtension API.

Icon created with https://deepai.org/machine-learning-model/text2img using this prompt:

```
I wrote a thunderbird extension for which I need icons now. I need two versions with the dimensions 48x48 pixels and 96x96 pixels.

The theme of the extensions are email address aliases.
When thinking about aliases, spies come to mind. Maybe in black/white.
```
