import { Link } from 'react-router-dom';
import PageShell from '../components/ui/PageShell.jsx';

function NotFoundPage() {
  return (
    <PageShell title="Page not found" eyebrow="404">
      <Link
        to="/dashboard"
        className="inline-flex rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
      >
        Back to Dashboard
      </Link>
    </PageShell>
  );
}

export default NotFoundPage;
