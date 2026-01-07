# Installation Guide

## Quick Start

### Option 1: Load as Temporary Add-on (Development/Testing)

1. Open Thunderbird
2. Press `Ctrl+Shift+A` (or go to Tools → Add-ons and Themes)
3. Click the gear icon ⚙️ → "Debug Add-ons"
4. Click "Load Temporary Add-on..."
5. Navigate to this directory and select `manifest.json`
6. The extension is now loaded!

**Note:** Temporary add-ons are removed when Thunderbird restarts.

---

### Option 2: Install as XPI (Permanent)

#### Build the XPI file:

```bash
cd /home/mk/src/thunderbird_send_as
zip -r send-as-alias.xpi * -x ".*" -x "*.md" -x "DESIGN.md" -x "notes.md" -x "task_plan.md" -x "FEATURES.md" -x ".git/*"
```

#### Install in Thunderbird:

1. Open Thunderbird
2. Press `Ctrl+Shift+A` (Tools → Add-ons and Themes)
3. Click the gear icon ⚙️ → "Install Add-on From File..."
4. Select the `send-as-alias.xpi` file
5. Click "Add" when prompted
6. Restart Thunderbird if requested

---

## First-Time Setup

### 1. Configure Your Base Identity

Make sure you have your base email address configured in Thunderbird:

1. Go to Tools → Account Settings
2. Check that your main email address is set up
3. Example: `user@posteo.de`

The extension will automatically detect this!

### 2. Enable Feature 2 (Optional)

If you want alias suggestion prompts:

1. Go to Add-ons → Send As Alias → Preferences
2. Under "Feature 2: Alias Suggestion"
3. Check the box next to accounts where you want prompts

### 3. Configure Feature 3 (Optional)

Feature 3 (Auto-Create Identity) is enabled by default.

To disable it:
1. Go to Add-ons → Send As Alias → Preferences
2. Under "Feature 3: Auto-Create Identity"
3. Uncheck "Prompt to create identity for new aliases"

---

## Verify Installation

### Test Feature 1 (Auto-Reply):

1. Send yourself a test email to `youremail+test@domain.com`
2. Reply to that email
3. Check the From address - it should be `youremail+test@domain.com`

### Test Feature 2 (Alias Suggestion):

1. Enable it for your account in settings
2. Compose a new email
3. You should see a prompt asking if you want to use an alias

### Test Feature 3 (Identity Creation):

1. Use an alias for the first time (via Feature 1 or 2)
2. You should see a prompt to save it as an identity
3. Check Tools → Account Settings → [Your Account] to see the new identity

---

## Uninstallation

1. Go to Add-ons (Ctrl+Shift+A)
2. Find "Send As Alias"
3. Click the three dots → Remove
4. Confirm removal

**Note:** This will remove the extension but NOT the identities you created with Feature 3.

---

## Troubleshooting Installation

### "This add-on could not be installed"

- Make sure you're using Thunderbird 115 or later
- Check that the `manifest.json` file is valid JSON
- Try loading as a temporary add-on first

### Extension not appearing in add-ons list

- Restart Thunderbird
- Check Tools → Add-ons → Extensions tab
- Look for "Send As Alias"

### Settings page not opening

- Right-click the extension → "Preferences"
- Or go to Tools → Add-ons → Send As Alias → Preferences button

---

## Next Steps

After installation, check out:
- [README.md](README.md) - Feature overview and usage
- [FEATURES.md](FEATURES.md) - Detailed feature descriptions
- Extension settings page - Configure per your preferences

Enjoy managing your email aliases! 📧
