import { ComicPage } from '@/components/ComicPage';
import { PageDepth } from '@/components/PageDepth';
import { getPages } from '@/content';
import { personSchema } from '@/lib/schema';

/**
 * TECH-1: the whole public site is statically generated. A recruiter's page
 * load never touches a data source. In Phase 2 this stays true — publishing
 * fires a revalidation webhook rather than making these pages dynamic.
 */
export const dynamic = 'force-static';

export default function IssueCover() {
  const pages = getPages();
  const [page] = pages;

  return (
    <>
      {/* TECH-3: structured data lives on the root page only, so a crawler
          sees one Person rather than four competing ones. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema()) }}
      />
      <ComicPage page={page} pageNumber={1} totalPages={pages.length} />
      <PageDepth slug={page.slug} pageNumber={1} />
    </>
  );
}
