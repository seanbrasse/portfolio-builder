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
 * Three controls:
 *   • Fit — contain shows the whole image letterboxed (the default, so nothing
 *     is cut before anyone looks); cover fills the well and crops the rest.
 *   • Zoom — magnifies the image into the well past its fit and lets the frame
 *     crop the edges. The dial for a slight crop that neither fit gives alone:
 *     nudge it up a little to trim a border off a contained shot.
 *   • Focus — the point kept in view: the anchor of a cover crop and the centre
 *     a zoom pulls toward. Shown whenever it steers something — under cover, or
 *     at any fit once the zoom is above 1. Set it by dragging on the preview or
 *     with the sliders; the sliders are what make it reachable from a keyboard.
 *
 * A video is left alone: a clip is not cropped to a focal point, and its own
 * frame is the composition. The well shows it whole.
 */
export function ImageAdjust({ image }: { image: AdminImage }) {
  const photo = image.media !== 'video';
  const [fit, setFit] = useState<'cover' | 'contain'>(image.fit ?? 'contain');
  const [scale, setScale] = useState(image.scale ?? 1);
  const [x, setX] = useState(image.focal_x ?? 0.5);
  const [y, setY] = useState(image.focal_y ?? 0.5);
  const [state, setState] = useState<'idle' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();
  const well = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const router = useRouter();

  // The focal point matters when there is a crop to steer: under cover, or once
  // a zoom is on. Under plain contain at scale 1 there is nothing to point at.
  const focusable = photo && (fit === 'cover' || scale > 1);
  const zoomed = photo && scale > 1;

  const dirty =
    fit !== (image.fit ?? 'contain') ||
    scale !== (image.scale ?? 1) ||
    (focusable && (x !== (image.focal_x ?? 0.5) || y !== (image.focal_y ?? 0.5)));

  function pointTo(clientX: number, clientY: number) {
    const box = well.current?.getBoundingClientRect();
    if (!box) return;
    setX(Math.min(1, Math.max(0, (clientX - box.left) / box.width)));
    setY(Math.min(1, Math.max(0, (clientY - box.top) / box.height)));
    setState('idle');
  }

  function save() {
    start(async () => {
      const result = await saveImageFraming(image.id, { fit, focalX: x, focalY: y, scale });
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
  const preview = {
    objectFit: fit,
    objectPosition: position,
    transform: zoomed ? `scale(${scale})` : undefined,
    transformOrigin: zoomed ? position : undefined,
  } satisfies React.CSSProperties;

  return (
    <div className="admin-frame-editor">
      {/* The well, at the card's ratio. Dragging sets the focal point whenever
          the focal point does something — under cover, or under a zoom. */}
      <div
        ref={well}
        className="admin-frame"
        data-focusable={focusable ? '' : undefined}
        onPointerDown={
          focusable
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
          <video src={image.src} muted playsInline loop autoPlay style={preview} />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={image.src} alt="" style={preview} />
        )}

        {/* The anchor, drawn only when the focal point is steering a crop. */}
        {focusable ? (
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
            <option value="contain">Contain — show the whole image</option>
            <option value="cover">Cover — fill the frame, crop the rest</option>
          </select>
        </label>

        {photo ? (
          <label className="field">
            <span className="field-label">Zoom — {Math.round(scale * 100)}%</span>
            <input
              type="range"
              min={100}
              max={250}
              value={Math.round(scale * 100)}
              onChange={(event) => {
                setScale(Number(event.target.value) / 100);
                setState('idle');
              }}
            />
          </label>
        ) : null}

        {focusable ? (
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
