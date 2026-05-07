import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * A reusable password field with visibility toggle.
 * 
 * @param {Object} props
 * @param {string} props.label - Field label
 * @param {string} props.name - Input name
 * @param {string} props.value - Input value
 * @param {Function} props.onChange - Change handler
 * @param {string} [props.autoComplete] - Auto-complete hint
 * @param {string} [props.error] - Error message
 * @param {string} [props.className] - Additional classes for the input
 */
function PasswordField({ label, name, value, onChange, autoComplete, error, className = '', ...props }) {
  const [showPassword, setShowPassword] = useState(false);

  const toggleVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <div className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="relative mt-1">
        <input
          type={showPassword ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className={`h-11 w-full rounded-md border border-slate-300 pl-3 pr-10 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={toggleVisibility}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
          tabIndex="-1"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
    </div>
  );
}

export default PasswordField;
