import Link from 'next/link';
import { notFound } from 'next/navigation';

import { deleteExperience, saveExperience, saveLogo } from '../../actions';
import { adminExperience } from '../../data';
import { DeleteButton, Form } from '../../Form';
import { LinkRows } from '../../LinkRows';
import { Upload } from '../../Upload';
import { CAPS } from '@/content/types';

/**
 * One company: its place on the timeline, and its mark.
 *
 * `new` is not a special route, it is the absence of a row — the same form with
 * empty defaults and an editable id. Two nearly identical forms is how one of
 * them ends up missing a field.
 */
export default async function EditExperience({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const creating = id === 'new';
  const item = creating ? null : await adminExperience(id);

  if (!creating && !item) notFound();

  return (
    <>
      <p className="admin-crumb">
        <Link href="/admin">← Content</Link>
      </p>
      <h1>{creating ? 'Add company' : item!.company}</h1>

      <Form action={saveExperience}>
        <div className="admin-grid">
          <label className="field">
            <span className="field-label">Id — used in links, lowercase</span>
            <input
              name="id"
              defaultValue={item?.id ?? ''}
              readOnly={!creating}
              required
              pattern="[a-z0-9-]+"
              placeholder="mailchimp"
            />
          </label>

          <label className="field">
            <span className="field-label">Company</span>
            <input name="company" defaultValue={item?.company ?? ''} required />
          </label>

          <label className="field">
            <span className="field-label">Role</span>
            <input name="role" defaultValue={item?.role ?? ''} required />
          </label>

          <label className="field">
            <span className="field-label">Location</span>
            <input name="location" defaultValue={item?.location ?? ''} />
          </label>

          <label className="field">
            <span className="field-label">Started — YYYY-MM</span>
            <input
              name="start_date"
              defaultValue={item?.start_date ?? ''}
              pattern="\d{4}-\d{2}"
              required
              placeholder="2023-04"
            />
          </label>

          <label className="field">
            <span className="field-label">Ended — blank if current</span>
            <input
              name="end_date"
              defaultValue={item?.end_date ?? ''}
              pattern="\d{4}-\d{2}"
              placeholder="2023-02"
            />
          </label>
        </div>

        <label className="field">
          <span className="field-label">Summary — max {CAPS.experienceSummary}</span>
          <textarea
            name="summary"
            rows={3}
            maxLength={CAPS.experienceSummary}
            defaultValue={item?.summary ?? ''}
          />
        </label>

        <label className="field">
          <span className="field-label">
            Impact bullets — one per line, max {CAPS.impactBulletCount}, each{' '}
            {CAPS.impactBullet} characters
          </span>
          <textarea
            name="impact_bullets"
            rows={4}
            defaultValue={(item?.impact_bullets ?? []).join('\n')}
          />
        </label>

        <LinkRows links={item?.links ?? []} />

        <label className="admin-check">
          <input type="checkbox" name="published" defaultChecked={item?.published ?? true} />
          <span>Published — unchecked keeps it off the live site</span>
        </label>
      </Form>

      {/* The logo is saved on its own, not with the form above, because the file
          has to reach storage before there is a URL worth recording. */}
      {!creating ? (
        <section className="admin-section">
          <h2>Logo</h2>
          <p className="admin-note">
            One mark per company. It shows on the timeline and on every project
            built here — there is no second place to set it. Without one, the
            badge draws a monogram.
          </p>
          <p className="admin-note">
            A company logo is a trademark. Use a mark you are permitted to use;
            most companies publish brand guidelines saying what that means.
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
                confirm={`Remove the ${item!.company} logo? The badge goes back to a monogram.`}
                action={async () => {
                  'use server';
                  return saveLogo(id, null);
                }}
              />
            </div>
          ) : null}

          <Upload
            folder={`logos/${id}`}
            label={item!.logo_src ? 'Replace logo' : 'Upload logo'}
            altHint={`${item!.company} logo`}
            onSave={async (image) => {
              'use server';
              return saveLogo(id, image);
            }}
          />
        </section>
      ) : null}

      {!creating ? (
        <section className="admin-section">
          <h2>Delete</h2>
          <p className="admin-note">
            Projects built here keep their rows but lose the company — they will
            render as personal projects until reassigned.
          </p>
          <DeleteButton
            label="Delete company"
            confirm={`Delete ${item!.company} from the timeline?`}
            action={async () => {
              'use server';
              return deleteExperience(id);
            }}
          />
        </section>
      ) : null}
    </>
  );
}
