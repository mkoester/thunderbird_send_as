# Instructions for Claude Code

This document contains important instructions for Claude Code when working on this project.

## Workflow

**CRITICAL:** If the `planning-with-files` skill is available, ALWAYS use it for complex tasks, multi-step projects, or any work that requires planning and progress tracking. This skill helps maintain structured planning files and ensures nothing is missed.

## Building the Extension

**IMPORTANT:** Always use the `./build.sh` script to create XPI files. Never use manual `zip` commands.

The build script:
- Automatically extracts the version from `manifest.json`
- Applies git-based versioning rules:
  - On `main` branch with no changes: uses manifest version (e.g., `1.0.2`)
  - On other branches: adds commit hash (e.g., `1.0.2-76abf97`)
  - With uncommitted changes: adds `-SNAPSHOT` suffix (e.g., `1.0.2-SNAPSHOT` or `1.0.2-76abf97-SNAPSHOT`)
- Outputs XPI to parent directory: `../send-as-alias-{version}.xpi`
- Shows git status information during build

### Usage

```bash
./build.sh
```

## Project Structure

- `manifest.json` - Extension metadata and version (single source of truth for version)
- `background.js` - Main extension logic (event handling, features 1-3 orchestration)
- `shared/alias-utils.js` - Pure alias/email helpers (`extractEmail`, `extractDomain`, `extractBase`, `matchesBase`, `aliasNamePart`). Loaded as a plain script **before** `background.js` (manifest `background.scripts` order, attaches to `globalThis`) and `require()`d by the unit tests under Node
- `tests/alias-utils.test.js` - Unit tests (`node --test tests/*.test.js`, run automatically by `build.sh` before packaging)
- `popup/` - HTML/JS for user-facing dialogs (alias prompt, identity creation)
- `options/` - Settings page UI
- `icons/` - Extension icons (48x48, 96x96)
- `build.sh` - Build script (use this!) — runs the tests, then packages
- `LICENSE` - GPL-3.0 license
- `README.md` - User documentation
- `INSTALL.md` - Installation guide
- `DESIGN_OWN_DOMAIN.md` - Current technical specification (alias methods)
- `WAYLAND.md` - Configuration guide for Wayland window managers
- `docs/archive/` - Historical plan/design/debug docs (superseded; kept for reference)
- `CLAUDE.md` - This file

## Architecture notes (2026-07-03 fixes)

- **Feature 3 is method-aware.** The base identity for a used alias is carried
  through `handleCompose` (`usedIdentity`/`usedMethod`) instead of being re-derived
  by string-splitting on `+` — the old parsing crashed for own-domain/catchall
  aliases (no `+` present). `aliasNamePart(aliasEmail, method)` produces the
  human alias name for identity naming, and the identity-prompt popup receives it
  as a URL parameter instead of re-parsing the email.
- **Prompt popups can't hang the compose flow.** Pending prompt resolvers live in
  a `Map` keyed by popup window id (concurrent compose windows stay independent);
  `windows.onRemoved` resolves an unanswered prompt as `{ cancelled: true }`
  (treated as "skip"). Popups send their response **before** calling
  `window.close()`.
- `processedComposeTabs` entries are dropped on `tabs.onRemoved` (tab ids can be
  reused).

## Important Notes

### Window Titles
- All popup windows should have titles starting with "Send As Alias - "
- This is set in the HTML `<title>` tags, NOT via `titlePreface` parameter
- The WebExtension API doesn't allow setting window titles before HTML loads

### Wayland Compatibility
- Extension popups appear as full windows on Wayland tiling WMs
- Users must configure their WM to float these windows
- See `WAYLAND.md` for configuration examples
- niri has special limitations (only checks rules at window creation time)

### Version Requirements
- Minimum Thunderbird version: 128.0
- Manifest V3 required for add-on store submission
- This is documented in `README.md` Requirements section

### Git Workflow
- Main branch: `main` (not `master`)
- Version bumps happen in `manifest.json`
- Build script automatically handles dev/snapshot versioning

### Branch Naming Convention (Git Flow)
Follow git flow conventions for branch naming:

- **Feature branches**: `feature/description`
  - Example: `feature/add-dark-mode`, `feature/reply-to-all`
  - For new features and enhancements

- **Bugfix branches**: `bugfix/description`
  - Example: `bugfix/identity-creation-error`, `bugfix/alias-parsing`
  - For fixing bugs in development

- **Hotfix branches**: `hotfix/description`
  - Example: `hotfix/critical-crash`, `hotfix/security-fix`
  - For urgent fixes to production/main branch

- **Release branches**: `release/version`
  - Example: `release/1.0.3`, `release/2.0.0`
  - For preparing releases

- **Development branch**: `develop` (optional)
  - Integration branch for features before merging to main

## Common Tasks

### Creating a Release Build
1. Ensure you're on `main` branch
2. Update version in `manifest.json`
3. Commit all changes
4. Run `./build.sh`
5. XPI will be in parent directory with clean version number

### Creating a Development Build
1. Make your changes
2. Run `./build.sh`
3. XPI will have `-SNAPSHOT` or commit hash suffix

### Publishing to Add-on Store
1. Create clean release build (see above)
2. Upload XPI to https://addons.thunderbird.net
3. Ensure all documentation is up to date
