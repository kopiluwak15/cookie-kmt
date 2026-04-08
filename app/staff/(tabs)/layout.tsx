import { redirect } from "next/navigation";
import StaffBottomNav from "../_components/StaffBottomNav";
import { createClient } from "@/lib/supabase/server";

export default async function StaffTabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // サーバーサイドで認証確認 (middlewareの二重防御)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/staff/login");

  return (
    <>
      {children}
      <StaffBottomNav />
    </>
  );
}
