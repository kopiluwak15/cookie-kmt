import StaffBottomNav from "../_components/StaffBottomNav";

export default function StaffTabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <StaffBottomNav />
    </>
  );
}
