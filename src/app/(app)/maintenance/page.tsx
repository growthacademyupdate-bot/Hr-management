"use client";

import { useAuth } from "@/lib/store";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Construction, Clock, Mail } from "lucide-react";

export default function MaintenancePage() {
  const user = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect admins to dashboard
    if (user?.role === "admin") {
      router.push("/dashboard");
    }
  }, [user, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 bg-amber-100 rounded-full flex items-center justify-center">
              <Construction className="h-10 w-10 text-amber-600" />
            </div>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            System Under Maintenance
          </h1>
          
          <p className="text-lg text-slate-600 mb-8">
            We're currently performing scheduled maintenance to improve our system. 
            Please check back soon. We apologize for any inconvenience.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-slate-50 rounded-xl p-6">
              <Clock className="h-8 w-8 text-amber-600 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-900 mb-2">Estimated Time</h3>
              <p className="text-sm text-slate-600">Expected to be back online shortly</p>
            </div>
            
            <div className="bg-slate-50 rounded-xl p-6">
              <Mail className="h-8 w-8 text-amber-600 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-900 mb-2">Need Help?</h3>
              <p className="text-sm text-slate-600">Contact your administrator for urgent matters</p>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <p className="text-sm text-slate-500">
              Thank you for your patience. We'll be back with an improved experience.
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-slate-500">
            AlMawa HR Management System
          </p>
        </div>
      </div>
    </div>
  );
}