import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

function Modal({ open, onClose, title, children, wide = false }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    const openModalCount = Number(document.body.dataset.modalOpenCount || '0') + 1;
    document.body.dataset.modalOpenCount = String(openModalCount);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      const remainingModalCount = Math.max(0, Number(document.body.dataset.modalOpenCount || '1') - 1);
      if (remainingModalCount === 0) {
        delete document.body.dataset.modalOpenCount;
        document.body.style.overflow = '';
      } else {
        document.body.dataset.modalOpenCount = String(remainingModalCount);
        document.body.style.overflow = 'hidden';
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={`relative mx-4 flex max-h-[95vh] flex-col rounded-2xl border border-slate-200 bg-white shadow-shell ${wide ? 'h-[620px] w-full max-w-[1200px]' : 'w-full max-w-lg overflow-y-auto'
          }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className={`flex-1 ${wide ? 'overflow-hidden' : 'px-6 py-5'}`}>{children}</div>
      </div>
    </div>
  );
}

export default Modal;
