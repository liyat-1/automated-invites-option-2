# Consolidate promotion management and assignments

## What will change

- Replace the separate **Promotions** and **Assignments** tabs with one clean promotion list.
- Keep each promotion’s campaign count visible and add a clear **Assign campaigns / Edit assignment** button on the same row.
- Move edit, duplicate, and delete into a compact three-dot menu for each promotion.
- Rebuild the assignment screen as one always-visible board:
  - first column: campaigns currently available for this promotion;
  - next columns: Automated Invites, Automated Transactional, and In-Property;
  - drag individual campaigns or **All campaigns / All Direct / All OTA** collections into the matching section.
- Preserve segment-level logic: Direct and OTA can be assigned independently, unavailable segments remain visibly disabled, and unchecking one returns that segment to the available column.
- Make the assignment experience visually consistent with the existing promotion-management board and dialogs.
- Fix the content editor so closing and saving always removes every overlay and does not leave the page frozen.
- Simplify media columns by removing “See file details” and showing only **Change file** and **Clear column** actions directly.
- Keep promotion configuration details only within promotion editing, not media assignment.

## Interaction rules

- A campaign stays in the available column while either Direct or OTA remains unassigned to this promotion.
- Dragging **All OTA** assigns only free OTA segments; Direct remains available where applicable.
- Dragging **All Direct** assigns only free Direct segments; OTA remains available where applicable.
- Dragging **All campaigns** assigns every free Direct and OTA segment.
- A campaign disappears from available only when neither segment is available.
- Existing assignments to another promotion are never overwritten by a drag.

## Verification

- Test individual and bulk drag-and-drop across all three campaign sections.
- Test unchecking Direct or OTA and confirm it immediately returns to available.
- Test promotion edit, duplicate, delete, assign, and edit-assignment actions.
- Test content editor close, discard confirmation, and save paths.
- Test media change/clear actions and confirm configuration details are absent.
- Check desktop and mobile-sized layouts for clipping or overlapping controls.
