# Agent Canvas Components

Date: 2026-06-30

## Current Surface

The first UI integration is a local Agent Canvas workbench. It is not a landing page and not yet a drag-and-drop editor. It connects the existing runtime loop:

User Prompt -> Engine Selector -> Workflow/Group Definition -> Agent Runtime -> Event Log -> Trace/Artifact view.

## Visual Direction

- Structure follows `mockups/v3`: left navigation/config, a large coding workspace, tab-like view switching, and a right inspection rail.
- Color and type borrow from `mockups/v1`: warm pale canvas background, slightly larger readable typography, quiet cream surfaces, and black primary actions.
- UI density should feel like a coding tool: compact enough for repeated use, but not cramped.

## Components

### App Sidebar

Purpose: task history and workspace-level navigation.

States:
- default: shows New Task, Skills, Automation, recent local runs.
- active: selected run uses a warm muted background and bold label.
- empty: history list shows a short local-only empty state.
- error: API failures appear in the task composer error area.

### Task Composer

Purpose: submit a local runtime task without needing CLI commands.

Fields:
- prompt textarea
- engine selector: `fake` or `opencode`
- workflow path input
- multi-agent group path input
- config path input
- OpenCode permission toggles for edit, shell, network
- timeout and max-node numeric inputs

States:
- default: fake engine, example config/group paths populated.
- loading: Run button disabled and labelled as running.
- error: failed POST response rendered above run metadata.
- disabled: OpenCode-specific controls remain visible but explanatory through labels, not hidden.

### Canvas Observer

Purpose: show execution meaning, not decorative graph art.

Each node card should map to a workflow node or strategy:
- role/node id
- current status
- selected route/model when available
- tool/permission hints
- cost estimate when available

Edges are static in v0.1 and derived from workflow/group defaults or observed event order.

### Trace Timeline

Purpose: chronological debug surface.

Events show:
- event type
- status/decision badge
- short summary
- node id when present

Filters:
- all events
- event type select
- tab switch between Canvas and Trace

### Inspector Rail

Purpose: selected event JSON plus generated outputs.

Sections:
- selected event detail
- artifacts and patch summaries
- run stats

Patch/artifact actions are not in this UI pass; lifecycle commands stay in CLI for now.
