import { createFileRoute, redirect } from "@tanstack/react-router";

import { getCurrentUser } from "@/lib/store";



export const Route = createFileRoute("/")({

  beforeLoad: () => {

    if (typeof window === "undefined") return;

    const user = getCurrentUser();

    throw redirect({ to: user ? "/dashboard" : "/login" });

  },

  component: () => null,

});

