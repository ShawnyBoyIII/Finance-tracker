import Navbar from '@/components/layout/Navbar';
import ElectricityTracker from '@/components/electricity/ElectricityTracker';

export default function ElectricityPage() {
  return (
    <div className="min-h-screen cockpit-grid">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ElectricityTracker />
      </main>
    </div>
  );
}
