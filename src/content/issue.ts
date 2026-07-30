/**
 * Phase 0: the content, written before the layout.
 *
 * Every string here is real and sourced from Sean's resume. Nothing is
 * placeholder prose. When Phase 2 lands, this module is replaced by Supabase
 * queries returning the same shapes — that is the only change the rendering
 * layer should ever see, which is why the panels below reference content by
 * id rather than embedding it.
 *
 * Two deliberate absences, both of which are content decisions rather than
 * missing code:
 *
 *   1. `testimonials` is empty. The PRD's `approved` flag exists precisely so
 *      that a quote nobody has cleared cannot reach the page, and inventing a
 *      quote to fill a panel would be the single worst thing this project
 *      could ship. The testimonial panel is built and tested; it renders the
 *      moment a real, cleared quote is added here.
 *
 *   2. Project `images` are empty. Screenshots are the one input that cannot
 *      be derived from a resume. The image pipeline (duotone, focal point,
 *      theme response) is built; project panels render an inked blank until a
 *      file lands, which is COMP-4 behavior, not a broken state.
 */

import type { Issue } from './types';

const settings: Issue['settings'] = {
  displayName: 'Sean Brasse',
  tagline: 'Frontend engineer who ships the feature nobody wants to own.',
  issueNumber: '#1',
  // Employed and not urgently looking, but open to the right conversation.
  availabilityStatus: 'selective',
  rolesOpenTo: ['Senior Frontend', 'Full Stack'],
  location: 'New York, NY',
  contactEmail: 'seanbrasse@gmail.com',
  // MEDIA-6: stable path so links in old applications never rot.
  resumeHref: '/resume.pdf',
  links: [
    { label: 'LinkedIn', url: 'https://linkedin.com/in/seanbrasse' },
    { label: 'GitHub', url: 'https://github.com/seanbrasse' },
  ],
  ogTagline: 'Software Engineer II at Intuit Mailchimp. React, TypeScript, and the parts of the stack nobody else will touch.',
};

const experiences: Issue['experiences'] = [
  {
    id: 'mailchimp',
    company: 'Intuit Mailchimp',
    role: 'Software Engineer II',
    location: 'New York, NY',
    startDate: '2023-04',
    endDate: null,
    summary:
      'Forms and SMS platform. Features here ship across a React microfrontend, a legacy Dojo app, and the PHP monolith — often all three at once, often under legal review.',
    impactBullets: [
      'Shipped SMS Age Gating across three stacks, unlocking a segment worth ~$50M ARR under strict legal constraint',
      'Lifted customer opt-in rates ~50% by replacing the legacy Reply-Y step with an onsite verification flow',
      'Core engineer on a greenfield form builder for QuickBooks Online — 100K+ merchants activated in three months',
    ],
  },
  {
    id: 'paypal',
    company: 'PayPal',
    role: 'Full-Stack Software Engineer',
    location: 'New York, NY',
    startDate: '2022-07',
    endDate: '2023-02',
    summary:
      "Merchant onboarding. Built the Google One-Tap sign-up integration alongside Google's engineers, then found the mobile bug that was quietly blocking its launch.",
    impactBullets: [
      "Shipped Google One-Tap sign-up with Google's team, projected to add ~20,000 new merchants annually",
      'Traced a cross-browser iframe sizing bug that blocked input on mobile, unblocking the One-Tap launch',
      'Wired a Jest suite into Jenkins CI, lifting merchant onboarding coverage ~40%',
    ],
  },
  {
    id: 'avarint',
    company: 'Avarint',
    role: 'Software Engineer',
    location: 'Buffalo, NY',
    startDate: '2021-09',
    endDate: '2022-07',
    summary:
      'Aerospace defense modeling. Rebuilt DIADS — a ten-year-old simulator for sensors tracking incoming aircraft — with a seven-person team, so it finally ran in a browser.',
    impactBullets: [
      'Rebuilt a 10-year-old defense modeling codebase in React with a seven-person team',
      'Led the landing page redesign, cutting new-user onboarding time 30%',
    ],
  },
];

const projects: Issue['projects'] = [
  {
    id: 'knowledge-engine',
    title: 'LLM Knowledge Engine',
    context: 'professional',
    experienceId: 'mailchimp',
    summary:
      'Ingests merged PRs and their linked Jira tickets into a searchable changelog, with a RAG layer so you can ask it questions in plain English.',
    impact: 'Demoed to engineering leadership as V1 of an internal AI platform',
    tech: ['Python', 'RAG', 'Claude', 'Jira API'],
    links: [],
    images: [],
    date: '2026-01',
  },
  {
    id: 'pass-the-interview',
    title: 'Pass the Interview',
    context: 'personal',
    summary:
      'LeetCode you can talk to. Think out loud while you code and an AI interviewer listens, pushes back, and grades you — in speech and in writing.',
    impact: '69 problems across DSA, system design, OOD, backend, and frontend',
    tech: ['React', 'Pyodide', 'Web Speech API', 'Claude', 'Supabase'],
    links: [{ label: 'passtheinterview.dev', url: 'https://passtheinterview.dev', type: 'live' }],
    images: [],
    date: '2026-07',
  },
  {
    id: 'cadence',
    title: 'Cadence',
    context: 'personal',
    summary:
      'Consistency-first fitness tracker. Native SwiftUI with an offline-first SwiftData store and read-only Apple Health sync for sleep, weight, and nutrition.',
    impact: 'Agentic coach that logs your weight and edits your split from chat',
    tech: ['Swift', 'SwiftUI', 'SwiftData', 'HealthKit', 'Supabase', 'Claude'],
    links: [],
    images: [],
    date: '2026-07',
  },
  {
    id: 'life-os',
    title: 'JARVIS Life OS',
    context: 'personal',
    summary:
      'Cross-device life tracking PWA. Goal gauges, a backfillable timeline, Apple Health ingest, and an accountability engine that writes you a review each night.',
    impact: 'Nightly reviews written by Claude, delivered as web push',
    tech: ['React', 'Supabase', 'Claude', 'Vercel', 'PWA'],
    images: [],
    links: [],
    date: '2026-07',
  },
];

const metrics: Issue['metrics'] = [
  { id: 'qbo-merchants', value: '100K+', label: 'QBO merchants activated' },
  { id: 'arr-unlocked', value: '~$50M', label: 'ARR segment unlocked' },
  { id: 'optin-lift', value: '~50%', label: 'Lift in customer opt-in rate' },
];

/**
 * See the note at the top of this file. Adding an entry here with
 * `approved: false` is the correct way to park a quote you have asked for but
 * not yet had cleared — it will not render.
 */
const testimonials: Issue['testimonials'] = [];

const pages: Issue['pages'] = [
  {
    id: 'page-origin',
    slug: 'origin',
    title: 'Origin',
    caption: 'MEANWHILE, IN NEW YORK...',
    templateId: 'hero-2-3',
    status: 'published',
    panels: [
      { slot: 'hero', content: { type: 'hero' }, overrides: { accent: 'b', shape: 'canted' } },
      {
        slot: 'left',
        content: {
          type: 'text',
          heading: 'The origin story',
          blurb: 'balloon',
          body: 'Computer science at Buffalo, then a first job modernizing a ten-year-old aerospace defense simulator. Then merchant onboarding at PayPal, then Mailchimp. Every move traded scale of hardware for scale of people — from simulated aircraft to a hundred thousand small businesses touching the same form builder.',
        },
        overrides: { accent: 'a' },
      },
      {
        slot: 'right',
        content: {
          type: 'text',
          heading: 'Currently',
          body: 'Software Engineer II at Intuit Mailchimp in New York, on the Forms and SMS platform. Most of what I ship crosses a React microfrontend, a legacy Dojo app, and a PHP monolith before it reaches a customer.',
        },
        overrides: { accent: 'c' },
      },
      // The three loud panels on the page. Solid flats, inverted lettering,
      // radiating rays — this is the row a recruiter remembers.
      {
        slot: 'a',
        content: { type: 'metric', ref: 'qbo-merchants' },
        overrides: { accent: 'b', fill: 'solid', rays: true, tilt: -0.5 },
      },
      {
        slot: 'b',
        content: { type: 'metric', ref: 'arr-unlocked' },
        overrides: { accent: 'a', fill: 'solid' },
      },
      {
        slot: 'c',
        content: { type: 'metric', ref: 'optin-lift' },
        overrides: { accent: 'c', fill: 'solid', tilt: 0.5 },
      },
    ],
  },
  {
    id: 'page-work',
    slug: 'work',
    title: 'Work',
    caption: 'FOUR YEARS EARLIER...',
    templateId: 'stack-4',
    status: 'published',
    ogTagline: 'Mailchimp, PayPal, and a ten-year-old defense simulator.',
    sfx: { text: 'SHIP IT!', slot: 'a', rotate: -11 },
    panels: [
      { slot: 'a', content: { type: 'experience', ref: 'mailchimp' }, overrides: { accent: 'a', tilt: -0.35 } },
      { slot: 'b', content: { type: 'experience', ref: 'paypal' }, overrides: { accent: 'b', shape: 'canted' } },
      { slot: 'c', content: { type: 'experience', ref: 'avarint' }, overrides: { accent: 'c', tilt: 0.35 } },
      // Professional side projects belong with the professional work, not
      // filed under nights-and-weekends.
      {
        slot: 'd',
        content: { type: 'project', ref: 'knowledge-engine' },
        overrides: { accent: 'b', fill: 'solid' },
      },
    ],
  },
  {
    id: 'page-builds',
    slug: 'builds',
    title: 'Builds',
    caption: 'NIGHTS AND WEEKENDS...',
    templateId: 'stack-3',
    status: 'published',
    ogTagline: 'Three things built to find out whether they could be.',
    panels: [
      {
        slot: 'a',
        content: { type: 'project', ref: 'pass-the-interview' },
        overrides: { accent: 'a', shape: 'canted' },
      },
      { slot: 'b', content: { type: 'project', ref: 'cadence' }, overrides: { accent: 'b' } },
      { slot: 'c', content: { type: 'project', ref: 'life-os' }, overrides: { accent: 'c', tilt: 0.4 } },
    ],
  },
  {
    id: 'page-contact',
    slug: 'contact',
    title: 'Contact',
    caption: 'TO BE CONTINUED...',
    templateId: 'hero-2',
    status: 'published',
    ogTagline: 'Open to senior frontend and full-stack work in New York.',
    panels: [
      { slot: 'hero', content: { type: 'cta' }, overrides: { accent: 'a', fill: 'solid' } },
      {
        slot: 'a',
        content: {
          type: 'text',
          heading: "What I'm after",
          body: 'Senior frontend or full-stack work where I own a surface end to end: the technical design, the implementation, and the rollout. The problems I like best are the ones where the constraint is legal, cross-team, or ten years old.',
        },
        overrides: { accent: 'b', tilt: -0.4 },
      },
      {
        slot: 'b',
        content: {
          type: 'text',
          heading: 'How I work',
          blurb: 'balloon',
          body: 'I tend to write the test suite nobody assigned. At Mailchimp that meant scoping the end-to-end coverage gap across the Forms platform, authoring the first Playwright suite, and mentoring a contract engineer through delivery — 0% to 85%. Shipping is the part after the feature works.',
        },
        overrides: { accent: 'c', shape: 'canted' },
      },
    ],
  },
];

export const issue: Issue = {
  settings,
  pages,
  experiences,
  projects,
  testimonials,
  metrics,
};
