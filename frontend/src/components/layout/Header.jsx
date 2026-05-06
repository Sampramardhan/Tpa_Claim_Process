import { LogOut, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

function Header({ onMenuClick }) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-700 transition hover:bg-slate-50 lg:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-500">TPA Claim Process</p>
          <h1 className="truncate text-lg font-semibold text-ink-900">Operations Console</h1>
        </div>

        <div className="hidden min-w-0 text-right md:block">
          <p className="truncate text-sm font-semibold text-ink-900">{user?.fullName}</p>
          <p className="text-xs font-medium uppercase text-slate-500">{user?.role}</p>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-700 transition hover:bg-slate-50"
          onClick={handleLogout}
          aria-label="Sign out"
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

export default Header;
