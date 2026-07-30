import {
  getExperience,
  getMetric,
  getProject,
  getProjects,
  getSettings,
  getTestimonial,
} from '@/content';
import type { Link as ContentLink, PanelContent, Project } from '@/content/types';
import { availabilityCopy, availabilityLabel, formatRange, isoRange } from '@/lib/format';

import { PanelMedia } from '../PanelMedia';

/**
 * Panel content renderers.
 *
 * ACC-4: panel titles are real headings. Every one of these renders `h2`,
 * because the page itself owns the single `h1` — see `ComicPage`. Nothing
 * here is a styled div pretending to be a heading.
 *
 * MODE-2: none of these render information that plain view lacks. If a fact
 * only exists inside a panel, it does not exist.
 */

function TechList({ tech }: { tech: string[] }) {
  if (tech.length === 0) return null;
  return (
    <ul className="tech-list">
      {tech.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function PanelLinks({ links }: { links: ContentLink[] }) {
  if (links.length === 0) return null;
  return (
    <div className="panel-links">
      {links.map((link) => (
        <a key={link.url} className="panel-link" href={link.url} target="_blank" rel="noreferrer">
          {link.label} ↗
        </a>
      ))}
    </div>
  );
}

function HeroPanel() {
  const settings = getSettings();

  return (
    <div className="hero-layout">
      <div className="hero-lockup">
        <p className="panel-kicker">Issue {settings.issueNumber}</p>
        {/* The page's h1 sits above this in the DOM and carries the name
            semantically, so the display lockup is a paragraph. */}
        <p className="panel-title panel-title--accent">{settings.displayName}</p>
        <p className="panel-subtitle">Software Engineer · React · TypeScript</p>
        <p className="panel-prose">{settings.tagline}</p>
      </div>

      {/* The corner box a comic cover puts its issue number and price in.
          Here it carries the two facts a recruiter is actually scanning for:
          where he is and whether he is reachable. */}
      <aside className="cover-box">
        <p className="cover-box-label">Status</p>
        <p className="cover-box-value">{availabilityLabel(settings.availabilityStatus)}</p>
        <p className="cover-box-label">Based in</p>
        <p className="cover-box-value">{settings.location}</p>
        <p className="cover-box-label">Open to</p>
        <ul className="tech-list">
          {settings.rolesOpenTo.map((role) => (
            <li key={role}>{role}</li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function ExperiencePanel({ id }: { id: string }) {
  const experience = getExperience(id);
  if (!experience) return null;

  const [cover] = experience.media ?? [];
  const links = experience.links ?? [];

  return (
    <div className="experience-layout" data-has-media={cover ? 'true' : undefined}>
      <div className="experience-copy">
        <p className="panel-kicker">
          <time dateTime={isoRange(experience.startDate, experience.endDate)}>
            {formatRange(experience.startDate, experience.endDate)}
          </time>
          {' · '}
          {experience.location}
        </p>
        <h2 className="panel-title">{experience.company}</h2>
        <p className="panel-subtitle">{experience.role}</p>
        <p className="panel-prose">{experience.summary}</p>
        {experience.impactBullets.length > 0 ? (
          <ul className="panel-bullets">
            {experience.impactBullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        ) : null}
        <PanelLinks links={links} />
      </div>

      {/* The shipped surface, when there is one to show. Professional work is
          the part a recruiter most wants to see and least often can. */}
      {cover ? (
        <div className="experience-media">
          <PanelMedia asset={cover} />
        </div>
      ) : null}
    </div>
  );
}

function ProjectPanel({ project }: { project: Project }) {
  const employer = project.experienceId ? getExperience(project.experienceId) : undefined;
  const [cover] = project.images;

  return (
    <>
      <p className="panel-kicker">
        {project.context === 'professional' && employer ? `Built at ${employer.company}` : 'Personal'}
      </p>
      <h2 className="panel-title">{project.title}</h2>
      {cover ? <PanelMedia asset={cover} /> : null}
      <p className="impact-flag">{project.impact}</p>
      <p className="panel-prose">{project.summary}</p>
      <div className="panel-foot">
        <TechList tech={project.tech} />
        <PanelLinks links={project.links} />
      </div>
    </>
  );
}

function TestimonialPanel({ id }: { id: string }) {
  // Returns undefined for anything not cleared by the person who said it.
  const testimonial = getTestimonial(id);
  if (!testimonial) return null;

  return (
    <figure style={{ margin: 0 }}>
      <blockquote className="balloon" data-type-on={testimonial.typeOn || undefined}>
        <span className="balloon-quote">{testimonial.quote}</span>
      </blockquote>
      <figcaption className="balloon-attribution">
        — {testimonial.authorName}, {testimonial.authorRole}, {testimonial.authorCompany}
      </figcaption>
    </figure>
  );
}

function MetricPanel({ id }: { id: string }) {
  const metric = getMetric(id);
  if (!metric) return null;

  return (
    <>
      {/* A starburst, drawn as tapering wedges rather than strokes. Lines of
          even weight read as scattered bars; wedges that narrow toward the
          centre read as a burst, which is what the reference page has.
          Decorative, so it is inert to assistive tech and the number below is
          the actual content. */}
      <svg
        className="speed-lines"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        {Array.from({ length: 14 }, (_, i) => {
          const step = (Math.PI * 2) / 14;
          const mid = i * step;
          // Narrow at the origin, wide at the rim.
          const inner = 0.06;
          const outer = 0.34;
          const point = (angle: number, radius: number) =>
            `${50 + Math.cos(angle) * radius},${50 + Math.sin(angle) * radius}`;
          return (
            <polygon
              key={i}
              points={[
                point(mid - step * inner, 6),
                point(mid - step * outer, 95),
                point(mid + step * outer, 95),
                point(mid + step * inner, 6),
              ].join(' ')}
            />
          );
        })}
      </svg>
      <p className="metric-value">{metric.value}</p>
      <h2 className="metric-label">
        <span className="metric-label-text">{metric.label}</span>
      </h2>
    </>
  );
}

function CtaPanel() {
  const settings = getSettings();
  const copy = availabilityCopy(settings.availabilityStatus, settings);

  return (
    <>
      <p className="panel-kicker">{copy.kicker}</p>
      <h2 className="panel-title">{copy.headline}</h2>
      <p className="panel-prose" style={{ marginBottom: 18 }}>
        {copy.body}
      </p>
      <a className="cta-button" href={`mailto:${settings.contactEmail}`}>
        {/* The label is its own element so it hugs the text rather than the
            burst's bounding box — the star's notches expose the panel behind,
            which is decoration, not the glyphs' background. */}
        <span className="cta-button-label">Hire me →</span>
      </a>
      <ul className="cta-contact">
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
    </>
  );
}

function TextPanel({
  heading,
  body,
  blurb = 'plain',
}: {
  heading: string;
  body: string;
  blurb?: 'plain' | 'balloon';
}) {
  if (blurb === 'balloon') {
    return (
      <>
        <h2 className="panel-title">{heading}</h2>
        <div className="balloon balloon--blurb">
          <span className="balloon-quote">{body}</span>
        </div>
      </>
    );
  }

  return (
    <>
      <h2 className="panel-title">{heading}</h2>
      <p className="panel-prose">{body}</p>
    </>
  );
}

/** Does a panel's content contain something clickable? Drives the hover lift. */
export function isInteractive(content: PanelContent): boolean {
  if (content.type === 'cta') return true;
  if (content.type === 'project') {
    const project = getProject(content.ref);
    return (project?.links.length ?? 0) > 0;
  }
  return false;
}

/** Extra class names a given content kind needs on the panel shell. */
export function panelClassName(content: PanelContent): string | undefined {
  if (content.type === 'metric') return 'metric-panel';
  if (content.type === 'cta') return 'cta-panel';
  return undefined;
}

export function PanelContentView({ content }: { content: PanelContent }) {
  switch (content.type) {
    case 'hero':
      return <HeroPanel />;
    case 'experience':
      return <ExperiencePanel id={content.ref} />;
    case 'project': {
      const project = getProject(content.ref);
      return project ? <ProjectPanel project={project} /> : null;
    }
    case 'testimonial':
      return <TestimonialPanel id={content.ref} />;
    case 'metric':
      return <MetricPanel id={content.ref} />;
    case 'cta':
      return <CtaPanel />;
    case 'text':
      return <TextPanel heading={content.heading} body={content.body} blurb={content.blurb} />;
    case 'image': {
      const project = getProjects().find((p) => p.images.some((image) => image.id === content.ref));
      const image = project?.images.find((candidate) => candidate.id === content.ref);
      return image ? <PanelMedia asset={image} /> : null;
    }
    case 'empty':
      return null;
  }
}
