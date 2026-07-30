import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Book } from '@/components/Book';
import { PageDepth } from '@/components/PageDepth';
import { getPages, getSettings } from '@/content';

export const dynamic = 'force-static';
export const dynamicParams = false;

type RouteParams = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  // Every page is deep-linkable, and opening one opens the book to the spread
  // it sits on rather than to a different document.
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
    alternates: { canonical: `/${page.slug}` },
    openGraph: { title: `${page.title} — ${settings.displayName}`, description },
  };
}

export default async function IssuePage({ params }: RouteParams) {
  const { slug } = await params;
  const pages = getPages();
  const index = pages.findIndex((page) => page.slug === slug);
  if (index === -1) notFound();

  return (
    <>
      <Book pages={pages} initialSlug={slug} />
      <PageDepth slug={slug} pageNumber={index + 2} />
    </>
  );
}
