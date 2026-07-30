# PRD: Comic Panel Portfolio

**Owner:** Sean
**Status:** Draft v1
**Last updated:** July 30, 2026

---

## 1. Summary

A personal engineering portfolio rendered as a comic book. Career history, professional projects, and testimonials are laid out as inked panels on a newsprint page. Visitors read it as an issue: a cover, a few pages, a "to be continued" hiring CTA.

The site is content-managed. All copy, images, logos, links, and page layouts are edited through an authenticated admin, never in code. Three display modes (four-color, noir, plain text) let the reader dial the intensity down to a boring resume if they want.

**The one-line thesis:** the portfolio is itself the work sample.

---

## 2. Goals and non-goals

### Goals

| # | Goal | How we know it worked |
|---|------|----------------------|
| G1 | A recruiter understands who Sean is and what he built in under 30 seconds | Someone unfamiliar can name the current role, two projects, and one impact number after a 30 second look |
| G2 | Content is editable without a deploy | A typo fix or a new project goes live in under 3 minutes from a browser |
| G3 | Readable at every intensity | Plain text mode passes a screen reader run and prints cleanly to PDF |
| G4 | Distinctive enough to be remembered | Interviewers mention it unprompted |
| G5 | Fast and accessible | Lighthouse: performance > 90, accessibility 100, on mobile |

### Non-goals

- Multi-user, roles, or permissions. One editor, forever.
- A blog or long-form CMS. If a writing section exists it links out.
- Comments, likes, or any social surface.
- A free-form drag-anywhere canvas editor. See section 6 for why.
- Themes beyond the three specified.
- Public sign-up of any kind.

---

## 3. Users

**The visitor (99% of traffic).** A recruiter, hiring manager, or engineer. Arrives from a LinkedIn link or an application form, often on a phone, often with 30 seconds. Never logs in. Never sees an auth prompt. Wants: what does he do, where has he worked, what did he build, is he available, how do I contact him, where's the resume.

**The editor (Sean).** Logs in to add a project, swap a screenshot, update availability, reorder pages. Wants to do this from a laptop in ten minutes without opening an editor or waiting on CI.

---

## 4. Authentication

### Answering the question directly

**Visitors never log in.** A portfolio behind a login is a portfolio nobody reads. Every public page is anonymous, indexable, and shareable.

**The editor does log in**, at `/admin`. This is completely normal: it is the standard headless CMS pattern. Anyone using Sanity, Contentful, or a WordPress backend has exactly this. The only unusual thing here is that the CMS is self-built, which is a feature given the goal.

### Requirements

- **AUTH-1.** Single-user auth. An allowlist of exactly one identity. No sign-up route exists.
- **AUTH-2.** GitHub OAuth or email magic link. No password to manage, no password reset flow to build.
- **AUTH-3.** All `/admin/*` routes are protected at the middleware layer, not just the client.
- **AUTH-4.** Database row-level security enforces the same rule at the data layer. Public read on published content, writes restricted to the one user id. Defense in depth, so a leaked API key alone cannot deface the site.
- **AUTH-5.** Sessions persist for 30 days so Sean is not logging in every visit.
- **AUTH-6.** Unauthenticated hits to `/admin` redirect to `/`, not to a login page. There is no reason to advertise that an admin exists.

---

## 5. Content model

Everything below is a database record, editable in the admin. Nothing here lives in code.

### `site_settings` (single row)

| Field | Type | Notes |
|-------|------|-------|
| `display_name` | text | |
| `tagline` | text | Appears on the cover |
| `issue_number` | text | Cosmetic, e.g. "#4" |
| `availability_status` | enum | `open`, `selective`, `not_looking`. Drives the CTA panel copy |
| `roles_open_to` | text[] | e.g. "Senior frontend", "Full stack" |
| `location` | text | |
| `resume_asset_id` | fk → `assets` | The PDF |
| `contact_email` | text | |
| `links` | jsonb | Ordered list of `{label, url, icon}` for LinkedIn, GitHub, etc. |
| `og_tagline` | text | Overrides the tagline in social previews |

### `pages`

An "issue" is the ordered set of pages.

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | |
| `slug` | text | Deep-linkable, e.g. `origin`, `work`, `builds` |
| `title` | text | Shown in the issue index rail |
| `caption` | text | The yellow caption box, e.g. "Meanwhile, at Mailchimp..." |
| `template_id` | fk → templates | See section 6 |
| `sort_order` | int | |
| `status` | enum | `draft`, `published` |

### `panels`

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | |
| `page_id` | fk | |
| `slot` | text | Which named grid area in the template this occupies |
| `type` | enum | `hero`, `experience`, `project`, `testimonial`, `metric`, `sfx`, `cta`, `image`, `text` |
| `content_ref` | uuid | Points at the row in the matching content table |
| `overrides` | jsonb | Per-panel accent color, halftone on/off, rotation for SFX |

### `experiences`

| Field | Type | Notes |
|-------|------|-------|
| `company` | text | |
| `logo_asset_id` | fk → `assets` | |
| `role` | text | |
| `start_date`, `end_date` | date | Null end date means current |
| `summary` | text | Hard cap 200 chars, enforced in the editor |
| `impact_bullets` | text[] | Max 3, each capped at 120 chars |
| `sort_order` | int | |

### `projects`

| Field | Type | Notes |
|-------|------|-------|
| `title` | text | |
| `context` | enum | `professional`, `personal` |
| `experience_id` | fk, nullable | Links a professional project to the employer |
| `summary` | text | Cap 200 chars |
| `impact` | text | The one number, e.g. "Cut sync failures 90%" |
| `tech` | text[] | |
| `links` | jsonb | `{label, url, type}` where type is `live`, `repo`, `case_study`, `press` |
| `images` | fk[] → `assets` | First is the panel image, rest are a lightbox |
| `date` | date | |
| `sort_order` | int | |

### `testimonials`

| Field | Type | Notes |
|-------|------|-------|
| `quote` | text | Cap 180 chars. Balloons cannot hold more |
| `author_name` | text | |
| `author_role` | text | |
| `author_company` | text | |
| `author_avatar_id` | fk, nullable | |
| `experience_id` | fk, nullable | |
| `approved` | bool | Do not publish a quote you have not cleared with the person |

### `assets`

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | |
| `storage_path` | text | |
| `kind` | enum | `screenshot`, `logo`, `avatar`, `document` |
| `alt_text` | text | **NOT NULL.** See ACC-2 |
| `width`, `height` | int | Captured at upload for layout stability |
| `focal_point` | jsonb | `{x, y}` 0 to 1, so crops keep the subject |
| `treatment` | enum | `duotone`, `grayscale`, `none`. Default duotone for screenshots, none for logos |

---

## 6. Page composition: templates, not a canvas

**This is the most important scope decision in the document.**

The tempting version is a drag-anywhere canvas where Sean positions and resizes panels freely. Do not build this. Free-form canvas editors are a multi-month project on their own, they produce bad layouts by default, and they have no answer for mobile, where comic panels cannot reflow.

### The design instead

- **COMP-1.** Ship a fixed library of 6 to 8 page templates. Each is a named CSS grid with named slots. Examples: `hero-2-3` (one full-width hero, then two, then three), `full-bleed` (single panel page), `splash-4` (2x2), `stack-3` (three full-width bands).
- **COMP-2.** Each template declares two things: a desktop `grid-template-areas` map, and a **mobile reading order** as an ordered list of slots. This is what makes guided view work.
- **COMP-3.** In the admin, Sean picks a template for a page and assigns a content item to each slot. Reordering is drag-and-drop between slots, which is a swap, not a free transform.
- **COMP-4.** Empty slots render as blank inked panels rather than collapsing. A comic page with a quiet empty panel looks intentional. A collapsed grid looks broken.
- **COMP-5.** Templates live in code. Adding a new one is a deploy. That is acceptable: it happens rarely, and it keeps art direction under version control where it belongs.

### Mobile: guided view

- **COMP-6.** Below 768px, panels render one per screen in the template's declared mobile order. Swipe or scroll advances. This is the Comixology guided-view pattern and it is the only approach that preserves both readability and the comic feel.
- **COMP-7.** A progress indicator shows position within the page and within the issue.

---

## 7. Display modes

Two orthogonal controls, both persisted to `localStorage` and both reflected in the URL as query params so a shared link preserves the mode.

### View: `comic` | `plain`

**Comic** is the default. Full panel layout, as designed.

**Plain** drops all comic chrome. Single column, semantic HTML, system font stack, no halftone, no panel borders, no SFX. It is a well-set resume page. Same data, different template. Requirements:

- **MODE-1.** Plain view is server-rendered at its own URL (`/plain`), not a client-side class toggle, so it is independently linkable and indexable.
- **MODE-2.** Every piece of content visible in comic view is present in plain view. No content lives only in the decorative layer.
- **MODE-3.** Plain view has a print stylesheet that produces a clean PDF.
- **MODE-4.** The toggle is visible and labeled on every page, in the issue index rail.

### Theme: `four-color` | `noir`

**Four-color** is the newsprint palette: paper cream, one red, one blue, one yellow, black ink.

**Noir** is the darker register. Ink black and bone white, heavy blacks, high-contrast halftone, dramatic negative space, and **one optional spot color** used at most twice per page. This is not simply "grayscale filter applied." It is a second art direction with its own token values.

- **MODE-5.** Every color in the system is a CSS custom property. There are zero hardcoded hex values in component code. Noir is implemented purely as a `[data-theme="noir"]` token remap. If this rule is followed, noir costs roughly a day. If it is broken anywhere, noir becomes a rewrite.
- **MODE-6.** Image `treatment` responds to theme. A `duotone` screenshot renders in the four-color duotone under the default theme and in high-contrast monochrome under noir, via SVG filter at render time. Nothing is baked at upload, so switching themes is instant and reversible.
- **MODE-7.** Logos are exempt from theme tinting by default (`treatment: none`) but get a `grayscale` option per asset, since some brand logos will fight the palette badly.
- **MODE-8.** Respect `prefers-color-scheme` on first visit: dark preference defaults to noir. After that, the explicit choice wins.

---

## 8. Media pipeline

- **MEDIA-1.** Drag-and-drop upload in the admin, with paste-from-clipboard support. Screenshots come from the clipboard more often than from the file system.
- **MEDIA-2.** On upload: strip EXIF, capture intrinsic dimensions, generate AVIF and WebP at 3 widths, store the original.
- **MEDIA-3.** Alt text is a required field in the upload form. The save button is disabled until it is filled. This is the only place in the admin where a hard block is justified.
- **MEDIA-4.** Focal point picker: click the image to set the point that must survive any crop.
- **MEDIA-5.** Duotone and posterize are applied at render via SVG `feColorMatrix` and `feComponentTransfer`, not baked into the file. This is what unifies three unrelated app screenshots into one illustrated world, and it must stay reversible for plain view and theme switching.
- **MEDIA-6.** Resume upload accepts PDF, stores it, and serves it at a stable URL (`/resume.pdf`) so the link in old applications never rots.
- **MEDIA-7.** Total image weight per page is budgeted at 500KB. The admin shows a running total per page and warns past the budget.

---

## 9. Motion

Motion carries the "it's a comic" feeling more than any static styling does. It also has the highest risk of tipping into noise.

- **MOTION-1.** Page-to-page transition uses the View Transitions API. A quick paper-slide, roughly 280ms, with a slight vertical offset. Degrades to an instant cut where unsupported. No 3D page curl: it reads as a 2011 iPad demo.
- **MOTION-2.** Panel entrance on scroll: panels "ink in" via IntersectionObserver. Border draws first, then fill, then halftone, then text. Staggered 60ms per panel in reading order, capped so a 6-panel page fully resolves within 500ms.
- **MOTION-3.** SFX elements enter with a scale-and-rotate overshoot. One per page, per the noise budget.
- **MOTION-4.** Speech balloons may use a fast type-on for the quote. Off by default; opt in per testimonial panel.
- **MOTION-5.** Hover on a project panel lifts the hard drop shadow by 2px. No blur, no scale, no glow.
- **MOTION-6.** All of the above is wrapped in `prefers-reduced-motion: reduce`, under which everything resolves to a simple opacity fade at 120ms or no animation at all.
- **MOTION-7.** Animate `transform` and `opacity` only. No animated `width`, `height`, `top`, or `filter`. Nothing that triggers layout.
- **MOTION-8.** Nothing animates on a loop. No ambient motion, no drifting halftone. Motion happens on entrance and on interaction, then stops.

---

## 10. Admin experience

Route: `/admin`. The admin does not need to be beautiful, but it does need to be fast, because the failure mode is Sean not updating the site.

- **ADMIN-1.** Split view: form on the left, live preview of the actual page on the right, updating on change.
- **ADMIN-2.** Preview has a device toggle (desktop, mobile guided view) and a theme toggle, so layouts are checked in all four combinations before publishing.
- **ADMIN-3.** Draft and publish are separate. Editing a published page creates a draft. The live site keeps serving the published version until "Publish" is pressed. A recruiter should never load the site mid-edit.
- **ADMIN-4.** Preview URLs for drafts are shareable with an unguessable token, for getting a second opinion before going live.
- **ADMIN-5.** Character counters on every capped field, showing the cap. Panels have hard word limits for a reason and the editor should make that visible, not discover it at render.
- **ADMIN-6.** Autosave drafts every 5 seconds. Never lose an in-progress edit.
- **ADMIN-7.** Reordering pages and swapping panel slots is drag-and-drop.
- **ADMIN-8.** A "revert to published" action on any draft.
- **ADMIN-9.** *(Phase 3, optional)* In-place editing: when logged in, text fields on the live site become `contentEditable` with save on blur. Layout changes still go through `/admin`. This is a genuinely delightful upgrade but it is not required for v1.

---

## 11. Accessibility

Non-negotiable. This section is also the argument that the whole concept is serious rather than a gimmick.

- **ACC-1.** DOM order matches visual reading order on every template. CSS Grid makes it trivially easy to break this. Every template needs a keyboard tab-through check before it ships.
- **ACC-2.** Alt text on every image, enforced at the database level (`NOT NULL`) and in the upload form.
- **ACC-3.** Text contrast meets WCAG AA in both themes. Yellow on cream fails and will need an ink outline or a darker yellow. Check it, do not assume it.
- **ACC-4.** Real heading hierarchy. Panel titles are `h2`/`h3`, not styled divs.
- **ACC-5.** Body copy is never set in the display face and never in all caps. Display type is limited to panel titles, captions, and SFX.
- **ACC-6.** SFX text is `aria-hidden`. It is decoration and a screen reader announcing "POW" is noise.
- **ACC-7.** Visible focus rings, styled as a thick comic outline so it fits the art direction instead of fighting it.
- **ACC-8.** Full keyboard navigation: arrow keys move page to page, `Escape` closes the lightbox, the issue index is reachable by tab.
- **ACC-9.** Plain view is the accessibility escape hatch and is linked from every page, not buried.

---

## 12. Technical approach

Chosen to match the existing stack and to be defensible in an interview.

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js App Router | RSC gives fast public pages, the admin is a client island |
| Hosting | Vercel | Already in use, plus Vercel OG for social cards |
| Database | Supabase Postgres | Already connected, and RLS covers AUTH-4 |
| Auth | Supabase Auth, GitHub provider | One-user allowlist, no password flow |
| Storage | Supabase Storage | Same platform, signed URLs for drafts |
| ORM | Drizzle | Typed schema, cheap migrations |
| Validation | Zod, shared client and server | Field caps defined once |
| Styling | Tailwind plus CSS custom properties | Tokens carry the theming, per MODE-5 |
| Transitions | Native View Transitions API | No animation library needed |

Additional requirements:

- **TECH-1.** Public pages are statically generated and revalidated on publish via a webhook. A recruiter's page load should not hit the database.
- **TECH-2.** Auto-generated OG images per page, styled as a comic cover. Recruiters share links, and the preview is the first impression.
- **TECH-3.** `sitemap.xml` and structured data (`Person`, `JobPosting`-adjacent schema) so the site ranks for his name.
- **TECH-4.** Analytics on page views and per-page depth, so Sean can see whether anyone reaches page 4. If nobody does, the issue is too long.

---

## 13. Phases

**Phase 0: content, no code (2 to 3 hours).**
Write every panel's copy in a plain markdown file. Every project, every impact number, every testimonial, at the real word counts. This is useful whether or not the site ever gets built, it de-risks the entire design, and it will surface which projects cannot survive compression. Do not skip to code before this exists.

**Phase 1: read-only site (1 weekend).**
Hardcoded content in a TypeScript file, 3 templates, four-color theme, desktop and mobile guided view, plain view. No database, no admin, no auth. This is the version that proves the concept is readable, and it is already a shippable portfolio.

**Phase 2: CMS (1 to 2 weekends).**
Supabase schema, auth, admin with live preview, media pipeline, draft/publish. Migrate the hardcoded content into the database.

**Phase 3: polish (1 weekend).**
Noir theme, View Transitions, ink-in animations, OG image generation, analytics, accessibility audit pass.

**Phase 4: optional.**
In-place editing (ADMIN-9), additional templates, a lightbox, case study sub-pages.

Realistic total: 3 to 5 focused weekends to Phase 3. Phase 1 alone is a legitimate portfolio, which is the point of the phasing. Every phase ends with something shippable.

---

## 14. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Scope creep into a canvas editor | High | Section 6 is a hard constraint. Templates only |
| Art direction is half-done and reads as cheap | High | Phase 1 exists to test this before any CMS work. If Phase 1 does not look good, stop |
| The CMS becomes the project and the portfolio never ships | High | Phase 1 has zero CMS. Content is proven before infrastructure |
| Mobile layouts break the comic feel | Medium | Mobile reading order is declared in the template, not derived. Test on a real phone each phase |
| Hardcoded colors block noir | Medium | MODE-5 enforced from the first commit. A lint rule banning hex literals in components is worth the ten minutes |
| Reads as gimmicky to conservative interviewers | Medium | Plain view, linked prominently. Also the strongest counter-argument, since building it demonstrates judgment |
| Company logo usage | Low | Employment logos used as factual reference are standard practice. Avoid any layout implying endorsement or partnership, and drop any logo on request |
| Testimonials published without consent | Low | The `approved` flag, plus asking each person in writing |

---

## 15. Open questions

1. **How many pages is an issue?** Recommendation: 4. Origin, Work, Builds, Contact. Analytics from TECH-4 will say whether even that is too many.
2. **Does noir get a spot color, and which one?** A single desaturated red is the obvious noir choice, which is a reason to consider something else.
3. **Is there a cover page?** A full-screen cover with issue number and barcode is the most on-concept element available, but it is also an interstitial between the recruiter and the content. Possible compromise: the cover is the hero panel of page 1 rather than its own page.
4. **Which display typeface?** Blambot has genuinely good comic lettering with indie-friendly licensing. This deserves real time, since the display face carries most of the personality.
5. **Case study depth.** Do projects link to sub-pages, or is a panel plus external links enough? Recommendation: panel only for v1. Depth is what the resume and the interview are for.
6. **Custom domain and existing portfolio.** Does this replace what is currently linked in applications, and what is the cutover?
