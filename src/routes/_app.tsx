import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_app")({
  component: () => (
    <>
      <AppLayout />
      <Toaster richColors />
    </>
  ),
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _Outlet = Outlet;
