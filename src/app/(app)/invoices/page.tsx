"use client";

import { useState, useRef } from "react";
import { useAuth, useDB, api } from "@/lib/store";
import type { Employee, Invoice } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Eye, Trash2, Printer } from "lucide-react";
import { toast } from "sonner";
import { useReactToPrint } from "react-to-print";

export default function InvoicesPage() {
  const user = useAuth();
  const db = useDB();
  const [open, setOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  if (user?.role !== "admin") {
    return <div className="p-8 text-center text-muted-foreground">Access Denied</div>;
  }

  const invoices = db.invoices || [];

  return (
    <div>
      <PageHeader
        title="Tax Invoices"
        description={`Manage bills for employees`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Generate Invoice</Button></DialogTrigger>
            <GenerateInvoiceDialog onClose={() => setOpen(false)} employees={db.employees} />
          </Dialog>
        }
      />

      <Card className="border-0 shadow-sm overflow-hidden mt-4">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No.</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const emp = db.employees.find(e => e.id === inv.employeeId);
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.id}</TableCell>
                      <TableCell>{emp?.name || inv.employeeId}</TableCell>
                      <TableCell>{inv.invoiceDate}</TableCell>
                      <TableCell>₹{inv.totalAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setViewInvoice(inv)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={async () => {
                          if (confirm("Are you sure?")) {
                            await api.deleteInvoice(inv.id);
                            toast.success("Invoice deleted");
                          }
                        }}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {invoices.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No invoices generated yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {viewInvoice && (
        <ViewInvoiceModal invoice={viewInvoice} employee={db.employees.find(e => e.id === viewInvoice.employeeId)} onClose={() => setViewInvoice(null)} />
      )}
    </div>
  );
}

function GenerateInvoiceDialog({ onClose, employees }: { onClose: () => void, employees: Employee[] }) {
  const [empId, setEmpId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  
  const [items, setItems] = useState<any[]>([
    { description: "", hsn: "", quantity: 1, rate: 0, gstPercent: 18 }
  ]);

  const selectedEmp = employees.find(e => e.id === empId);

  const calculateRow = (item: any) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const taxable = qty * rate;
    const gstAmt = (taxable * (Number(item.gstPercent) || 0)) / 100;
    return { ...item, taxable, gstAmount: gstAmt, total: taxable + gstAmt };
  };

  const processedItems = items.map(calculateRow);
  
  const subTotal = processedItems.reduce((acc, i) => acc + i.taxable, 0);
  const totalGst = processedItems.reduce((acc, i) => acc + i.gstAmount, 0);
  const cgst = totalGst / 2;
  const sgst = totalGst / 2;
  const igst = 0; // Keeping it CGST/SGST for simplicity within state
  
  const totalAmountFloat = subTotal + cgst + sgst + igst;
  const totalAmount = Math.round(totalAmountFloat);
  const roundOff = totalAmount - totalAmountFloat;
  const totalQuantity = processedItems.reduce((acc, i) => acc + Number(i.quantity), 0);

  async function submit() {
    if (!empId) { toast.error("Select an employee"); return; }
    if (processedItems.some(i => !i.description)) { toast.error("All items must have a description"); return; }
    
    try {
      await api.createInvoice({
        employeeId: empId,
        invoiceDate,
        items: processedItems,
        subTotal, cgst, sgst, igst, totalAmount, roundOff, totalQuantity
      });
      toast.success("Invoice Generated");
      onClose();
    } catch(err: any) {
      toast.error("Error generating invoice");
    }
  }

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Generate Tax Invoice</DialogTitle></DialogHeader>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="space-y-1">
          <Label>Employee</Label>
          <Select value={empId} onValueChange={setEmpId}>
            <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
            <SelectContent>
              {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.id})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Invoice Date</Label>
          <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
        </div>
      </div>

      <div className="border rounded-md p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="w-20">HSN</TableHead>
              <TableHead className="w-20">Qty</TableHead>
              <TableHead className="w-24">Rate (₹)</TableHead>
              <TableHead className="w-20">GST %</TableHead>
              <TableHead className="w-24 text-right">Total (₹)</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedItems.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell><Input value={item.description} onChange={(e) => { const n = [...items]; n[idx].description = e.target.value; setItems(n); }} /></TableCell>
                <TableCell><Input value={item.hsn} onChange={(e) => { const n = [...items]; n[idx].hsn = e.target.value; setItems(n); }} /></TableCell>
                <TableCell><Input type="number" value={item.quantity} onChange={(e) => { const n = [...items]; n[idx].quantity = e.target.value; setItems(n); }} /></TableCell>
                <TableCell><Input type="number" value={item.rate} onChange={(e) => { const n = [...items]; n[idx].rate = e.target.value; setItems(n); }} /></TableCell>
                <TableCell><Input type="number" value={item.gstPercent} onChange={(e) => { const n = [...items]; n[idx].gstPercent = e.target.value; setItems(n); }} /></TableCell>
                <TableCell className="text-right py-3">{item.total.toFixed(2)}</TableCell>
                <TableCell><Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => setItems([...items, { description: "", hsn: "", quantity: 1, rate: 0, gstPercent: 18 }])}>
          <Plus className="h-4 w-4 mr-1" /> Add Row
        </Button>
      </div>

      <div className="flex justify-end gap-6 text-sm mt-4 border p-4 rounded-md bg-muted/20">
        <div className="space-y-1 text-right">
          <div>Sub Total:</div>
          <div>CGST:</div>
          <div>SGST:</div>
          <div>Round Off:</div>
          <div className="font-bold text-base mt-2">Total Amount:</div>
        </div>
        <div className="space-y-1 text-right font-medium">
          <div>₹{subTotal.toFixed(2)}</div>
          <div>₹{cgst.toFixed(2)}</div>
          <div>₹{sgst.toFixed(2)}</div>
          <div>₹{roundOff.toFixed(2)}</div>
          <div className="font-bold text-base mt-2">₹{totalAmount.toFixed(2)}</div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}>Generate Invoice</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function ViewInvoiceModal({ invoice, employee, onClose }: { invoice: Invoice, employee?: Employee, onClose: () => void }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    // @ts-ignore
    content: () => contentRef.current,
    documentTitle: `Invoice_${invoice.id}`,
  });

  return (
    <Dialog open={true} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="flex flex-row justify-between items-center print:hidden">
          <DialogTitle>View Invoice</DialogTitle>
          <div className="flex gap-2 pr-4">
            <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Print</Button>
          </div>
        </DialogHeader>

        {/* Printable Area */}
        <div ref={contentRef} className="p-8 bg-white text-black min-h-[1056px] w-full font-sans text-[13px] border relative">
          
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="AL-MAWA Logo" className="max-h-16 max-w-[120px] object-contain" />
              <div>
                <div className="text-xs font-semibold text-gray-500">GSTIN : 27ABDCA0474D1Z1</div>
                <h1 className="text-2xl font-bold uppercase tracking-tight text-blue-900 mt-1">AL-MAWA INTERNATIONAL</h1>
                <div className="text-xs text-gray-600 mt-1">
                  Office No. 102-103 (Nexus Work Spaces), 1st Floor, Pride Icon Building, above Athithi Restaurant<br/>
                  Kharadi-Mundhwa Road, Kharadi, Pune, Maharashtra, PIN Code 411014<br/>
                  Contact No. : 📞 +91 95611 79693 | 📞 +91 95611 06693 | 📞 +91 90283 22363
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 border border-black mb-4">
            <div className="col-span-1 border-r border-black p-2 space-y-1">
              <div className="font-bold text-xs bg-gray-100 -m-2 mb-2 p-1 border-b border-black">Bill To</div>
              <div className="font-bold">{employee?.name}</div>
              <div className="w-48 break-words text-xs">{employee?.address || "Address not provided"}</div>
              <div className="text-xs">State: {employee?.state || "N/A"}</div>
              <div className="text-xs">GSTIN: {employee?.gstin || "URD"}</div>
            </div>
            <div className="col-span-1 border-r border-black p-2 space-y-1">
              <div className="font-bold text-xs bg-gray-100 -m-2 mb-2 p-1 border-b border-black">Shipp To</div>
              <div className="font-bold">{employee?.name}</div>
            </div>
            <div className="col-span-1 text-xs flex flex-col justify-between">
              <div className="grid grid-cols-2 border-b border-black p-2 gap-y-1">
                <span className="font-semibold">Inv. No. :</span><span>{invoice.id}</span>
                <span className="font-semibold">Inv. Date :</span><span>{invoice.invoiceDate}</span>
              </div>
              <div className="grid grid-cols-2 p-2 gap-y-1 h-full">
                <span className="font-semibold">Vehicle Number :</span><span>{invoice.vehicleNumber || "N/A"}</span>
              </div>
            </div>
          </div>

          <table className="w-full border-collapse border border-black text-xs text-center mb-0">
            <thead className="bg-blue-50/50">
              <tr>
                <th className="border border-black p-1 w-8">Sr</th>
                <th className="border border-black p-1 text-left">Goods & Service Description</th>
                <th className="border border-black p-1">HSN</th>
                <th className="border border-black p-1">Quantity</th>
                <th className="border border-black p-1">Rate</th>
                <th className="border border-black p-1 bg-blue-100/30">Taxable</th>
                <th className="border border-black p-0">
                  <div className="border-b border-black">GST</div>
                  <div className="flex"><div className="w-1/2 border-r border-black">%</div><div className="w-1/2">Amt.</div></div>
                </th>
                <th className="border border-black p-1 bg-blue-100/30">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => (
                <tr key={i} className="align-top h-8">
                  <td className="border-l border-r border-black p-1">{i + 1}</td>
                  <td className="border-l border-r border-black p-1 text-left font-medium text-gray-800">{item.description}</td>
                  <td className="border-l border-r border-black p-1 text-gray-600">{item.hsn}</td>
                  <td className="border-l border-r border-black p-1">{item.quantity} Nos</td>
                  <td className="border-l border-r border-black p-1">{item.rate.toFixed(2)}</td>
                  <td className="border-l border-r border-black p-1 bg-blue-50/30 text-blue-900 font-medium">{item.taxable.toFixed(2)}</td>
                  <td className="border-l border-r border-black p-0 text-gray-600 flex justify-center">
                    <div className="w-1/2 p-1 border-r border-black">{item.gstPercent}%</div>
                    <div className="w-1/2 p-1">{item.gstAmount.toFixed(2)}</div>
                  </td>
                  <td className="border-l border-r border-black p-1 bg-blue-50/30 text-blue-900 font-bold">{item.total.toFixed(2)}</td>
                </tr>
              ))}
              {/* Fill empty space */}
              {Array.from({ length: Math.max(0, 10 - invoice.items.length) }).map((_, i) => (
                <tr key={`empty-${i}`} className="h-8">
                  <td className="border-l border-r border-black"></td>
                  <td className="border-l border-r border-black"></td>
                  <td className="border-l border-r border-black"></td>
                  <td className="border-l border-r border-black"></td>
                  <td className="border-l border-r border-black"></td>
                  <td className="border-l border-r border-black bg-blue-50/30"></td>
                  <td className="border-l border-r border-black">
                     <div className="flex h-full"><div className="w-1/2 border-r border-black"></div><div className="w-1/2"></div></div>
                  </td>
                  <td className="border-l border-r border-black bg-blue-50/30"></td>
                </tr>
              ))}
              <tr className="border border-black font-bold text-gray-800">
                <td colSpan={3} className="text-right p-1 pr-4">Sub-Total:</td>
                <td className="border-l border-r border-black p-1">{invoice.totalQuantity}</td>
                <td className="border-l border-r border-black p-1"></td>
                <td className="border-l border-r border-black p-1 bg-blue-100/50">{invoice.subTotal.toFixed(2)}</td>
                <td className="border-l border-r border-black p-0">
                  <div className="flex h-full"><div className="w-1/2 border-r border-black"></div><div className="w-1/2 p-1 bg-blue-100/50">{(invoice.cgst + invoice.sgst + invoice.igst).toFixed(2)}</div></div>
                </td>
                <td className="border-l border-r border-black p-1 bg-blue-100/50 text-blue-900">{invoice.totalAmount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div className="flex border-l border-r border-b border-black text-xs">
            <div className="w-[60%] p-2 border-r border-black">
              <div className="font-bold mb-1">Our Bank Details</div>
              <div className="grid grid-cols-3 gap-1">
                <span className="font-medium text-gray-600">Bank Name :</span><span className="col-span-2 font-bold">STATE BANK OF INDIA</span>
                <span className="font-medium text-gray-600">Branch :</span><span className="col-span-2">Delhi</span>
                <span className="font-medium text-gray-600">Account No :</span><span className="col-span-2 font-bold">20412XXXX05</span>
                <span className="font-medium text-gray-600">IFSC Code :</span><span className="col-span-2">SBIN003XXXX</span>
                <span className="font-medium text-gray-600">UPI ID :</span><span className="col-span-2">yourid@upi</span>
              </div>
              <div className="mt-4">
                <span className="font-medium text-gray-600">Invoice Total in Word</span><br/>
                <span className="font-bold">Rupees {invoice.totalAmount} Only</span>
              </div>
            </div>
            <div className="w-[40%] text-right font-medium text-gray-700">
               <div className="flex border-b border-black"><div className="w-2/3 p-1 border-r border-black bg-gray-50">CGST Amt :</div><div className="w-1/3 p-1">{invoice.cgst.toFixed(2)}</div></div>
               <div className="flex border-b border-black"><div className="w-2/3 p-1 border-r border-black bg-gray-50">SGST Amt :</div><div className="w-1/3 p-1">{invoice.sgst.toFixed(2)}</div></div>
               <div className="flex border-b border-black"><div className="w-2/3 p-1 border-r border-black bg-gray-50">IGST Amt :</div><div className="w-1/3 p-1">{invoice.igst.toFixed(2)}</div></div>
               <div className="flex border-b border-black"><div className="w-2/3 p-1 border-r border-black bg-gray-50">Freight Packing Charges :</div><div className="w-1/3 p-1"></div></div>
               <div className="flex border-b border-black"><div className="w-2/3 p-1 border-r border-black bg-gray-50">Round off :</div><div className="w-1/3 p-1">{invoice.roundOff.toFixed(2)}</div></div>
               <div className="flex text-sm font-bold text-blue-900"><div className="w-2/3 p-1 border-r border-black bg-blue-50/50">Total Amount :</div><div className="w-1/3 p-1 bg-blue-50/50">{invoice.totalAmount.toFixed(2)}</div></div>
            </div>
          </div>

          <div className="border-l border-r border-b border-black p-2 flex justify-between text-[11px] h-32 relative">
            <div>
              {/* Removed Declaration block */}
            </div>
            <div className="flex flex-col justify-between items-end h-full pt-1">
              <div className="font-bold text-xs uppercase tracking-wide">For, AL-MAWA INTERNATIONAL</div>
              <img src="/signature.png" alt="Signature" className="h-16 object-contain mt-auto mb-1 mr-4 mix-blend-multiply" />
              <div className="font-bold border-t border-black pt-1 px-4 text-center mt-auto">Authorised Signatory</div>
            </div>
          </div>
          
          <div className="text-center font-bold text-xs mt-2 text-gray-600">Thank You For Business With US!</div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
