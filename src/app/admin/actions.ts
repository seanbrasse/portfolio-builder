'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { supabaseServer, isAdmin } from '@/lib/supabase/server';

/**
 * Every write the admin can make.
 *
 * Each one re-checks `isAdmin()` rather than trusting that the middleware let
 * the page render. A server action is a public endpoint with a generated name
 * — it is reachable by POST whether or not anyone loaded the page it came
 * from, so "the page was protected" is not a claim about the action.
 *
 * That is the third of three locks. The middleware keeps the page from
 * rendering, this keeps the action from running, and row-level security keeps
 * the row from changing. Any one of them failing leaves two.
 */

export type Result = { ok: true } | { ok: false; error: string };

const DENIED: Result = { ok: false, error: 'Not signed in as the site owner.' };

/**
 * The public page is statically generated, so a save that does not invalidate
 * it changes the database and nothing else — the site keeps serving the copy
 * built at deploy time and the edit looks like it silently failed.
 */
function republish() {
  revalidatePath('/', 'layout');
  revalidatePath('/admin');
}

/** A textarea of one-per-line values, as an array. Blank lines are not data. */
function lines(value: FormDataEntryValue | null): string[] {
  return String(value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

/** A comma-separated field, as an array. Same rule. */
function commas(value: FormDataEntryValue | null): string[] {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function text(form: FormData, key: string): string {
  return String(form.get(key) ?? '').trim();
}

/** An empty month field means "no end date", which is not the same as "". */
function month(form: FormData, key: string): string | null {
  const value = text(form, key);
  return value.length > 0 ? value : null;
}

/**
 * Link rows arrive as three parallel arrays, because that is what repeated
 * inputs with the same name produce and it needs no client-side state to
 * manage. A row with no URL is a row the editor started and abandoned.
 */
function links(form: FormData): { label: string; url: string; type?: string }[] {
  const labels = form.getAll('link_label').map(String);
  const urls = form.getAll('link_url').map(String);
  const types = form.getAll('link_type').map(String);

  return urls
    .map((url, index) => ({
      label: labels[index]?.trim() ?? '',
      url: url.trim(),
      type: types[index]?.trim() || undefined,
    }))
    .filter((link) => link.url.length > 0);
}

/* -------------------------------------------------------------------------
   Settings
------------------------------------------------------------------------- */

export async function saveSettings(form: FormData): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  const supabase = await supabaseServer();

  const { error } = await supabase
    .from('settings')
    .update({
      display_name: text(form, 'display_name'),
      tagline: text(form, 'tagline'),
      availability_status: text(form, 'availability_status'),
      roles_open_to: commas(form.get('roles_open_to')),
      skills: commas(form.get('skills')),
      education_school: text(form, 'education_school'),
      education_credential: text(form, 'education_credential'),
      education_start_date: text(form, 'education_start_date'),
      location: text(form, 'location'),
      contact_email: text(form, 'contact_email'),
      resume_href: text(form, 'resume_href'),
      links: links(form),
      og_tagline: text(form, 'og_tagline'),
      updated_at: new Date().toISOString(),
    })
    .eq('id', true);

  if (error) return { ok: false, error: error.message };
  republish();
  return { ok: true };
}

/* -------------------------------------------------------------------------
   Experiences — the timeline
------------------------------------------------------------------------- */

function experienceFields(form: FormData) {
  return {
    company: text(form, 'company'),
    role: text(form, 'role'),
    location: text(form, 'location'),
    start_date: text(form, 'start_date'),
    end_date: month(form, 'end_date'),
    summary: text(form, 'summary'),
    impact_bullets: lines(form.get('impact_bullets')),
    links: links(form),
    published: form.get('published') === 'on',
  };
}

export async function saveExperience(form: FormData): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  const supabase = await supabaseServer();

  const id = text(form, 'id');
  if (!id) return { ok: false, error: 'An id is required.' };

  const { error } = await supabase
    .from('experiences')
    .upsert({ id, ...experienceFields(form) });

  if (error) return { ok: false, error: error.message };
  republish();
  return { ok: true };
}

/**
 * The company's mark, saved once and read everywhere.
 *
 * This is the whole of "logos are consistent across companies": the logo is a
 * column on the employer, not a field on each project. The timeline badge and
 * every project card built at that company read the same row, so there is no
 * second place to update and no way for them to disagree.
 */
export async function saveLogo(
  id: string,
  logo: { src: string; alt: string; width: number; height: number } | null,
): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  const supabase = await supabaseServer();

  const { error } = await supabase
    .from('experiences')
    .update({
      logo_src: logo?.src ?? null,
      logo_alt: logo?.alt ?? '',
      logo_width: logo?.width ?? null,
      logo_height: logo?.height ?? null,
    })
    .eq('id', id);

  if (error) return { ok: false, error: error.message };
  republish();
  return { ok: true };
}

/**
 * Redirects rather than returning, like `deleteProject`. Refreshing in place
 * would re-run a page whose row no longer exists and land on a 404 — the row
 * being gone is the success case, so the page has to go with it.
 */
export async function deleteExperience(id: string): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  const supabase = await supabaseServer();

  const { error } = await supabase.from('experiences').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };

  republish();
  redirect('/admin');
}

/* -------------------------------------------------------------------------
   Projects — the cards
------------------------------------------------------------------------- */

export async function saveProject(form: FormData): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  const supabase = await supabaseServer();

  const id = text(form, 'id');
  if (!id) return { ok: false, error: 'An id is required.' };

  const context = text(form, 'context');
  const employer = text(form, 'experience_id');

  // The same rule the database has a constraint for, checked here so the
  // editor gets a sentence rather than a Postgres error string.
  if (context === 'professional' && !employer) {
    return { ok: false, error: 'A professional project has to name the company it was built at.' };
  }

  const { error } = await supabase.from('projects').upsert({
    id,
    title: text(form, 'title'),
    context,
    experience_id: employer || null,
    summary: text(form, 'summary'),
    impact: text(form, 'impact'),
    tech: commas(form.get('tech')),
    links: links(form),
    date: text(form, 'date'),
    published: form.get('published') === 'on',
  });

  if (error) return { ok: false, error: error.message };
  republish();
  return { ok: true };
}

export async function deleteProject(id: string): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  const supabase = await supabaseServer();

  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };

  republish();
  redirect('/admin');
}

/* -------------------------------------------------------------------------
   Images
------------------------------------------------------------------------- */

/**
 * Records an already-uploaded file.
 *
 * The bytes went straight from the browser to storage — see
 * `lib/supabase/browser.ts` — so what arrives here is a URL and the intrinsic
 * size the browser measured. Alt text is required by the column as well as by
 * the form, because a required field with a default of "" is not required.
 */
export async function addImage(
  projectId: string,
  image: { src: string; alt: string; width: number; height: number },
): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  if (!image.alt.trim()) return { ok: false, error: 'Alt text is required.' };

  const supabase = await supabaseServer();

  const { count } = await supabase
    .from('project_images')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId);

  const { error } = await supabase.from('project_images').insert({
    project_id: projectId,
    src: image.src,
    alt: image.alt.trim(),
    width: image.width,
    height: image.height,
    kind: 'screenshot',
    sort_order: count ?? 0,
  });

  if (error) return { ok: false, error: error.message };
  republish();
  return { ok: true };
}

export async function removeImage(id: string): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  const supabase = await supabaseServer();

  const { error } = await supabase.from('project_images').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };

  republish();
  return { ok: true };
}

/* -------------------------------------------------------------------------
   Session
------------------------------------------------------------------------- */

export async function signOut(): Promise<void> {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect('/');
}
