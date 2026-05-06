import { ShieldCheck } from 'lucide-react';

function AuthShell({ eyebrow, title, children }) {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-ink-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:items-center">
          <section className="space-y-5">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-brand-600 text-white">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase text-brand-700">{eyebrow}</p>
              <h1 className="mt-2 text-3xl font-semibold text-ink-900 sm:text-4xl">{title}</h1>
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}

export default AuthShell;
