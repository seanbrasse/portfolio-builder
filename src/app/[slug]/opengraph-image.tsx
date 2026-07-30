import { getPages, getSettings } from '@/content';
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = `${getSettings().displayName} — engineering portfolio, drawn as a comic`;

export function generateStaticParams() {
  return getPages().map((page) => ({ slug: page.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const settings = getSettings();
  const page = getPages().find((candidate) => candidate.slug === slug);

  // Each page gets its own card, so a link to /work previews as the work page
  // rather than as a generic site cover.
  return renderOgImage({
    caption: page?.caption ?? first(),
    title: (page?.title ?? settings.displayName).toUpperCase(),
    subtitle: (page?.ogTagline ?? settings.tagline).toUpperCase(),
  });
}

function first(): string {
  return getPages()[0].caption;
}
