import { getSettings } from '@/content';
import type { Page, Panel as PanelData } from '@/content/types';
import { getTemplate, gridStyle } from '@/lib/templates';

import { GuidedView } from './GuidedView';
import { Panel } from './Panel';
import { PanelContentView, isInteractive, panelClassName } from './panels';

type ComicPageProps = {
  page: Page;
  pageNumber: number;
  totalPages: number;
};

/**
 * One page of the issue.
 *
 * ACC-1: panels are emitted by walking `template.slots`, never by walking the
 * page's own panel array. The template's slot list *is* the reading order, so
 * DOM order, tab order, guided-view order, and the animation stagger are all
 * the same sequence by construction. There is no way to author a page whose
 * visual order and DOM order disagree, which is the failure CSS Grid makes
 * easy and which a keyboard user hits first.
 */
export function ComicPage({ page, pageNumber, totalPages }: ComicPageProps) {
  const settings = getSettings();
  const template = getTemplate(page.templateId);
  const bySlot = new Map(page.panels.map((panel) => [panel.slot, panel]));

  return (
    <div className="issue-shell" style={{ viewTransitionName: 'page' }}>
      {/* ACC-4: the page owns the single h1; panel titles are h2 beneath it. */}
      <h1 className="sr-only">
        {settings.displayName} — {page.title}
      </h1>

      <p className="page-caption">{page.caption}</p>

      <GuidedView
        style={gridStyle(template)}
        panelCount={template.slots.length}
        pageNumber={pageNumber}
        totalPages={totalPages}
      >
        {template.slots.map((slot, index) => {
          // COMP-4: an unassigned slot is a quiet inked panel, not a gap. A
          // collapsed grid looks broken; a blank panel looks intentional.
          const panel: PanelData = bySlot.get(slot) ?? { slot, content: { type: 'empty' } };

          return (
            <Panel
              key={slot}
              slot={slot}
              index={index}
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
      </GuidedView>
    </div>
  );
}
