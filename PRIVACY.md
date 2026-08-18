# Send As Alias — Privacy Policy

_Last updated: 2026-07-03_

**Send As Alias does not collect, transmit, or sell any data.** The extension makes **no network requests at all** — everything happens locally inside Thunderbird. This is also declared machine-readably in the manifest (`data_collection_permissions: { required: ["none"] }`).

## What the extension handles (locally)

- Your Thunderbird **accounts and identities** (email addresses, display names) — to detect which aliases belong to which account and to create new identities **only when you approve them** in a prompt.
- The **To/Cc headers** of a message you reply to or forward — to detect whether it was sent to one of your aliases.
- Your extension **settings** (per-account alias configuration, skip list, theme, debug flag).

## Where it is stored

Settings are stored **locally** via Thunderbird's extension storage API (`storage.local`). Identities you approve are created in your Thunderbird profile like any manually created identity. Nothing is sent to the developer or to any third party.

## What we do NOT do

- No network requests of any kind.
- No analytics or telemetry.
- No tracking or profiling.
- No advertising.
- No selling or sharing of data.
- No remotely hosted or executed code.

## Permissions

| Permission | Why |
|---|---|
| `accountsRead` | List your accounts/identities to match aliases against |
| `accountsIdentities` | Create a new identity when you approve it in the prompt |
| `messagesRead` | Read the To/Cc headers of the message you reply to |
| `compose` | Set the From address / identity of compose windows |
| `storage` | Save your settings locally |
