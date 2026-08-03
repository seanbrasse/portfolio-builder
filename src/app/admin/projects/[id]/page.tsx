import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  addImage,
  deleteProject,
  discardDraft,
  moveImage,
  removeImage,
  saveProject,
  unpublishProject,
} from '../../actions';
import { AudioToggle } from '../../AudioToggle';
import { Autosave } from '../../Autosave';
import { adminExperiences, adminImages, adminProject } from '../../data';
import { DeleteButton, Form } from '../../Form';
import { ImageAdjust } from '../../ImageAdjust';
import { LinkRows } from '../../LinkRows';
import { ProjectDraft } from '../../ProjectDraft';
import { Reorder } from '../../Reorder';
import { Upload } from '../../Upload';
import { CAPS } from '@/content/types';

/**
 * One card: its copy, its company, and its screenshots.
 *
 * As with a company, `new` is the absence of a row rather than a second form.
 *
 * Draft/publish: the form saves as a draft or saves and publishes (the two
 * buttons `Form` renders when `publish` is set). A published project can hold
 * one pending draft — staged edits that are not live. When it does, this page
 * shows the draft's values (so you continue editing the draft), a status badge
 * says so, and "Discard draft" reverts to the published version. The live site
 * is untouched until you publish.
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

  // What the form shows: the pending draft's fields when there is one, otherwise
  // the live row. Identity and lifecycle (`id`, `published`) always come from
  // the live row.
  const values = item ? { ...item, ...(item.draft ?? {}) } : null;
  const draftPending = item?.has_draft ?? false;

  return (
    <>
      <p className="admin-crumb">
        <Link href="/admin">← Content</Link>
      </p>
      <h1>{creating ? 'Add project' : item!.title}</h1>

      {!creating && item ? (
        <div className="admin-status">
          {item.published ? (
            draftPending ? (
              <span className="admin-flag admin-flag-pending">Published · unpublished draft</span>
            ) : (
              <span className="admin-flag admin-flag-live">Published</span>
            )
          ) : (
            <span className="admin-flag">Draft — not on the site yet</span>
          )}

          {item.published ? (
            <DeleteButton
              tone="quiet"
              label="Unpublish"
              confirm="Take this project off the live site? It becomes a draft you can republish anytime."
              action={async () => {
                'use server';
                return unpublishProject(id);
              }}
            />
          ) : null}

          {draftPending ? (
            <>
              <p className="admin-note">
                You&rsquo;re editing the unpublished draft. &ldquo;Save &amp; publish&rdquo;
                replaces the live version; until then the published version stays as it is.
              </p>
              <DeleteButton
                label="Discard draft"
                confirm="Discard the unpublished draft and revert to the published version?"
                reloadOnDone
                action={async () => {
                  'use server';
                  return discardDraft(id);
                }}
              />
            </>
          ) : null}
        </div>
      ) : null}

      <Form action={saveProject} publish>
        {/* Inside the form on purpose: it reaches these fields by walking up to
            the form with `closest('form')`. One tool for both jobs — paste a
            link, notes, or a write-up and it proposes values. New project → the
            fields are blank, so it drafts them; existing project → they carry the
            current copy, so it suggests edits. Prose fields are reviewed as
            cards; a new project's structural fields are filled directly. */}
        <ProjectDraft creating={creating} />

        {/* Autosaves edits to the draft as you type, so a refresh doesn't lose
            them. Only for an existing project — a new one has no draft slot until
            its first save. */}
        {!creating ? <Autosave /> : null}

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
            <input name="title" defaultValue={values?.title ?? ''} required />
          </label>

          <label className="field">
            <span className="field-label">Built — YYYY-MM</span>
            <input
              name="date"
              defaultValue={values?.date ?? ''}
              pattern="\d{4}-\d{2}"
              title="Four-digit year, a hyphen, two-digit month — for example 2023-04."
              required
              placeholder="2026-07"
            />
          </label>

          <label className="field">
            <span className="field-label">Kind</span>
            <select name="context" defaultValue={values?.context ?? 'personal'}>
              <option value="personal">Personal</option>
              <option value="professional">Professional</option>
            </select>
          </label>

          {/* State of completion. Only the two non-default values render on the
              site — a badge saying "shipped" on every card is wallpaper. */}
          <label className="field">
            <span className="field-label">State</span>
            <select name="status" defaultValue={values?.status ?? 'shipped'}>
              <option value="shipped">Shipped</option>
              <option value="building">Still building</option>
              <option value="archived">Archived</option>
            </select>
          </label>

          <label className="field">
            <span className="field-label">Took — free text, optional</span>
            <input name="duration" defaultValue={values?.duration ?? ''} placeholder="3 months" />
          </label>

          {/* A professional project must name its employer — the badge on the
              card reads that company's logo row. The database has the same
              constraint; this is so the choice is visible while making it. */}
          <label className="field">
            <span className="field-label">Company — required for professional</span>
            <select name="experience_id" defaultValue={values?.experience_id ?? ''}>
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
          <span className="field-label">Card summary — max {CAPS.projectSummary}</span>
          <textarea
            name="summary"
            rows={3}
            maxLength={CAPS.projectSummary}
            defaultValue={values?.summary ?? ''}
          />
          <span className="admin-note">
            The short teaser on the carousel card. The fuller write-up goes in the
            Story field below, which is what the opened card shows under it.
          </span>
        </label>

        {/* One cohesive write-up, not a labelled breakdown. The hint recommends
            STAR as a shape to guide the writing; the field itself is free prose,
            roomy because the modal scrolls. Empty is fine — a project with no
            story just shows its summary when opened. */}
        <label className="field">
          <span className="field-label">Story — max {CAPS.projectStory}</span>
          <textarea
            name="story"
            rows={8}
            maxLength={CAPS.projectStory}
            defaultValue={values?.story ?? ''}
          />
          <span className="admin-note">
            The write-up shown in the opened card, under the summary. Tell it as a
            short story — a paragraph or two, the way you&rsquo;d explain the project in
            an interview: the situation, what you set out to do, what you did and the
            decisions you made, and how it turned out. Write it as flowing prose, not
            labelled sections.
          </span>
        </label>

        <label className="field">
          <span className="field-label">Impact — the one number</span>
          <input name="impact" defaultValue={values?.impact ?? ''} />
        </label>

        <label className="field">
          <span className="field-label">Tech — comma separated</span>
          <input name="tech" defaultValue={(values?.tech ?? []).join(', ')} />
        </label>

        <LinkRows links={values?.links ?? []} />

        {creating ? (
          <p className="admin-note">
            Save as a draft to keep working, or save &amp; publish to put it on the
            site. Either way you land on the next screen to add screenshots.
          </p>
        ) : null}
      </Form>

      {!creating ? (
        <section className="admin-section">
          <h2>Images</h2>
          <p className="admin-note">
            Images are shared with the published version — changes here take
            effect immediately, they are not part of the draft.
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
                <span className="admin-note">
                  <span className="field-label">Alt text</span> {image.alt}
                </span>
                {image.media === 'video' ? (
                  <AudioToggle id={image.id} hasAudio={image.has_audio} />
                ) : null}
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
