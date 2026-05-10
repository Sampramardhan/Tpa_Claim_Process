import StatusBadge from '../common/StatusBadge.jsx';

function formatDateTime(value) {
  if (!value) return 'Timestamp pending';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function humanize(value) {
  return value
    ?.toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function TimelineShell({ entries = [] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6 w-full">
      <div className="mb-8">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Claim Timeline</h3>
        <p className="text-sm font-bold text-slate-800">Status & Workflow Progress</p>
      </div>

      <div className="relative">
        {entries.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Timeline entries will appear here.
          </div>
        ) : (
          <div className="flex w-full items-start overflow-x-auto pb-4 scrollbar-hide">
            {entries.map((entry, index) => {
              const isFirst = index === 0;
              const isLast = index === entries.length - 1;

              return (
                <div key={`${entry.stage}-${entry.status}-${index}`} className="relative flex flex-1 flex-col items-center min-w-[150px]">
                  {/* Connecting Line */}
                  <div className="absolute top-4 left-0 w-full flex items-center -z-10">
                    <div className={`h-[2px] w-1/2 ${isFirst ? 'bg-transparent' : 'bg-brand-200'}`}></div>
                    <div className={`h-[2px] w-1/2 ${isLast ? 'bg-transparent' : 'bg-brand-200'}`}></div>
                  </div>

                  {/* Node Circle */}
                  <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 border-2 border-brand-200 z-10">
                    <span className="h-3 w-3 rounded-full bg-brand-600 shadow-sm" />
                  </div>

                  {/* Labels */}
                  <div className="mt-4 flex flex-col items-center text-center px-2">
                    <p className="text-sm font-bold text-slate-800 leading-tight mb-1">{humanize(entry.stage) || 'Pending stage'}</p>
                    <StatusBadge status={entry.status} />
                    <p className="mt-2 text-[10px] uppercase tracking-wider font-semibold text-slate-500 whitespace-nowrap">
                      {formatDateTime(entry.timestamp)}
                    </p>
                    {entry.description && (
                      <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 max-w-[180px] leading-snug">
                        {entry.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default TimelineShell;
