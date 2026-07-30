import { getSettings } from '@/content';
import type { Page, Panel as PanelData } from '@/content/types';
import type { Leaf } from '@/lib/book';
import { getTemplate, gridStyle } from '@/lib/templates';
import { availabilityLabel } from '@/lib/format';

import { Panel } from './Panel';
import { PanelContentView, isInteractive, panelClassName } from './panels';

/**
 * One physical page. Fixed canvas, no flow — see the note in `lib/book.ts`.
 *
 * ACC-1 still holds: panels are emitted by walking the template's slot list, so
 * DOM order matches the reading order even though the page no longer scrolls.
 */
function ComicLeaf({ page, inkOffset = 0 }: { page: Page; inkOffset?: number }) {
  const template = getTemplate(page.templateId);
  const bySlot = new Map(page.panels.map((panel) => [panel.slot, panel]));

  return (
    <>
      <p className="page-caption">{page.caption}</p>
      <div className="comic-page" style={gridStyle(template)}>
        {template.slots.map((slot, index) => {
          const panel: PanelData = bySlot.get(slot) ?? { slot, content: { type: 'empty' } };
          return (
            <Panel
              key={slot}
              slot={slot}
              // Offset rather than index: on a spread the right page continues
              // the left page's sequence instead of restarting alongside it.
              index={inkOffset + index}
              overrides={panel.overrides}
              interactive={isInteractive(panel.content)}
              empty={panel.content.type === 'empty'}
              className={panelClassName(panel.content)}
              sfx={page.sfx?.slot === slot ? page.sfx : undefined}
            >
              <PanelContentView content={panel.content} />
            </Panel>
          );
        })}
      </div>
    </>
  );
}

/**
 * The cover. Everything a recruiter needs in the first thirty seconds, on the
 * one page they are guaranteed to see (G1).
 */
function CoverLeaf() {
  const settings = getSettings();

  return (
    <div className="cover">
      <span className="cover-screen" aria-hidden="true" />

      <div className="cover-head">
        <span className="cover-issue">Issue {settings.issueNumber}</span>
        <span className="cover-price">{settings.location}</span>
      </div>

      <div className="cover-lockup">
        <h1 className="cover-name">{settings.displayName}</h1>
        <p className="cover-role">Software Engineer · React · TypeScript</p>
        <p className="cover-tagline">{settings.tagline}</p>
      </div>

      <div className="cover-flash" aria-hidden="true">
        <span>{availabilityLabel(settings.availabilityStatus)}</span>
      </div>

      <div className="cover-foot">
        <p className="cover-blurb">
          Four years of shipping customer-facing React — at Mailchimp, PayPal, and on a
          ten-year-old defense simulator.
        </p>
        <p className="cover-turn">Turn the page →</p>
      </div>
    </div>
  );
}

export function BookLeaf({ leaf, inkOffset = 0 }: { leaf: Leaf; inkOffset?: number }) {
  return leaf.kind === 'cover' ? (
    <CoverLeaf />
  ) : (
    <ComicLeaf page={leaf.page} inkOffset={inkOffset} />
  );
}
