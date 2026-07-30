'use client';

import { useEffect, useRef, useState } from 'react';

import type { Asset } from '@/content/types';

/**
 * A screenshot or a screen recording inside a panel.
 *
 * For shipped product work a short clip of the thing working says more than a
 * still, so video is a first-class asset kind rather than a special case. It
 * is muted, looping and inline — a moving screenshot, not a player.
 *
 * MOTION-6 applies: under `prefers-reduced-motion` the clip does not autoplay
 * and gets controls instead, because a looping video is exactly the ambient
 * motion that preference exists to stop. That decision has to happen in
 * JavaScript — CSS cannot stop playback — which is why this is a client
 * component while every other panel renderer is not.
 */
export function PanelMedia({ asset }: { asset: Asset }) {
  const isVideo = asset.media === 'video';
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (!isVideo) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      setReduced(query.matches);
      const node = videoRef.current;
      if (!node) return;
      if (query.matches) node.pause();
      else void node.play().catch(() => {});
    };
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, [isVideo]);

  const { x = 0.5, y = 0.5 } = asset.focalPoint ?? {};
  const objectPosition = `${x * 100}% ${y * 100}%`;
  const treatment = asset.treatment ?? 'duotone';

  if (isVideo) {
    return (
      <div className="panel-image-frame">
        <video
          ref={videoRef}
          className="panel-image"
          data-treatment={treatment}
          style={{ objectPosition }}
          src={asset.src}
          poster={asset.poster}
          width={asset.width}
          height={asset.height}
          muted
          loop
          playsInline
          preload="metadata"
          controls={reduced}
          // The accessible name for a clip with no audio track.
          aria-label={asset.alt}
        />
      </div>
    );
  }

  return (
    <div className="panel-image-frame">
      {/* Plain <img>: these sit inside a panel already sized by the template,
          and next/image's wrapper fights `object-fit` in a grid area. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="panel-image"
        src={asset.src}
        alt={asset.alt}
        width={asset.width}
        height={asset.height}
        loading="lazy"
        decoding="async"
        data-treatment={treatment}
        style={{ objectPosition }}
      />
    </div>
  );
}
