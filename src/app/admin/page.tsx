import Link from 'next/link';

import { saveSettings } from './actions';
import { adminExperiences, adminProjects, adminSettings } from './data';
import { Form } from './Form';
import { LinkRows } from './LinkRows';
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
  const [settings, experiences, projects] = await Promise.all([
    adminSettings(),
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

          <label className="field">
            <span className="field-label">Tagline</span>
            <input name="tagline" defaultValue={settings.tagline} />
          </label>

          <label className="field">
            <span className="field-label">Skills — comma separated</span>
            <input name="skills" defaultValue={settings.skills.join(', ')} />
          </label>

          <h3 className="admin-subhead">Education</h3>
          <p className="admin-note">Where the timeline starts.</p>

          <div className="admin-grid">
            <label className="field">
              <span className="field-label">School</span>
              <input name="education_school" defaultValue={settings.education_school} />
            </label>

            <label className="field">
              <span className="field-label">Credential</span>
              <input name="education_credential" defaultValue={settings.education_credential} />
            </label>

            <label className="field">
              <span className="field-label">Started — YYYY-MM</span>
              <input
                name="education_start_date"
                defaultValue={settings.education_start_date}
                pattern="\d{4}-\d{2}"
                title="Four-digit year, a hyphen, two-digit month — for example 2023-04."
                placeholder="2017-09"
              />
            </label>
          </div>

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

          <label className="field">
            <span className="field-label">Social card description</span>
            <textarea name="og_tagline" rows={2} defaultValue={settings.og_tagline} />
          </label>

          <LinkRows links={settings.links} />
        </Form>
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
        <p className="admin-note">
          The carousel, newest first. Summaries are capped at {CAPS.projectSummary}{' '}
          characters because the card cannot hold more.
        </p>

        <ul className="admin-list">
          {projects.map((item) => (
            <li key={item.id}>
              <Link href={`/admin/projects/${item.id}`} className="admin-row">
                <span className="admin-row-main">
                  <strong>{item.title}</strong>
                  <span className="admin-note">
                    {item.date} · {item.experience_id ?? 'personal'}
                  </span>
                </span>
                {!item.published ? <span className="admin-flag">Draft</span> : null}
              </Link>
            </li>
          ))}
          {projects.length === 0 ? <li className="admin-note">Nothing yet.</li> : null}
        </ul>
      </section>
    </>
  );
}
