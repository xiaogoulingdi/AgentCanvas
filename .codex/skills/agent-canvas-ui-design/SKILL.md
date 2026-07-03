---
name: agent-canvas-ui-design
description: UI design workflow for Agent Canvas. Use when designing or implementing Agent Canvas visual surfaces such as the Code entry, Engine Selector, Canvas observer/editor, Trace panel, artifact view, model routing configuration, or any frontend UI work where design quality matters.
---

# Agent Canvas UI Design

Use this skill before implementing Agent Canvas UI surfaces.

## Design Principle

Agent Canvas is a product-layer configuration and observability surface. It should make model routing, agent roles, permissions, costs, and trace state understandable to users.

Do not treat Canvas as decorative graph art. Every node and edge should map to execution meaning.

## Phase Order

1. Canvas observer
2. Lightweight configuration
3. Drag/edit workflow builder

## Required Design Artifacts

Before implementing a new UI surface, create or update design artifacts:

```text
design/
  design-tokens.css
  components.md
  data-models.md
  wireframe.html
```

For small changes, update only the relevant artifact.

## Recommended UI Style

Agent Canvas is a coding/productivity tool, so prefer:

- quiet, dense, work-focused layouts
- restrained color
- clear hierarchy
- visible state
- compact controls
- strong scanability

Avoid:

- landing-page hero layouts
- decorative card-heavy compositions
- vague gradient backgrounds
- graph nodes that do not map to execution semantics

## Component State Matrix

Every interactive component should define:

- default
- hover
- focus
- active
- loading
- empty
- error
- disabled

## Canvas-Specific UI Requirements

Canvas should show:

- supervisor/subagent structure
- model selected per node
- route reason
- tool scope
- permission scope
- cost estimate and actual cost
- current execution status
- artifact/patch output

Future editing should allow:

- change model per node
- change route policy
- set cost limit
- set discussion max rounds
- save as custom engine

## Iteration Sequence

```text
v0.1 - Shell + navigation
v0.2 - Engine selector
v0.3 - Canvas observer
v0.4 - Trace and artifact panels
v0.5 - Edge states and responsive polish
```

## Diff-Driven Handoff

For UI changes:

1. Update design artifacts first.
2. Commit the design diff.
3. Implement the UI from the diff.
4. Verify with screenshots when a browser UI exists.

## References

- Use `docs/CANVAS_PRODUCT_LAYER.md` for Canvas product semantics.
- Use `docs/MODEL_COST_STRATEGY.md` for model routing UI.
- Use `mockups/v3/` as the current visual direction.

