# Wayland Tiling Window Manager Configuration

When using Send As Alias with Wayland-based tiling window managers, the extension's popup dialogs may appear as full tiled windows instead of floating popups. This is because the WebExtension API doesn't provide low-level control over Wayland window types.

This document provides configuration examples to make the popups float properly.

---

## Why This Happens

- The WebExtension `windows.create()` API with `type: 'popup'` is a hint for the browser
- On Wayland, there's no standardized "popup" window type hint that all compositors respect
- Thunderbird creates these windows as regular toplevels (`xdg_toplevel`) from the compositor's perspective
- Each window manager interprets and handles windows differently

**This cannot be fixed in the extension code** - you must configure your window manager.

---

## Sway Configuration

Add to `~/.config/sway/config`:

```sway
# Send As Alias extension popups
for_window [app_id="thunderbird" title="^Send As Alias - "] floating enable, resize set 550 300
```

If you want more specific rules for each popup type:

```sway
# Alias suggestion popup (Feature 2)
for_window [app_id="thunderbird" title="^Send As Alias - Use Alias\?"] floating enable, resize set 550 300

# Identity creation popup (Feature 3)
for_window [app_id="thunderbird" title="^Send As Alias - Create Identity\?"] floating enable, resize set 550 300
```

After adding these rules, reload Sway:

```bash
swaymsg reload
```

### Optional: Center the popups

```sway
for_window [app_id="thunderbird" title="^Send As Alias - "] floating enable, resize set 550 300, move position center
```

---

## Mango (River Fork) Configuration

Mango uses River's configuration system. Add to `~/.config/mango/init`:

```bash
# Send As Alias extension popups
mangoctl rule-add -app-id 'thunderbird' -title '^Send As Alias - ' float
mangoctl rule-add -app-id 'thunderbird' -title '^Send As Alias - ' dimensions 550 300
```

Or if using River directly (`~/.config/river/init`):

```bash
# Send As Alias extension popups
riverctl rule-add -app-id 'thunderbird' -title '^Send As Alias - ' float
riverctl rule-add -app-id 'thunderbird' -title '^Send As Alias - ' dimensions 550 300
```

After modifying the config, restart Mango/River.

---

## Hyprland Configuration

Add to `~/.config/hyprland/hyprland.conf`:

```conf
# Send As Alias extension popups
windowrulev2 = float, class:^(thunderbird)$, title:^Send As Alias -
windowrulev2 = size 550 300, class:^(thunderbird)$, title:^Send As Alias -
windowrulev2 = center, class:^(thunderbird)$, title:^Send As Alias -
```

Reload Hyprland config:

```bash
hyprctl reload
```

---

## i3 Configuration (X11, but commonly used)

While i3 runs on X11, many users transition between i3 and Sway. Add to `~/.config/i3/config`:

```i3
# Send As Alias extension popups
for_window [class="thunderbird" title="^Send As Alias - "] floating enable, resize set 550 300, move position center
```

Reload i3:

```bash
i3-msg reload
```

---

## Wayfire Configuration

Add to `~/.config/wayfire.ini`:

```ini
[window-rules]
thunderbird_send_as_alias = app_id is "thunderbird" & title contains "Send As Alias - " | set floating true | set geometry 550 300
```

---

## niri Configuration

⚠️ **Known Issue**: niri only evaluates window rules at window creation time, but Thunderbird extension popups are created with the title "Mozilla Thunderbird" and only update to "Send As Alias - ..." after the HTML loads. This means title-based rules won't work.

**Workaround Options:**

### Option 1: Float all Thunderbird popups (Recommended)
```kdl
window-rule {
    match app-id="^thunderbird$"
    default-floating true
}
```

This will float all Thunderbird windows. You may want to be more selective if this affects your main Thunderbird window.

### Option 2: Use size-based matching (if supported in future)
If niri adds support for size-based rules, you could use:
```kdl
window-rule {
    match app-id="^thunderbird$" initial-width=550
    default-floating true
}
```

### Option 3: Manually float when needed
Use niri's keybindings to manually toggle floating for the popup windows when they appear.

**Note**: This is a limitation of the WebExtension API - there's no way for the extension to set window properties that Wayland compositors can read before the HTML loads.

---

## Testing Your Configuration

1. Restart or reload your window manager after adding the rules
2. Open Thunderbird
3. Trigger a popup (e.g., compose a new email if Feature 2 is enabled)
4. The popup should now appear as a floating window

---

## Debugging Window Properties

If the rules don't work, verify the window properties:

### For Sway/i3:

```bash
swaymsg -t get_tree | grep -A 10 "Send As Alias"
```

### For Hyprland:

```bash
hyprctl clients | grep -A 5 thunderbird
```

### For River/Mango:

```bash
riverctl list-outputs  # Check window titles in logs
```

Look for the exact `app_id`, `class`, and `title` values to adjust your rules.

---

## Additional Resources

- **Sway**: [Window Rules Documentation](https://man.archlinux.org/man/sway.5#CRITERIA)
- **Hyprland**: [Window Rules V2](https://wiki.hyprland.org/Configuring/Window-Rules/)
- **River**: [Rules Documentation](https://github.com/riverwm/river/blob/master/doc/river.1.scd#rules)
- **i3**: [Window Criteria](https://i3wm.org/docs/userguide.html#command_criteria)

---

## Notes

- The `^` in regex patterns means "starts with"
- The `\?` escapes the question mark in titles
- Window dimensions (550x300) are suggestions - adjust to your preference
- Some window managers may require different syntax for regex patterns

If you find a working configuration for another Wayland compositor, please contribute it to the project!
