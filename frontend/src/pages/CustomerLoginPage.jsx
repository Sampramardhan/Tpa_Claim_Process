import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../components/auth/AuthShell.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { getApiErrorMessage, getRoleHomePath } from '../utils/authUtils.js';

const initialForm = {
  email: '',
  password: '',
};

function CustomerLoginPage() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const { loginCustomer } = useAuth();
  const navigate = useNavigate();

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
      const session = await loginCustomer(form);
      navigate(getRoleHomePath(session.user.role), { replace: true });
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Customer login failed.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell eyebrow="Customer" title="Customer Login">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={updateField}
            className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            autoComplete="email"
          />
          {fieldErrors.email ? <span className="mt-1 block text-xs text-red-600">{fieldErrors.email}</span> : null}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={updateField}
            className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            autoComplete="current-password"
          />
          {fieldErrors.password ? <span className="mt-1 block text-xs text-red-600">{fieldErrors.password}</span> : null}
        </label>

        <button
          type="submit"
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={isLoading}
        >
          {isLoading ? <LoadingSpinner label="Signing in" inverse /> : 'Login'}
        </button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-sm">
        <Link to="/" className="font-medium text-slate-600 hover:text-ink-900">
          Back
        </Link>
        <Link to="/register/customer" className="font-semibold text-brand-700 hover:text-brand-600">
          Register
        </Link>
      </div>
    </AuthShell>
  );
}

export default CustomerLoginPage;
