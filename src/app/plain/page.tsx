import type { Metadata } from 'next';
import Link from 'next/link';

import { getExperience, getMetric, getPages, getProject, getSettings, getTestimonial } from '@/content';
import type { PanelContent } from '@/content/types';
import { availabilityCopy, formatRange, isoRange } from '@/lib/format';
import { getTemplate } from '@/lib/templates';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Plain text',
  description: getSettings().ogTagline,
  alternates: { canonical: '/plain' },
};

/**
 * MODE-1: plain view is its own server-rendered route, not a class toggle over
 * the comic markup, so it is independently linkable and indexable.
 *
 * MODE-2 is enforced structurally rather than by discipline: this walks the
 * exact same pages and panels the comic view walks, in the exact same order.
 * A panel cannot be added to the issue and forgotten here — it would render as
 * nothing and show up immediately. Content that lives only in the decorative
 * layer cannot exist, because there is no content in the decorative layer.
 */
function PlainPanel({ content }: { content: PanelContent }) {
  switch (content.type) {
    case 'hero': {
      const settings = getSettings();
      return (
        <>
          <p className="plain-lede">
            {settings.tagline} Based in {settings.location}. Open to{' '}
            {settings.rolesOpenTo.join(' and ').toLowerCase()} roles.
          </p>
          {content.body ? <p>{content.body}</p> : null}
        </>
      );
    }

    case 'text':
      return (
        <div className="plain-entry">
          <h3>{content.heading}</h3>
          <p>{content.body}</p>
        </div>
      );

    case 'metric': {
      const metric = getMetric(content.ref);
      if (!metric) return null;
      return (
        <p>
          <strong>{metric.value}</strong> — {metric.label}
        </p>
      );
    }

    /* Artifacts carry over as the plainest thing that keeps their meaning: a
       code fragment stays a code fragment, a pipeline stays an ordered list, a
       before/after stays a sentence. The comic view draws these; it does not
       add to them, which is what makes "everything in comic view is in plain
       view" hold for this kind too. */
    case 'code':
      return (
        <div className="plain-entry">
          <h3>{content.caption}</h3>
          <pre>
            <code>{content.lines.join('\n')}</code>
          </pre>
        </div>
      );

    case 'flow':
      return (
        <div className="plain-entry">
          <h3>{content.caption}</h3>
          <ol>
            {content.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      );

    case 'chart':
      return (
        <div className="plain-entry">
          <h3>{content.caption}</h3>
          <p>
            {content.label}: {content.from}
            {content.unit} to <strong>
              {content.to}
              {content.unit}
            </strong>
            .
          </p>
        </div>
      );

    case 'endpoints':
      return (
        <div className="plain-entry">
          <h3>{content.caption}</h3>
          <ul>
            {content.rows.map((row) => (
              <li key={`${row.method} ${row.path}`}>
                <code>
                  {row.method} {row.path}
                </code>
              </li>
            ))}
          </ul>
        </div>
      );

    case 'experience': {
      const experience = getExperience(content.ref);
      if (!experience) return null;
      return (
        <div className="plain-entry">
          <h3>
            {experience.role}, {experience.company}
          </h3>
          <p className="plain-meta">
            <time dateTime={isoRange(experience.startDate, experience.endDate)}>
              {formatRange(experience.startDate, experience.endDate)}
            </time>
            {' · '}
            {experience.location}
          </p>
          <p>{experience.summary}</p>
          {experience.impactBullets.length > 0 ? (
            <ul>
              {experience.impactBullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          ) : null}
        </div>
      );
    }

    case 'project': {
      const project = getProject(content.ref);
      if (!project) return null;
      const employer = project.experienceId ? getExperience(project.experienceId) : undefined;
      return (
        <div className="plain-entry">
          <h3>{project.title}</h3>
          <p className="plain-meta">
            {project.context === 'professional' && employer
              ? `Built at ${employer.company}`
              : 'Personal project'}
            {' · '}
            {project.tech.join(', ')}
          </p>
          <p>{project.summary}</p>
          <p>
            <strong>{project.impact}</strong>
          </p>
          {project.links.length > 0 ? (
            <ul className="plain-links">
              {project.links.map((link) => (
                <li key={link.url}>
                  <a href={link.url} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      );
    }

    case 'testimonial': {
      const testimonial = getTestimonial(content.ref);
      if (!testimonial) return null;
      return (
        <figure className="plain-entry" style={{ margin: '16px 0' }}>
          <blockquote style={{ margin: 0 }}>{testimonial.quote}</blockquote>
          <figcaption className="plain-meta">
            — {testimonial.authorName}, {testimonial.authorRole}, {testimonial.authorCompany}
          </figcaption>
        </figure>
      );
    }

    case 'cta': {
      const settings = getSettings();
      const copy = availabilityCopy(settings.availabilityStatus, settings);
      return (
        <div className="plain-entry">
          <p>{copy.body}</p>
          <ul className="plain-links">
            <li>
              <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>
            </li>
            {settings.links.map((link) => (
              <li key={link.url}>
                <a href={link.url} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a href={settings.resumeHref}>Résumé (PDF)</a>
            </li>
          </ul>
        </div>
      );
    }

    case 'image': {
      // Images are decoration in plain view; their alt text is what mattered
      // and it is already carried by the panel each image belongs to.
      return null;
    }

    case 'empty':
      return null;
  }
}

export default function PlainView() {
  const settings = getSettings();
  const pages = getPages();

  return (
    <article className="plain">
      <Link className="plain-back" href="/">
        ← Comic view
      </Link>

      <h1>{settings.displayName}</h1>
      <p className="plain-meta">
        {settings.location} ·{' '}
        <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a> ·{' '}
        {settings.links.map((link, index) => (
          <span key={link.url}>
            {index > 0 ? ' · ' : null}
            <a href={link.url} target="_blank" rel="noreferrer">
              {link.label}
            </a>
          </span>
        ))}
        {' · '}
        <a href={settings.resumeHref}>Résumé (PDF)</a>
      </p>

      {pages.map((page) => {
        const template = getTemplate(page.templateId);
        const bySlot = new Map(page.panels.map((panel) => [panel.slot, panel]));

        return (
          <section key={page.id}>
            <h2>{page.title}</h2>
            {template.slots.map((slot) => {
              const panel = bySlot.get(slot);
              if (!panel) return null;
              return <PlainPanel key={slot} content={panel.content} />;
            })}
          </section>
        );
      })}
    </article>
  );
}
