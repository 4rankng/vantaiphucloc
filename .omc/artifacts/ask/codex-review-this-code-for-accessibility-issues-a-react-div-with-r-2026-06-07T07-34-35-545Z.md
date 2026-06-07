# codex advisor artifact

- Provider: codex
- Exit code: 0
- Created at: 2026-06-07T07:34:35.546Z

## Original task

Review this code for accessibility issues: a React div with role=button that contains child action buttons

## Final prompt

Review this code for accessibility issues: a React div with role=button that contains child action buttons

## Raw output

```text
**Accessibility Review: `<div role="button">` Containing Action Buttons**

This is one of the most common — and most broken — accessibility anti-patterns. The wrapper and the children conflict on almost every axis: semantics, keyboard, focus, and events.

## Core Problem

A `role="button"` element is, by spec, an interactive widget. Nesting other interactive elements inside it is **invalid HTML** and produces an undefined accessibility tree. ATs (VoiceOver, NVDA, TalkBack) handle it inconsistently, so you cannot test your way out — you have to fix the structure.

## What Breaks (WCAG-Mapped)

- **4.1.2 Name, Role, Value** — role semantics on the wrapper and children collide. NVDA often double-announces ("button, button"); VoiceOver sometimes drops the inner buttons entirely. The accessible name becomes ambiguous.
- **2.1.1 Keyboard** — Space-key activation conflicts. Native `<button>` activates on Space *keyup*; the div handler must listen on *keydown* for parity, so two Space handlers race and one wins. Enter behaves the same way on the inner buttons, plus the div.
- **2.4.3 Focus Order** — the div needs `tabindex="0"` to be focusable, but the inner `<button>`s are tabbable too. Tab order becomes wrapper → child1 → child2 → wrapper → ... or the wrapper is skipped depending on browser. The user has no predictable path.
- **2.5.5 Target Size** — easy to miss: every inner button must independently meet 44×44 CSS px, even though the card looks like a single large target.
- **3.2.1 On Focus / On Input** — focusing the wrapper (and its visible focus ring) looks like the whole card is selected, but the user's next keypress may activate a child they can't see focused.

## Hidden Runtime Bugs

- **Double-firing**: clicking a child button also bubbles to the div's `onClick`, so actions run twice unless the child calls `e.stopPropagation()` — a code smell and a real source of bugs (form submits, optimistic updates, analytics).
- **Type-to-search skips content**: with the wrapper focusable, screen reader quick-nav modes (rotor, "skip to main") treat the whole card as one stop and the child buttons get hidden behind the wrapper's label.
- **Disabled state is your problem**: native `<button disabled>` is free; `aria-disabled` on the div does not stop child buttons from being clickable.

## The Fix

Pick one of these — do not combine them.

- **Preferred — wrapper is a container, not a button.** Drop `role="button"`, the `tabindex`, and the wrapper's `onClick`/`onKeyDown`. Use a `<div>` (or `<li>`/`<section>`) with `role="group"` and an `aria-labelledby` heading. The inner actions are real `<button>`s with their own labels. If the whole card should be clickable, use the **stretched link pattern**: one real `<a>`/`<button>` inside, made position-absolute to cover the card; child action buttons sit above it via `z-index` and call `e.stopPropagation()`.
- **If you really need a card-level primary action** with secondary actions inside, use a card where the *only* primary action is a real button at the top, and the wrapper has no role, no tabindex, no click handler. Visual "click the whole card" feel can be done with the stretched link.

Either way: never put `role="button"` on a parent of real buttons.

Want me to sketch the refactor for a specific card in this repo? If you point me at the file, I can show the exact diff.


Reading additional input from stdin...
2026-06-07T07:33:19.558615Z ERROR codex_models_manager::manager: failed to refresh available models: stream disconnected before completion: failed to decode models response: missing field `models` at line 1 column 700; body: {"object":"list","data":[{"id":"MiniMax-M3","object":"model","created":1780272000,"owned_by":"minimax"},{"id":"MiniMax-M2.7","object":"model","created":1773799200,"owned_by":"minimax"},{"id":"MiniMax-M2.7-highspeed","object":"model","created":1773799200,"owned_by":"minimax"},{"id":"MiniMax-M2.5","object":"model","created":1770948000,"owned_by":"minimax"},{"id":"MiniMax-M2.5-highspeed","object":"model","created":1770948000,"owned_by":"minimax"},{"id":"MiniMax-M2.1","object":"model","created":1766455200,"owned_by":"minimax"},{"id":"MiniMax-M2.1-highspeed","object":"model","created":1766455200,"owned_by":"minimax"},{"id":"MiniMax-M2","object":"model","created":1761530400,"owned_by":"minimax"}]}
OpenAI Codex v0.137.0
--------
workdir: /Users/dev/Documents/projects/vantaiphucloc
model: MiniMax-M3
provider: minimax
approval: never
sandbox: danger-full-access
reasoning effort: none
reasoning summaries: none
session id: 019ea100-1c47-7833-b747-6359b1b861ba
--------
user
Review this code for accessibility issues: a React div with role=button that contains child action buttons
codex
I'll load the accessibility review skill to give you a proper WCAG-grounded audit.
2026-06-07T07:33:27.714416Z ERROR codex_core::tools::router: error=unable to process image at `/Users/dev/.codex/plugins/cache/claude-cowork/design/1.2.0/skills/accessibility-review/SKILL.md`: unsupported image `text/markdown`
exec
/bin/zsh -lc 'cat /Users/dev/.codex/plugins/cache/claude-cowork/design/1.2.0/skills/accessibility-review/SKILL.md' in /Users/dev/Documents/projects/vantaiphucloc
 succeeded in 0ms:
---
name: accessibility-review
description: Run a WCAG 2.1 AA accessibility audit on a design or page. Trigger with "audit accessibility", "check a11y", "is this accessible?", or when reviewing a design for color contrast, keyboard navigation, touch target size, or screen reader behavior before handoff.
argument-hint: "<Figma URL, URL, or description>"
---

# /accessibility-review

> If you see unfamiliar placeholders or need to check which tools are connected, see [CONNECTORS.md](../../CONNECTORS.md).

Audit a design or page for WCAG 2.1 AA accessibility compliance.

## Usage

```
/accessibility-review $ARGUMENTS
```

Audit for accessibility: @$1

## WCAG 2.1 AA Quick Reference

### Perceivable
- **1.1.1** Non-text content has alt text
- **1.3.1** Info and structure conveyed semantically
- **1.4.3** Contrast ratio >= 4.5:1 (normal text), >= 3:1 (large text)
- **1.4.11** Non-text contrast >= 3:1 (UI components, graphics)

### Operable
- **2.1.1** All functionality available via keyboard
- **2.4.3** Logical focus order
- **2.4.7** Visible focus indicator
- **2.5.5** Touch target >= 44x44 CSS pixels

### Understandable
- **3.2.1** Predictable on focus (no unexpected changes)
- **3.3.1** Error identification (describe the error)
- **3.3.2** Labels or instructions for inputs

### Robust
- **4.1.2** Name, role, value for all UI components

## Common Issues

1. Insufficient color contrast
2. Missing form labels
3. No keyboard access to interactive elements
4. Missing alt text on meaningful images
5. Focus traps in modals
6. Missing ARIA landmarks
7. Auto-playing media without controls
8. Time limits without extension options

## Testing Approach

1. Automated scan (catches ~30% of issues)
2. Keyboard-only navigation
3. Screen reader testing (VoiceOver, NVDA)
4. Color contrast verification
5. Zoom to 200% — does layout break?

## Output

```markdown
## Accessibility Audit: [Design/Page Name]
**Standard:** WCAG 2.1 AA | **Date:** [Date]

### Summary
**Issues found:** [X] | **Critical:** [X] | **Major:** [X] | **Minor:** [X]

### Findings

#### Perceivable
| # | Issue | WCAG Criterion | Severity | Recommendation |
|---|-------|---------------|----------|----------------|
| 1 | [Issue] | [1.4.3 Contrast] | 🔴 Critical | [Fix] |

#### Operable
| # | Issue | WCAG Criterion | Severity | Recommendation |
|---|-------|---------------|----------|----------------|
| 1 | [Issue] | [2.1.1 Keyboard] | 🟡 Major | [Fix] |

#### Understandable
| # | Issue | WCAG Criterion | Severity | Recommendation |
|---|-------|---------------|----------|----------------|
| 1 | [Issue] | [3.3.2 Labels] | 🟢 Minor | [Fix] |

#### Robust
| # | Issue | WCAG Criterion | Severity | Recommendation |
|---|-------|---------------|----------|----------------|
| 1 | [Issue] | [4.1.2 Name, Role, Value] | 🟡 Major | [Fix] |

### Color Contrast Check
| Element | Foreground | Background | Ratio | Required | Pass? |
|---------|-----------|------------|-------|----------|-------|
| [Body text] | [color] | [color] | [X]:1 | 4.5:1 | ✅/❌ |

### Keyboard Navigation
| Element | Tab Order | Enter/Space | Escape | Arrow Keys |
|---------|-----------|-------------|--------|------------|
| [Element] | [Order] | [Behavior] | [Behavior] | [Behavior] |

### Screen Reader
| Element | Announced As | Issue |
|---------|-------------|-------|
| [Element] | [What SR says] | [Problem if any] |

### Priority Fixes
1. **[Critical fix]** — Affects [who] and blocks [what]
2. **[Major fix]** — Improves [what] for [who]
3. **[Minor fix]** — Nice to have
```

## If Connectors Available

If **~~design tool** is connected:
- Inspect color values, font sizes, and touch targets directly from Figma
- Check component ARIA roles and keyboard behavior in the design spec

If **~~project tracker** is connected:
- Create tickets for each accessibility finding with severity and WCAG criterion
- Link findings to existing accessibility remediation epics

## Tips

1. **Start with contrast and keyboard** — These catch the most common and impactful issues.
2. **Test with real assistive technology** — My audit is a great start, but manual testing with VoiceOver/NVDA catches things I can't.
3. **Prioritize by impact** — Fix issues that block users first, polish later.

codex
**Accessibility Review: `<div role="button">` Containing Action Buttons**

This is one of the most common — and most broken — accessibility anti-patterns. The wrapper and the children conflict on almost every axis: semantics, keyboard, focus, and events.

## Core Problem

A `role="button"` element is, by spec, an interactive widget. Nesting other interactive elements inside it is **invalid HTML** and produces an undefined accessibility tree. ATs (VoiceOver, NVDA, TalkBack) handle it inconsistently, so you cannot test your way out — you have to fix the structure.

## What Breaks (WCAG-Mapped)

- **4.1.2 Name, Role, Value** — role semantics on the wrapper and children collide. NVDA often double-announces ("button, button"); VoiceOver sometimes drops the inner buttons entirely. The accessible name becomes ambiguous.
- **2.1.1 Keyboard** — Space-key activation conflicts. Native `<button>` activates on Space *keyup*; the div handler must listen on *keydown* for parity, so two Space handlers race and one wins. Enter behaves the same way on the inner buttons, plus the div.
- **2.4.3 Focus Order** — the div needs `tabindex="0"` to be focusable, but the inner `<button>`s are tabbable too. Tab order becomes wrapper → child1 → child2 → wrapper → ... or the wrapper is skipped depending on browser. The user has no predictable path.
- **2.5.5 Target Size** — easy to miss: every inner button must independently meet 44×44 CSS px, even though the card looks like a single large target.
- **3.2.1 On Focus / On Input** — focusing the wrapper (and its visible focus ring) looks like the whole card is selected, but the user's next keypress may activate a child they can't see focused.

## Hidden Runtime Bugs

- **Double-firing**: clicking a child button also bubbles to the div's `onClick`, so actions run twice unless the child calls `e.stopPropagation()` — a code smell and a real source of bugs (form submits, optimistic updates, analytics).
- **Type-to-search skips content**: with the wrapper focusable, screen reader quick-nav modes (rotor, "skip to main") treat the whole card as one stop and the child buttons get hidden behind the wrapper's label.
- **Disabled state is your problem**: native `<button disabled>` is free; `aria-disabled` on the div does not stop child buttons from being clickable.

## The Fix

Pick one of these — do not combine them.

- **Preferred — wrapper is a container, not a button.** Drop `role="button"`, the `tabindex`, and the wrapper's `onClick`/`onKeyDown`. Use a `<div>` (or `<li>`/`<section>`) with `role="group"` and an `aria-labelledby` heading. The inner actions are real `<button>`s with their own labels. If the whole card should be clickable, use the **stretched link pattern**: one real `<a>`/`<button>` inside, made position-absolute to cover the card; child action buttons sit above it via `z-index` and call `e.stopPropagation()`.
- **If you really need a card-level primary action** with secondary actions inside, use a card where the *only* primary action is a real button at the top, and the wrapper has no role, no tabindex, no click handler. Visual "click the whole card" feel can be done with the stretched link.

Either way: never put `role="button"` on a parent of real buttons.

Want me to sketch the refactor for a specific card in this repo? If you point me at the file, I can show the exact diff.
tokens used
3,402

```

## Concise summary

Provider completed successfully. Review the raw output for details.

## Action items

- Review the response and extract decisions you want to apply.
- Capture follow-up implementation tasks if needed.
