import { AppLayout } from "@/components/AppLayout";
import { Toaster } from "@/components/ui/sonner";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppLayout>{children}</AppLayout>
      <Toaster richColors />
    </>
  );
}
