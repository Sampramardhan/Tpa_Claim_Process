import { Building2, FileStack, Handshake, Hospital } from 'lucide-react';
import { Link } from 'react-router-dom';
import AuthShell from '../components/auth/AuthShell.jsx';

const loginOptions = [
  {
    label: 'Login as Customer',
    path: '/login/customer',
    icon: FileStack,
  },
  {
    label: 'Login as Client',
    path: '/login/client',
    icon: Building2,
  },
  {
    label: 'Login as FMG',
    path: '/login/fmg',
    icon: Handshake,
  },
  {
    label: 'Login as Carrier',
    path: '/login/carrier',
    icon: Hospital,
  },
];

function AuthLandingPage() {
  return (
    <AuthShell eyebrow="Access" title="TPA Claim Process">
      <div className="grid gap-3 sm:grid-cols-2">
        {loginOptions.map((option) => {
          const Icon = option.icon;

          return (
            <Link
              key={option.path}
              to={option.path}
              className="flex min-h-28 items-center gap-4 rounded-md border border-slate-200 bg-white p-4 text-left transition hover:border-brand-500 hover:bg-brand-50"
            >
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-slate-100 text-brand-700">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-base font-semibold text-ink-900">{option.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-5 border-t border-slate-200 pt-5">
        <Link
          to="/register/customer"
          className="inline-flex h-11 items-center justify-center rounded-md bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Register Customer
        </Link>
      </div>
    </AuthShell>
  );
}

export default AuthLandingPage;
