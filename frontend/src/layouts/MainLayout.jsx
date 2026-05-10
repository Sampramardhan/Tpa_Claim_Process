import { Outlet } from 'react-router-dom';
import Header from '../components/layout/Header.jsx';

function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-ink-900 dark:text-slate-100 font-sans transition-colors duration-300">
      <Header />
      <main className="mx-auto w-full max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;

