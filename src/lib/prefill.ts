import 'server-only';

import Anthropic from '@anthropic-ai/sdk';

import { CAPS } from '@/content/types';

/**
 * Turn a link into a first draft of a project.
 *
 * The admin pastes a URL — usually a GitHub repo, sometimes a live site — and
 * this reads what the page can tell us (repo metadata and README, or the page's
 * own text) and asks Claude to map it onto the fields the project form has. What
 * comes back is a *draft*: every value lands in the form as an editable default,
 * so the editor's job becomes correcting rather than typing from a blank page.
 *
 * Nothing here is authoritative. The model can be wrong about a date or invent a
 * tidy STAR write-up from a thin README, which is exactly why the result is
 * poured into form fields the editor then reviews and saves, not written to the
 * database directly.
 */

/** The shape the form fills from — one key per field the editor can prefill. */
export type Prefill = {
  /** A lowercase slug for the id field (matches the form's `[a-z0-9-]+`). */
  id: string;
  title: string;
  /** YYYY-MM, or '' when the source gives no honest date. */
  date: string;
  context: 'personal' | 'professional';
  /** The card teaser. */
  summary: string;
  /** The one number, if the source states one — else ''. */
  impact: string;
  tech: string[];
  /** A cohesive story of the project, a paragraph or two — not a STAR breakdown. */
  story: string;
  links: { label: string; url: string; type: '' | 'live' | 'repo' | 'case_study' | 'press' }[];
};

/** Missing key is a configuration state, not a bug — say so in a sentence. */
class PrefillError extends Error {}

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

/** README and page text are trimmed to this before going to the model. */
const SOURCE_CAP = 12_000;

type Source = {
  /** What the link is, for the model's benefit: 'a GitHub repository' etc. */
  kind: string;
  /** The primary link to carry onto the project, already typed. */
  primaryLink: Prefill['links'][number] | null;
  /** A homepage or live URL the source advertises, if any. */
  liveLink: Prefill['links'][number] | null;
  /** The text the model reads: metadata lines plus README or page body. */
  text: string;
};

/* -------------------------------------------------------------------------
   Reading the source
------------------------------------------------------------------------- */

/** github.com/owner/repo → { owner, repo }, tolerating a trailing path or .git. */
function githubRepo(url: URL): { owner: string; repo: string } | null {
  if (!/(^|\.)github\.com$/i.test(url.hostname)) return null;
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const [owner, rawRepo] = parts;
  const repo = rawRepo.replace(/\.git$/i, '');
  // These are not repos, whatever the path depth suggests.
  if (['orgs', 'sponsors', 'settings', 'marketplace'].includes(owner)) return null;
  return { owner, repo };
}

function ghHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    // GitHub rejects API calls with no User-Agent.
    'User-Agent': 'portfolio-builder',
  };
  // A token lifts the unauthenticated 60/hr limit; it is optional, so the
  // feature still works without one until that ceiling is hit.
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function readGithub(owner: string, repo: string): Promise<Source> {
  const base = `https://api.github.com/repos/${owner}/${repo}`;

  const metaRes = await fetch(base, { headers: ghHeaders() });
  if (metaRes.status === 404) {
    throw new PrefillError('That GitHub repository is private or does not exist.');
  }
  if (metaRes.status === 403) {
    throw new PrefillError('GitHub rate limit reached — set GITHUB_TOKEN or try again later.');
  }
  if (!metaRes.ok) {
    throw new PrefillError(`GitHub returned ${metaRes.status} for that repository.`);
  }

  const meta = (await metaRes.json()) as {
    name?: string;
    full_name?: string;
    description?: string | null;
    homepage?: string | null;
    language?: string | null;
    topics?: string[];
    license?: { name?: string } | null;
    created_at?: string;
    pushed_at?: string;
    html_url?: string;
  };

  // The README, as raw text. Its absence is normal, not an error.
  let readme = '';
  const readmeRes = await fetch(`${base}/readme`, {
    headers: { ...ghHeaders(), Accept: 'application/vnd.github.raw+json' },
  });
  if (readmeRes.ok) readme = (await readmeRes.text()).slice(0, SOURCE_CAP);

  const lines = [
    `Name: ${meta.name ?? repo}`,
    meta.description ? `Description: ${meta.description}` : '',
    meta.language ? `Primary language: ${meta.language}` : '',
    meta.topics?.length ? `Topics: ${meta.topics.join(', ')}` : '',
    meta.homepage ? `Homepage: ${meta.homepage}` : '',
    meta.license?.name ? `License: ${meta.license.name}` : '',
    meta.created_at ? `Created: ${meta.created_at.slice(0, 7)}` : '',
    meta.pushed_at ? `Last pushed: ${meta.pushed_at.slice(0, 7)}` : '',
  ].filter(Boolean);

  const homepage = meta.homepage?.trim();

  return {
    kind: 'a GitHub repository',
    primaryLink: {
      label: 'GitHub',
      url: meta.html_url || `https://github.com/${owner}/${repo}`,
      type: 'repo',
    },
    liveLink:
      homepage && /^https?:\/\//i.test(homepage)
        ? { label: 'Live', url: homepage, type: 'live' }
        : null,
    text: [lines.join('\n'), readme && `\nREADME:\n${readme}`].filter(Boolean).join('\n'),
  };
}

/** Strip a page to something a model can read: title, meta description, body text. */
function pageText(html: string): { title: string; description: string; body: string } {
  const pick = (re: RegExp) => html.match(re)?.[1]?.trim() ?? '';

  const title =
    pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    pick(/<title[^>]*>([^<]+)<\/title>/i);
  const description =
    pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
    pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);

  const body = html
    // Drop the parts that are markup, not prose.
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, SOURCE_CAP);

  return { title, description, body };
}

async function readPage(url: URL): Promise<Source> {
  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'portfolio-builder', Accept: 'text/html,*/*' },
    redirect: 'follow',
  });
  if (!res.ok) throw new PrefillError(`That page returned ${res.status}.`);

  const html = await res.text();
  const { title, description, body } = pageText(html);

  const lines = [
    title ? `Page title: ${title}` : '',
    description ? `Description: ${description}` : '',
    `URL: ${url.toString()}`,
  ].filter(Boolean);

  return {
    kind: 'a project web page',
    primaryLink: { label: 'Live', url: url.toString(), type: 'live' },
    liveLink: null,
    text: [lines.join('\n'), body && `\nPage text:\n${body}`].filter(Boolean).join('\n'),
  };
}

/* -------------------------------------------------------------------------
   Asking the model
------------------------------------------------------------------------- */

const SCHEMA: Anthropic.Tool.InputSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    date: { type: 'string' },
    context: { type: 'string', enum: ['personal', 'professional'] },
    summary: { type: 'string' },
    impact: { type: 'string' },
    tech: { type: 'array', items: { type: 'string' } },
    story: { type: 'string' },
    links: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          label: { type: 'string' },
          url: { type: 'string' },
          type: { type: 'string', enum: ['', 'live', 'repo', 'case_study', 'press'] },
        },
        required: ['label', 'url', 'type'],
      },
    },
  },
  required: [
    'id',
    'title',
    'date',
    'context',
    'summary',
    'impact',
    'tech',
    'story',
    'links',
  ],
};

/** The house voice, shared by drafting and suggesting so both read the same. */
const VOICE = [
  'Voice — write like a good engineering portfolio, not a README or a press',
  'release. A hiring manager skims this in a few seconds:',
  '- Plain, concrete English. Short sentences. Say what it does and what changed.',
  '- No buzzwords or hype: avoid words like leveraged, seamless, robust,',
  '  cutting-edge, state-of-the-art, powerful, passionate, utilize.',
  '- Talk at the product and decision level, not line by line. Name a technical',
  '  choice only when it mattered to the result; skip setup, config, folder',
  '  layout, and dependency detail nobody reviewing a portfolio needs.',
  '- Favour outcomes and the one or two decisions that mattered over a full',
  '  feature list. When the source gives a number, lead with it.',
];

function systemPrompt(): string {
  return [
    'You draft entries for a software engineer\'s portfolio from a source they',
    'pasted a link to. You are filling a form the person will review and edit, so',
    'aim for a strong, honest first draft — never invent facts the source does not',
    'support. If the source is thin, leave a field empty rather than padding it.',
    '',
    ...VOICE,
    '',
    'Field rules:',
    `- id: a lowercase slug, letters/numbers/hyphens only, from the project name.`,
    `- title: the project's real, human-readable name.`,
    `- date: the month it was built or released as YYYY-MM if the source states or`,
    `  strongly implies one (e.g. a repo's creation month); otherwise "".`,
    `- context: "professional" only if the source shows it was built for or at a`,
    `  company; default "personal".`,
    `- summary: one or two plain sentences — what it is and why it is interesting —`,
    `  at most ${CAPS.projectSummary} characters. A teaser, not a spec.`,
    `- impact: a single concrete outcome or number if the source states one, else "".`,
    `- tech: the technologies actually named or clearly evidenced, as short tags.`,
    '- story: a cohesive write-up of the project — a paragraph or two (three at',
    '  most), the way you would tell it in an interview. Move naturally through the',
    '  situation, what you set out to do, what you did and the decisions that',
    '  mattered, and how it turned out — as flowing prose. Do NOT label those parts',
    '  or use headings; it is one story, not a STAR form. Base it on the source and',
    '  leave "" when the source is too thin to tell it honestly.',
    '- links: carry through the links you are given; do not invent URLs.',
  ].join('\n');
}

function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new PrefillError('Link parsing is not configured — set ANTHROPIC_API_KEY.');
  }
  return new Anthropic();
}

/** Pasted documents are trimmed to this — longer than a README, since it's prose. */
const DOC_CAP = 24_000;

/** A whole-string URL, as opposed to prose that merely mentions one. */
function looksLikeUrl(raw: string): boolean {
  return /^https?:\/\/\S+$/i.test(raw.trim());
}

/**
 * Read whatever the editor pasted — a URL to fetch, or a document to use as-is.
 *
 * A single URL is fetched (a GitHub repo or a plain page); anything else is
 * treated as the source text itself, which is what lets someone paste notes, a
 * spec, or a write-up rather than only a link.
 */
export async function readSource(raw: string): Promise<Source> {
  const input = raw.trim();
  if (!input) throw new PrefillError('Paste a document or a link first.');

  if (looksLikeUrl(input)) {
    let url: URL;
    try {
      url = new URL(input);
    } catch {
      throw new PrefillError('That does not look like a valid URL.');
    }
    const repo = githubRepo(url);
    return repo ? readGithub(repo.owner, repo.repo) : readPage(url);
  }

  return { kind: 'a pasted document', primaryLink: null, liveLink: null, text: input.slice(0, DOC_CAP) };
}

/**
 * One forced tool call, with the SDK's own errors translated to a sentence.
 *
 * Structured output via a forced tool: the model must answer by calling the
 * tool, so its `input` arrives validated rather than prose we hope is JSON.
 * Thinking is disabled because forcing a specific tool and extended thinking are
 * mutually exclusive, and this is extraction the admin is waiting on.
 */
async function callTool(
  system: string,
  userText: string,
  tool: { name: string; description: string; input_schema: Anthropic.Tool.InputSchema },
): Promise<unknown> {
  let message;
  try {
    message = await client().messages.create({
      model: MODEL,
      max_tokens: 4096,
      thinking: { type: 'disabled' },
      system,
      tools: [tool],
      tool_choice: { type: 'tool', name: tool.name },
      messages: [{ role: 'user', content: userText }],
    });
  } catch (error) {
    // PrefillError is already friendly; let it through. Otherwise turn the SDK's
    // raw "401 {...}" body into something the editor can act on.
    if (error instanceof PrefillError) throw error;
    const status = (error as { status?: number }).status;
    if (status === 401) throw new PrefillError('The Anthropic API key was rejected — check ANTHROPIC_API_KEY.');
    if (status === 404) throw new PrefillError(`The model "${MODEL}" was not found — check ANTHROPIC_MODEL.`);
    if (status === 429) throw new PrefillError('Anthropic rate limit reached — try again in a moment.');
    throw new PrefillError('Claude could not read that source — try again.');
  }

  const call = message.content.find((block) => block.type === 'tool_use');
  if (!call || call.type !== 'tool_use') {
    throw new PrefillError('The model returned nothing usable.');
  }
  return call.input;
}

/**
 * The whole draft flow: read the source, ask the model, normalise the answer.
 *
 * Normalising matters because the form has its own rules the model is only asked
 * to honour: the id must match `[a-z0-9-]+`, the links the source gave are the
 * ones we trust for URLs, and the model's link list is kept only for any it
 * usefully labelled. The source's own links lead.
 */
export async function prefillFromUrl(raw: string): Promise<Prefill> {
  const source = await readSource(raw);
  const input = await callTool(
    systemPrompt(),
    `The source is ${source.kind}. Draft a portfolio project from it.\n\n${source.text}`,
    { name: 'draft_project', description: 'Record the drafted portfolio project fields.', input_schema: SCHEMA },
  );
  return normalise(input as Prefill, source);
}

/* -------------------------------------------------------------------------
   Suggesting edits to an existing project
------------------------------------------------------------------------- */

/** The fields the suggest-edits flow may propose changes to. */
export const SUGGEST_FIELDS = ['title', 'summary', 'story', 'impact', 'tech'] as const;

export type SuggestField = (typeof SUGGEST_FIELDS)[number];

/** A suggestion per field — only the fields the model recommends changing. */
export type ProjectSuggestions = Partial<Record<SuggestField, string>>;

const SUGGEST_SCHEMA: Anthropic.Tool.InputSchema = {
  type: 'object',
  additionalProperties: false,
  // No `required`: the model includes only the fields it wants to change. `tech`
  // is a comma-separated string here to match the form's single tech input.
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    story: { type: 'string' },
    impact: { type: 'string' },
    tech: { type: 'string' },
  },
};

function suggestSystemPrompt(): string {
  return [
    'You suggest edits to an existing software engineer\'s portfolio project,',
    'using a source they pasted — a document, notes, or a link. They will review',
    'your suggestions field by field and apply the ones they want, so propose real',
    'improvements, not churn.',
    '',
    ...VOICE,
    '',
    'Rules:',
    '- Only include a field when you are recommending a change to it. Leave a field',
    '  out entirely when its current text is already good or the source adds nothing.',
    '- Base every change on the source, or on tightening the current text into the',
    '  voice above. Never invent facts present in neither.',
    '- Give the full replacement value for each field you include, not a diff.',
    `- summary is at most ${CAPS.projectSummary} characters; tech is a comma-separated`,
    '  list of short tags; story is a cohesive write-up of a paragraph or two (three',
    '  at most) — the project told the way you would in an interview, moving through',
    '  the situation, the goal, what you did and decided, and how it turned out, as',
    '  flowing prose with no labels or headings.',
  ].join('\n');
}

/** Format the current field values for the model, so it edits rather than invents. */
function formatCurrent(current: ProjectSuggestions): string {
  return SUGGEST_FIELDS.map((field) => {
    const value = (current[field] ?? '').trim();
    return `${field}: ${value || '(empty)'}`;
  }).join('\n');
}

/** Keep only string suggestions for known fields, trimmed and capped. */
function normaliseSuggestions(input: Record<string, unknown>): ProjectSuggestions {
  const cap: Partial<Record<SuggestField, number>> = {
    summary: CAPS.projectSummary,
    story: CAPS.projectStory,
  };
  const out: ProjectSuggestions = {};
  for (const field of SUGGEST_FIELDS) {
    const raw = input[field];
    if (typeof raw !== 'string') continue;
    const value = raw.trim();
    if (!value) continue;
    const limit = cap[field];
    out[field] = limit ? value.slice(0, limit) : value;
  }
  return out;
}

/**
 * Propose edits to an existing project from a pasted source.
 *
 * The current field values are sent alongside the source so the model edits what
 * is there rather than drafting from scratch, and it returns only the fields it
 * would change — which is what makes the reviewer's list short and honest.
 */
export async function suggestEdits(
  current: ProjectSuggestions,
  raw: string,
): Promise<ProjectSuggestions> {
  const source = await readSource(raw);
  const userText = [
    `The source is ${source.kind}. Suggest edits to the project below, using it.`,
    '',
    'CURRENT FIELDS:',
    formatCurrent(current),
    '',
    'SOURCE:',
    source.text,
  ].join('\n');

  const input = await callTool(suggestSystemPrompt(), userText, {
    name: 'suggest_edits',
    description: 'Record suggested edits, one entry per field you would change.',
    input_schema: SUGGEST_SCHEMA,
  });

  return normaliseSuggestions(input as Record<string, unknown>);
}

/** Make the model's answer safe to pour into the form. */
function normalise(draft: Prefill, source: Source): Prefill {
  const slug = (draft.id || draft.title || 'project')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  // The links the source itself gave are the trustworthy ones; the model's are
  // kept only when they add a URL the source did not already provide.
  const seed = [source.primaryLink, source.liveLink].filter(
    (link): link is Prefill['links'][number] => link !== null,
  );
  const known = new Set(seed.map((link) => link.url));
  const extra = (Array.isArray(draft.links) ? draft.links : [])
    .filter((link) => link && typeof link.url === 'string' && /^https?:\/\//i.test(link.url))
    .filter((link) => !known.has(link.url));

  const validType = new Set(['', 'live', 'repo', 'case_study', 'press']);

  return {
    id: slug || 'project',
    title: (draft.title || '').trim(),
    date: /^\d{4}-\d{2}$/.test(draft.date) ? draft.date : '',
    context: draft.context === 'professional' ? 'professional' : 'personal',
    summary: (draft.summary || '').slice(0, CAPS.projectSummary),
    impact: (draft.impact || '').trim(),
    tech: Array.isArray(draft.tech) ? draft.tech.map((t) => String(t).trim()).filter(Boolean) : [],
    story: (draft.story || '').slice(0, CAPS.projectStory),
    links: [...seed, ...extra].map((link) => ({
      label: (link.label || '').trim(),
      url: link.url.trim(),
      type: validType.has(link.type) ? link.type : '',
    })),
  };
}
