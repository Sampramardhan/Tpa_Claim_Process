import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../components/auth/AuthShell.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { getApiErrorMessage, getRoleHomePath } from '../utils/authUtils.js';

const initialForm = {
  fullName: '',
  email: '',
  mobile: '',
  dateOfBirth: '',
  password: '',
};

const mobilePattern = /^\+?[1-9]\d{9,14}$/;

function CustomerRegisterPage() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const { registerCustomer } = useAuth();
  const navigate = useNavigate();

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.fullName.trim()) {
      nextErrors.fullName = 'Full name is required.';
    }
    if (!form.email.includes('@')) {
      nextErrors.email = 'Enter a valid email.';
    }
    if (!mobilePattern.test(form.mobile.trim())) {
      nextErrors.mobile = 'Enter a valid mobile number.';
    }
    if (!form.dateOfBirth) {
      nextErrors.dateOfBirth = 'Date of birth is required.';
    }
    if (form.password.length < 8) {
      nextErrors.password = 'Use at least 8 characters.';
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
      const session = await registerCustomer({
        ...form,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
      });
      navigate(getRoleHomePath(session.user.role), { replace: true });
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Customer registration failed.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell eyebrow="Customer" title="Customer Registration">
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
            {error}
          </div>
        ) : null}

        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-slate-700">Full Name</span>
          <input
            type="text"
            name="fullName"
            value={form.fullName}
            onChange={updateField}
            className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            autoComplete="name"
          />
          {fieldErrors.fullName ? <span className="mt-1 block text-xs text-red-600">{fieldErrors.fullName}</span> : null}
        </label>

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
          <span className="text-sm font-medium text-slate-700">Mobile</span>
          <input
            type="tel"
            name="mobile"
            value={form.mobile}
            onChange={updateField}
            className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            autoComplete="tel"
          />
          {fieldErrors.mobile ? <span className="mt-1 block text-xs text-red-600">{fieldErrors.mobile}</span> : null}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Date of Birth</span>
          <input
            type="date"
            name="dateOfBirth"
            value={form.dateOfBirth}
            onChange={updateField}
            className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          {fieldErrors.dateOfBirth ? (
            <span className="mt-1 block text-xs text-red-600">{fieldErrors.dateOfBirth}</span>
          ) : null}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={updateField}
            className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            autoComplete="new-password"
          />
          {fieldErrors.password ? <span className="mt-1 block text-xs text-red-600">{fieldErrors.password}</span> : null}
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 sm:col-span-2">
          <Link to="/login/customer" className="text-sm font-medium text-slate-600 hover:text-ink-900">
            Back to Login
          </Link>
          <button
            type="submit"
            className="inline-flex h-11 min-w-36 items-center justify-center rounded-md bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={isLoading}
          >
            {isLoading ? <LoadingSpinner label="Registering" inverse /> : 'Register'}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}

export default CustomerRegisterPage;
