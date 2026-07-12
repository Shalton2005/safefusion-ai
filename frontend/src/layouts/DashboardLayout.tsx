import { Outlet } from 'react-router-dom';
import { Sidebar }    from '@/components/common/Sidebar';
import { TopNav }     from '@/components/common/TopNav';
import { Footer }     from '@/components/common/Footer';
import { RightPanel } from '@/components/common/RightPanel';

export function DashboardLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--sf-surface-base)] print:h-auto print:overflow-visible print:bg-white">
      {/* Sidebar */}
      <div className="print:hidden">
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-in-out print:overflow-visible">
        <div className="print:hidden">
          <TopNav />
        </div>

        <main className="flex-1 overflow-y-auto focus:outline-none print:overflow-visible" id="main-content">
          <Outlet />
        </main>

        <div className="print:hidden">
          <Footer />
        </div>
      </div>

      {/* Right utility panel */}
      <div className="print:hidden">
        <RightPanel />
      </div>
    </div>
  );
}
