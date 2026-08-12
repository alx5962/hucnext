---
name: gear
description: Triggers the /gear workflow by starting the geargfx MCP server and visually verifying all subsequent updates in pce-studio with screenshots of the changes.
---

# Gear Skill Instructions (PCE-Studio Only)

When the `/gear` skill or `/gear` command is invoked:

1. **Instant Screenshot & Visual Feedback**:
   Run the dedicated runner script immediately in a single step (working directory: `c:\workspace\git\hucnext\pce-studio`):
   ```powershell
   node scripts/run-gear.js "<appDataDir>\brain\<conversation-id>\geargfx_preview.png" 60
   ```

2. **If ROM Build Needed**:
   If code changes were made or `build_tmp/main.pce` does not exist, run `npm run build:pce` prior to running `run-gear.js`.

3. **Display Image**:
   Embed and display the preview image immediately in your output:
   `![Geargrafx Preview](file:///<appDataDir>/brain/<conversation-id>/geargfx_preview.png)`

4. **Automatic Post-Update Verification**:
   For any subsequent code modification or build task during the session, automatically execute `node scripts/run-gear.js "<appDataDir>\brain\<conversation-id>\geargfx_preview.png" 60` and show the updated screenshot.
