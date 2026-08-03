'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import { supabaseBrowser } from '@/lib/supabase/browser';
import type { Result } from './actions';

/**
 * The largest file the storage bucket will take. Kept in step by hand with the
 * `media` bucket's `file_size_limit` in Supabase — the browser has no way to
 * read that config, so the number lives here too and is stated to the editor
 * up front rather than after a rejected upload. If the bucket limit changes,
 * change this with it.
 */
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** A size in the units a person reads — "8.4 MB", "63 MB". */
function formatBytes(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
}

/** What the browser can tell us about a file without decoding it twice. */
type Measured = {
  file: File;
  width: number;
  height: number;
  preview: string;
  media: 'image' | 'video';
};

/**
 * A file waiting to be uploaded. It carries its own id — so React can key it
 * and a Remove can name it — and its own alt text, because every file staged
 * at once needs a description of its own.
 */
type Staged = Measured & { id: string; alt: string };

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
 * Drop files, describe them, save them.
 *
 * More than one at a time: a project's screenshots usually arrive as a set, so
 * the picker, a drop and a paste all take several files, each staged with its
 * own preview and its own alt field and its own Remove. Nothing is written
 * until Upload — a file added by mistake is taken back out of the queue, not
 * deleted from storage after the fact.
 *
 * The bytes go from the browser straight to storage rather than through a
 * server action: a screenshot is several megabytes, and routing it through a
 * function means holding all of it in memory only to hand it on. The session
 * authorises the upload and the bucket policy checks `is_admin()`, so the
 * shortcut costs nothing in access control.
 *
 * Alt text gates the save (MEDIA-3), still — but it falls back to the hint, so
 * a file left with an empty field saves with the suggestion rather than being
 * blocked. An image with no description is unusable to anyone who cannot see
 * it, and "add it later" has never once happened.
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
  const [staged, setStaged] = useState<Staged[]>([]);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const zone = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  /**
   * Measure and queue whatever was handed in — a picker selection, a drop, or a
   * paste, any of which can carry several files. Each is checked against the
   * size limit and read for its dimensions before it joins the queue; the ones
   * that fail either test are named in the error and simply left out, so one bad
   * file does not sink the rest of the batch.
   */
  async function choose(files: FileList | File[] | null | undefined) {
    const list = Array.from(files ?? []);
    if (!list.length) return;
    setError('');

    const measured: Staged[] = [];
    const problems: string[] = [];

    for (const file of list) {
      if (file.size > MAX_UPLOAD_BYTES) {
        problems.push(`${file.name} is ${formatBytes(file.size)}`);
        continue;
      }
      try {
        const m = await measure(file);
        measured.push({ ...m, id: crypto.randomUUID(), alt: '' });
      } catch {
        problems.push(`${file.name} could not be read`);
      }
    }

    if (measured.length) setStaged((current) => [...current, ...measured]);
    if (problems.length) {
      setError(
        `Skipped ${problems.join('; ')} — the upload limit is ${formatBytes(MAX_UPLOAD_BYTES)} ` +
          `and files have to be a readable image or video.`,
      );
    }
  }

  /** Take a file back out of the queue and release its preview. */
  function removeStaged(id: string) {
    setStaged((current) => {
      const going = current.find((item) => item.id === id);
      if (going) URL.revokeObjectURL(going.preview);
      return current.filter((item) => item.id !== id);
    });
  }

  function setAltFor(id: string, value: string) {
    setStaged((current) =>
      current.map((item) => (item.id === id ? { ...item, alt: value } : item)),
    );
  }

  /**
   * Paste files straight in. The clipboard carries files as `items`, and a
   * paste can hold more than one, so all of them come through — a screenshot
   * copied with the OS shortcut or images copied from a browser arrive here
   * without ever touching the file picker.
   *
   * Bound while the zone holds focus rather than to the whole window: there can
   * be more than one uploader on a page, and a paste should land in the one the
   * editor is actually working in, not in whichever mounted first.
   */
  useEffect(() => {
    const node = zone.current;
    if (!node) return;

    const onPaste = (event: ClipboardEvent) => {
      const files = [...(event.clipboardData?.items ?? [])]
        .filter((item) => item.kind === 'file')
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);
      if (files.length) {
        event.preventDefault();
        void choose(files);
      }
    };

    node.addEventListener('paste', onPaste);
    return () => node.removeEventListener('paste', onPaste);
  }, []);

  /**
   * Release every staged preview if the uploader unmounts mid-edit. The remove
   * and upload paths revoke as they go; this catches the queue that was still
   * open when the page navigated away. A ref, so the cleanup sees the current
   * queue rather than the empty one it closed over at mount.
   */
  const stagedRef = useRef<Staged[]>([]);
  useEffect(() => {
    stagedRef.current = staged;
  }, [staged]);
  useEffect(
    () => () => {
      stagedRef.current.forEach((item) => URL.revokeObjectURL(item.preview));
    },
    [],
  );

  /**
   * Upload the whole queue, one file after another. Each is sent to storage and
   * then recorded through `onSave`; the ones that land are dropped from the
   * queue and the ones that fail stay in it, named, so a retry is just pressing
   * Upload again rather than re-adding everything.
   */
  function save() {
    if (!staged.length) return;

    start(async () => {
      setError('');
      const supabase = supabaseBrowser();
      const batch = staged;
      const doneIds: string[] = [];
      const failures: string[] = [];

      for (const item of batch) {
        const key = keyFor(folder, item.file);
        const upload = await supabase.storage
          .from('media')
          .upload(key, item.file, { cacheControl: '31536000', upsert: false });

        if (upload.error) {
          // The bucket's own size rejection reads "The object exceeded the
          // maximum allowed size" and never names the size. Restate it with the
          // number when that is what came back; pass anything else through.
          const why = /maximum allowed size|payload too large|exceeded/i.test(upload.error.message)
            ? `larger than the ${formatBytes(MAX_UPLOAD_BYTES)} limit`
            : upload.error.message;
          failures.push(`${item.file.name} (${why})`);
          continue;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('media').getPublicUrl(key);

        const result = await onSave({
          src: publicUrl,
          alt: item.alt.trim() || altHint,
          width: item.width,
          height: item.height,
          media: item.media,
        });

        if (!result.ok) {
          failures.push(`${item.file.name} (${result.error})`);
          continue;
        }

        URL.revokeObjectURL(item.preview);
        doneIds.push(item.id);
      }

      setStaged((current) => current.filter((item) => !doneIds.includes(item.id)));
      if (failures.length) {
        setError(`Didn't upload: ${failures.join('; ')}.`);
      } else if (input.current) {
        input.current.value = '';
      }
      // A successful upload is a natural checkpoint: nudge the editor's autosave
      // to flush any pending text edits now, so a refresh right after adding a
      // clip keeps both the media (saved above) and the words. No-op where no
      // autosave is listening (a logo uploader, say).
      if (doneIds.length) window.dispatchEvent(new Event('admin-autosave-flush'));
      router.refresh();
    });
  }

  return (
    <div className="admin-upload">
      {/* The files waiting to go up, newest at the bottom, each with its own
          description and its own way out of the queue. The add target sits
          below them, so it is always under the thing most recently added. */}
      {staged.length ? (
        <ol className="admin-staged">
          {staged.map((item) => (
            <li key={item.id} className="admin-staged-item">
              {item.media === 'video' ? (
                <video className="admin-preview" src={item.preview} controls muted playsInline />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img className="admin-preview" src={item.preview} alt="" />
              )}
              <p className="admin-note">
                {item.width} × {item.height}
              </p>

              <label className="field">
                <span className="field-label">Alt text — defaults to the grey suggestion</span>
                <input
                  type="text"
                  value={item.alt}
                  onChange={(event) => setAltFor(item.id, event.target.value)}
                  /**
                   * Tabbing out of an empty field commits the suggestion, so the
                   * value left is the value that saves — no difference between
                   * "looked filled in" and "was filled in".
                   */
                  onBlur={() => {
                    if (!item.alt.trim()) setAltFor(item.id, altHint);
                  }}
                  placeholder={altHint}
                />
              </label>

              <button
                type="button"
                className="admin-button admin-quiet"
                onClick={() => removeStaged(item.id)}
                disabled={pending}
              >
                Remove
              </button>
            </li>
          ))}
        </ol>
      ) : null}

      <span className="field-label">{label}</span>

      {/* One target for all three ways in. Clicking or pressing it opens the
          file picker through the hidden input; files dragged onto it drop in;
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
          void choose(event.dataTransfer.files);
        }}
      >
        <span className="dropzone-lead">Drop files, paste, or click to choose</span>
        <span className="dropzone-sub">Images or video · several at once</span>
      </button>

      <input
        ref={input}
        type="file"
        accept={accept}
        multiple
        hidden
        onChange={(event) => choose(event.target.files)}
      />

      {staged.length ? (
        <button type="button" className="admin-button" onClick={save} disabled={pending}>
          {pending
            ? 'Uploading…'
            : staged.length > 1
              ? `Upload ${staged.length} files`
              : 'Upload'}
        </button>
      ) : null}

      {error ? (
        <p className="admin-error" role="status">
          {error}
        </p>
      ) : null}
    </div>
  );
}
