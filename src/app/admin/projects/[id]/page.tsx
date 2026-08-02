import Link from 'next/link';
import { notFound } from 'next/navigation';

import { addImage, deleteProject, moveImage, removeImage, saveProject } from '../../actions';
import { adminExperiences, adminImages, adminProject } from '../../data';
import { DeleteButton, Form } from '../../Form';
import { ImageAdjust } from '../../ImageAdjust';
import { LinkRows } from '../../LinkRows';
import { Reorder } from '../../Reorder';
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
              title="Lowercase letters, numbers and hyphens only — no spaces."
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
              title="Four-digit year, a hyphen, two-digit month — for example 2023-04."
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

          {/* State of completion. Only the two non-default values render on the
              site — a badge saying "shipped" on every card is wallpaper. */}
          <label className="field">
            <span className="field-label">State</span>
            <select name="status" defaultValue={item?.status ?? 'shipped'}>
              <option value="shipped">Shipped</option>
              <option value="building">Still building</option>
              <option value="archived">Archived</option>
            </select>
          </label>

          <label className="field">
            <span className="field-label">Took — free text, optional</span>
            <input
              name="duration"
              defaultValue={item?.duration ?? ''}
              placeholder="3 months"
            />
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
            rows={5}
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

        {/* Publishing is an edit-time choice, not a create-time one. A new
            project saves as a draft and lands on this same page in edit mode,
            where its images can be added and this checkbox appears — so the
            create form shows the promise instead of a control that would be
            overridden anyway. */}
        {creating ? (
          <p className="admin-note">
            Saves as a draft. Add screenshots on the next screen, then publish
            when it&rsquo;s ready.
          </p>
        ) : (
          <>
            <label className="admin-check">
              <input type="checkbox" name="published" defaultChecked={item!.published} />
              <span>Published — unchecked keeps it out of the carousel</span>
            </label>
            <label className="admin-check">
              <input type="checkbox" name="starred" defaultChecked={item!.starred} />
              <span>Starred — pins it to the front of the carousel</span>
            </label>
          </>
        )}
      </Form>

      {!creating ? (
        <section className="admin-section">
          <h2>Images</h2>
          <p className="admin-note">
            The order is the order they appear in, and the first is what the
            card shows — move one to the top to make it the card&rsquo;s picture.
            Opening the project shows all of them as a gallery. The well is 16:9,
            and each image chooses how it sits in it — Cover fills and crops,
            Contain shows the whole thing letterboxed, and under Cover you set
            which part stays in frame. An MP4 or WebM works too — a clip of the
            thing running says more than a still, and it plays muted and looping
            unless the visitor has asked for reduced motion.
          </p>

          <ol className="admin-shots">
            {images.map((image, i) => (
              <li key={image.id}>
                <div className="admin-shot-head">
                  <span className="admin-note">
                    {i === 0 ? 'Shown on the card · ' : `#${i + 1} · `}
                    {image.media === 'video' ? 'Video · ' : ''}
                    {image.width} × {image.height}
                  </span>
                  <Reorder
                    isFirst={i === 0}
                    isLast={i === images.length - 1}
                    up={async () => {
                      'use server';
                      return moveImage(image.id, 'up');
                    }}
                    down={async () => {
                      'use server';
                      return moveImage(image.id, 'down');
                    }}
                  />
                </div>
                <ImageAdjust image={image} />
                <span className="admin-note">{image.alt}</span>
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
          </ol>

          {/* The hint doubles as the default alt now, so it has to read as a
              description rather than an instruction — "Cadence screenshot", not
              "what the screenshot shows". Type something specific when the shot
              has a subject worth naming; this is the floor, not the goal. */}
          <Upload
            folder={`projects/${id}`}
            label="Add screenshot or clip"
            altHint={`${item!.title} screenshot`}
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
