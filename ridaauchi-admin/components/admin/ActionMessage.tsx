'use client';

export default function ActionMessage({
  message,
  type = 'success',
}: {
  message: string;
  type?: 'success' | 'error';
}) {
  const styles =
    type === 'success'
      ? 'border-green-200 bg-green-50 text-green-700'
      : 'border-red-200 bg-red-50 text-red-700';

  return (
    <div className={`mb-4 rounded-lg border p-3 text-sm ${styles}`}>
      {message}
    </div>
  );
}
