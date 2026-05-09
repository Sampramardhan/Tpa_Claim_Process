import { LogOut, Activity } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { navigationRoutes } from '../../routes/routeConfig.js';
import { getRoleHomePath } from '../../utils/authUtils.js';

function Header() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  
  const visibleRoutes = navigationRoutes.filter((item) => item.roles.includes(user?.role));

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-md shadow-brand-500/20">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-wider text-ink-900 leading-tight">Enterprise TPA</h1>
              <p className="text-[10px] font-medium text-slate-500 leading-tight">Operations Console</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {visibleRoutes.map((item) => {
              const Icon = item.icon;
              const targetPath = item.path === '/dashboard' ? getRoleHomePath(user?.role) : item.path;

              return (
                <NavLink
                  key={item.path}
                  to={targetPath}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-200/50'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-ink-900'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden text-right md:block">
            <p className="truncate text-sm font-bold text-ink-900">{user?.fullName}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600">{user?.role}</p>
          </div>

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-red-50 hover:text-red-600 hover:border-red-200"
            onClick={handleLogout}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;

