import Dashboard from '@/components/dashboard/Dashboard';
import Navbar from '@/components/layout/Navbar';

export default function Home() {
  return (
    <div className="min-h-screen cockpit-grid">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Dashboard />
      </main>
    </div>
  );
}
