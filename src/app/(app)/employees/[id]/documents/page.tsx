"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDB, api } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, FileText, CheckCircle2, XCircle, File, Eye, Download, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadFileToCloudinary, updateEmployeeDocuments } from "@/app/actions";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = [".pdf", ".jpg", ".jpeg", ".png"];

const DOCUMENT_TYPES = [
  { id: "aadhaarCard", label: "Aadhaar Card" },
  { id: "panCard", label: "PAN Card" },
  { id: "marksheet10", label: "Marksheet 10" },
  { id: "marksheet12", label: "Marksheet 12" },
  { id: "graduationMarksheet", label: "Graduation Marksheet" },
  { id: "degreeCertificate", label: "Degree Certificate" },
  { id: "courseCertificate", label: "Course Certificate" },
  { id: "policeVerificationCertificate", label: "Police Verification Certificate" },
  { id: "healthCertificate", label: "Health Certificate" },
  { id: "resume", label: "Resume" },
];

export default function EmployeeDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const db = useDB();
  const { id } = use(params);
  
  const emp = db.employees.find((e) => e.id === id);
  const [emergencyContact, setEmergencyContact] = useState("");
  
  // Local state for files being uploaded
  const [selectedFiles, setSelectedFiles] = useState<Record<string, { file: File; error?: string }>>({});
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (emp && emp.emergencyContact) {
      setEmergencyContact(emp.emergencyContact);
    }
  }, [emp]);

  if (!emp) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-2xl font-bold">Employee Not Found</h2>
        <Button onClick={() => router.push("/employees")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Employees
        </Button>
      </div>
    );
  }

  const handleFileChange = (docId: string, file: File | undefined) => {
    if (!file) {
      const newFiles = { ...selectedFiles };
      delete newFiles[docId];
      setSelectedFiles(newFiles);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSelectedFiles((prev) => ({
        ...prev,
        [docId]: { file, error: "File size must be less than or equal to 2 MB." }
      }));
      // Reset input by changing state
      return;
    }
    
    const fileExt = "." + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_TYPES.includes(fileExt) && file.type !== "application/pdf" && !file.type.startsWith("image/")) {
      setSelectedFiles((prev) => ({
        ...prev,
        [docId]: { file, error: "Invalid file type. Only PDF, JPG, JPEG, PNG are allowed." }
      }));
      return;
    }

    setSelectedFiles((prev) => ({
      ...prev,
      [docId]: { file }
    }));
  };

  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleUploadAll = async () => {
    const filesToUpload = Object.entries(selectedFiles).filter(([_, data]) => !data.error);
    if (filesToUpload.length === 0 && (!emergencyContact || emergencyContact === emp.emergencyContact)) {
      toast.error("No valid files or changes to submit.");
      return;
    }

    setUploading(true);
    try {
      const newDocuments: any = { ...(emp.documents || {}) };
      
      for (const [docId, { file }] of filesToUpload) {
        const base64 = await getBase64(file);
        const uploadRes = await uploadFileToCloudinary(base64, file.name);
        if (uploadRes.success) {
          newDocuments[docId] = {
            url: uploadRes.url,
            name: DOCUMENT_TYPES.find(d => d.id === docId)?.label,
            fileName: file.name,
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toISOString(),
          };
        } else {
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      await updateEmployeeDocuments(emp.id, newDocuments, emergencyContact);
      await api.refreshDB(true);
      toast.success("Documents updated successfully");
      setSelectedFiles({});
    } catch (error: any) {
      toast.error(error.message || "An error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  const renderDocumentRow = (docType: typeof DOCUMENT_TYPES[0]) => {
    const existingDoc = emp.documents?.[docType.id];
    const selectedFile = selectedFiles[docType.id];

    if (existingDoc) {
      return (
        <Card key={docType.id} className="border shadow-sm flex flex-col justify-between gap-4 p-4 overflow-hidden">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">{docType.label}</p>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                <span className="text-green-600 font-medium shrink-0">Uploaded</span>
                <span className="truncate shrink-0">• {new Date(existingDoc.uploadedAt).toLocaleDateString()}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate" title={existingDoc.fileName}>{existingDoc.fileName}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 mt-auto">
            <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none">
              <a href={existingDoc.url} target="_blank" rel="noopener noreferrer">
                <Eye className="h-4 w-4 mr-1.5 shrink-0" /> View
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none">
              <a href={existingDoc.url} download={existingDoc.fileName}>
                <Download className="h-4 w-4 mr-1.5 shrink-0" /> Download
              </a>
            </Button>
            
            <div className="relative flex-1 sm:flex-none">
              <input 
                type="file" 
                id={`replace-${docType.id}`}
                className="hidden" 
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange(docType.id, e.target.files?.[0])}
              />
              <Button variant="outline" size="sm" asChild className="w-full">
                <label htmlFor={`replace-${docType.id}`} className="cursor-pointer">
                  <RefreshCw className="h-4 w-4 mr-1.5 shrink-0" /> Replace
                </label>
              </Button>
            </div>
          </div>
          {selectedFile && (
            <div className="mt-1 flex items-center text-sm">
               {selectedFile.error ? (
                  <p className="text-red-500 flex items-center text-xs"><XCircle className="h-3.5 w-3.5 mr-1 shrink-0"/> {selectedFile.error}</p>
               ) : (
                  <p className="text-blue-500 flex items-center text-xs truncate" title={selectedFile.file.name}><CheckCircle2 className="h-3.5 w-3.5 mr-1 shrink-0"/> Ready to replace: {selectedFile.file.name}</p>
               )}
            </div>
          )}
        </Card>
      );
    }

    return (
      <Card key={docType.id} className={`border shadow-sm flex flex-col justify-between gap-4 p-4 overflow-hidden ${selectedFile?.error ? 'border-red-500' : ''}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center shrink-0">
            <File className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate">{docType.label}</p>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
              <XCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="shrink-0">Not Uploaded</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">Maximum size: 2 MB</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-auto">
          <div className="relative">
            <input 
              type="file" 
              id={`upload-${docType.id}`}
              className="hidden" 
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleFileChange(docType.id, e.target.files?.[0])}
            />
            <Button variant="default" size="sm" asChild>
              <label htmlFor={`upload-${docType.id}`} className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2 shrink-0" /> Upload
              </label>
            </Button>
          </div>
          {selectedFile && (
            <div className="text-sm min-w-0 w-full sm:w-auto">
              {selectedFile.error ? (
                <div className="flex flex-col sm:items-end gap-1">
                  <p className="text-red-500 font-medium text-xs leading-tight">{selectedFile.error}</p>
                  <Button variant="ghost" size="sm" onClick={() => handleFileChange(docType.id, undefined)} className="text-xs h-6 text-red-500 hover:text-red-600 p-0">Clear</Button>
                </div>
              ) : (
                <div className="flex flex-col sm:items-end gap-1 min-w-0">
                   <p className="text-green-600 font-medium text-xs truncate w-full sm:max-w-[200px]" title={selectedFile.file.name}>{selectedFile.file.name}</p>
                   <p className="text-xs text-muted-foreground">({(selectedFile.file.size / 1024 / 1024).toFixed(2)} MB)</p>
                   <Button variant="ghost" size="sm" onClick={() => handleFileChange(docType.id, undefined)} className="text-xs h-6 text-muted-foreground p-0 self-start sm:self-end mt-0.5">Remove</Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  };

  const hasChanges = Object.keys(selectedFiles).length > 0 || emergencyContact !== (emp.emergencyContact || "");
  const hasErrors = Object.values(selectedFiles).some(f => !!f.error);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader 
        title="Employee Documents" 
        description={`Manage documents for ${emp.name}`} 
        actions={
          <Button variant="outline" onClick={() => router.push(`/employees/${emp.id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Profile
          </Button>
        }
      />

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Employee Details</CardTitle>
          <CardDescription>Personal and contact information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Employee Name</Label>
              <Input value={emp.name} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Employee Phone Number</Label>
              <Input value={emp.mobile} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Emergency Contact (Family/Relative)</Label>
              <Input 
                value={emergencyContact} 
                onChange={(e) => setEmergencyContact(e.target.value)} 
                placeholder="Enter emergency contact number"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-bold">Document Uploads</h3>
        
        {/* Top specific documents layout (Aadhaar etc) as per requirements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DOCUMENT_TYPES.slice(0, 2).map(renderDocumentRow)}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {DOCUMENT_TYPES.slice(2, 9).map(renderDocumentRow)}
        </div>

        <div className="grid grid-cols-1 gap-4">
           {DOCUMENT_TYPES.slice(9).map(renderDocumentRow)}
        </div>
      </div>

      <div className="flex justify-end pt-4 pb-10">
        <Button 
          size="lg" 
          onClick={handleUploadAll} 
          disabled={!hasChanges || hasErrors || uploading}
          className="w-full md:w-auto"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" /> Upload Documents
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
