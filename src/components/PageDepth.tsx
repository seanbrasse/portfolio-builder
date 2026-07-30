'use client';

import { track } from '@vercel/analytics';
import { useEffect } from 'react';

type PageDepthProps = {
  slug: string;
  /** 1-based position within the issue. */
  pageNumber: number;
};

/**
 * TECH-4: per-page depth, which is the number that decides whether the issue
 * is too long. Page views alone cannot answer "does anyone reach page 4".
 *
 * Fires once per page view with the depth reached, so the analytics side can
 * read it as a funnel without needing session stitching.
 */
export function PageDepth({ slug, pageNumber }: PageDepthProps) {
  useEffect(() => {
    track('page_depth', { slug, depth: pageNumber });
  }, [slug, pageNumber]);

  return null;
}
