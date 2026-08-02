'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { AdminProject } from './data';
import { StarToggle } from './StarToggle';

/**
 * The projects list, with a sort control.
 *
 * Sorting is client-side: the whole list is already loaded for the page, so
 * reordering it is instant and needs no round trip or URL state. Three orders,
 * because they answer three different questions an editor actually has — "what
 * did I just add", "where is the one called X", and "how does the timeline
 * read". "Recently added" is the default: after adding or editing a project you
 * want it on top, which the newest-first project-date order does not guarantee
 * (a backdated project sorts down the list).
 */
type SortKey = 'added' | 'az' | 'date';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'added', label: 'Recently added' },
  { key: 'az', label: 'A–Z' },
  { key: 'date', label: 'Project date' },
];

export function ProjectsList({ projects }: { projects: AdminProject[] }) {
  const [sort, setSort] = useState<SortKey>('added');

  const shown = useMemo(() => {
    const list = [...projects];
    if (sort === 'az') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === 'date') {
      list.sort((a, b) => b.date.localeCompare(a.date));
    } else {
      // Newest row first. Fall back to the project date if a created_at is
      // ever missing, so the order is never arbitrary.
      list.sort((a, b) => (b.created_at ?? b.date).localeCompare(a.created_at ?? a.date));
    }
    return list;
  }, [projects, sort]);

  return (
    <>
      <div className="admin-sort">
        <label className="field-label" htmlFor="projects-sort">
          Sort
        </label>
        <select
          id="projects-sort"
          value={sort}
          onChange={(event) => setSort(event.target.value as SortKey)}
        >
          {SORTS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <ul className="admin-list">
        {shown.map((item) => (
          <li key={item.id} className="admin-row-item">
            <Link href={`/admin/projects/${item.id}`} className="admin-row">
              <span className="admin-row-main">
                <strong>{item.title}</strong>
                <span className="admin-note">
                  {item.date} · {item.experience_id ?? 'personal'}
                </span>
              </span>
              {!item.published ? <span className="admin-flag">Draft</span> : null}
            </Link>
            {/* The pin lives here, on the far right of the row, and toggling it
                never navigates — it sits outside the edit link. */}
            <StarToggle id={item.id} starred={item.starred} />
          </li>
        ))}
        {shown.length === 0 ? <li className="admin-note">Nothing yet.</li> : null}
      </ul>
    </>
  );
}
