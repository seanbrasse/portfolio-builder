import { Projects } from '@/components/Projects';
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
 * The one thing that scrolls is the project rail, horizontally, because a
 * carousel of work is the page's actual subject.
 *
 * TECH-1: statically generated. A visitor's page load touches no data source.
 */
export const dynamic = 'force-static';

export default function Home() {
  const settings = getSettings();
  const projects = getProjects();
  const experiences = getExperiences();

  // Projects name their employer by id and the card wants the company. Resolved
  // here rather than in the client component, which would otherwise ship every
  // experience to the browser to read one field.
  const employers = Object.fromEntries(experiences.map((item) => [item.id, item]));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema()) }}
      />

      <div className="screen">
        <div className="intro">
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
          <h2 className="section-label" id="work-label">
            Selected work
          </h2>
          <Projects projects={projects} employers={employers} />
        </section>
      </div>
    </>
  );
}
