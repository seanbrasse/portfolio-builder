import Link from 'next/link';

import { Panel } from '@/components/Panel';

export default function NotFound() {
  return (
    <div className="issue-shell">
      <p className="page-caption">Missing page</p>
      <div className="comic-page" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
        <Panel slot="a" index={0} overrides={{ accent: 'a' }} interactive>
          <h1 className="panel-title">This issue has no page 404</h1>
          <p className="panel-prose">Whatever you were looking for is not in this run.</p>
          <div className="panel-foot">
            <Link className="panel-link" href="/">
              Back to page one
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}
