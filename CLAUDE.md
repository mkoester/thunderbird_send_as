# Instructions for Claude Code

This document contains important instructions for Claude Code when working on this project.

## Building the Extension

**IMPORTANT:** Always use the `./build.sh` script to create XPI files. Never use manual `zip` commands.

The build script:
- Automatically extracts the version from `manifest.json`
- Applies git-based versioning rules:
  - On `main` branch with no changes: uses manifest version (e.g., `1.0.2`)
  - On other branches: adds commit hash (e.g., `1.0.2-76abf97`)
  - With uncommitted changes: adds `-SNAPSHOT` suffix (e.g., `1.0.2-SNAPSHOT` or `1.0.2-76abf97-SNAPSHOT`)
- Outputs XPI to parent directory: `../send-as-alias-{version}.xpi`
- Deletes a previous XPI of the same version before zipping (fixed 2026-07-07:
  `zip` updates an existing archive in place, so entries of meanwhile-deleted
  files silently survived in the XPI)
- Shows git status information during build

### Usage

```bash
./build.sh
```

## Feature names

The three features were referred to by number during early development
("Feature 1/2/3"); renamed on 2026-07-06. Canonical names, used everywhere
(code, docs, UI):

| Old | Name | What it does | Per-account storage keys |
|---|---|---|---|
| Feature 1 | **Reply as Alias** | Sets From to the matching alias on reply/forward | `replyAsAliasEnabled` (+ `aliasMethod`) |
| Feature 2 | **Alias Suggestion** | Prompts for an alias when composing from a base address | `suggestAliasEnabled`, `suggestAliasDontAskList` |
| Feature 3 | **Identity Creation** | Offers to save a newly used alias as a Thunderbird identity | global: `offerIdentityCreation`, `skipIdentityCreation` (always had these names) |

`migrateAccountSettings` in `shared/alias-utils.js` (pure, unit-tested) renames
the old `feature1Enabled`/`feature2Enabled`/`feature2DontAskList` keys found in
existing installs' `storage.local`; `loadSettings` in `background.js` runs it
and persists when anything changed. Old feature numbers survive only in
`docs/archive/` and in `DESIGN_OWN_DOMAIN.md` (which carries a naming note).

## Project Structure

- `manifest.json` - Extension metadata and version (single source of truth for version)
- `background.js` - Main extension logic (event handling, orchestration of the three features)
- `shared/alias-utils.js` - Pure helpers (`extractEmail`, `extractDomain`, `extractBase`, `matchesBase`, `aliasNamePart`, `collectRecipientCandidates`, `displayAddress`, `migrateAccountSettings`). Loaded as a plain script **before** `background.js` (manifest `background.scripts` order, attaches to `globalThis`), also loaded by `options/options.html`, and `require()`d by the unit tests under Node
- `tests/alias-utils.test.js` - Unit tests (`node --test tests/*.test.js`, run automatically by `build.sh` before packaging)
- `popup/` - HTML/JS for user-facing dialogs (alias prompt, identity creation); `popup/prompt.css` is the stylesheet shared by both dialogs
- `options/` - Settings page UI (`options.css` holds its styles)
- `theme/` - Shared design system: `tokens.css` (color tokens, light + dark palettes) and `theme.js` (applies the stored theme)
- `icons/` - Extension icons (48x48, 96x96)
- `build.sh` - Build script (use this!) — runs the tests, then packages
- `scripts/lint` - Runs `addons-linter` (via `pnpm dlx`/`npx`) on the newest
  XPI in the parent dir (or a given path). This is the engine behind ATN's
  upload check. Known-benign baseline (documented in the script header): 6
  warnings (4× Thunderbird permissions unknown to the Firefox schemas, 2×
  `data_collection_permissions` needs FF 140 vs. our 128 floor) plus a
  `VERSION_FORMAT_INVALID` error on `-SNAPSHOT` dev builds only. Anything
  beyond that needs fixing. Allowlisted in `.claude/settings.json`
- `scripts/screenshot-ui` - Renders options + both popups to `screenshots/`
  (gitignored) in light and dark via a headless Chromium-family browser
  (`$SCREENSHOT_BROWSER` overrides autodetection); `hidden` elements are shown.
  Use it to review CSS changes without installing the XPI; allowlisted in
  `.claude/settings.json`
- `scripts/verify-ui` + `scripts/ui-verify/` - Headless functional UI checks
  (pattern ported from Bookmarks+): pages are staged to a temp dir with
  `messenger-stub.js` (fixture accounts) injected before their scripts and
  `lib.js` + a per-page driver after, rendered via chromium `--dump-dom`, and
  PASS/FAIL lines parsed from a `<pre id="verify-result">`. Covers the options
  table (row rendering, collapsed-row behavior, domain conflict, setup hint)
  and both prompt popups (param rendering, runtime response messages). Run it
  after changing page JS/HTML — synthetic events verify logic and DOM shape,
  not native gestures. **Timing gotcha**: drivers must wait for the
  `DOMContentLoaded` event itself, then poll with microtasks only — a
  `setTimeout(0)` can fire *before* DCL, and `--dump-dom` can snapshot before
  timer-parked work finishes (see `lib.js`). Allowlisted in
  `.claude/settings.json`
- `LICENSE` - GPL-3.0 license
- `PRIVACY.md` - Privacy policy (no data collection, no network requests);
  `data_collection_permissions: { required: ["none"] }` is also declared in
  `manifest.json` (inert below TB 140, honoured above)
- `README.md` - User documentation
- `INSTALL.md` - Installation guide
- `DESIGN_OWN_DOMAIN.md` - Design doc for the alias-methods rework (historical; carries a naming note mapping Feature 1/2/3 to the current names)
- `WAYLAND.md` - Configuration guide for Wayland window managers
- `docs/archive/` - Historical plan/design/debug docs (superseded; kept for reference)
- `CLAUDE.md` - This file

## Architecture notes (2026-07-03 fixes)

- **Identity Creation is method-aware.** The base identity for a used alias is carried
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
- **The identity prompt (Identity Creation) is stateless** (2026-07-03 bug fix): the
  in-memory resolver map does **not** survive MV3 event-page restarts, and a
  dropped resolver silently ate the popup's response — identity never created,
  no error. Now the popup echoes `aliasEmail`/`baseEmail`/`identityName` in its
  runtime message and `handleIdentityPromptResponse` creates the identity
  directly in the `onMessage` handler, no pending state needed. The compose
  tab id travels along so the still-open compose window can be updated.
  **Hard TB limitation** (verified in comm-esr128 source): a compose window
  cannot switch to an identity created *after* it opened — `ext-compose.js`
  resolves `identityId` against the window's identity dropdown (populated at
  window open), sets `selectedItem = undefined` when there is no menu item,
  and crashes in `LoadIdentity`; after that even plain `from` overrides crash
  (`MakeFromFieldEditable` reads `selectedItem.value`). So for the just-created
  case only the From header is overridden (with the new identity's name); that
  message is sent from the base identity, and the real identity applies from
  the next compose on via `applyAliasToCompose` (safe there: those windows
  always open after the identity already existed, so the menu item is present).
  Only the alias
  prompt (Alias Suggestion) still uses the resolver map, because its response must
  reach the compose flow awaiting it; a dropped alias response is now at least
  `errorLog`ged instead of silent.
- `processedComposeTabs` entries are dropped on `tabs.onRemoved` (tab ids can be
  reused).
- **Existing alias identities are used, not clobbered** (`applyAliasToCompose`):
  when Reply as Alias or Alias Suggestion resolves an alias that already has its own identity, the
  compose window is switched to it via `setComposeDetails({ identityId })` — so
  that identity's name/signature apply. Building the From string from the
  *base* identity's name (the old behaviour) produced mixtures like
  `Mirko Köster <it@…>` for an identity named `Mirko Köster IT`. Only when no
  identity exists yet is the From header overridden, and only then does
  Identity Creation offer to create one.
- **First-run onboarding** (issue #1): `runtime.onInstalled` (reason
  `install`) opens the options page, and the options page shows a warning-style
  setup hint (`#setupHint`, `updateSetupHint()`) while no account has
  Reply as Alias enabled — without that the extension is entirely inactive, which
  confused users ("no configuration needed" was in old docs).
- **Options table shows one row per account** — the account's *default* identity
  (`accounts.list()` + `identities.getDefault(accountId)`), not every identity.
  Rows with Reply as Alias disabled are collapsed (2026-07-07): the dependent
  controls (method radios, Suggest Alias checkbox) are hidden via the row's
  `reply-disabled` class + CSS instead of shown disabled — inert noise
  otherwise. The disabled-state logic stays underneath as a second layer, and
  the domain-conflict warning remains visible.
  Identities created by Identity Creation for aliases would otherwise flood the table.
  They stay unconfigured (settings default to disabled), so `background.js` —
  which still iterates **all** identities — skips them.

## Delivery-header detection (2026-07-06/07)

Adopted from studying the **ReplyAsOriginalRecipientUp** add-on (a user
switched to it after issue #1 feedback; credited in README):

- **Reply as Alias scans delivery headers.** `collectRecipientCandidates(headers,
  parsedRecipients, parsedCc)` (pure, in `shared/alias-utils.js`) builds the
  candidate list: `x-original-to` / `delivered-to` / `envelope-to` from the raw
  `messages.getFull()` headers first (they record the actual delivery address —
  covers BCC/mailing-list/forwarded cases where the alias isn't in To/CC), then
  the **parsed** `MessageHeader.recipients`/`.ccList` from `messages.get()`.
  The parsed lists replaced the raw `to`/`cc` header strings: a raw header can
  hold several mailboxes in one string (`To: a@b, c@d`), which `extractEmail`
  misparsed (it only found the first `<...>`).
- **Delivery headers are candidates, not commands** (design decision,
  2026-07-07): every candidate — delivery header or To/CC — must pass
  `matchesBase` against a configured identity's alias method. A separate
  RAORu-style "Original-Recipient Fallback" (blindly trusting the delivered-to
  address, with an ownership heuristic + confirmation popup) was built on
  2026-07-06 and **removed the next day** before ever being released: one
  candidate source with one uniform check is simpler and has no
  trusted-as-is path. Catch-all users get the RAORu behavior by enabling
  Reply as Alias with the catchall method. Don't reintroduce a blind path.
- **Reply as Alias is the per-account master switch** — no feature is active
  for an account without `replyAsAliasEnabled`; Alias Suggestion additionally
  has its own per-account opt-in.
- `displayAddress(recipient, fallbackName)` (pure) formats From values: keeps
  an existing display name, else prepends the identity's name — replaced the
  inline name-merging in `findMatchingAlias`.
- The account table's column headers carry `title` tooltips (dotted underline
  via `th.has-tooltip`) explaining each setting.

## UI design system (2026-07-03)

The UI design is ported from the Bookmarks+ extension (`linkding-ext` repo) and shared
across all three pages (options, alias-prompt, identity-prompt):

- **Tokens, not hardcoded colors.** All colors are CSS custom properties defined once in
  `theme/tokens.css` (light default, dark via `prefers-color-scheme`, plus pinned
  `data-theme` variants). Page stylesheets (`options/options.css`, `popup/prompt.css`)
  only reference `var(--…)` tokens — never add hex colors to page CSS; extend the token
  file in **all three blocks** (light / OS-dark / pinned-dark) instead.
- **Theme selection**: stored as a flat `theme` key (`"system"` | `"light"` | `"dark"`)
  in `messenger.storage.local`, picked in the options page "Appearance" section.
  `theme/theme.js` is loaded as the **first** script in each page's `<head>`; it pins
  `data-theme` on `<html>` for light/dark or removes the attribute for system.
- **Conventions** (match Bookmarks+): `system-ui` font, rem sizing, section `h2`s are
  uppercase + `--fg-muted` + letter-spacing, panels are `--surface` + 1px `--border` +
  6px radius, inputs/buttons on `--surface-2` with 4px radius, primary buttons on
  `--primary`/`--on-primary`. `color-scheme` is set per theme so native controls follow.
- **No inline styles in HTML** — everything lives in the linked stylesheets. JS only
  toggles `display` (status message, conflict warning), never colors.

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
- Version bumps happen in `manifest.json` — bump the patch **once, right after a release, on `develop` only** (`main`'s version changes only when a release is merged into it). No bump-per-test-build: intermediate builds are already identifiable by the hash/`-SNAPSHOT` decoration
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
2. Verify the version in `manifest.json` (it was already bumped right after the previous release)
3. Commit all changes
4. Run `./build.sh`
5. XPI will be in parent directory with clean version number
6. After the release is published: bump the patch version in `manifest.json` on `develop` (next working version; `main` keeps the released version)

### Creating a Development Build
1. Make your changes
2. Run `./build.sh`
3. XPI will have `-SNAPSHOT` or commit hash suffix

### Publishing to Add-on Store
1. Create clean release build (see above)
2. Upload XPI to https://addons.thunderbird.net
3. Ensure all documentation is up to date
