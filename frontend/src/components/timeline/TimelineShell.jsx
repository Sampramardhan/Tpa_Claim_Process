import StatusBadge from '../common/StatusBadge.jsx';

function TimelineShell({ entries = [] }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-brand-600">Timeline</p>
          <h3 className="mt-1 text-lg font-semibold text-ink-900">Status History</h3>
        </div>
      </div>

      <ol className="mt-6 space-y-5">
        {entries.length === 0 ? (
          <li className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Timeline entries will appear here.
          </li>
        ) : (
          entries.map((entry, index) => (
            <li key={`${entry.stage}-${entry.status}-${index}`} className="relative flex gap-3">
              <span className="mt-1 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brand-100">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />
              </span>
              <div className="min-w-0 flex-1 border-b border-slate-100 pb-5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-ink-900">{entry.stage || 'Pending stage'}</p>
                  <StatusBadge status={entry.status} />
                </div>
                <p className="mt-1 text-xs text-slate-500">{entry.timestamp || 'Timestamp pending'}</p>
                {entry.description ? <p className="mt-2 text-sm text-slate-600">{entry.description}</p> : null}
              </div>
            </li>
          ))
        )}
      </ol>
    </section>
  );
}

export default TimelineShell;
