import { getSettings } from '@/content';
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = `${getSettings().displayName} — engineering portfolio`;

export default async function Image() {
  const settings = getSettings();

  return renderOgImage({
    caption: settings.location.toUpperCase(),
    title: settings.displayName.toUpperCase(),
    subtitle: 'SOFTWARE ENGINEER · REACT · TYPESCRIPT',
  });
}
