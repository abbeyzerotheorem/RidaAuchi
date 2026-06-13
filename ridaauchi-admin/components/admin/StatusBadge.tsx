import { getRideStatusColor } from '@/lib/format';

export default function StatusBadge({
  status,
  label,
}: {
  status?: string;
  label?: string;
}) {
  return (
    <span
      className={`inline-flex px-2 py-1 rounded text-xs font-medium capitalize ${getRideStatusColor(status)}`}
    >
      {label ?? status ?? 'unknown'}
    </span>
  );
}
