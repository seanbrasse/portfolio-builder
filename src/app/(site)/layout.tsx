import { getSettings } from '@/content';

/**
 * The public site's frame.
 *
 * Separate from the root layout because the one-screen behaviour belongs to
 * this page and not to the document. It used to live on `html`/`body`, which
 * meant `/admin` inherited `overflow: hidden` and was clipped at one viewport —
 * the Save button, the timeline editor and the project list were all rendered
 * and all unreachable.
 *
 * Holding the height here instead means the body's content is exactly one
 * viewport tall, so the page still does not scroll, and anything rendered
 * outside this frame is an ordinary scrolling document again.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();

  return (
    <div className="site-frame">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <main id="main">{children}</main>

      <footer className="site-footer">
        <div className="site-footer-inner">
          {/* Decorative: the name is in the copyright line two columns over,
              so a screen reader announcing an initial would be noise. */}
          <p className="footer-mark" aria-hidden="true">
            {settings.displayName.charAt(0)}
          </p>

          {/* All of the contact information, in one row. This is the only place
              it appears — the page above has no contact section and no
              call-to-action buttons, so the footer is not a duplicate of
              anything, it is the whole answer to "how do I reach him". */}
          <div className="footer-col">
            <ul>
              <li>
                <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>
              </li>
              {settings.links.map((link) => (
                <li key={link.url}>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <a href={settings.resumeHref}>Resume</a>
              </li>
            </ul>
          </div>

          <p className="footer-fine">
            © {new Date().getFullYear()} {settings.displayName} · {settings.location}
          </p>
        </div>
      </footer>
    </div>
  );
}
