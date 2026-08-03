import { supabaseServer } from '@/lib/supabase/server';

/**
 * What the admin sees.
 *
 * Separate from `src/content/db.ts` because the two want different things. The
 * public read maps rows onto the rendering types and never sees a draft; this
 * one wants the rows as they are, drafts included, with the `published` flag
 * intact so it can be edited.
 *
 * The session-carrying client is deliberate here. The read policies return
 * unpublished rows only to `is_admin()`, so the admin's view of the content is
 * a consequence of who is asking rather than of a filter this file remembers
 * to leave out.
 */

export type AdminEducation = {
  id: string;
  school: string;
  credential: string;
  location: string;
  start_date: string;
  end_date: string | null;
  logo_src: string | null;
  logo_alt: string;
  logo_width: number | null;
  logo_height: number | null;
  links: { label: string; url: string; type?: string }[];
  published: boolean;
};

export type AdminExperience = {
  id: string;
  company: string;
  role: string;
  location: string;
  start_date: string;
  end_date: string | null;
  summary: string;
  impact_bullets: string[];
  logo_src: string | null;
  logo_alt: string;
  logo_width: number | null;
  logo_height: number | null;
  links: { label: string; url: string; type?: string }[];
  published: boolean;
};

export type AdminProject = {
  id: string;
  title: string;
  context: 'professional' | 'personal';
  experience_id: string | null;
  summary: string;
  story: string;
  impact: string;
  status: 'shipped' | 'building' | 'archived';
  duration: string;
  tech: string[];
  links: { label: string; url: string; type?: string }[];
  date: string;
  published: boolean;
  starred: boolean;
  /** Row creation time — drives the admin's "Recently added" sort. */
  created_at: string;
  /**
   * True when this is a published project carrying a pending, unpublished draft
   * variation (staged edits not yet live). A plain unpublished project — one
   * whose own row is the draft — has this false; its state is `published:false`.
   */
  has_draft: boolean;
};

/**
 * The editable text fields of a project, as staged in `project_drafts.data`.
 *
 * Everything the form writes except the identity and lifecycle bits (`id`,
 * `published`, `starred`, `created_at`) and the images, which stay shared with
 * the published version rather than being staged.
 */
export type ProjectDraftData = {
  title: string;
  context: 'professional' | 'personal';
  experience_id: string | null;
  summary: string;
  story: string;
  impact: string;
  status: 'shipped' | 'building' | 'archived';
  duration: string;
  tech: string[];
  links: { label: string; url: string; type?: string }[];
  date: string;
};

export type AdminImage = {
  id: string;
  project_id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  media: 'image' | 'video';
  fit: 'cover' | 'contain';
  scale: number | null;
  focal_x: number | null;
  focal_y: number | null;
  has_audio: boolean;
  sort_order: number;
};

export type AdminSettings = {
  display_name: string;
  tagline: string;
  availability_status: string;
  roles_open_to: string[];
  skills: string[];
  // The `education_*` columns are still on this table and are deliberately not
  // listed. 0003 moved schools to their own table; naming them here would put
  // a second, editable copy back on the settings form.
  location: string;
  contact_email: string;
  resume_href: string;
  links: { label: string; url: string; type?: string }[];
  og_tagline: string;
  og_subtitle: string;
};

export async function adminSettings(): Promise<AdminSettings | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase.from('settings').select('*').eq('id', true).maybeSingle();
  return (data as AdminSettings) ?? null;
}

export async function adminEducations(): Promise<AdminEducation[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from('education')
    .select('*')
    .order('start_date', { ascending: false });
  return (data as AdminEducation[]) ?? [];
}

export async function adminEducation(id: string): Promise<AdminEducation | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase.from('education').select('*').eq('id', id).maybeSingle();
  return (data as AdminEducation) ?? null;
}

export async function adminExperiences(): Promise<AdminExperience[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from('experiences')
    .select('*')
    .order('start_date', { ascending: false });
  return (data as AdminExperience[]) ?? [];
}

export async function adminExperience(id: string): Promise<AdminExperience | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase.from('experiences').select('*').eq('id', id).maybeSingle();
  return (data as AdminExperience) ?? null;
}

export async function adminProjects(): Promise<AdminProject[]> {
  const supabase = await supabaseServer();
  const [rows, drafts] = await Promise.all([
    supabase.from('projects').select('*').order('date', { ascending: false }),
    supabase.from('project_drafts').select('project_id'),
  ]);
  const pending = new Set((drafts.data ?? []).map((row) => row.project_id as string));
  return ((rows.data as Omit<AdminProject, 'has_draft'>[]) ?? []).map((row) => ({
    ...row,
    has_draft: pending.has(row.id),
  }));
}

/** A single project, plus its pending draft edits if it has any. */
export async function adminProject(
  id: string,
): Promise<(AdminProject & { draft: ProjectDraftData | null }) | null> {
  const supabase = await supabaseServer();
  const [row, draft] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).maybeSingle(),
    supabase.from('project_drafts').select('data').eq('project_id', id).maybeSingle(),
  ]);
  if (!row.data) return null;
  const draftData = (draft.data?.data as ProjectDraftData | undefined) ?? null;
  return {
    ...(row.data as Omit<AdminProject, 'has_draft'>),
    has_draft: draftData !== null,
    draft: draftData,
  };
}

export async function adminImages(projectId: string): Promise<AdminImage[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from('project_images')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });
  return (data as AdminImage[]) ?? [];
}
