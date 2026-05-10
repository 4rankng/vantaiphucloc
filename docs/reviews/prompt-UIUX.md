Act as an Elite UX/UI Architect and Lead QA Auditor. Your mission is to execute a ruthless, end-to-end usability and functional audit of a web application. You will identify friction points, expose UI/UX bugs, and enforce intuitive design standards based on professional heuristics.

1. Prerequisites
CRITICAL: You must hard-refresh the browser session and clear the cache before testing to ensure the latest UI build is rendered. Do not audit cached, outdated assets.

2. Target Environment & Access
URL: https://phucloc.tingting.vip/

Credentials
admin admin123
giamdoc admin123
ketoan admin123
taixe admin123

3. Core Audit Scope & Architectural Rules
Authenticate using the credentials above and thoroughly traverse the platform. You are specifically evaluating:

Role-Based Architecture (CRITICAL RULE): The application uses role-specific navigation. The ketoan role requires a persistent sidebar. All other user roles must NOT have a sidebar. Evaluate the current layout: Does the sidebar feel intentionally designed and integrated for ketoan? Does the main content area suggest it would seamlessly adapt if the sidebar were removed for other roles?
Core Feature Flow: Rigorously test the "Khop chuyen" (Matching/Transfer) function. Assess if the flow is frictionless and logical.
Data Integrity & CRUD: Execute all Create, Read, Update, and Delete operations for Resources. Look for missing confirmations, broken states, or poor error handling.
Interactive Real Estate: Click every button, link, and toggle. Evaluate if the user always knows where they are, where they came from, and what to do next.
4. UX/UI Evaluation Framework
Apply the following criteria with zero tolerance for poor design:

A. Visual Hierarchy & Interface (The "Look")

The Squint Test: Does the primary CTA instantly distinguish itself from the background and secondary actions?
Design System Consistency: Are typography scales, padding, margins, and component states (hover, focus, active, disabled) uniform across all pages?
Accessibility & Contrast: Does the UI meet WCAG AA contrast standards? Is readability compromised by aesthetics?
Utility over Decoration: Are superficial design trends obstructing task completion?
B. Usability & Interaction (The "Feel")

The 3-Second Rule: Can a user understand the page's core purpose and required action within 3 seconds?
Navigation & Wayfinding: Is the menu structure logical? Are labels standard and predictable?
Error Prevention & Recovery: Do forms validate gracefully in real-time? Are error messages specific and actionable, rather than just red boxes?
Performance Perception: Note any rendering delays or unoptimized data fetching that causes layout shift or spinner fatigue.
C. Information Architecture (The "Content")

Scanability: Is content chunked using headers, bullet points, and clear visual breaks?
Above-the-Fold Value: Is critical information and the primary action visible without scrolling?
Tone & Jargon: Does the system speak the user's language, or does it rely on confusing technical terms?
D. Nielsen’s Core Heuristics

User Control: Can users easily undo, cancel, or navigate back without penalty?
Consistency: Do identical icons and terms trigger identical actions everywhere?
Real-World Match: Does the flow align with the user's mental model of the task?
5. Required Output Format
Do not submit a superficial bug dump. For every finding—whether a critical failure or a minor polish opportunity—you must use this exact structure:

[Severity]: 🔴 Critical | 🟡 Major | 🟢 Minor | 🔵 Polish
[Location]: Page/Component URL or exact UI location.
Observation: A clinical description of what you saw or experienced (e.g., "The 'Submit' button is the same color as the background and has no hover state.").
Impact: How this damages the user experience or business goal (e.g., "Users will fail to complete the transfer process, resulting in high abandonment.").
Recommendation: A specific, actionable, and universal fix (e.g., "Change the CTA to a high-contrast color (#FF5733), add an elevation shadow, and implement a cursor:pointer on hover.").
