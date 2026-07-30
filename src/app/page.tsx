import { Book } from '@/components/Book';
import { PageDepth } from '@/components/PageDepth';
import { getPages } from '@/content';
import { personSchema } from '@/lib/schema';

/**
 * TECH-1: the whole public site is statically generated. A recruiter's page
 * load never touches a data source.
 */
export const dynamic = 'force-static';

export default function IssueCover() {
  const pages = getPages();

  return (
    <>
      {/* TECH-3: structured data lives on the root only, so a crawler sees one
          Person rather than one per page. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema()) }}
      />
      <Book pages={pages} initialSlug={null} />
      <PageDepth slug="cover" pageNumber={1} />
    </>
  );
}
