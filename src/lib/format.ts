import type { AvailabilityStatus, SiteSettings } from '@/content/types';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** '2023-04' -> 'Apr 2023'. Parsed by hand rather than via Date, which would
 *  shift the month backwards for anyone west of UTC. */
export function formatMonth(iso: string): string {
  const [year, month] = iso.split('-');
  const index = Number(month) - 1;
  return `${MONTHS[index] ?? month} ${year}`;
}

export function formatRange(start: string, end: string | null): string {
  return `${formatMonth(start)} — ${end ? formatMonth(end) : 'Present'}`;
}

/** For <time dateTime> and structured data. */
export function isoRange(start: string, end: string | null): string {
  return end ? `${start}/${end}` : start;
}

/** The short form, for the cover box. */
export function availabilityLabel(status: AvailabilityStatus): string {
  switch (status) {
    case 'open':
      return 'Available now';
    case 'selective':
      return 'Open to the right role';
    case 'not_looking':
      return 'Not looking';
  }
}

type AvailabilityCopy = {
  kicker: string;
  headline: string;
  body: string;
};

/**
 * The CTA panel's copy is driven by `availability_status` rather than written
 * per page, so changing one enum value changes what a recruiter reads.
 */
export function availabilityCopy(
  status: AvailabilityStatus,
  settings: SiteSettings,
): AvailabilityCopy {
  const roles = settings.rolesOpenTo.join(' or ').toLowerCase();

  switch (status) {
    case 'open':
      return {
        kicker: 'Next issue',
        headline: 'To be continued...',
        body: `Actively looking for ${roles} work in ${settings.location}. The fastest way to reach me is email.`,
      };
    case 'selective':
      return {
        kicker: 'Next issue',
        headline: 'To be continued...',
        body: `Happily employed, but open to ${roles} roles in ${settings.location} for the right team. Email is the fastest way to reach me.`,
      };
    case 'not_looking':
      return {
        kicker: 'Next issue',
        headline: 'To be continued...',
        body: `Not looking right now, but always glad to talk shop. Email still works.`,
      };
  }
}
