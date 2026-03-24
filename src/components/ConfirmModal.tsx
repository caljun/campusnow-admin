interface Props {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ message, confirmLabel = "削除する", onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm mx-4">
        <p className="text-white text-sm mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-700 text-gray-400 py-2.5 rounded-xl text-sm hover:bg-gray-800 transition"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-700 transition"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
