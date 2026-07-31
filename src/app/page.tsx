import { ThemeToggle } from '@/components/ThemeToggle';
import { Work } from '@/components/Work';
import { getExperiences, getProjects, getSettings } from '@/content';
import { personSchema } from '@/lib/schema';

/**
 * One screen. Name, what he does, what he knows, what he has built.
 *
 * The page does not scroll on a viewport tall enough to hold it — that is the
 * point of the layout, and it is why there is so little on it. Anything that
 * cannot earn a place in a single view does not belong here; the career
 * history, the metrics and the long intro all failed that test.
 *
 * The carousel is the page's subject, and the timeline above it marks where the
 * card currently in the middle sits in the career.
 *
 * TECH-1: statically generated. A visitor's page load touches no data source.
 */
export const dynamic = 'force-static';

export default async function Home() {
  const settings = await getSettings();
  // Newest first: the carousel opens on the most recent project and scrolling
  // forward walks back through time. The order is a presentation choice, so it
  // is made here rather than baked into the content file.
  const projects = [...(await getProjects())].sort((a, b) => b.date.localeCompare(a.date));
  const experiences = await getExperiences();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(await personSchema()) }}
      />

      <div className="screen">
        <div className="intro">
          {/* In the intro rather than in a bar of its own. A header whose only
              content was the name, sitting directly above an h1 of the name,
              was saying it twice — and taking a strip of a screen that cannot
              scroll to do it. Anchored to this block, the control lines up with
              the title by construction rather than by matching two paddings. */}
          <ThemeToggle />

          <h1>{settings.displayName}</h1>
          <p className="intro-role">Software Engineer · {settings.location}</p>
          <p className="intro-tagline">{settings.tagline}</p>

          <h2 className="section-label intro-skills-label">Skills</h2>
          <ul className="skills">
            {settings.skills.map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
        </div>

        <section className="work" aria-labelledby="work-label">
          {/* Named, not shown. The carousel is the only thing in this half of
              the page, so a label over it was telling the reader what they were
              already looking at — but the section still needs a name, or the
              landmark is an unlabelled region. */}
          <h2 className="sr-only" id="work-label">
            Selected work
          </h2>
          <Work projects={projects} experiences={experiences} education={settings.education} />
        </section>
      </div>
    </>
  );
}
