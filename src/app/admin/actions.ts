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
      // Education is its own table as of 0003 and is edited on its own pages.
      // The `education_*` columns still exist; writing them from here would
      // maintain a copy nothing reads.
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

export type Mark = { src: string; alt: string; width: number; height: number } | null;

/**
 * Write a mark onto a row.
 *
 * Not exported, and the table is a parameter of this helper rather than of any
 * action: the two wrappers below each bind it to a literal, so a table name is
 * never something a caller can supply. A server action's arguments arrive over
 * the wire.
 *
 * Schools and companies share this because they store a logo identically — four
 * columns with the same names and meanings. That is also why `toLogo` in the
 * read layer takes the columns rather than a row type.
 */
async function writeMark(
  table: 'experiences' | 'education',
  id: string,
  logo: Mark,
): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  const supabase = await supabaseServer();

  const { error } = await supabase
    .from(table)
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
 * The company's mark, saved once and read everywhere.
 *
 * This is the whole of "logos are consistent across companies": the logo is a
 * column on the employer, not a field on each project. The timeline badge and
 * every project card built at that company read the same row, so there is no
 * second place to update and no way for them to disagree.
 */
export async function saveLogo(id: string, logo: Mark): Promise<Result> {
  return writeMark('experiences', id, logo);
}

/**
 * The school's mark. Nothing but the timeline reads it — no project is built at
 * a university — so unlike a company logo this one has exactly one surface.
 */
export async function saveEducationLogo(id: string, logo: Mark): Promise<Result> {
  return writeMark('education', id, logo);
}

/* -------------------------------------------------------------------------
   Education — the front of the timeline
------------------------------------------------------------------------- */

function educationFields(form: FormData) {
  return {
    school: text(form, 'school'),
    credential: text(form, 'credential'),
    location: text(form, 'location'),
    start_date: text(form, 'start_date'),
    end_date: month(form, 'end_date'),
    links: links(form),
    published: form.get('published') === 'on',
  };
}

export async function saveEducation(form: FormData): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  const supabase = await supabaseServer();

  const id = text(form, 'id');
  if (!id) return { ok: false, error: 'An id is required.' };

  /**
   * The logo columns are absent from the payload on purpose, and that is safe:
   * a single-object upsert updates only the keys it names, so a mark uploaded
   * on the same page survives a save of the fields around it.
   */
  const { error } = await supabase.from('education').upsert({ id, ...educationFields(form) });

  if (error) return { ok: false, error: error.message };
  republish();
  return { ok: true };
}

export async function deleteEducation(id: string): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  const supabase = await supabaseServer();

  const { error } = await supabase.from('education').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };

  republish();
  redirect('/admin');
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

  /**
   * Is this the first save, or an edit of a row that already exists? The answer
   * changes two things below, so it is asked once here. The admin's client sees
   * drafts, so a row that exists is found whether or not it is published.
   */
  const existing = await supabase.from('projects').select('id').eq('id', id).maybeSingle();
  const creating = !existing.data;

  const { error } = await supabase.from('projects').upsert({
    id,
    title: text(form, 'title'),
    context,
    experience_id: employer || null,
    summary: text(form, 'summary'),
    impact: text(form, 'impact'),
    status: text(form, 'status') || 'shipped',
    duration: text(form, 'duration'),
    tech: commas(form.get('tech')),
    links: links(form),
    date: text(form, 'date'),
    // Pin to the front of the carousel. Like `published`, an edit-time choice —
    // the create form does not show it (a brand-new draft is not on the site to
    // pin), so on first save the checkbox is absent and this reads as false.
    starred: form.get('starred') === 'on',
    /**
     * A brand-new project is always a draft, no matter what the form said.
     * A project cannot be finished at the instant it is named — it has no
     * screenshots yet, because those can only be added once the row exists to
     * attach them to. Publishing is a deliberate later step, so creation does
     * not offer it; an edit of an existing row respects the checkbox.
     */
    published: creating ? false : form.get('published') === 'on',
  });

  if (error) return { ok: false, error: error.message };
  republish();

  /**
   * After the first save, go to the row's own edit page. That page is where
   * images and the rest live — the create form cannot show them because there
   * is no row to hang an image on yet — so landing there is what makes "add a
   * project, then add its screenshots" one continuous flow rather than a save
   * that appears to dead-end.
   */
  if (creating) redirect(`/admin/projects/${id}`);
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
  image: { src: string; alt: string; width: number; height: number; media: 'image' | 'video' },
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
    media: image.media,
    // A still starts on the column default, `contain`, so the whole of it shows
    // before anyone frames it. A clip starts on `cover`: a recording is composed
    // to its own edges, and letterboxing it inside a frame that is already a
    // frame reads as a mistake.
    fit: image.media === 'video' ? 'cover' : undefined,
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

/**
 * Move one image earlier or later in its project's order.
 *
 * Order is `sort_order`, and the first image is the one the card shows — so
 * moving an image to the front is how you choose the card's picture. This swaps
 * the row with its neighbour rather than rewriting the whole list: two updates,
 * and the values stay a clean sequence because that is all `addImage` ever put
 * there. A move off either end is a no-op that still reports success, so the
 * buttons at the ends do nothing rather than erroring.
 */
export async function moveImage(id: string, direction: 'up' | 'down'): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  const supabase = await supabaseServer();

  const target = await supabase
    .from('project_images')
    .select('id, project_id, sort_order')
    .eq('id', id)
    .maybeSingle();

  if (target.error) return { ok: false, error: target.error.message };
  if (!target.data) return { ok: false, error: 'That image no longer exists.' };

  const siblings = await supabase
    .from('project_images')
    .select('id, sort_order')
    .eq('project_id', target.data.project_id)
    .order('sort_order', { ascending: true });

  if (siblings.error) return { ok: false, error: siblings.error.message };

  const rows = siblings.data ?? [];
  const at = rows.findIndex((row) => row.id === id);
  const swapWith = direction === 'up' ? at - 1 : at + 1;

  // Already at the end it is moving toward: nothing to do, and not an error.
  if (swapWith < 0 || swapWith >= rows.length) return { ok: true };

  const a = rows[at];
  const b = rows[swapWith];

  const first = await supabase
    .from('project_images')
    .update({ sort_order: b.sort_order })
    .eq('id', a.id);
  if (first.error) return { ok: false, error: first.error.message };

  const second = await supabase
    .from('project_images')
    .update({ sort_order: a.sort_order })
    .eq('id', b.id);
  if (second.error) return { ok: false, error: second.error.message };

  republish();
  return { ok: true };
}

/**
 * How an already-uploaded image sits in the card's well.
 *
 * The focal point matters under `cover` (it anchors the crop) and at any fit
 * once `scale` climbs above 1 (it is the point the zoom keeps in view). When it
 * steers nothing — plain `contain` at scale 1 — it is nulled rather than kept
 * as a value that means nothing, so the next edit that needs it starts from
 * centre. Fractions clamp to 0..1 and the scale to the column's 1..3.
 */
export async function saveImageFraming(
  id: string,
  framing: { fit: 'cover' | 'contain'; focalX: number; focalY: number; scale: number },
): Promise<Result> {
  if (!(await isAdmin())) return DENIED;
  const supabase = await supabaseServer();

  const clamp = (n: number) => Math.min(1, Math.max(0, n));
  const scale = Math.min(3, Math.max(1, framing.scale));
  const steersCrop = framing.fit === 'cover' || scale > 1;

  const { error } = await supabase
    .from('project_images')
    .update({
      fit: framing.fit,
      scale,
      focal_x: steersCrop ? clamp(framing.focalX) : null,
      focal_y: steersCrop ? clamp(framing.focalY) : null,
    })
    .eq('id', id);

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
