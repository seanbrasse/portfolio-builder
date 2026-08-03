'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { setImageAudio } from './actions';

/**
 * Mark a clip as silent.
 *
 * Reliable audio detection for a muted, cross-origin, autoplaying clip is not
 * something the browser will tell us after the fact, so which clips have sound
 * is the editor's call. Checking this flags the clip as having no audio, and the
 * carousel then shows its unmute control disabled and muted rather than offering
 * a press that changes nothing.
 */
export function AudioToggle({ id, hasAudio }: { id: string; hasAudio: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const router = useRouter();

  return (
    <label className="admin-audio-toggle">
      <input
        type="checkbox"
        checked={!hasAudio}
        disabled={pending}
        onChange={(event) => {
          // Checked means "no audio", so the stored flag is the inverse.
          const nextHasAudio = !event.target.checked;
          start(async () => {
            const result = await setImageAudio(id, nextHasAudio);
            if (result.ok) router.refresh();
            else setError(result.error);
          });
        }}
      />
      <span className="admin-note">This clip has no audio (disable its unmute button)</span>
      {error ? (
        <span className="admin-error" role="status">
          {error}
        </span>
      ) : null}
    </label>
  );
}
