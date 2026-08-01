'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import { supabaseBrowser } from '@/lib/supabase/browser';
import type { Result } from './actions';

/** What the browser can tell us about a file without decoding it twice. */
type Measured = {
  file: File;
  width: number;
  height: number;
  preview: string;
  media: 'image' | 'video';
};

/**
 * Intrinsic dimensions, measured rather than assumed.
 *
 * The card needs them to reserve the right box before the image loads, and
 * asking the file is the only way to know — a name and a MIME type say nothing
 * about shape. SVGs frequently report 0×0 because they have no intrinsic size,
 * which is correct and is why the columns allow it.
 */
function measure(file: File): Promise<Measured> {
  const media = file.type.startsWith('video/') ? 'video' : 'image';

  return new Promise((resolve, reject) => {
    const preview = URL.createObjectURL(file);

    if (media === 'video') {
      // `videoWidth` is only populated once metadata has arrived, which is a
      // different event from an image's load — an image is decoded whole, a
      // video announces its dimensions long before it has finished arriving.
      const clip = document.createElement('video');
      clip.onloadedmetadata = () =>
        resolve({ file, width: clip.videoWidth, height: clip.videoHeight, preview, media });
      clip.onerror = () => {
        URL.revokeObjectURL(preview);
        reject(new Error('That file could not be read as a video.'));
      };
      clip.src = preview;
      return;
    }

    const image = new Image();
    image.onload = () =>
      resolve({ file, width: image.naturalWidth, height: image.naturalHeight, preview, media });
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
  accept = 'image/png,image/jpeg,image/webp,image/avif,image/svg+xml,video/mp4,video/webm,video/quicktime',
}: {
  folder: string;
  onSave: (image: {
    src: string;
    alt: string;
    width: number;
    height: number;
    media: 'image' | 'video';
  }) => Promise<Result>;
  label: string;
  altHint: string;
  /** Narrowed where only a still makes sense — a company logo, for instance. */
  accept?: string;
}) {
  const [picked, setPicked] = useState<Measured | null>(null);
  const [alt, setAlt] = useState('');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const zone = useRef<HTMLButtonElement>(null);
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

  /**
   * Paste an image straight in. The clipboard carries files as `items`, so a
   * screenshot copied with the OS shortcut or an image copied from a browser
   * arrives here without ever touching the file picker.
   *
   * Bound while the zone holds focus rather than to the whole window: there can
   * be more than one uploader on a page — a project's screenshots and, in
   * future, other media — and a paste should land in the one the editor is
   * actually working in, not in whichever mounted first.
   */
  useEffect(() => {
    const node = zone.current;
    if (!node) return;

    const onPaste = (event: ClipboardEvent) => {
      const file = [...(event.clipboardData?.items ?? [])]
        .find((item) => item.kind === 'file')
        ?.getAsFile();
      if (file) {
        event.preventDefault();
        void choose(file);
      }
    };

    node.addEventListener('paste', onPaste);
    return () => node.removeEventListener('paste', onPaste);
  }, []);

  /**
   * The description that will be saved: what was typed, or the hint if nothing
   * was. The hint is written to read as usable alt text ("Avarint logo",
   * "Cadence screenshot") precisely so it can stand in — an empty field
   * defaulting to a prompt would be worse than the prompt. Alt text is still
   * required; this only changes what "required" falls back to.
   */
  const effectiveAlt = alt.trim() || altHint;

  function save() {
    if (!picked) return;

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
        alt: effectiveAlt,
        width: picked.width,
        height: picked.height,
        media: picked.media,
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
      <span className="field-label">{label}</span>

      {/* One target for all three ways in. Clicking or pressing it opens the
          file picker through the hidden input; a file dragged onto it drops in;
          a paste while it has focus lands too. It is a real button so the
          keyboard and a screen reader treat it as the control it looks like. */}
      <button
        type="button"
        ref={zone}
        className="dropzone"
        data-dragging={dragging || undefined}
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void choose(event.dataTransfer.files?.[0]);
        }}
      >
        <span className="dropzone-lead">Drop a file, paste, or click to choose</span>
        <span className="dropzone-sub">Image or video</span>
      </button>

      <input
        ref={input}
        type="file"
        accept={accept}
        hidden
        onChange={(event) => choose(event.target.files?.[0])}
      />

      {picked ? (
        <>
          {picked.media === 'video' ? (
            <video className="admin-preview" src={picked.preview} controls muted playsInline />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img className="admin-preview" src={picked.preview} alt="" />
          )}
          <p className="admin-note">
            {picked.width} × {picked.height}
          </p>

          <label className="field">
            <span className="field-label">Alt text — defaults to the grey suggestion</span>
            <input
              type="text"
              value={alt}
              onChange={(event) => setAlt(event.target.value)}
              /**
               * Tabbing out of an empty field commits the suggestion, so the
               * value you leave is the value that saves — no difference between
               * "looked filled in" and "was filled in". Uploading straight from
               * an empty field does the same, via `effectiveAlt`.
               */
              onBlur={() => {
                if (!alt.trim()) setAlt(altHint);
              }}
              placeholder={altHint}
            />
          </label>

          <button type="button" className="admin-button" onClick={save} disabled={pending}>
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
