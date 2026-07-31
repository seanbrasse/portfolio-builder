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
    templateId: 'splash-rail',
    status: 'published',
    panels: [
      // The establishing shot is the page. Name, role and the opening paragraph
      // sit *in* the picture rather than in a panel above it, which is the
      // arrangement the whole template exists for.
      {
        slot: 'splash',
        content: {
          type: 'hero',
          body: 'Computer science at Buffalo, then a first job modernizing a ten-year-old aerospace defense simulator. Then merchant onboarding at PayPal, then Mailchimp. Every move traded scale of hardware for scale of people — from simulated aircraft to a hundred thousand small businesses touching the same form builder.',
        },
        overrides: { accent: 'b', bleed: 'page', frame: 'none' },
      },
      // Four beats mounted down the right, in reading order: what he is doing
      // now, then the three numbers.
      {
        slot: 'rail-a',
        content: {
          type: 'text',
          heading: 'Currently',
          body: 'Software Engineer II at Intuit Mailchimp in New York, on the Forms and SMS platform. Most of what I ship crosses a React microfrontend, a legacy Dojo app, and a PHP monolith before it reaches a customer.',
        },
        overrides: { accent: 'c', frame: 'mat' },
      },
      {
        slot: 'rail-b',
        content: { type: 'metric', ref: 'qbo-merchants' },
        overrides: { accent: 'b', fill: 'solid', rays: true, frame: 'mat' },
      },
      {
        slot: 'rail-c',
        content: { type: 'metric', ref: 'arr-unlocked' },
        overrides: { accent: 'a', fill: 'solid', frame: 'mat' },
      },
      {
        slot: 'rail-d',
        content: { type: 'metric', ref: 'optin-lift' },
        overrides: { accent: 'c', fill: 'solid', frame: 'mat' },
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
    // Crosses the gutter between the first two bands.
    breakouts: [{ kind: 'speed-streak', x: 62, y: 25, w: 34, h: 6, rotate: -3, accent: 'a', opacity: 0.42 }],
    panels: [
      // One slant, repeated. Every gutter down this page is the same diagonal.
      { slot: 'a', content: { type: 'experience', ref: 'mailchimp' }, overrides: { accent: 'a', shape: 'band-up' } },
      { slot: 'b', content: { type: 'experience', ref: 'paypal' }, overrides: { accent: 'b', shape: 'band-up' } },
      { slot: 'c', content: { type: 'experience', ref: 'avarint' }, overrides: { accent: 'c', shape: 'band-up' } },
      // Professional side projects belong with the professional work, not
      // filed under nights-and-weekends.
      {
        slot: 'd',
        content: { type: 'project', ref: 'knowledge-engine' },
        overrides: { accent: 'b', fill: 'solid', shape: 'band-up' },
      },
    ],
  },
  /**
   * A case study, and the template for the ones that follow it.
   *
   * Every fact on this page is already elsewhere in this file — the Playwright
   * suite and the 0-to-85% are in the `how-i-work` copy on Contact, and the
   * Forms platform is Mailchimp's summary. A case study is a re-telling of a
   * claim the resume already makes, at the length it takes to be believable.
   * It is not a place to introduce a fact that has no other source.
   *
   * `work` is a `chart` rather than a `code` artifact for a reason worth
   * writing down. The code panel is built and this is exactly the slot it is
   * for, but the actual Playwright suite is Mailchimp's, not mine to publish,
   * and writing a plausible fragment to fill the frame would be inventing
   * evidence. Same reasoning as the empty `testimonials` array and the empty
   * project `images`: the component ships, the fabricated content does not.
   */
  {
    id: 'page-coverage',
    slug: 'coverage',
    title: 'The suite nobody assigned',
    caption: 'NOBODY ASSIGNED THIS...',
    templateId: 'case-study',
    status: 'published',
    ogTagline: 'End-to-end coverage on the Forms platform, from nothing to 85%.',
    panels: [
      {
        slot: 'scene',
        content: { type: 'art', art: 'skyline' },
        overrides: { accent: 'b', bleed: 'page', frame: 'none' },
      },
      {
        slot: 'problem',
        content: {
          type: 'text',
          heading: 'The problem',
          body: 'The Forms platform at Mailchimp shipped across a React microfrontend, a legacy Dojo app and the PHP monolith. Nothing tested the path a customer actually takes through all three, so every release was verified by hand and the parts nobody clicked were the parts that broke.',
        },
        overrides: { accent: 'a', frame: 'mat' },
      },
      {
        slot: 'approach',
        content: {
          type: 'text',
          heading: 'The approach',
          blurb: 'balloon',
          body: 'Scope the end-to-end gap across the platform rather than adding tests to whichever file was open. Author the first Playwright suite against the real customer path, then mentor a contract engineer through delivering the rest of it — a suite one person owns is a suite that leaves when they do.',
        },
        overrides: { accent: 'c', frame: 'mat' },
      },
      {
        slot: 'work',
        content: {
          type: 'chart',
          caption: 'End-to-end coverage, Forms platform',
          label: 'Playwright, authored from nothing and handed over.',
          from: 0,
          to: 85,
          unit: '%',
        },
        overrides: { accent: 'b', frame: 'mat' },
      },
      {
        slot: 'result',
        content: {
          type: 'text',
          heading: 'What it changed',
          body: 'Releases stopped depending on somebody remembering to click the Dojo path. The engineer who delivered the second half of the suite owns it now, which was the actual goal — shipping is the part after the feature works.',
        },
        overrides: { accent: 'a', fill: 'solid', frame: 'mat' },
      },
    ],
  },
  /**
   * The second case study. Same constraint as the first: every stage in the
   * pipeline below is a phrase out of the project's own one-line summary —
   * merged PRs, their linked Jira tickets, a searchable changelog, a RAG layer,
   * plain English. Drawing it as a diagram is a restatement of that sentence,
   * not an addition to it. The moment a stage appears here that the summary
   * does not support, the diagram has started making claims of its own.
   */
  {
    id: 'page-knowledge-engine',
    slug: 'knowledge-engine',
    title: 'Asking a codebase questions',
    caption: 'MEANWHILE, IN THE CHANGELOG...',
    templateId: 'case-study',
    status: 'published',
    ogTagline: 'A RAG layer over merged PRs and their Jira tickets.',
    panels: [
      {
        slot: 'scene',
        content: { type: 'art', art: 'skyline' },
        overrides: { accent: 'a', bleed: 'page', frame: 'none' },
      },
      {
        slot: 'problem',
        content: {
          type: 'text',
          heading: 'The problem',
          body: 'What shipped, and why, is spread across merged pull requests and the Jira tickets they close. Answering "when did this behaviour change, and who decided that" means reading both by hand, and the answer gets harder to find the longer the project runs.',
        },
        overrides: { accent: 'c', frame: 'mat' },
      },
      {
        slot: 'approach',
        content: {
          type: 'text',
          heading: 'The approach',
          blurb: 'balloon',
          body: 'Ingest merged PRs together with their linked tickets so the change and its reason arrive as one record, then put a retrieval layer over the result. The interface is a question in plain English rather than a query language, because the people who most need the answer are not the ones who wrote the code.',
        },
        overrides: { accent: 'b', frame: 'mat' },
      },
      {
        slot: 'work',
        content: {
          type: 'flow',
          caption: 'How a question gets answered',
          steps: [
            'Merged PRs',
            'Linked Jira tickets',
            'Searchable changelog',
            'RAG retrieval',
            'Plain-English answer',
          ],
        },
        overrides: { accent: 'a', frame: 'mat' },
      },
      {
        slot: 'result',
        content: {
          type: 'text',
          heading: 'Where it got to',
          body: 'Demoed to engineering leadership as V1 of an internal AI platform. Built in Python against the Jira API, with Claude behind the retrieval layer.',
        },
        overrides: { accent: 'b', fill: 'solid', frame: 'mat' },
      },
    ],
  },
  {
    id: 'page-builds',
    slug: 'builds',
    title: 'Builds',
    caption: 'NIGHTS AND WEEKENDS...',
    templateId: 'splash-side',
    status: 'published',
    ogTagline: 'Three things built to find out whether they could be.',
    panels: [
      // The establishing shot is the whole page; the three bands sit on its
      // right-hand side, so the gutters between them show the art underneath.
      {
        slot: 'splash',
        content: { type: 'art', art: 'skyline' },
        overrides: { accent: 'b', bleed: 'page' },
      },
      {
        slot: 'a',
        content: { type: 'project', ref: 'pass-the-interview' },
        overrides: { accent: 'a', shape: 'band-up' },
      },
      { slot: 'b', content: { type: 'project', ref: 'cadence' }, overrides: { accent: 'b', shape: 'band-up' } },
      { slot: 'c', content: { type: 'project', ref: 'life-os' }, overrides: { accent: 'c', shape: 'band-up' } },
    ],
    // Straddles the gutter between the splash and the stack beside it.
    // No breakout on this page. The stack beside the splash is three text
    // panels with no slack in them, so anything crossing that gutter lands on
    // copy — the audit caught a burst sitting on Cadence's tech chips at two
    // different positions. The crossing element here should be the figure,
    // which can be drawn to fit the gap rather than dropped into it.
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
        overrides: { accent: 'b' },
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
