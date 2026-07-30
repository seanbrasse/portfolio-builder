import { getExperiences, getSettings } from '@/content';

import { siteUrl } from './site';

/**
 * TECH-3: structured data so the site ranks for his name.
 *
 * `Person` with the employment history attached, which is the closest standard
 * vocabulary to a resume — `JobPosting` describes an opening, not a job held,
 * so using it here would be schema abuse that Search Console flags.
 */
export function personSchema() {
  const settings = getSettings();
  const [current] = getExperiences();

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
    alumniOf: {
      '@type': 'CollegeOrUniversity',
      name: 'University at Buffalo, the State University of New York',
    },
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
