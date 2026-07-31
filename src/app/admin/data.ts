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
  impact: string;
  tech: string[];
  links: { label: string; url: string; type?: string }[];
  date: string;
  published: boolean;
};

export type AdminImage = {
  id: string;
  project_id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  sort_order: number;
};

export type AdminSettings = {
  display_name: string;
  tagline: string;
  availability_status: string;
  roles_open_to: string[];
  skills: string[];
  education_school: string;
  education_credential: string;
  education_start_date: string;
  location: string;
  contact_email: string;
  resume_href: string;
  links: { label: string; url: string; type?: string }[];
  og_tagline: string;
};

export async function adminSettings(): Promise<AdminSettings | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase.from('settings').select('*').eq('id', true).maybeSingle();
  return (data as AdminSettings) ?? null;
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
  const { data } = await supabase.from('projects').select('*').order('date', { ascending: false });
  return (data as AdminProject[]) ?? [];
}

export async function adminProject(id: string): Promise<AdminProject | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
  return (data as AdminProject) ?? null;
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
