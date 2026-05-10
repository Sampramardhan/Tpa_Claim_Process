import { ShieldCheck } from 'lucide-react';

function AuthShell({ eyebrow, title, children }) {
  return (
    <main className="min-h-screen bg-transparent px-4 py-8 text-ink-900 dark:text-slate-100 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:items-center">
          <section className="space-y-5">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase text-brand-700 dark:text-brand-400">{eyebrow}</p>
              <h1 className="mt-2 text-3xl font-semibold text-ink-900 dark:text-slate-100 sm:text-4xl">{title}</h1>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm sm:p-6 transition-all">
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}

export default AuthShell;
