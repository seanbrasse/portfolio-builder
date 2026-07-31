import Link from 'next/link';
import { notFound } from 'next/navigation';

import { deleteEducation, saveEducation, saveEducationLogo } from '../../actions';
import { adminEducation } from '../../data';
import { DeleteButton, Form } from '../../Form';
import { LinkRows } from '../../LinkRows';
import { Upload } from '../../Upload';

/**
 * One school: where it sits on the timeline, and its crest.
 *
 * Deliberately the same page as a company, minus the fields a degree does not
 * have — no role, no impact bullets, no summary. A school and a job are the
 * same shape to the line and different things to a reader, and this is where
 * that difference is allowed to show.
 *
 * `new` is not a special route, it is the absence of a row: the same form with
 * empty defaults and an editable id.
 */
export default async function EditEducation({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const creating = id === 'new';
  const item = creating ? null : await adminEducation(id);

  if (!creating && !item) notFound();

  return (
    <>
      <p className="admin-crumb">
        <Link href="/admin">← Content</Link>
      </p>
      <h1>{creating ? 'Add school' : item!.school}</h1>

      <Form action={saveEducation}>
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
              placeholder="buffalo"
            />
          </label>

          <label className="field">
            <span className="field-label">School</span>
            <input
              name="school"
              defaultValue={item?.school ?? ''}
              required
              placeholder="University at Buffalo"
            />
          </label>

          <label className="field">
            <span className="field-label">Credential</span>
            <input
              name="credential"
              defaultValue={item?.credential ?? ''}
              placeholder="B.S. Computer Science"
            />
          </label>

          <label className="field">
            <span className="field-label">Location</span>
            <input name="location" defaultValue={item?.location ?? ''} placeholder="Buffalo, NY" />
          </label>

          <label className="field">
            <span className="field-label">Started — YYYY-MM</span>
            <input
              name="start_date"
              defaultValue={item?.start_date ?? ''}
              pattern="\d{4}-\d{2}"
              title="Four-digit year, a hyphen, two-digit month — for example 2017-09."
              required
              placeholder="2017-09"
            />
          </label>

          <label className="field">
            <span className="field-label">Ended — blank if still enrolled</span>
            <input
              name="end_date"
              defaultValue={item?.end_date ?? ''}
              pattern="\d{4}-\d{2}"
              title="Four-digit year, a hyphen, two-digit month — for example 2021-05."
              placeholder="2021-05"
            />
          </label>
        </div>

        <LinkRows links={item?.links ?? []} />

        <label className="admin-check">
          <input type="checkbox" name="published" defaultChecked={item?.published ?? true} />
          <span>Published — unchecked keeps it off the live site</span>
        </label>
      </Form>

      {/* Saved on its own, not with the form above, because the file has to
          reach storage before there is a URL worth recording. */}
      {!creating ? (
        <section className="admin-section">
          <h2>Logo</h2>
          <p className="admin-note">
            The badge on the timeline. Without one it draws a monogram from the
            school&rsquo;s initials.
          </p>
          <p className="admin-note">
            A university crest is a trademark like any other mark. Use one you
            are permitted to use — most schools publish brand guidelines saying
            what that means.
          </p>
          <p className="admin-note">
            Square images sit best: the badge is a square box and fits the whole
            image inside it, so a wide logo renders shorter than the marks
            beside it rather than cropping.
          </p>

          {item!.logo_src ? (
            <div className="admin-current">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item!.logo_src} alt={item!.logo_alt} width={40} height={40} />
              <span className="admin-note">
                {item!.logo_width} × {item!.logo_height} · {item!.logo_alt || 'no alt text'}
              </span>
              <DeleteButton
                label="Remove logo"
                confirm={`Remove the ${item!.school} logo? The badge goes back to a monogram.`}
                action={async () => {
                  'use server';
                  return saveEducationLogo(id, null);
                }}
              />
            </div>
          ) : null}

          <Upload
            folder={`logos/${id}`}
            label={item!.logo_src ? 'Replace logo' : 'Upload logo'}
            altHint={`${item!.school} logo`}
            accept="image/png,image/jpeg,image/webp,image/avif,image/svg+xml"
            onSave={async (image) => {
              'use server';
              return saveEducationLogo(id, image);
            }}
          />
        </section>
      ) : null}

      {!creating ? (
        <section className="admin-section">
          <h2>Delete</h2>
          <p className="admin-note">
            Removes the join from the timeline. If this is the earliest thing on
            the line, the line starts at whatever comes next instead.
          </p>
          <DeleteButton
            label="Delete school"
            confirm={`Delete ${item!.school} from the timeline?`}
            action={async () => {
              'use server';
              return deleteEducation(id);
            }}
          />
        </section>
      ) : null}
    </>
  );
}
