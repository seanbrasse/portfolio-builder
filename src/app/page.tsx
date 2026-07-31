import { Projects } from '@/components/Projects';
import { Timeline } from '@/components/Timeline';
import { getExperiences, getMetric, getProjects, getSettings } from '@/content';
import { availabilityBody, availabilityLabel } from '@/lib/format';
import { personSchema } from '@/lib/schema';

/**
 * The whole site, on one page.
 *
 * Sections in the order a reader asks the questions: who is this, where has he
 * worked, what has he built, how do I reach him. Nothing is behind a route, a
 * modal or a click — the page is short enough to scroll, and a recruiter
 * reading it has under a minute.
 *
 * TECH-1: statically generated. A visitor's page load touches no data source.
 */
export const dynamic = 'force-static';

/** The three numbers worth leading with. Ids, so the copy stays in one file. */
const HEADLINE_METRICS = ['qbo-merchants', 'arr-unlocked', 'optin-lift'];

const INTRO =
  'Computer science at Buffalo, then a first job modernizing a ten-year-old aerospace defense ' +
  'simulator. Then merchant onboarding at PayPal, then Mailchimp. Every move traded scale of ' +
  'hardware for scale of people — from simulated aircraft to a hundred thousand small businesses ' +
  'touching the same form builder.';

export default function Home() {
  const settings = getSettings();
  const experiences = getExperiences();
  const projects = getProjects();
  const metrics = HEADLINE_METRICS.map(getMetric).filter((metric) => metric !== undefined);

  // Projects name their employer by id, and the card wants the company and its
  // logo. Resolved here rather than inside the client component, which would
  // mean shipping every experience to the browser to read two fields.
  const employers = Object.fromEntries(experiences.map((item) => [item.id, item]));

  return (
    <>
      {/* TECH-3: one Person, on the one page there is. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema()) }}
      />

      <section className="shell hero" id="top">
        <p className="availability">
          <span className="availability-dot" aria-hidden="true" />
          {availabilityLabel(settings.availabilityStatus)}
        </p>

        <h1>{settings.displayName}</h1>
        <p className="hero-role">Software Engineer · React · TypeScript · {settings.location}</p>
        <p className="hero-tagline">{settings.tagline}</p>
        <p className="hero-body">{INTRO}</p>

        <div className="hero-actions">
          <a className="button" data-variant="primary" href={`mailto:${settings.contactEmail}`}>
            Get in touch
          </a>
          <a className="button" data-variant="ghost" href={settings.resumeHref}>
            Résumé (PDF)
          </a>
        </div>

        {metrics.length > 0 ? (
          <ul className="metric-row">
            {metrics.map((metric) => (
              <li key={metric.id} className="metric">
                <p className="metric-value">{metric.value}</p>
                <p className="metric-label">{metric.label}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="shell section" id="work">
        <h2 className="section-label">Where I&rsquo;ve worked</h2>
        <Timeline experiences={experiences} />
      </section>

      <section className="shell section" id="projects">
        <div className="projects-head">
          <h2 className="section-label">What I&rsquo;ve built</h2>
        </div>
        <Projects projects={projects} employers={employers} />
      </section>

      <section className="shell section" id="contact">
        <h2 className="section-label">Contact</h2>
        <p className="hero-tagline">{availabilityBody(settings.availabilityStatus, settings)}</p>
        <p className="hero-body">
          Email is the fastest way to reach me. I read everything, and I answer anything that
          isn&rsquo;t a template.
        </p>

        <p className="contact-links">
          <a className="button" data-variant="primary" href={`mailto:${settings.contactEmail}`}>
            {settings.contactEmail}
          </a>
          {settings.links.map((link) => (
            <a
              key={link.url}
              className="button"
              data-variant="ghost"
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {link.label}
            </a>
          ))}
        </p>
      </section>
    </>
  );
}
