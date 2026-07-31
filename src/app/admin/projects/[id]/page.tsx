import Link from 'next/link';
import { notFound } from 'next/navigation';

import { addImage, deleteProject, removeImage, saveProject } from '../../actions';
import { adminExperiences, adminImages, adminProject } from '../../data';
import { DeleteButton, Form } from '../../Form';
import { LinkRows } from '../../LinkRows';
import { Upload } from '../../Upload';
import { CAPS } from '@/content/types';

/**
 * One card: its copy, its company, and its screenshots.
 *
 * As with a company, `new` is the absence of a row rather than a second form.
 */
export default async function EditProject({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const creating = id === 'new';

  const [item, employers, images] = await Promise.all([
    creating ? Promise.resolve(null) : adminProject(id),
    adminExperiences(),
    creating ? Promise.resolve([]) : adminImages(id),
  ]);

  if (!creating && !item) notFound();

  return (
    <>
      <p className="admin-crumb">
        <Link href="/admin">← Content</Link>
      </p>
      <h1>{creating ? 'Add project' : item!.title}</h1>

      <Form action={saveProject}>
        <div className="admin-grid">
          <label className="field">
            <span className="field-label">Id — used in links, lowercase</span>
            <input
              name="id"
              defaultValue={item?.id ?? ''}
              readOnly={!creating}
              required
              pattern="[a-z0-9-]+"
              placeholder="pass-the-interview"
            />
          </label>

          <label className="field">
            <span className="field-label">Title</span>
            <input name="title" defaultValue={item?.title ?? ''} required />
          </label>

          <label className="field">
            <span className="field-label">Built — YYYY-MM</span>
            <input
              name="date"
              defaultValue={item?.date ?? ''}
              pattern="\d{4}-\d{2}"
              required
              placeholder="2026-07"
            />
          </label>

          <label className="field">
            <span className="field-label">Kind</span>
            <select name="context" defaultValue={item?.context ?? 'personal'}>
              <option value="personal">Personal</option>
              <option value="professional">Professional</option>
            </select>
          </label>

          {/* A professional project must name its employer — the badge on the
              card reads that company's logo row. The database has the same
              constraint; this is so the choice is visible while making it. */}
          <label className="field">
            <span className="field-label">Company — required for professional</span>
            <select name="experience_id" defaultValue={item?.experience_id ?? ''}>
              <option value="">None (personal)</option>
              {employers.map((employer) => (
                <option key={employer.id} value={employer.id}>
                  {employer.company}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span className="field-label">Summary — max {CAPS.projectSummary}</span>
          <textarea
            name="summary"
            rows={3}
            maxLength={CAPS.projectSummary}
            defaultValue={item?.summary ?? ''}
          />
        </label>

        <label className="field">
          <span className="field-label">Impact — the one number</span>
          <input name="impact" defaultValue={item?.impact ?? ''} />
        </label>

        <label className="field">
          <span className="field-label">Tech — comma separated</span>
          <input name="tech" defaultValue={(item?.tech ?? []).join(', ')} />
        </label>

        <LinkRows links={item?.links ?? []} />

        <label className="admin-check">
          <input type="checkbox" name="published" defaultChecked={item?.published ?? true} />
          <span>Published — unchecked keeps it out of the carousel</span>
        </label>
      </Form>

      {!creating ? (
        <section className="admin-section">
          <h2>Images</h2>
          <p className="admin-note">
            The first is the card&rsquo;s screenshot. The well is 16:9, so
            anything else is letterboxed rather than cropped.
          </p>

          <ul className="admin-shots">
            {images.map((image) => (
              <li key={image.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.src} alt={image.alt} />
                <span className="admin-note">
                  {image.width} × {image.height} · {image.alt}
                </span>
                <DeleteButton
                  label="Remove"
                  confirm="Remove this image from the project?"
                  action={async () => {
                    'use server';
                    return removeImage(image.id);
                  }}
                />
              </li>
            ))}
            {images.length === 0 ? (
              <li className="admin-note">
                None yet — the card shows &ldquo;No screenshot yet&rdquo;.
              </li>
            ) : null}
          </ul>

          <Upload
            folder={`projects/${id}`}
            label="Add screenshot"
            altHint={`${item!.title} — what the screenshot shows`}
            onSave={async (image) => {
              'use server';
              return addImage(id, image);
            }}
          />
        </section>
      ) : null}

      {!creating ? (
        <section className="admin-section">
          <h2>Delete</h2>
          <p className="admin-note">This takes the project&rsquo;s images with it.</p>
          <DeleteButton
            label="Delete project"
            confirm={`Delete ${item!.title} and its images?`}
            action={async () => {
              'use server';
              return deleteProject(id);
            }}
          />
        </section>
      ) : null}
    </>
  );
}
