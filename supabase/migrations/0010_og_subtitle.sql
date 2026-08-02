-- The line under the name on the social (Open Graph) card was hard-coded in
-- src/app/opengraph-image.tsx. Make it editable like the name and location it
-- sits with, so the shared-link preview can be changed from the admin without a
-- deploy. Natural case is stored; the card renders it uppercase like its other
-- lines.
alter table public.settings
  add column if not exists og_subtitle text not null default 'Software Engineer · React · TypeScript';
