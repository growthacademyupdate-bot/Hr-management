'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function QuotationGenerator() {
  const [formData, setFormData] = useState({
    customerName: '',
    companyName: '',
    customerMobile: '',
    customerMobile2: '',
    address: '',
    pincode: '',
    email: '',
    customerId: '',
    quoteNumber: '',
    date: new Date().toISOString().split('T')[0],
    validUntil: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString().split('T')[0],
    bdeName: '',
  });

  const [items, setItems] = useState([
    { description: '', unitPrice: 0, quantity: 1, sgstPercent: 0, cgstPercent: 0, includeGst: true, serviceDetails: '' }
  ]);

  const [additionalServices, setAdditionalServices] = useState<{ description: string, amount: string }[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { description: '', unitPrice: 0, quantity: 1, sgstPercent: 0, cgstPercent: 0, includeGst: true, serviceDetails: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const addAdditionalService = () => {
    setAdditionalServices([...additionalServices, { description: '', amount: 'Charges Applicable' }]);
  };

  const updateAdditionalService = (index: number, field: string, value: string) => {
    const newServices = [...additionalServices];
    newServices[index] = { ...newServices[index], [field]: value };
    setAdditionalServices(newServices);
  };

  const removeAdditionalService = (index: number) => {
    setAdditionalServices(additionalServices.filter((_, i) => i !== index));
  };

  const calculations = items.reduce(
    (acc, item) => {
      const subtotal = Number(item.unitPrice) * Number(item.quantity);
      acc.subtotal += subtotal;
      
      if (item.includeGst) {
        const sgst = (subtotal * Number(item.sgstPercent)) / 100;
        const cgst = (subtotal * Number(item.cgstPercent)) / 100;
        acc.sgst += sgst;
        acc.cgst += cgst;
      }
      return acc;
    },
    { subtotal: 0, sgst: 0, cgst: 0 }
  );

  const total = calculations.subtotal + calculations.sgst + calculations.cgst;

  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    if (!formData.customerName || !formData.companyName || !formData.customerMobile || !formData.address || !formData.pincode || !formData.quoteNumber || !formData.date || !formData.validUntil || !formData.bdeName || items.some(i => !i.description || i.unitPrice < 0 || i.quantity <= 0)) {
      toast.error("Please fill all required fields correctly.");
      return;
    }

    setIsGenerating(true);
    try {
      const payload = {
        ...formData,
        items,
        additionalServices,
        subtotal: calculations.subtotal,
        sgstAmount: calculations.sgst,
        cgstAmount: calculations.cgst,
        totalAmount: total,
      };

      const response = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to generate quotation');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Quotation_${formData.quoteNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("PDF Generated successfully!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Quotation Generator</h1>
        <p className="text-gray-500">Fill in the details below to generate a professional quotation PDF</p>
      </div>

      <div className="space-y-6">
        <Card className="bg-slate-50 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input name="customerName" value={formData.customerName} onChange={handleInputChange} placeholder="Enter customer name" />
            </div>
            <div className="space-y-2">
              <Label>Company / Store / Shop Name *</Label>
              <Input name="companyName" value={formData.companyName} onChange={handleInputChange} placeholder="Enter company name" />
            </div>
            <div className="space-y-2">
              <Label>Customer Mobile Number *</Label>
              <Input name="customerMobile" value={formData.customerMobile} onChange={handleInputChange} placeholder="Enter mobile number" />
            </div>
            <div className="space-y-2">
              <Label>Customer Mobile Number 2</Label>
              <Input name="customerMobile2" value={formData.customerMobile2} onChange={handleInputChange} placeholder="Enter mobile number" />
            </div>
            <div className="space-y-2">
              <Label>Address *</Label>
              <Input name="address" value={formData.address} onChange={handleInputChange} placeholder="Enter address" />
            </div>
            <div className="space-y-2">
              <Label>Pincode *</Label>
              <Input name="pincode" value={formData.pincode} onChange={handleInputChange} placeholder="Enter pincode" />
            </div>
            <div className="space-y-2">
              <Label>Email ID</Label>
              <Input name="email" value={formData.email} onChange={handleInputChange} placeholder="Enter email id" />
            </div>
            <div className="space-y-2">
              <Label>Customer ID</Label>
              <Input name="customerId" value={formData.customerId} onChange={handleInputChange} placeholder="Enter customer ID" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Quote Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quote Number *</Label>
              <Input name="quoteNumber" value={formData.quoteNumber} onChange={handleInputChange} placeholder="Enter quote number" />
            </div>
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input type="date" name="date" value={formData.date} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label>Valid Until *</Label>
              <Input type="date" name="validUntil" value={formData.validUntil} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label>BDE Name *</Label>
              <Input name="bdeName" value={formData.bdeName} onChange={handleInputChange} placeholder="Enter BDE Name" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Items</CardTitle>
            <Button onClick={addItem} variant="default" className="bg-blue-500 hover:bg-blue-600">Add Item</Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {items.map((item, index) => (
              <div key={index} className="p-4 bg-white rounded-lg border space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-sm">Item {index + 1}</h4>
                  {items.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeItem(index)} className="text-red-500 h-8">Delete Item</Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <Label>Description</Label>
                    <Input value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} placeholder="Item description" />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit Price</Label>
                    <Input type="number" value={item.unitPrice} onChange={e => handleItemChange(index, 'unitPrice', e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} placeholder="1" />
                  </div>
                  <div className="space-y-2">
                    <Label>SGST %</Label>
                    <Input type="number" value={item.sgstPercent} onChange={e => handleItemChange(index, 'sgstPercent', e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>CGST %</Label>
                    <Input type="number" value={item.cgstPercent} onChange={e => handleItemChange(index, 'cgstPercent', e.target.value)} placeholder="0" />
                  </div>
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox id={`gst-${index}`} checked={item.includeGst} onCheckedChange={(c) => handleItemChange(index, 'includeGst', !!c)} />
                  <Label htmlFor={`gst-${index}`} className="font-normal cursor-pointer text-sm">Include GST (CGST + SGST)</Label>
                </div>
                <div className="space-y-2">
                  <Label>Service Details (Enter each point on a new line)</Label>
                  <Textarea rows={4} value={item.serviceDetails} onChange={e => handleItemChange(index, 'serviceDetails', e.target.value)} placeholder="• Detail 1&#10;• Detail 2" className="resize-none" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Additional Services (Optional)</CardTitle>
            <Button onClick={addAdditionalService} variant="outline">Add Service</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {additionalServices.map((service, index) => (
              <div key={index} className="flex gap-4 items-start">
                <div className="flex-1 space-y-2">
                  <Label>Description</Label>
                  <Input value={service.description} onChange={e => updateAdditionalService(index, 'description', e.target.value)} placeholder="E.g. Professional influencer vlogging..." />
                </div>
                <div className="w-48 space-y-2">
                  <Label>Amount</Label>
                  <Input value={service.amount} onChange={e => updateAdditionalService(index, 'amount', e.target.value)} />
                </div>
                <Button variant="ghost" className="mt-8 text-red-500" onClick={() => removeAdditionalService(index)}>Delete</Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <h3 className="text-lg font-semibold">Summary</h3>
              <div className="w-full md:w-64 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>₹{calculations.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">SGST:</span>
                  <span>₹{calculations.sgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">CGST:</span>
                  <span>₹{calculations.cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                  <span>Total:</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center pt-4">
          <Button onClick={generatePDF} disabled={isGenerating} size="lg" className="bg-blue-600 hover:bg-blue-700 text-white min-w-[200px]">
            {isGenerating ? 'Generating...' : 'Generate PDF Quote'}
          </Button>
        </div>
      </div>
    </div>
  );
}
