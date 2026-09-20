# Template management and promo landing previews

## What will change

- Add **Manage templates** as a fourth action in the selected campaign tools area, beside channel strategy, promos, and text media.
- Open a full-width, bounded template assignment popup matching the existing promo assignment popup, with staged changes plus Cancel and Save assignment actions.
- Keep an email-eligible campaign column on the left and user-selected template columns on the right. Campaigns can be dragged onto templates; columns can change template, be cleared, removed, or added.
- Support Direct and OTA independently on each template assignment using the same checked, unchecked, and scratched-out visual language already used by promo and media assignment.
- Exclude Text-only campaigns from template assignment. Text + Email and Text with Email fallback campaigns remain available.
- Show template details in each selected column and its detail view: name, description, total campaigns, active campaigns, creator/owner, and last updater/time.
- Add a full template preview that can be opened before assigning, while keeping create/edit template actions connected to the existing Template Studio flow.

## Template content and presentation

- Expand the built-in email template set with more standard, modern hospitality designs using the existing image library, varied layouts, restrained colors, and distinct visual moods.
- Preserve campaign-written copy when a template is reassigned; apply the chosen template’s visual layout and identity without unexpectedly replacing customized text.
- Keep the current simple, warm editor structure and make template/layout controls visually consistent with the new manager.
- Make the email footer’s unsubscribe action a recognizable link in previews.

## Promo landing page preview

- Add a reusable guest-facing promo landing page rendered inside the existing phone mockup.
- In Text editing, show the message phone and promo landing-page phone side by side. The message’s promo link opens/focuses the landing preview.
- In Email editing, make the email CTA preview interactive and show the same promo landing-page phone beside the email preview.
- Populate the landing page from the assigned promo: property imagery/logo, headline, description, code type and code, discount or benefit, validity, and a clear booking action.
- When no promo is attached, show a clean destination preview based on the campaign link rather than inventing promo details.

## Data and behavior

- Extend email template records with ownership and update metadata while deriving usage and active counts from current campaign assignments.
- Apply template assignments per Direct/OTA email variant and record the current user and update time.
- Keep the existing browser-based demo persistence and all current promo, media, strategy, and content-editing behavior unchanged.

## Verification

- Verify add/change/remove template columns, campaign drag/drop, Direct/OTA toggles, Text-only exclusion, Cancel, and Save.
- Verify template metadata, full preview, modern template choices, and preservation of customized copy.
- Verify SMS promo-link and email CTA interactions plus side-by-side phone landing preview at desktop and narrow widths.
- Run the TypeScript check and inspect the live preview for console errors.
