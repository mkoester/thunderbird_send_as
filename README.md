# Send As Alias - Thunderbird Extension

Automatically manage email aliases for plus-addressing (e.g., `user+alias@domain.com`).

## Features

### Feature 1: Auto-Reply with Alias ✅ Always Active

Automatically sets your "From" address to match aliases when replying to or forwarding emails.

**Example:**
- You receive an email sent to `user+shopping@posteo.de`
- You click Reply
- Extension automatically sets From to `user+shopping@posteo.de`

**Works with:** Reply, Reply All, and Forward

**Configuration:** None needed - just works!

---

### Feature 2: Alias Suggestion 📝 Optional (Per-Account)

Prompts you to use an alias when composing emails from your base address.

**Example:**
- You start composing a new email
- Your From is set to `user@posteo.de` (base address)
- Extension prompts: "Enter an alias name to use user+ALIAS@posteo.de"
- You enter "shopping" → From becomes `user+shopping@posteo.de`

**Configuration:** Enable per account in extension settings

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

### Feature 2: Alias Suggestion

1. Open extension settings (Tools → Add-ons → Send As Alias → Preferences)
2. Under "Feature 2: Alias Suggestion"
3. Check the box next to each account where you want alias prompts
4. Use "Manage Don't Ask Again Lists" to clear exceptions

### Feature 3: Auto-Create Identity

1. Open extension settings
2. Under "Feature 3: Auto-Create Identity"
3. Uncheck to disable the feature
4. View/remove aliases in the "skip list"

---

## How It Works

### Plus-Addressing Pattern

The extension works with any email provider that supports plus-addressing:
- `user+alias@domain.com`
- Everything between `+` and `@` is the alias
- Works with: posteo.de, gmail.com, and many others

### Smart Detection

1. **Extracts base addresses** from your configured Thunderbird identities
2. **Matches aliases** by stripping the `+alias` part and comparing to base addresses
3. **No configuration needed** for Feature 1 - uses your existing Thunderbird setup!

---

## Privacy

- All processing done locally in Thunderbird
- No data sent to external servers
- Settings stored in Thunderbird's local storage
- Open source - audit the code yourself!

---

## Requirements

- Thunderbird 128.0+ (Manifest V3 extensions require this minimum version)
- Email provider that supports plus-addressing

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

- Check that you have the base address configured as an identity in Thunderbird
- Example: For `user+shop@domain.com` to work, you need `user@domain.com` as an identity
- Reload the extension or restart Thunderbird

### Feature 2 prompts aren't showing

- Check that you've enabled it for the specific account in settings
- Make sure you're composing from a base address (not an alias)
- Check the "Don't ask again" list isn't blocking the recipient

### Feature 3 isn't creating identities

- Check that the feature is enabled in settings
- Verify the alias isn't in the "skip list"
- Check Thunderbird's error console for errors

---

## Development

See [DESIGN.md](DESIGN.md) for technical specification and implementation details.

### File Structure

```
thunderbird_send_as/
├── manifest.json           # Extension metadata
├── background.js           # Main extension logic
├── options/
│   ├── options.html        # Settings UI
│   └── options.js          # Settings logic
├── icons/                  # Extension icons
├── README.md              # This file
├── DESIGN.md              # Technical specification
└── FEATURES.md            # Feature descriptions
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
