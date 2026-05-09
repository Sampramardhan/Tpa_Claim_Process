import { Outlet } from 'react-router-dom';
import Header from '../components/layout/Header.jsx';

function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-ink-900 font-sans">
      <Header />
      <main className="mx-auto w-full max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;

