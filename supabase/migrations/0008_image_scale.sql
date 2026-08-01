-- Image framing, part two: a zoom, and contain as the default.
--
-- `scale` is how far the image is zoomed into its 16:9 well — 1 shows it at the
-- fit chosen, above 1 magnifies it from the focal point and lets the well crop
-- the edges. It is the "slight crop" that neither cover nor contain gave on
-- their own: contain shows the whole thing, cover fills to the frame, and this
-- is the dial between and past them. Clamped in the write path to a sane range;
-- the column only guards the floor.
alter table project_images
  add column if not exists scale real not null default 1 check (scale >= 1 and scale <= 3);

-- Contain becomes the default a new image lands on. A screenshot dropped in is
-- more often the wrong shape for the well than the right one, and showing the
-- whole of it — rather than filling and silently cropping — is the safer thing
-- to do before anyone has looked. Existing rows keep whatever they were framed
-- to; this only changes where a new one starts.
alter table project_images
  alter column fit set default 'contain';
