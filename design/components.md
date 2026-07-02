# Agent Canvas Components

Date: 2026-07-02

## Current Surface

The first product-facing UI follows the uploaded four-page prototype:

- Dialog initial state
- Dialog result state
- Dialog with details drawer
- Agent Canvas configuration page

The default product surface is the dialog, not the Canvas. Canvas and trace are secondary details.

Runtime loop:

User Prompt -> Agent Pack Selector -> Local Run API -> Event Log -> Chinese Result Summary -> Optional Details Drawer.

## Visual Direction

- Minimal Chinese interface.
- No fake navigation such as Skills or Automation.
- The prompt input is always visible at the bottom of the viewport.
- Agent Pack selection stays near the composer.
- Model/runtime settings live behind a settings button.
- Trace and Artifacts live in a right-side drawer opened from result cards.

## Components

### Header

Purpose: show product name and current project path.

States:
- default: `Agent Canvas / current project`.
- detail open: unchanged; drawer is the visual state change.

### Slim Rail

Purpose: small utility rail only.

Allowed actions:
- refresh local runs.
- open recent run list when implemented.

Do not add fake product areas.

### Chat Surface

Purpose: primary daily-use interface.

States:
- initial: centered "开始工作" block with 2-3 task chips.
- running: user prompt plus a compact running status.
- completed: user prompt plus concise Chinese result summary.
- error: user prompt plus visible error message.

### Composer

Purpose: always-available task entry.

Elements:
- Agent Pack selector.
- settings button.
- prompt input.
- send button.

The composer is fixed in the visible bottom row and must never require manual scrolling.

### Model Settings

Purpose: keep runtime options out of the main page.

Fields:
- engine: fake/opencode.
- config path.
- OpenCode edit/shell/network permissions.
- timeout.
- max OpenCode nodes.

States:
- closed by default.
- open as a small popover near the composer.

### Result Card

Purpose: summarize the run without exposing raw trace.

Content:
- completion title.
- short bullets based on events/artifacts.
- status, event count, artifact count, cost.
- "查看详情" button.

### Details Drawer

Purpose: secondary debugging and inspection.

Tabs:
- Trace: readable execution steps.
- Artifacts: generated artifacts and patch summaries.

The drawer opens only after the user asks for details.

### Agent Canvas Configuration

Purpose: future secondary page for editing Agent Packs.

This is not the default page in v0.1. It can be reached later from model settings.
