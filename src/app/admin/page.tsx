import Link from 'next/link';

import { saveSettings } from './actions';
import { adminEducations, adminExperiences, adminProjects, adminSettings } from './data';
import { Form } from './Form';
import { Grow } from './Grow';
import { LinkRows } from './LinkRows';
import { OgPreview } from './OgPreview';
import { StarToggle } from './StarToggle';
import { CAPS } from '@/content/types';

/**
 * Everything the site shows, in one list.
 *
 * The surfaces are the organising principle rather than the tables: the intro,
 * the timeline, the cards. If something appears on the page it appears here,
 * and if it does not appear here then editing it still means editing code —
 * which is the thing this exists to stop.
 */
export default async function AdminHome() {
  const [settings, education, experiences, projects] = await Promise.all([
    adminSettings(),
    adminEducations(),
    adminExperiences(),
    adminProjects(),
  ]);

  if (!settings) {
    return (
      <p className="admin-error">
        No settings row. The database is reachable but empty — run the seed in
        supabase/migrations before editing.
      </p>
    );
  }

  return (
    <>
      <h1>Content</h1>

      {/* ------------------------------------------------------------------ */}
      <section className="admin-section">
        <h2>Intro</h2>
        <p className="admin-note">The name, the line under it, and the skills row.</p>

        <Form action={saveSettings}>
          <div className="admin-grid">
            <label className="field">
              <span className="field-label">Display name</span>
              <input name="display_name" defaultValue={settings.display_name} required />
            </label>

            <label className="field">
              <span className="field-label">Location</span>
              <input name="location" defaultValue={settings.location} />
            </label>
          </div>

          <Grow
            name="tagline"
            label="Tagline"
            max={CAPS.tagline}
            defaultValue={settings.tagline}
            hint="The line under your name. It is set large on a page that does not scroll, so every line it takes comes off the work below it."
          />

          <Grow
            name="skills"
            label="Skills — comma separated"
            max={CAPS.skills}
            defaultValue={settings.skills.join(', ')}
            hint="Counted as the whole line, because the row wraps as one run."
          />

          <h3 className="admin-subhead">Footer and metadata</h3>

          <div className="admin-grid">
            <label className="field">
              <span className="field-label">Contact email</span>
              <input name="contact_email" type="email" defaultValue={settings.contact_email} />
            </label>

            <label className="field">
              <span className="field-label">Résumé path</span>
              <input name="resume_href" defaultValue={settings.resume_href} />
            </label>

            <label className="field">
              <span className="field-label">Availability</span>
              <select name="availability_status" defaultValue={settings.availability_status}>
                <option value="open">Open</option>
                <option value="selective">Selective</option>
                <option value="not_looking">Not looking</option>
              </select>
            </label>

            <label className="field">
              <span className="field-label">Roles open to — comma separated</span>
              <input name="roles_open_to" defaultValue={settings.roles_open_to.join(', ')} />
            </label>
          </div>

          <Grow
            name="og_tagline"
            label="Social card description"
            max={CAPS.ogTagline}
            defaultValue={settings.og_tagline}
            hint="Shown when the site is pasted into a chat or a post. Most platforms stop displaying it around here."
          />

          <label className="field">
            <span className="field-label">Social card subtitle — max {CAPS.ogSubtitle}</span>
            <input
              name="og_subtitle"
              defaultValue={settings.og_subtitle}
              maxLength={CAPS.ogSubtitle}
              placeholder="Software Engineer · React · TypeScript"
            />
            <span className="admin-note">
              The line under your name on the shared-link image. Drawn uppercase
              on the card; the name and location on it come from the fields
              above. The preview updates as you type — save to update the real
              card.
            </span>
          </label>

          <OgPreview
            displayName={settings.display_name}
            location={settings.location}
            subtitle={settings.og_subtitle}
          />

          <LinkRows links={settings.links} />
        </Form>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="admin-section">
        <div className="admin-section-head">
          <h2>Education</h2>
          <Link href="/admin/education/new" className="admin-button">
            Add school
          </Link>
        </div>
        <p className="admin-note">
          The front of the timeline. Each school is a join on the line with its
          own badge, exactly like a company — add as many as you have. The
          stretch before your first job is compressed on purpose, so the years
          with the work in them get the room; with no schools at all the line
          simply starts at the first job.
        </p>

        <ul className="admin-list">
          {education.map((item) => (
            <li key={item.id}>
              <Link href={`/admin/education/${item.id}`} className="admin-row">
                <span className="admin-row-mark">
                  {item.logo_src ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={item.logo_src} alt="" width={22} height={22} />
                  ) : (
                    <span className="admin-row-mono">no logo</span>
                  )}
                </span>
                <span className="admin-row-main">
                  <strong>{item.school}</strong>
                  <span className="admin-note">
                    {item.credential || 'no credential'} · {item.start_date} →{' '}
                    {item.end_date ?? 'present'}
                  </span>
                </span>
                {!item.published ? <span className="admin-flag">Draft</span> : null}
              </Link>
            </li>
          ))}
          {education.length === 0 ? <li className="admin-note">Nothing yet.</li> : null}
        </ul>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="admin-section">
        <div className="admin-section-head">
          <h2>Timeline</h2>
          <Link href="/admin/experiences/new" className="admin-button">
            Add company
          </Link>
        </div>
        <p className="admin-note">
          Each company is a join on the line, a badge, and the employer that
          professional projects point at. The logo lives here, which is what
          makes it the same mark on the timeline and on every card built there.
        </p>

        <ul className="admin-list">
          {experiences.map((item) => (
            <li key={item.id}>
              <Link href={`/admin/experiences/${item.id}`} className="admin-row">
                <span className="admin-row-mark">
                  {item.logo_src ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={item.logo_src} alt="" width={22} height={22} />
                  ) : (
                    <span className="admin-row-mono">no logo</span>
                  )}
                </span>
                <span className="admin-row-main">
                  <strong>{item.company}</strong>
                  <span className="admin-note">
                    {item.role} · {item.start_date} → {item.end_date ?? 'present'}
                  </span>
                </span>
                {!item.published ? <span className="admin-flag">Draft</span> : null}
              </Link>
            </li>
          ))}
          {experiences.length === 0 ? <li className="admin-note">Nothing yet.</li> : null}
        </ul>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="admin-section">
        <div className="admin-section-head">
          <h2>Projects</h2>
          <Link href="/admin/projects/new" className="admin-button">
            Add project
          </Link>
        </div>

        <ul className="admin-list">
          {projects.map((item) => (
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
              {/* The pin lives here, on the far right of the row, and toggling
                  it never navigates — it sits outside the edit link. */}
              <StarToggle id={item.id} starred={item.starred} />
            </li>
          ))}
          {projects.length === 0 ? <li className="admin-note">Nothing yet.</li> : null}
        </ul>
      </section>
    </>
  );
}
