# Report issue tab

Status: approved
Route: note
Date: 2026-11-03

## Goal

Any visitor can open the project's GitHub Issues from a permanent Report issue tab on the right edge of the screen
(issue #65). On hover or focus, the tab shows a GIF preview from Story Poker Storage.

## Decisions

1. The Report issue tab (issue #65) replaces the feedback button in the header, per the user's decision: «роби #65 замість кнопки
   в хедері» ("do #65 instead of the button in the header"). The link is `https://github.com/upstars-global/storypoker/issues` and opens in a new tab.
2. The tab is vertical, `fixed` at the middle of the right edge of the viewport, on all pages, with an i18n label.
3. The GIF is stored at `report-issue/nice.gif` in a new public bucket `app-assets` (migration `022`: public read, 6 MB,
   `image/gif` only, no client write policies). Use a new bucket over the existing `avatars` / `room-backgrounds`:
   their policies and MIME limits are tied to a single user or room object.
4. The GIF (5.5 MB) loads only after the first hover or focus, not on the first render. With
   `prefers-reduced-motion: reduce`, the preview is neither shown nor loaded.
5. A separate PR from `main`, independent of PR #73.
6. Touch devices have no preview (issue #65, Owner decisions, item 5): `pointerenter` shows the preview only for
   `pointerType` `mouse` and `pen`; `focus` does not show it when `(hover: none)`. On such devices the GIF is not
   requested, and a tap immediately follows the link.
7. Below 640 px (`sm`), the tab shows only the `ic:baseline-feedback` icon from the existing icon pipeline (issue #65,
   Owner decisions, item 7). The label remains the accessible name (`aria-label` and `sr-only`); at 640 px and above,
   vertical text is visible.

## Acceptance criteria

1. AC1: Every page has a Report issue tab at the right edge that opens `https://github.com/upstars-global/storypoker/issues` in a new tab (`noopener noreferrer`).
2. AC2: Hover or keyboard focus shows the GIF from the public URL `app-assets/report-issue/nice.gif`; no GIF request occurs before the first interaction.
3. AC4: With `prefers-reduced-motion: reduce`, hover and focus neither show nor request the GIF.
4. AC3: The tab has a visible focus state and remains clickable at 375 px and 1280 px.
5. AC5: `pointerenter` with `pointerType` `touch` and `focus` when `(hover: none)` neither render the preview nor request the GIF.
6. AC6: Below 640 px, the tab shows only an icon and has an accessible name from `t('reportIssue.label')`; at 640 px and above, vertical text is visible.

## Verification record

```text
Ruling: header feedback button replaced by the issue #65 right-edge tab - user: "роби #65 замість кнопки в хедері" ("do #65 instead of the button in the header") (2026-11-03)
Ruling: spec re-approved - 2026-11-03
Ruling: no GIF preview under prefers-reduced-motion - requested in the user's pasted brief (2026-11-03)
Ruling: review R3 origin user-started - so-upstars review 5744990507 on 8861e11, requested by the user's brief
Received: R3 on 8861e116103cc10ceb61a520dc9ec02680227796 - Critical 0, Important 0, Minor 1
Finding: R3-F1 Minor ACCEPT - spec lacked the touch-skip and icon-only decisions; added Decisions 6-7 and AC5-AC6
Ruling: touch-skip and icon-only below 640 px recorded as owner decisions - user's brief: "Внеси в PR #76 дві правки, щоб він відповідав рішенням власника в описі issue #65 (розділ Owner decisions, пункти 5 і 7)" ("Make two changes to PR #76 so it follows the owner decisions in the issue #65 description, Owner decisions section, items 5 and 7") (2026-11-03)
Ruling: spec re-approved - 2026-11-03
Round review 1: R3 - 1 accepted, 0 rejected
Verify: PASS full tree f1715478e2b4b49e1c3ded899e34602cc900822d 2026-11-03 01:52
```
