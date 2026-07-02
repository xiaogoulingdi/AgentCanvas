# Agent Canvas Components

Date: 2026-06-30

## Current Surface

The first product-facing UI is a Code Chat Shell. It should feel closer to OpenCode/Codex than to an admin workbench: the user starts with a conversation, chooses an engine or Multi-Agent Group near the composer, and only opens Canvas/Trace details when needed.

The older workbench pattern remains useful as a debugging mental model, but it should not be the default product entry.

Runtime loop:

User Prompt -> Agent Pack Selector -> Local Run API -> Event Log -> Chat Summary -> Optional Plan/Canvas/Trace/Artifact panel.

## Visual Direction

- Follow `mockups/v3` for shell layout: left navigation, top app bar, centered code-chat surface, bottom composer.
- Borrow `mockups/v1` warmth: pale canvas background, cream surfaces, larger readable type, black primary actions.
- Keep Agent Canvas visible as a product feature, but not as the first-screen dominant object.
- First-version model selection uses fixed Agent Packs instead of free-form graph editing.
- Canvas cards are configuration/observability slots, not decorative graph art.

## Components

### App Sidebar

Purpose: workspace navigation and local run history.

States:
- default: New Task, Skills, Automation, recent local runs.
- active: selected run uses a warm muted background and bold label.
- empty: shows a compact empty state.
- loading: history can refresh while a run is executing.

### Chat Surface

Purpose: primary daily-use interface for coding tasks.

Elements:
- welcome title when no run is selected.
- user/assistant message stream.
- assistant messages summarize runtime status, cost, events, and artifact count.
- compact action chips for common task types.

States:
- empty: centered title and composer.
- loading: user message stays visible, assistant bubble shows running state.
- completed: assistant bubble links the run to Plan/Canvas/Trace.
- error: assistant bubble shows the local runtime error.

### Composer

Purpose: submit a task without exposing full workflow plumbing.

Fields:
- prompt textarea.
- engine selector: `fake` or `opencode`.
- Agent Pack selector:
  - DeepSeek Solo
  - DeepSeek + Kimi
  - DeepSeek + Kimi + OpenAI
- selected pack role summary.
- Run button.

Advanced fields move into a compact right-panel Runtime section:
- config path.
- OpenCode edit/shell/network permissions.
- timeout and max-node settings.

### Agent Packs

Purpose: give users a simple, fixed model bundle before editable Canvas exists.

Built-ins:
- DeepSeek Solo: DeepSeek handles planning, coding, and review for low-cost tests.
- DeepSeek + Kimi: DeepSeek sets rules and Kimi writes code.
- DeepSeek + Kimi + OpenAI: DeepSeek sets rules, Kimi writes code, OpenAI reviews.

### Agent Group Panel

Purpose: show user-configured strategy slots before and after execution.

Cards:
- Supervisor
- Researcher
- Coder
- Reviewer

Each card shows:
- model/provider label.
- route intent.
- tool scope.
- permission scope.
- current status after a run.

### Detail Panel

Tabs:
- Plan: run summary, cost, event/artifact count.
- Canvas: compact agent cards and relationships.
- Trace: recent events and selected event JSON.
- Artifacts: generated reports/patches.

This panel is secondary. It supports understanding and debugging, but the chat remains the main surface.
