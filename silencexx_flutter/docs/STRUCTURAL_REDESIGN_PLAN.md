# Structural redesign plan — 2026-10-10

## Audit: why navigation was duplicated

HomeScreen added AppNavigation on mobile, while ConversationSidebar still contained the same five primary destinations. Secondary pages also had a menu button and a separate “back to chat” action. Thus the drawer and bottom bar competed as primary navigation. The correction separates responsibilities: exactly one primary navigator per breakpoint, conversation history is contextual, nested settings retain normal back navigation.

Existing reusable widgets: PageBody, PageIntro, SectionCard, FormGroup, ActionPage, ActionButton, GlassSurface, AppDialog, AsyncPanel, RetainedPageStack, AppNavigation, ConversationSidebar, message/composer widgets. Problem: most pages repeat intro → rectangular SectionCard → footer. These generic wrappers are not a substitute for content-specific composition.

## Screen-by-screen before / after

| Screen | Before / usability issue | After / hierarchy and interactions |
|---|---|---|
| Root mobile | Bottom navigation duplicates drawer destinations; secondary app bars repeat routes | One bottom bar, drawer contains ONLY conversation library; non-chat pages own their heading and contextual actions |
| Root tablet | Mobile drawer stretches to large width | Compact primary rail; separate contextual conversation drawer |
| Root wide/web | Navigation buried below conversation history | Single primary rail/sidebar with clear destinations; conversation library opens contextually, never duplicates primary routes |
| Empty chat | Centered orbit, title, three stacked suggestions, huge bottom composer | Editorial left-aligned greeting, compact mode/status row, asymmetric selectable conversation starters, contextual history/new/search controls; active conversation remains message-first |
| Active chat | Two flat stacks of bubbles with detached controls | Timestamp/author hierarchy, grouped message toolbar; compact anchored composer with tools separate from primary send action |
| Journal | Intro, date button, week strip, editor card, history list all in one long stack | Writing / archive workspace; active-date header, paper-like full-width editor and contextual save; archive entries as chronological rows; wider screens split browsing and writing |
| Daily practice | Generic orbit card + large empty space + sticky footer | Real task status/streak overview, large action-focused practice area and compact step progression locked→opened→complete; direct action adjacent to task |
| Inbox | Intro, segmented button, rectangular compose card or list | Mailbox header with compose action, letter-style inbox rows; dedicated writing mode with recipient/anonymity header, editor, quota and send footer |
| Settings | Large intro/avatar card + repeated rectangular groups | Compact account masthead and 2-column shortcut grid where space allows; grouped preference rows; contextual account actions |
| Profile/security | Single vertical form | Identity summary, editable identity section and expandable password/security sections; destructive actions separated |
| Privacy | Repeated form groups | Privacy controls followed by distinct data export/delete zone, warnings adjacent to actions |
| Safety/about | Long grouped cards | Editorial safety statement, compact resource actions, expandable policy details |
| Sessions | Repeated session cards | Device list with current-session identifier and contextual revoke actions |
| Language | Standard radio list | Locale selection tiles with explicit current marker and immediate feedback |
| Reminders | Standard form | Schedule-centric time display, enabled state and compact settings below |
| Subscription | Current plan card + usage rows + vertical pricing cards | Plan overview + usage grid, selectable pricing comparison, payment history timeline |
| Payment | Generic purchase card | Order summary, price hierarchy, availability state and explicit next action; no enabling disabled payments |
| Auth | All fields/providers inside one glass card | Branded upper area + login/register switch, full-width form section and separate provider entry area; adaptive split on wide screens |
| Disclaimer | Icon + title + long card | Numbered onboarding-style safety brief with compact key points and clear acceptance area |
| Onboarding | Long checklist | Goal-selection grid with selected summary and distinct continue/skip action area |
| Support/panic | Orbit plus sliders and generic cards | Focused step journey: check-in → breathing → reflection; phase controls stay beside relevant content |
| Loading/errors/dialogs | Generic repeated card blocks | Content-appropriate skeletons, compact recoverable error and action hierarchy |

Motion: finite section transitions, selection/expansion states, no perpetual idle animation. Respect reduced motion. Preserve all API/body formats, controllers/drafts, storage, record/voice workflows, existing payment restrictions and native widget behavior.

## Verification and proof

1. Preserve screenshots from the first pass as `build/structural-before`.
2. Widget tests across mobile/tablet/wide, both themes, 200% text and landscape; navigation test explicitly checks absence of duplicate primary destinations in conversation library.
3. Capture actual Flutter-rendered screens into `build/structural-after`; no generated UI mockups.
4. Provide contact sheets, before/after grayscale comparison and a local gallery linking every captured screenshot, with fixture-data disclosure.
5. Run formatter/analyzer/full tests, iOS build and new profile-mode sample on physical iPhone where available. Earlier 67-frame sample belongs to BEFORE version and cannot validate the structural rewrite.
