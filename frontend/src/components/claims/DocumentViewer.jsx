import { AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

function DocumentViewer({ url, title = 'Document Preview' }) {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [url]);

  return (
    <div className="h-full w-full bg-white">
      {error ? (
        <div className="flex h-full flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <p className="mt-2 text-sm text-red-600">Failed to load document preview.</p>
        </div>
      ) : (
        <iframe
          src={url}
          title={title}
          className="h-full w-full border-0"
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}

export default DocumentViewer;
