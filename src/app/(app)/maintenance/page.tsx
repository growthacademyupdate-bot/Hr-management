"use client";

import { useAuth, logout } from "@/lib/store";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Construction, Clock, Mail, RefreshCw, LogOut, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function MaintenancePage() {
  const user = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // Redirect admins to dashboard
    if (user?.role === "admin") {
      router.push("/dashboard");
    }
  }, [user, router]);

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/maintenance");
      const data = await res.json();
      if (!data.maintenanceMode) {
        toast.success("Maintenance is complete! Welcome back.");
        window.dispatchEvent(new CustomEvent("ems_maintenance_change", { detail: { enabled: false } }));
        router.push("/dashboard");
      } else {
        toast.info("The system is still under maintenance. Please check back shortly.");
      }
    } catch {
      toast.error("Failed to check status. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-amber-50/30 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500" />
          
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 bg-amber-100/80 border border-amber-200 rounded-2xl flex items-center justify-center shadow-inner">
              <Construction className="h-10 w-10 text-amber-600 animate-pulse" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold uppercase tracking-wider mb-4">
            <ShieldAlert className="h-3.5 w-3.5" /> Maintenance Mode Active
          </div>
          
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            System Under Maintenance
          </h1>
          
          <p className="text-base sm:text-lg text-slate-600 mb-8 max-w-lg mx-auto">
            We are currently performing scheduled maintenance to upgrade and improve our services.
            Access is temporarily restricted. We apologize for the inconvenience.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left">
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                <h3 className="font-semibold text-slate-900 text-sm">Estimated Duration</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Our team is working diligently. We expect services to resume shortly.
              </p>
            </div>
            
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <Mail className="h-5 w-5 text-amber-600 shrink-0" />
                <h3 className="font-semibold text-slate-900 text-sm">Need Help?</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Contact your system administrator or HR management for urgent inquiries.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={handleCheckStatus}
              disabled={checking}
              className="w-full sm:w-auto h-11 px-6 rounded-xl font-medium"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${checking ? "animate-spin" : ""}`} />
              Check Status
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="w-full sm:w-auto h-11 px-6 rounded-xl font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out / Login as Admin
            </Button>
          </div>

          <div className="border-t border-slate-100 mt-8 pt-5">
            <p className="text-xs text-slate-400">
              AlMawa HR Management System &bull; Restricted Maintenance Window
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}