import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ComicPage } from '@/components/ComicPage';
import { PageDepth } from '@/components/PageDepth';
import { getPages, getSettings } from '@/content';

export const dynamic = 'force-static';
export const dynamicParams = false;

type RouteParams = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  // Every published page is deep-linkable at its own slug, including the first
  // one — links in old applications should not break because the issue got
  // reordered. The first page canonicalises to `/`.
  return getPages().map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  const pages = getPages();
  const index = pages.findIndex((page) => page.slug === slug);
  if (index === -1) return {};

  const page = pages[index];
  const settings = getSettings();
  const description = page.ogTagline ?? settings.ogTagline;

  return {
    title: page.title,
    description,
    alternates: { canonical: index === 0 ? '/' : `/${page.slug}` },
    openGraph: {
      title: `${page.title} — ${settings.displayName}`,
      description,
    },
  };
}

export default async function IssuePage({ params }: RouteParams) {
  const { slug } = await params;
  const pages = getPages();
  const index = pages.findIndex((page) => page.slug === slug);
  if (index === -1) notFound();

  const page = pages[index];

  return (
    <>
      <ComicPage page={page} pageNumber={index + 1} totalPages={pages.length} />
      <PageDepth slug={page.slug} pageNumber={index + 1} />
    </>
  );
}
