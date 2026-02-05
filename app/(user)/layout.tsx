import AppSidebar from '@/components/layout/app-sidebar';

export default function UserLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen bg-white-950">
      <AppSidebar>{children}</AppSidebar>
    </div>
  );
}
