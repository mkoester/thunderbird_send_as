# Send As Alias

Thunderbird MailExtension (plain JS, MV3, Thunderbird ≥ 128): replies and forwards go out from the
alias the mail was received at.

Cross-project conventions come from the OKF vault; workspace rules from `../AGENTS.md`. Project
structure, the UI design system and the full git-flow table are in `docs/design-notes.md`.

## Building

**Always use `./build.sh`; never a manual `zip`.** It reads the version from `manifest.json`,
decorates it from git state (`1.0.2` on clean `main`, `1.0.2-76abf97` off-branch, `-SNAPSHOT` when
dirty) and writes `../send-as-alias-<version>.xpi`.

**It deletes a previous XPI of the same version first, and that is load-bearing** — `zip` updates
an existing archive in place, so entries for meanwhile-deleted files silently survived into the
build.

## ⚠ Design decisions — do not revisit

- **Delivery headers are candidates, not commands.** `collectRecipientCandidates()` (pure, in
  `shared/alias-utils.js`) gathers `x-original-to` / `delivered-to` / `envelope-to` from the raw
  headers, then the **parsed** `recipients`/`ccList`. Every candidate must still pass `matchesBase`
  against a configured identity's alias method. A blindly-trusting "Original-Recipient Fallback"
  was built and **removed the next day, before release** — one candidate source with one uniform
  check has no trusted-as-is path. **Do not reintroduce a blind path**; catch-all users get that
  behaviour via the catchall method.
- **Use the parsed recipient lists, not raw `to`/`cc` header strings.** A raw header can hold
  several mailboxes in one string, which `extractEmail` misparsed by finding only the first `<…>`.
- **`replyAsAliasEnabled` is the per-account master switch** — no feature is active for an account
  without it. Alias Suggestion has an additional per-account opt-in.
- Keep pure logic in `shared/alias-utils.js`; that is what is testable.

## Platform notes

- **Window titles must be set in each popup's HTML `<title>`**, starting `"Send As Alias - "`. The
  WebExtension API cannot set them before the HTML loads, so `titlePreface` does not work.
- **Popups appear as full windows on Wayland tiling WMs** — users float them via WM rules; see
  `WAYLAND.md`. niri only evaluates rules at window-creation time.

## Releases

`main` is the default branch, not `master`. **Bump the patch version in `manifest.json` once, right
after a release, on `develop` only** — `main`'s version changes only when a release is merged in.
No bump per test build: intermediate builds are already identified by the hash/`-SNAPSHOT`
decoration. Branch naming follows standard git flow; the vault covers that.
