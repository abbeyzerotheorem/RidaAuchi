'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', exact: true },
  { href: '/dashboard/rides', label: 'Rides', exact: false },
  { href: '/dashboard/drivers', label: 'Drivers', exact: false },
  { href: '/dashboard/riders', label: 'Riders', exact: false },
];

export default function Sidebar({
  onLogout,
  open,
  onClose,
}: {
  onLogout: () => void;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {open && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 min-h-screen flex flex-col text-white shrink-0 transform transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ backgroundColor: '#F04E05' }}
      >
        <div className="p-5 border-b border-orange-400/40">
          <div className="flex items-center gap-3">
            <Image
              src="/icon.png"
              alt="RidaAuchi"
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />
            <div>
              <p className="font-bold leading-tight">RidaAuchi</p>
              <p className="text-xs text-orange-100">Admin Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                  active
                    ? 'bg-white text-orange-600'
                    : 'text-orange-50 hover:bg-orange-600'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-orange-400/40">
          <button
            onClick={onLogout}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-medium text-orange-50 hover:bg-orange-600 transition"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
