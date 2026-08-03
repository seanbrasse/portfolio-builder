-- Whether a video has an audio track.
--
-- Screen recordings are often silent, and offering an "unmute" on a clip that
-- has no sound is a control that does nothing. This flags a clip as silent so
-- the player can show its mute toggle disabled and muted rather than inviting a
-- press that changes nothing. Stills are irrelevant here and keep the default.
--
-- Defaults true so every existing row is treated as having audio (the prior
-- behaviour — the toggle stays live); a silent clip is marked by the editor, or
-- by a future upload-time detector.
alter table public.project_images
  add column has_audio boolean not null default true;
