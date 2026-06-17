'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-white/10 bg-slate-950/40 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-fuchsia-500 shadow-lg shadow-cyan-500/20" />
              <div>
                <span className="block font-semibold text-base text-white tracking-wide">Finance Cockpit</span>
                <span className="block text-[11px] uppercase tracking-[0.24em] text-slate-400">Household control center</span>
              </div>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/"
                aria-current={pathname === '/' ? 'page' : undefined}
                className={`${
                  pathname === '/'
                    ? 'border-cyan-400 text-white'
                    : 'border-transparent text-slate-400 hover:border-slate-500 hover:text-slate-100'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                Dashboard
              </Link>
              <Link
                href="/transactions"
                aria-current={pathname === '/transactions' ? 'page' : undefined}
                className={`${
                  pathname === '/transactions'
                    ? 'border-cyan-400 text-white'
                    : 'border-transparent text-slate-400 hover:border-slate-500 hover:text-slate-100'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                Transactions
              </Link>
              <Link
                href="/budgets"
                aria-current={pathname === '/budgets' ? 'page' : undefined}
                className={`${
                  pathname === '/budgets'
                    ? 'border-cyan-400 text-white'
                    : 'border-transparent text-slate-400 hover:border-slate-500 hover:text-slate-100'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                Budgets
              </Link>
              <Link
                href="/statements"
                aria-current={pathname === '/statements' ? 'page' : undefined}
                className={`${
                  pathname === '/statements'
                    ? 'border-cyan-400 text-white'
                    : 'border-transparent text-slate-400 hover:border-slate-500 hover:text-slate-100'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                Statements
              </Link>
              <Link
                href="/electricity"
                aria-current={pathname === '/electricity' ? 'page' : undefined}
                className={`${
                  pathname === '/electricity'
                    ? 'border-cyan-400 text-white'
                    : 'border-transparent text-slate-400 hover:border-slate-500 hover:text-slate-100'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                Electricity
              </Link>
              <Link
                href="/data"
                aria-current={pathname === '/data' ? 'page' : undefined}
                className={`${
                  pathname === '/data'
                    ? 'border-cyan-400 text-white'
                    : 'border-transparent text-slate-400 hover:border-slate-500 hover:text-slate-100'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                Data
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
