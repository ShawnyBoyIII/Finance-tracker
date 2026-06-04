'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  const getLinkProps = (path: string) => {
    const isActive = pathname === path;
    return {
      className: isActive
        ? 'border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium'
        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium',
      'aria-current': isActive ? ('page' as const) : undefined,
    };
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="font-bold text-xl text-indigo-600">FreeBudgetTracker</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link href="/" {...getLinkProps('/')}>
                Dashboard
              </Link>
              <Link href="/transactions" {...getLinkProps('/transactions')}>
                Transactions
              </Link>
              <Link href="/budgets" {...getLinkProps('/budgets')}>
                Budgets
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
