import { getPages, getSettings } from '@/content';
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = `${getSettings().displayName} — engineering portfolio, drawn as a comic`;

export default async function Image() {
  const settings = getSettings();
  const [first] = getPages();

  return renderOgImage({
    caption: first.caption,
    title: settings.displayName.toUpperCase(),
    subtitle: 'SOFTWARE ENGINEER · REACT · TYPESCRIPT',
  });
}
