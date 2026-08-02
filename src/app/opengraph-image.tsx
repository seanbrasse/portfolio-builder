import { getSettings } from '@/content';
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
/**
 * Static, and it has to be: Next reads `alt` as a module export, so it cannot
 * await a content read. The name is in the image itself and in the page title
 * beside it, so what is lost here is a duplicate rather than the fact.
 */
export const alt = 'Engineering portfolio';

export default async function Image() {
  const settings = await getSettings();

  return renderOgImage({
    caption: settings.location.toUpperCase(),
    title: settings.displayName.toUpperCase(),
    // Editable in the admin now, and stored in natural case; uppercased here
    // like the caption and title so the card's lines read as one set.
    subtitle: settings.ogSubtitle.toUpperCase(),
  });
}
