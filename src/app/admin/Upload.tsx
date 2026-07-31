'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';

import { supabaseBrowser } from '@/lib/supabase/browser';
import type { Result } from './actions';

/** What the browser can tell us about a file without decoding it twice. */
type Measured = { file: File; width: number; height: number; preview: string };

/**
 * Intrinsic dimensions, measured rather than assumed.
 *
 * The card needs them to reserve the right box before the image loads, and
 * asking the file is the only way to know — a name and a MIME type say nothing
 * about shape. SVGs frequently report 0×0 because they have no intrinsic size,
 * which is correct and is why the columns allow it.
 */
function measure(file: File): Promise<Measured> {
  return new Promise((resolve, reject) => {
    const preview = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () =>
      resolve({ file, width: image.naturalWidth, height: image.naturalHeight, preview });
    image.onerror = () => {
      URL.revokeObjectURL(preview);
      reject(new Error('That file could not be read as an image.'));
    };
    image.src = preview;
  });
}

/** A storage key that cannot collide and keeps the original extension. */
function keyFor(folder: string, file: File) {
  const dot = file.name.lastIndexOf('.');
  const extension = dot > 0 ? file.name.slice(dot).toLowerCase() : '';
  return `${folder}/${crypto.randomUUID()}${extension}`;
}

/**
 * Drop a file, describe it, save it.
 *
 * The bytes go from the browser straight to storage rather than through a
 * server action: a screenshot is several megabytes, and routing it through a
 * function means holding all of it in memory only to hand it on. The session
 * authorises the upload and the bucket policy checks `is_admin()`, so the
 * shortcut costs nothing in access control.
 *
 * Alt text gates the save (MEDIA-3). It is the one hard block in here, and it
 * is justified: an image with no description is unusable to anyone who cannot
 * see it, and "add it later" has never once happened.
 */
export function Upload({
  folder,
  onSave,
  label,
  altHint,
}: {
  folder: string;
  onSave: (image: { src: string; alt: string; width: number; height: number }) => Promise<Result>;
  label: string;
  altHint: string;
}) {
  const [picked, setPicked] = useState<Measured | null>(null);
  const [alt, setAlt] = useState('');
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function choose(file: File | undefined) {
    if (!file) return;
    setError('');
    try {
      setPicked(await measure(file));
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'That file could not be read.');
    }
  }

  function save() {
    if (!picked || !alt.trim()) return;

    start(async () => {
      setError('');
      const supabase = supabaseBrowser();
      const key = keyFor(folder, picked.file);

      const upload = await supabase.storage
        .from('media')
        .upload(key, picked.file, { cacheControl: '31536000', upsert: false });

      if (upload.error) {
        setError(upload.error.message);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('media').getPublicUrl(key);

      const result = await onSave({
        src: publicUrl,
        alt: alt.trim(),
        width: picked.width,
        height: picked.height,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      URL.revokeObjectURL(picked.preview);
      setPicked(null);
      setAlt('');
      if (input.current) input.current.value = '';
      router.refresh();
    });
  }

  return (
    <div className="admin-upload">
      <label className="field">
        <span className="field-label">{label}</span>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif,image/svg+xml"
          onChange={(event) => choose(event.target.files?.[0])}
        />
      </label>

      {picked ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="admin-preview" src={picked.preview} alt="" />
          <p className="admin-note">
            {picked.width} × {picked.height}
          </p>

          <label className="field">
            <span className="field-label">Alt text (required)</span>
            <input
              type="text"
              value={alt}
              onChange={(event) => setAlt(event.target.value)}
              placeholder={altHint}
            />
          </label>

          <button
            type="button"
            className="admin-button"
            onClick={save}
            disabled={pending || alt.trim().length === 0}
          >
            {pending ? 'Uploading…' : 'Upload'}
          </button>
        </>
      ) : null}

      {error ? (
        <p className="admin-error" role="status">
          {error}
        </p>
      ) : null}
    </div>
  );
}
