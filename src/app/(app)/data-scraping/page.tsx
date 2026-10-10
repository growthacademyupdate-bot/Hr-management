"use client";

import { useState } from "react";
import { useAuth, api } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save } from "lucide-react";

export default function DataScrapingPage() {
  const user = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    businessName: "",
    cityNames: "",
    state: "",
    totalDataCollected: 0
  });

  if (!user || user.role !== "employee") {
    return <div className="p-6">Unauthorized access. Only employees can submit data scraping info.</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName || !form.state || form.totalDataCollected < 0) {
      toast.error("Please fill all required fields correctly.");
      return;
    }

    setLoading(true);
    try {
      await api.addDataScraping(form);
      toast.success("Data scraping information submitted successfully");
      setForm({ businessName: "", cityNames: "", state: "", totalDataCollected: 0 });
    } catch (error: any) {
      toast.error(error.message || "Failed to submit data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data Scraping</h1>
        <p className="text-muted-foreground">Submit your data scraping collection details</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Entry</CardTitle>
          <CardDescription>Enter the business and location details of your scraped data.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="space-y-2 w-full">
              <Label>Business Name(s) *</Label>
              <Textarea 
                value={form.businessName} 
                onChange={e => setForm({...form, businessName: e.target.value})} 
                placeholder="e.g. XYZ Corp, ABC Ltd (You can add multiple names here)" 
                required 
                className="min-h-[120px] resize-y"
              />
            </div>
            
            <div className="space-y-2 w-full">
              <Label>City Name(s)</Label>
              <Textarea 
                value={form.cityNames} 
                onChange={e => setForm({...form, cityNames: e.target.value})} 
                placeholder="e.g. Mumbai, Pune (Optional)" 
                className="min-h-[80px] resize-y"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 w-full">
                <Label>State *</Label>
                <Input 
                  value={form.state} 
                  onChange={e => setForm({...form, state: e.target.value})} 
                  placeholder="e.g. Maharashtra" 
                  required 
                />
              </div>
              <div className="space-y-2 w-full">
                <Label>Total Collected *</Label>
                <Input 
                  type="text" inputMode="numeric"
                  min="0"
                  value={form.totalDataCollected || ""} 
                  onChange={e => setForm({...form, totalDataCollected: parseInt(e.target.value) || 0})} 
                  required 
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button type="submit" className="w-full md:w-auto h-10" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Submitting..." : "Submit Data"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
