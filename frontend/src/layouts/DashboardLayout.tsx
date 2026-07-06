import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/common/Sidebar';
import { TopNav }  from '@/components/common/TopNav';
import { Footer }  from '@/components/common/Footer';

export function DashboardLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--sf-surface-base)]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-in-out">
        <TopNav />

        <main className="flex-1 overflow-y-auto focus:outline-none" id="main-content">
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  );
}
