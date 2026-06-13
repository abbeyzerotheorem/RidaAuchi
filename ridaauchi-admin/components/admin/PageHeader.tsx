'use client';

export default function PageHeader({
  title,
  description,
  onRefresh,
  refreshing,
}: {
  title: string;
  description: string;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-500 text-sm mt-1">{description}</p>
      </div>
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 shrink-0"
          style={{ backgroundColor: '#F04E05' }}
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      )}
    </div>
  );
}
