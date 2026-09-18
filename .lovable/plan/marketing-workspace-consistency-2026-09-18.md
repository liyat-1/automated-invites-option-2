# Marketing workspace consistency

## What will change

- Turn promotion assignment into a large, centered popup matching the existing Manage promotions dialog, with a dimmed backdrop, close control, and fixed Cancel / Save assignment actions.
- Keep the current four-column campaign board and all Direct/OTA drag-and-drop rules inside the popup; changes remain staged until Save, while Cancel discards them.
- Polish the Media page in a clean shared-drive style: clearer folder icons and active state, a tighter search/filter toolbar, improved upload area, and more legible file cards and actions.
- Rework promotion create/edit into the same split workspace used by Edit content: editable details and banner controls on the left, with a persistent live promotion preview on the right.

## Interaction details

- Assignment popup closes from Cancel, the close icon, or backdrop only after handling staged changes consistently.
- Save commits all assignment edits at once and returns to the promotions list.
- Promotion preview updates live while editing and remains visible as the left panel scrolls.
- Existing media upload, rename, delete, folder, filtering, and drag-and-drop behavior remains unchanged.

## Technical details

- Reuse the existing dialog and button components, semantic design tokens, promotion banner renderer, and current media thumbnails.
- Add local draft assignment state around the existing promotion mutation helpers rather than changing the underlying audience-conflict rules.
- Preserve current app navigation, data model, and all other marketing screens.

## Verification

- Check create/edit promotion, assignment Save/Cancel, campaign drag/drop and Direct/OTA states.
- Check media folders, filtering, upload area, and file actions.
- Verify desktop and narrow layouts, then run the TypeScript check and inspect browser errors.
