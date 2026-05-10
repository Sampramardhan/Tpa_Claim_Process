import { useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthShell from '../components/auth/AuthShell.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import PasswordField from '../components/common/PasswordField.jsx';
import { USER_ROLES } from '../constants/appConstants.js';
import { useAuth } from '../hooks/useAuth.js';
import { getApiErrorMessage, getRoleHomePath } from '../utils/authUtils.js';
import { Users, Building2, ShieldAlert, FileStack } from 'lucide-react';

const ROLES = [
  { id: USER_ROLES.CUSTOMER, label: 'Customer', icon: Users, desc: 'Policy holders' },
  { id: USER_ROLES.CLIENT, label: 'Client', icon: Building2, desc: 'Bank / Mediator' },
  { id: USER_ROLES.FMG, label: 'FMG', icon: ShieldAlert, desc: 'Medical Review' },
  { id: USER_ROLES.CARRIER, label: 'Carrier', icon: FileStack, desc: 'Settlement' },
];

function LoginPage() {
  const [activeRole, setActiveRole] = useState(USER_ROLES.CUSTOMER);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  
  const { loginCustomer, loginStaticRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.email.includes('@')) {
      nextErrors.email = 'Enter a valid email.';
    }
    if (!form.password) {
      nextErrors.password = 'Password is required.';
    }
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!validate()) {
      return;
    }

    setIsLoading(true);
    try {
      let session;
      if (activeRole === USER_ROLES.CUSTOMER) {
        session = await loginCustomer(form);
      } else {
        session = await loginStaticRole({ ...form, role: activeRole });
      }
      
      const from = location.state?.from?.pathname || getRoleHomePath(session.user.role);
      navigate(from, { replace: true });
    } catch (apiError) {
      const roleLabel = ROLES.find(r => r.id === activeRole)?.label || 'User';
      setError(getApiErrorMessage(apiError, `${roleLabel} login failed.`));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = (roleId) => {
    setActiveRole(roleId);
    setError('');
    setFieldErrors({});
    // Reset form fields
    setForm({ email: '', password: '' });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="bg-brand-600 px-6 py-8 text-center text-white sm:px-12 sm:py-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-white/20">
            <ShieldAlert className="h-7 w-7 text-white" />
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">TPA Claim Process</h2>
          <p className="mt-2 text-brand-100">Sign in to your account</p>
        </div>

        <div className="p-6 sm:p-10">
          {/* Role Selector Tabs */}
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ROLES.map((role) => {
              const Icon = role.icon;
              const isActive = activeRole === role.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => handleRoleChange(role.id)}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-3 transition-all ${
                    isActive
                      ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-600'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-semibold">{role.label}</span>
                </button>
              );
            })}
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email address</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={updateField}
                placeholder="Enter your email"
                className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                autoComplete="email"
              />
              {fieldErrors.email ? <span className="mt-1 block text-xs text-red-600">{fieldErrors.email}</span> : null}
            </label>

            <PasswordField
              label="Password"
              name="password"
              value={form.password}
              onChange={updateField}
              error={fieldErrors.password}
              autoComplete="current-password"
            />

            <button
              type="submit"
              className="inline-flex h-11 w-full items-center justify-center rounded-md bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isLoading}
            >
              {isLoading ? <LoadingSpinner label="Signing in" inverse /> : 'Login'}
            </button>
          </form>

          {activeRole === USER_ROLES.CUSTOMER && (
            <div className="mt-8 text-center text-sm text-slate-500">
              Don't have an account?{' '}
              <Link to="/register/customer" className="font-semibold text-brand-600 hover:text-brand-700">
                Register here
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
