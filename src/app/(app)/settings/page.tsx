"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/store";
import { toast } from "sonner";
import { 
  Building, 
  Clock, 
  CalendarRange, 
  Settings2, 
  Save, 
  Loader2,
  Mail,
  Phone,
  MapPin,
  Coffee,
  HelpCircle
} from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"company" | "attendance" | "leaves" | "system">("company");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [settings, setSettings] = useState<Record<string, string>>({
    company_name: "AlMawa International",
    company_email: "info@almawainternational.com",
    company_phone: "+91 98765 43210",
    company_address: "Mumbai, Maharashtra, India",
    office_checkin_time: "09:00",
    office_checkout_time: "18:00",
    office_grace_period: "15",
    full_day_hours: "8",
    annual_casual_leaves: "12",
    annual_sick_leaves: "12",
    auto_approve_leaves: "false",
    maintenance_mode: "false",
    email_alerts: "true",
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const fetched = await api.getSystemSettings();
        if (fetched && fetched.length > 0) {
          const dict: Record<string, string> = {};
          fetched.forEach((s: any) => {
            dict[s.key] = s.value;
          });
          setSettings(prev => ({ ...prev, ...dict }));
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateSystemSettings(settings);
      toast.success("Settings saved successfully!");
    } catch (err) {
      console.error("Failed to save settings:", err);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateKey = (key: string, val: string) => {
    setSettings(prev => ({ ...prev, [key]: val }));
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const tabItems = [
    { id: "company", name: "Company Profile", icon: Building },
    { id: "attendance", name: "Attendance Rules", icon: Clock },
    { id: "leaves", name: "Leave Policies", icon: CalendarRange },
    { id: "system", name: "System Settings", icon: Settings2 },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Settings" 
        description="Configure system parameters, attendance tracking criteria, leaves, and organization profile." 
      />

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Side: Navigation Tabs */}
        <div className="w-full md:w-64 shrink-0 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
          {tabItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg whitespace-nowrap transition-colors duration-150 ${
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.name}
              </button>
            );
          })}
        </div>

        {/* Right Side: Tab Panel Form */}
        <div className="flex-1">
          <form onSubmit={handleSave} className="space-y-6">
            
            {activeTab === "company" && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-primary" />
                    Company Profile
                  </CardTitle>
                  <CardDescription>
                    Update details about your company displayed on reports and invoices.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="company_name">Company Name</Label>
                      <Input 
                        id="company_name" 
                        value={settings.company_name} 
                        onChange={(e) => updateKey("company_name", e.target.value)} 
                        placeholder="e.g. AlMawa International"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="company_email">Official Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="company_email" 
                          type="email"
                          className="pl-9"
                          value={settings.company_email} 
                          onChange={(e) => updateKey("company_email", e.target.value)} 
                          placeholder="info@almawainternational.com"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="company_phone">Contact Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="company_phone" 
                          className="pl-9"
                          value={settings.company_phone} 
                          onChange={(e) => updateKey("company_phone", e.target.value)} 
                          placeholder="+91 98765 43210"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="company_address">Address</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="company_address" 
                          className="pl-9"
                          value={settings.company_address} 
                          onChange={(e) => updateKey("company_address", e.target.value)} 
                          placeholder="Mumbai, Maharashtra, India"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "attendance" && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Attendance & Shift Rules
                  </CardTitle>
                  <CardDescription>
                    Define default check-in timelines and attendance qualification rules.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="office_checkin_time">Standard Check-In Time</Label>
                      <Input 
                        id="office_checkin_time" 
                        type="time"
                        value={settings.office_checkin_time} 
                        onChange={(e) => updateKey("office_checkin_time", e.target.value)} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="office_checkout_time">Standard Check-Out Time</Label>
                      <Input 
                        id="office_checkout_time" 
                        type="time"
                        value={settings.office_checkout_time} 
                        onChange={(e) => updateKey("office_checkout_time", e.target.value)} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="office_grace_period" className="flex items-center gap-1.5">
                        Grace Period (Minutes)
                        <span title="Time in minutes allowed past Check-In before marked as late">
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        </span>
                      </Label>
                      <Input 
                        id="office_grace_period" 
                        type="number"
                        min="0"
                        max="60"
                        value={settings.office_grace_period} 
                        onChange={(e) => updateKey("office_grace_period", e.target.value)} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="full_day_hours">Min Hours for Full Day</Label>
                      <Input 
                        id="full_day_hours" 
                        type="number"
                        min="1"
                        max="24"
                        value={settings.full_day_hours} 
                        onChange={(e) => updateKey("full_day_hours", e.target.value)} 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "leaves" && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarRange className="h-5 w-5 text-primary" />
                    Leave Allocation & Approval Policy
                  </CardTitle>
                  <CardDescription>
                    Configure annual leave quotas and automated approval workflows.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="annual_casual_leaves">Annual Casual Leaves</Label>
                      <Input 
                        id="annual_casual_leaves" 
                        type="number"
                        min="0"
                        value={settings.annual_casual_leaves} 
                        onChange={(e) => updateKey("annual_casual_leaves", e.target.value)} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="annual_sick_leaves">Annual Sick Leaves</Label>
                      <Input 
                        id="annual_sick_leaves" 
                        type="number"
                        min="0"
                        value={settings.annual_sick_leaves} 
                        onChange={(e) => updateKey("annual_sick_leaves", e.target.value)} 
                      />
                    </div>

                    <div className="col-span-1 md:col-span-2 flex items-center justify-between p-4 rounded-lg border bg-muted/40">
                      <div className="space-y-0.5">
                        <Label className="text-base font-semibold">Auto-Approve Employee Leaves</Label>
                        <p className="text-sm text-muted-foreground">
                          Skip HR/Admin reviews and approve employee leaves instantly upon submission.
                        </p>
                      </div>
                      <Switch 
                        checked={settings.auto_approve_leaves === "true"} 
                        onCheckedChange={(checked) => updateKey("auto_approve_leaves", checked ? "true" : "false")} 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "system" && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5 text-primary" />
                    System Preferences
                  </CardTitle>
                  <CardDescription>
                    Manage general system-wide actions and notification rules.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/40">
                      <div className="space-y-0.5">
                        <Label className="text-base font-semibold">Send Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Automate system email alerts for tasks, leaves, and announcements.
                        </p>
                      </div>
                      <Switch 
                        checked={settings.email_alerts === "true"} 
                        onCheckedChange={(checked) => updateKey("email_alerts", checked ? "true" : "false")} 
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                      <div className="space-y-0.5">
                        <Label className="text-base font-semibold text-destructive">Maintenance Mode</Label>
                        <p className="text-sm text-muted-foreground">
                          Take the system offline for updates. Only Administrators will be able to log in.
                        </p>
                      </div>
                      <Switch 
                        checked={settings.maintenance_mode === "true"} 
                        onCheckedChange={(checked) => updateKey("maintenance_mode", checked ? "true" : "false")} 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Form Action Controls */}
            <div className="flex items-center gap-4 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
            
          </form>
        </div>
      </div>
    </div>
  );
}
