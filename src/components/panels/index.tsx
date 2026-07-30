import {
  getExperience,
  getMetric,
  getProject,
  getProjects,
  getSettings,
  getTestimonial,
} from '@/content';
import type { Asset, PanelContent, Project } from '@/content/types';
import { availabilityCopy, availabilityLabel, formatRange, isoRange } from '@/lib/format';

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

function ProjectImage({ image }: { image: Asset }) {
  const { x = 0.5, y = 0.5 } = image.focalPoint ?? {};
  return (
    <div className="panel-image-frame">
      {/* Plain <img>: these are decorative-adjacent screenshots inside a fixed
          panel, and next/image's wrapper fights `object-fit` inside a grid
          area that is already sized by the template. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="panel-image"
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        loading="lazy"
        decoding="async"
        data-treatment={image.treatment ?? 'duotone'}
        style={{ objectPosition: `${x * 100}% ${y * 100}%` }}
      />
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

  return (
    <>
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
    </>
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
      {cover ? <ProjectImage image={cover} /> : null}
      <p className="impact-flag">{project.impact}</p>
      <p className="panel-prose">{project.summary}</p>
      <div className="panel-foot">
        <TechList tech={project.tech} />
        {project.links.length > 0 ? (
          <div className="panel-links">
            {project.links.map((link) => (
              <a
                key={link.url}
                className="panel-link"
                href={link.url}
                target="_blank"
                rel="noreferrer"
              >
                {link.label} ↗
              </a>
            ))}
          </div>
        ) : null}
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
      {/* Radial speed lines. Decorative, so it is inert to assistive tech and
          the number below is the actual content. */}
      <svg
        className="speed-lines"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          return (
            <line
              key={i}
              x1="50"
              y1="50"
              x2={50 + Math.cos(angle) * 90}
              y2={50 + Math.sin(angle) * 90}
              stroke="var(--ink)"
              strokeWidth="2.5"
            />
          );
        })}
      </svg>
      <p className="metric-value">{metric.value}</p>
      <h2 className="metric-label">{metric.label}</h2>
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
        Hire me →
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

function TextPanel({ heading, body }: { heading: string; body: string }) {
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
      return <TextPanel heading={content.heading} body={content.body} />;
    case 'image': {
      const project = getProjects().find((p) => p.images.some((image) => image.id === content.ref));
      const image = project?.images.find((candidate) => candidate.id === content.ref);
      return image ? <ProjectImage image={image} /> : null;
    }
    case 'empty':
      return null;
  }
}
