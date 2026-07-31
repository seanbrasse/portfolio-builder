/**
 * How an image sits in the card's 16:9 well.
 *
 * The well is a fixed shape and a screenshot rarely is, so something has to
 * give. Until now that was always `object-fit: cover` in the stylesheet — fill
 * the well and crop whatever overflows, centred — with no way to change it. A
 * tall screenshot lost its top and bottom, and the focal columns that were
 * meant to steer the crop (`focal_x`, `focal_y`, here since 0001) were written
 * by nothing and read by nothing.
 *
 * `fit` makes the choice per image:
 *   • cover   — fill the well, crop the overflow. The default, because a shot
 *               that is already 16:9 should bleed to the edges.
 *   • contain — show the whole image, letterboxed on the well's background.
 *               Nothing is cut, which is what a shot the wrong shape wants.
 *
 * Focal point only bites under cover — there is nothing to steer when the whole
 * image is shown — so it is not gated here, just ignored downstream when it
 * cannot apply.
 */

alter table public.project_images
  add column fit text not null default 'cover'
    check (fit in ('cover', 'contain'));
