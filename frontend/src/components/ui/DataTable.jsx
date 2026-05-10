function DataTable({ columns, data, emptyMessage = 'No data available.', onRowClick }) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
        <thead className="bg-slate-50 dark:bg-slate-900/50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={row.id || idx}
                className={`transition-colors ${
                  onRowClick
                    ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    : ''
                }`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className="whitespace-nowrap px-4 py-3 text-ink-700 dark:text-slate-300">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
