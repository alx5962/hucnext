---
name: gear
description: Enable MCP server debug mode in Geargrafx emulator for testing, state inspection, input simulation, screenshot capture, and PC Engine ROM debugging.
---

# Geargrafx MCP Server Debug Skill

Use this skill when the user runs `/gear` or requests to launch, test, or debug PC Engine ROMs using Geargrafx MCP server integration.

## Overview

Geargrafx executable location:
`C:\Emulators\Geargrafx-1.7.16-desktop-windows-x64\Geargrafx.exe`

Geargrafx supports MCP (Model Context Protocol) over stdio:
- `--headless --mcp-stdio <path_to_rom.pce>`: Headless mode for automated tests, screenshot generation, and background debugging.
- `--mcp-stdio <path_to_rom.pce>`: Interactive GUI mode with stdio MCP debug API active.

## Running MCP Debug Tasks

You can run automated debug checks using the built-in MCP client scripts in `scripts/`:

1. **Initialize and List MCP Tools**:
   ```bash
   node scripts/geargrafx-mcp-client.js build_tmp/main.pce
   ```

2. **Capture Screenshot**:
   ```bash
   node scripts/save-screenshot.js
   ```

3. **Debug Built ROM & Trace Log**:
   ```bash
   node scripts/debug-built-rom.js
   ```

4. **Test Collision & Scene Movement**:
   ```bash
   node scripts/test-collision-movement.js
   ```

## Supported MCP Server Methods

- **Protocol**: `JSON-RPC 2.0` over stdio
- **Initialization**: `initialize` (protocol version `2024-11-05`)
- **Tools List**: `tools/list`
- **Tool Calling**: `tools/call`
  - `get_trace_log`: Fetch CPU execution trace log
  - `send_input`: Simulate controller buttons (`UP`, `DOWN`, `LEFT`, `RIGHT`, `RUN`, `SELECT`, `I`, `II`)
  - `step_frame`: Step frame execution
  - `get_screenshot`: Capture PNG framebuffer
  - `read_memory`: Read RAM / VRAM addresses
  - `write_memory`: Write RAM / VRAM bytes

## Usage Instructions for `/gear`

When invoked via `/gear`:
1. Build current project ROM via `node scripts/build-pce.js`.
2. Connect to Geargrafx MCP server using `GeargrafxMCP` client (`scripts/geargrafx-mcp-client.js`).
3. Run diagnostic checks (trace logs, input response, trigger execution, or screenshot generation).
4. Report emulator status, CPU execution state, and frame capture results.
