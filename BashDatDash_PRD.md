# Product Requirements Document (PRD)

**Project:** BashDatDash (Chrome Extension)  
**Date:** June 21, 2025  
**Owner:** Jason Brown

---

## 1. Overview

BashDatDash is a lightweight Chrome extension that replaces em-dashes (U+2014) and en-dashes (U+2013) in ChatGPT responses with a user-selected character or string (default: comma + space). The extension runs on chat.openai.com, intercepts streaming text via a MutationObserver, and optionally adjusts clipboard content on copy events. Users can enable or disable the feature, choose which dash types to target, and select replacement text via a simple popup UI.

---

## 2. Objectives

- Deliver zero-config "install-and-forget" experience for replacing dashes in ChatGPT replies  
- Minimize runtime overhead when disabled (no observer, no text walking)  
- Provide basic customization options (dash type, replacement string) in a compact popup  
- Ensure compatibility across platforms (Windows, macOS, Linux) and Chrome profiles via `chrome.storage.sync`

---

## 3. Guiding Principles

### 3.1 Zero Overhead When Disabled
- The extension should consume no measurable runtime resources when turned off.
- No observers, listeners, DOM scanning, or memory footprint beyond initial boot check.

### 3.2 Focused Scope
- Build for one purpose: replacing dash characters in ChatGPT output.
- Avoid feature creep. Future flexibility can be added with config options, not clutter.

### 3.3 Simple, Predictable UX
- Users should immediately understand what the extension does and how to control it.
- Default settings should be safe and helpful without requiring configuration.

### 3.4 Privacy First
- No user data is tracked, collected, stored, or transmitted beyond settings in `chrome.storage.sync`.
- Clipboard interception is performed locally and does not capture usage.

### 3.5 Resilient to Change
- Code must gracefully handle DOM changes on ChatGPT’s site.
- Use selectors that fail silently and include fallback logic.

### 3.6 Small, Fast, Lightweight
- Load quickly. Run lean. Script should be small enough to audit manually.
- Avoid unnecessary dependencies or frameworks.

### 3.7 Respectful Integration
- Do not interfere with ChatGPT functionality, styling, or inputs.
- Never affect user input areas or keyboard shortcuts.

### 3.8 Maintainable Codebase
- Clear, modular, well-commented code.
- Comments should explain intent ("why") not just implementation ("what").

---

## 4. Scope

**In-Scope:**
- Content script targeting `https://chat.openai.com/*`
- On-page dash replacement (streaming and initial sweep)
- Clipboard interception
- Popup UI with options and donation link

**Out-of-Scope (v1):**
- Multi-site support
- Regex or custom rule builders
- Analytics or enterprise licensing

---

## 5. Features

### 5.1 Dash Replacement Engine
- Replace em-dash and/or en-dash characters in streamed ChatGPT text.
- Initial sweep on page load.
- Skip editable regions (inputs, textareas, contenteditable=true).

### 5.2 Clipboard Hook
- Intercept `copy` events.
- Modify clipboard contents to match dash replacement settings.

### 5.3 Popup UI
- On/off toggle (default: enabled, but shown via onboarding).
- "Replace What" dropdown: em / en / both (default: em).
- "Replace With" dropdown: comma+space / -- / space / nothing (default: comma+space).
- "Buy Me a Coffee" button opens https://coff.ee/brownjason1 in new tab.

### 5.4 Settings Storage
- Use `chrome.storage.sync` to persist settings across Chrome installs.

### 5.5 Onboarding Prompt
- One-time overlay or modal to show user the extension is active.
- Notes that it's replacing em-dashes by default and is configurable.

---

## 6. User Stories

1. As a user, I want dashes in ChatGPT responses replaced automatically so I never see em-dashes.  
2. As a user, I want to disable the extension entirely so it consumes zero resources.  
3. As a user, I want to choose which dash types to replace and what to replace them with.  
4. As a user, I want copied text to reflect the same replacements.  
5. As a user, I want a simple way to support the developer.

---

## 7. Functional Requirements

| ID  | Requirement                                                                          |
|-----|--------------------------------------------------------------------------------------|
| FR1 | Content script waits for `#thread` (retry every 200 ms, max 50 attempts)            |
| FR2 | If `enabled` is false, script must exit immediately with zero processing            |
| FR3 | MutationObserver watches `characterData` under `#thread`                            |
| FR4 | Regex pattern must respect `replaceWhat` selection                                  |
| FR5 | Clipboard handler updates copy buffer contents per `replaceWhat/With` settings      |
| FR6 | Popup reflects and persists all settings via `chrome.storage.sync`                  |
| FR7 | Buy Me a Coffee button opens in a new tab using hardcoded safe `<a>` element        |

---

## 8. Non-Functional Requirements

- **Performance:** No measurable lag on ChatGPT page  
- **Security:** No site access beyond what's required  
- **Resilience:** Does not crash if ChatGPT structure changes  
- **Compatibility:** Chrome 100+, all major OSes

---

## 9. Technical Architecture

### 9.1 Chrome Extension Files
- `manifest.json` (Manifest V3)  
- `content.js` (core logic)  
- `popup.html`, `popup.js`, `popup.css` (UI)  
- `icons/` (16x, 48x, 128x PNGs)

### 9.2 Git Repository & Process
- Git used for all code versioning
- Branching: `main`, `dev`, `feature/*`, `hotfix/*`
- Guidelines:
  - Atomic commits with clear messages
  - Code review required for `main`
  - No unused or dead code

---

## 10. Milestones & Timeline

| Milestone                          | Duration       | Target Date    |
|------------------------------------|----------------|----------------|
| POC complete                       | 1 day          | June 22, 2025  |
| Scaffold extension files           | 1 day          | June 23, 2025  |
| Build popup UI and toggle logic    | 2 days         | June 25, 2025  |
| Integrate dash engine + copy hook  | 2 days         | June 27, 2025  |
| Polish UI + onboarding             | 1 day          | June 28, 2025  |
| Store listing prep                 | 2 days         | June 30, 2025  |
| Submit to Chrome Web Store         | 1 day          | July 1, 2025   |

---

## 11. Success Metrics

- 1,000 installs in the first month  
- 90%+ enablement retention  
- 0 critical bug reports  
- 50+ Buy Me a Coffee clicks in 60 days

---

## 12. Risks & Mitigations

| Risk                                     | Mitigation                                      |
|------------------------------------------|-------------------------------------------------|
| ChatGPT DOM changes                      | Fallback selectors, retry loop                 |
| Overhead when disabled                   | Bail immediately from content script           |
| CSP restrictions on popup content        | Avoid inline scripts, use static `<a>` buttons |
| User confusion over popup                | Onboarding modal and simple UX                 |
| Store rejection for clipboard hook       | Transparent privacy disclosure                 |