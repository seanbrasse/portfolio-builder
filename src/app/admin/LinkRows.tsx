'use client';

import { useState } from 'react';

type Row = { label: string; url: string; type?: string };

/**
 * A repeating group of links.
 *
 * Three parallel inputs with the same name, which is what the server action
 * expects — `FormData.getAll` gives it three arrays it zips back into objects.
 * That is the whole of the state management: adding a row adds three inputs,
 * and a row with no URL is dropped on save rather than tracked as deleted.
 */
export function LinkRows({ links }: { links: Row[] }) {
  const [rows, setRows] = useState<Row[]>(links.length > 0 ? links : [{ label: '', url: '' }]);

  return (
    <fieldset className="admin-fieldset">
      <legend className="field-label">Links</legend>

      {rows.map((row, index) => (
        <div className="admin-grid admin-link-row" key={index}>
          <input name="link_label" defaultValue={row.label} placeholder="Label" aria-label="Label" />
          <input
            name="link_url"
            defaultValue={row.url}
            placeholder="https://"
            aria-label="URL"
            type="url"
          />
          <select name="link_type" defaultValue={row.type ?? ''} aria-label="Kind">
            <option value="">—</option>
            <option value="live">Live</option>
            <option value="repo">Repo</option>
            <option value="case_study">Case study</option>
            <option value="press">Press</option>
          </select>
        </div>
      ))}

      <button
        type="button"
        className="admin-button admin-quiet"
        onClick={() => setRows([...rows, { label: '', url: '' }])}
      >
        Add link
      </button>
      <p className="admin-note">Clear a row&rsquo;s URL to remove it on save.</p>
    </fieldset>
  );
}
