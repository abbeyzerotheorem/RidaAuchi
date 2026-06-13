'use client';

import Image from 'next/image';

export default function LoadingScreen({ message }: { message: string }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: '#F04E05' }}
    >
      <Image
        src="/icon.png"
        alt="RidaAuchi"
        width={160}
        height={160}
        className="mb-4 w-40 h-auto"
        priority
      />
      <p className="text-white text-lg">{message}</p>
    </div>
  );
}
