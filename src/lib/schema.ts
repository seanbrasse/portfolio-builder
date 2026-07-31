import { getEducation, getExperiences, getSettings } from '@/content';

import { siteUrl } from './site';

/**
 * TECH-3: structured data so the site ranks for his name.
 *
 * `Person` with the employment history attached, which is the closest standard
 * vocabulary to a resume — `JobPosting` describes an opening, not a job held,
 * so using it here would be schema abuse that Search Console flags.
 */
export async function personSchema() {
  const settings = await getSettings();
  const [current] = await getExperiences();
  const schools = await getEducation();

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: settings.displayName,
    url: siteUrl(),
    email: `mailto:${settings.contactEmail}`,
    jobTitle: current?.role,
    description: settings.ogTagline,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'New York',
      addressRegion: 'NY',
      addressCountry: 'US',
    },
    worksFor: current
      ? { '@type': 'Organization', name: current.company }
      : undefined,
    /**
     * From the content, not from this file.
     *
     * This was a hardcoded string — and it had already drifted: it read
     * "University at Buffalo, the State University of New York" while the page
     * itself said "University at Buffalo". Search engines were being told a
     * different name than readers were shown, which is the failure mode that
     * duplicating content into a second place always ends in.
     *
     * Always an array, including for one school — `alumniOf` accepts a list,
     * and branching on the count to emit a bare object for the common case
     * would be two output shapes for one fact. Omitted entirely when there are
     * no schools; an empty array would assert attendance at nothing.
     */
    alumniOf: schools.length
      ? schools.map((school) => ({
          '@type': 'CollegeOrUniversity',
          name: school.school,
        }))
      : undefined,
    knowsAbout: [
      'React',
      'TypeScript',
      'Next.js',
      'Node.js',
      'Web accessibility',
      'Microfrontends',
    ],
    sameAs: settings.links.map((link) => link.url),
  };
}
