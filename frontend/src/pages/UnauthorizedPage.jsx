import { Link } from 'react-router-dom';
import PageShell from '../components/ui/PageShell.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { getRoleHomePath } from '../utils/authUtils.js';

function UnauthorizedPage() {
  const { user } = useAuth();

  return (
    <PageShell title="Unauthorized" eyebrow="Access">
      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-ink-900">Access restricted</h2>
        <p className="mt-2 text-sm text-slate-600">
          This route is not available for the current role.
        </p>
        <Link
          to={getRoleHomePath(user?.role)}
          className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Go to Dashboard
        </Link>
      </section>
    </PageShell>
  );
}

export default UnauthorizedPage;
