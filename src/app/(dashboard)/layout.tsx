import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden px-4 py-6 pt-16 lg:px-8 lg:py-8 lg:pt-8">
        {children}
      </main>
    </div>
  );
}
