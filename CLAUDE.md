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
- `background.js` - Main extension logic
- `popup/` - HTML/JS for user-facing dialogs (alias prompt, identity creation)
- `options/` - Settings page UI
- `icons/` - Extension icons (48x48, 96x96)
- `build.sh` - Build script (use this!)
- `LICENSE` - GPL-3.0 license
- `README.md` - User documentation
- `WAYLAND.md` - Configuration guide for Wayland window managers
- `CLAUDE.md` - This file

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
