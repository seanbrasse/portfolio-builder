'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';

import { saveImageFraming } from './actions';
import type { AdminImage } from './data';

/**
 * Frame one already-uploaded image in the card's 16:9 well.
 *
 * The card's well is a fixed shape; a screenshot usually is not. This is where
 * that mismatch is resolved, per image, with the same well rendered live above
 * the controls so the choice is made by looking rather than by guessing and
 * saving.
 *
 * Two controls:
 *   • Fit — cover fills the well and crops; contain shows the whole image
 *     letterboxed. Contain is the answer to "it doesn't fit" when nothing
 *     should be cut.
 *   • Focus — where the crop is anchored, and only shown under cover, because
 *     contain has nothing to crop. Set it by dragging on the preview or with
 *     the two sliders; the sliders are what make it reachable from a keyboard.
 *
 * A video is left alone: a clip is not cropped to a focal point, and its own
 * frame is the composition. The well shows it whole.
 */
export function ImageAdjust({ image }: { image: AdminImage }) {
  const [fit, setFit] = useState<'cover' | 'contain'>(image.fit ?? 'cover');
  const [x, setX] = useState(image.focal_x ?? 0.5);
  const [y, setY] = useState(image.focal_y ?? 0.5);
  const [state, setState] = useState<'idle' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();
  const well = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const router = useRouter();

  const dirty =
    fit !== (image.fit ?? 'cover') ||
    (fit === 'cover' && (x !== (image.focal_x ?? 0.5) || y !== (image.focal_y ?? 0.5)));

  function pointTo(clientX: number, clientY: number) {
    const box = well.current?.getBoundingClientRect();
    if (!box) return;
    setX(Math.min(1, Math.max(0, (clientX - box.left) / box.width)));
    setY(Math.min(1, Math.max(0, (clientY - box.top) / box.height)));
    setState('idle');
  }

  function save() {
    start(async () => {
      const result = await saveImageFraming(image.id, { fit, focalX: x, focalY: y });
      if (result.ok) {
        setState('saved');
        setMessage('');
        router.refresh();
      } else {
        setState('error');
        setMessage(result.error);
      }
    });
  }

  const position = `${x * 100}% ${y * 100}%`;

  return (
    <div className="admin-frame-editor">
      {/* The well, at the card's ratio. Dragging sets the focal point under
          cover; under contain there is nothing to point at, so it is inert. */}
      <div
        ref={well}
        className="admin-frame"
        data-focusable={fit === 'cover' ? '' : undefined}
        onPointerDown={
          fit === 'cover'
            ? (event) => {
                dragging.current = true;
                event.currentTarget.setPointerCapture(event.pointerId);
                pointTo(event.clientX, event.clientY);
              }
            : undefined
        }
        onPointerMove={(event) => {
          if (dragging.current) pointTo(event.clientX, event.clientY);
        }}
        onPointerUp={(event) => {
          dragging.current = false;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
      >
        {image.media === 'video' ? (
          <video
            src={image.src}
            muted
            playsInline
            loop
            autoPlay
            style={{ objectFit: fit, objectPosition: position }}
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={image.src} alt="" style={{ objectFit: fit, objectPosition: position }} />
        )}

        {/* The anchor, drawn only under cover so contain does not imply a
            control that does nothing. */}
        {fit === 'cover' && image.media !== 'video' ? (
          <span className="admin-frame-dot" style={{ left: `${x * 100}%`, top: `${y * 100}%` }} />
        ) : null}
      </div>

      <div className="admin-frame-controls">
        <label className="field">
          <span className="field-label">Fit</span>
          <select
            value={fit}
            onChange={(event) => {
              setFit(event.target.value as 'cover' | 'contain');
              setState('idle');
            }}
          >
            <option value="cover">Cover — fill the frame, crop the rest</option>
            <option value="contain">Contain — show the whole image</option>
          </select>
        </label>

        {fit === 'cover' && image.media !== 'video' ? (
          <div className="admin-frame-focus">
            <label className="field">
              <span className="field-label">Horizontal focus</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(x * 100)}
                onChange={(event) => {
                  setX(Number(event.target.value) / 100);
                  setState('idle');
                }}
              />
            </label>
            <label className="field">
              <span className="field-label">Vertical focus</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(y * 100)}
                onChange={(event) => {
                  setY(Number(event.target.value) / 100);
                  setState('idle');
                }}
              />
            </label>
          </div>
        ) : null}

        <div className="admin-frame-actions">
          <button
            type="button"
            className="admin-button"
            onClick={save}
            disabled={pending || (!dirty && state !== 'error')}
          >
            {pending ? 'Saving…' : 'Save framing'}
          </button>
          {state === 'saved' ? (
            <span className="admin-ok" role="status">
              Saved.
            </span>
          ) : null}
          {state === 'error' ? (
            <span className="admin-error" role="status">
              {message}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
