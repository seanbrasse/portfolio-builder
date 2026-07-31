import type { Experience } from '@/content/types';
import { formatRange, isoRange } from '@/lib/format';

/**
 * Career history as a timeline.
 *
 * An ordered list, because the order *is* the meaning — this is a sequence in
 * time, and that has to survive the CSS being ignored. The rule down the left
 * and the markers are drawn by the stylesheet and carry no text: a screen
 * reader gets "list of 3 items" and dated entries in order, which is the same
 * information the rule conveys visually.
 *
 * The current role is marked two ways, a filled marker and the word "Present"
 * in its dates. The fill is never the only signal.
 */
export function Timeline({ experiences }: { experiences: Experience[] }) {
  return (
    <ol className="timeline">
      {experiences.map((experience) => {
        const current = experience.endDate === null;

        return (
          <li key={experience.id} className="timeline-item" data-current={current || undefined}>
            <p className="timeline-dates">
              <time dateTime={isoRange(experience.startDate, experience.endDate)}>
                {formatRange(experience.startDate, experience.endDate)}
              </time>
            </p>

            <h3 className="timeline-role">{experience.role}</h3>

            <p className="timeline-company">
              {/* Decorative: the company name is right beside it in text, so a
                  screen reader announcing the logo would just repeat it. */}
              {experience.logo ? (
                <img
                  className="timeline-logo"
                  src={experience.logo.src}
                  alt=""
                  aria-hidden="true"
                  width={20}
                  height={20}
                />
              ) : null}
              {experience.company}
              <span className="timeline-location">· {experience.location}</span>
            </p>

            <p className="timeline-summary">{experience.summary}</p>

            {experience.impactBullets.length > 0 ? (
              <ul className="timeline-bullets">
                {experience.impactBullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
