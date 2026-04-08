import AdminSidebar from "./_components/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <AdminSidebar />
      <div className="lg:pl-64">{children}</div>
    </div>
  );
}
