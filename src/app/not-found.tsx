import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="shell hero">
      <h1>Not found</h1>
      <p className="hero-body">Whatever you were looking for is not here.</p>
      <div className="hero-actions">
        <Link className="button" data-variant="primary" href="/">
          Back to the start
        </Link>
      </div>
    </section>
  );
}
