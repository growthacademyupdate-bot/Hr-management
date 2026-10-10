'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const quotationTemplates: Record<string, { description: string; serviceDetails: string }> = {
  ecommerce: {
    description: 'E-commerce Website',
    serviceDetails: `Responsive E-Commerce Website – Developed using MongoDB, Express.js, React.js, and Node.js with mobile, tablet, and desktop support.
User Authentication & Security – Signup, login, JWT authentication, password hashing, protected routes, and role-based access.
Product & Category Management – Admin can manage products, categories, sub-categories, pricing, images, descriptions, specifications, and stock.
Search & Product Filtering – Product search, category/price/availability filters, sorting, and detailed product pages.
Cart & Wishlist – Add/remove products, quantity management, wishlist, and automatic cart total calculation.
Checkout & Online Payment – Customer details, delivery information, order summary, and Razorpay/Stripe payment integration.
Order Management & Tracking – Order placement, order history, payment status, and tracking through Pending, Confirmed, Processing, Shipped, Delivered, and Cancelled statuses.
Admin Dashboard – Centralized management of customers, products, categories, inventory, orders, payments, revenue, and business statistics.
REST API & Database – Developed RESTful APIs using Node.js/Express.js with MongoDB/Mongoose for authentication, products, orders, cart, wishlist, and payments.
Performance & Deployment – Optimized application performance, database queries, API requests, and provided production deployment/configuration support.`
  },
  digital: {
    description: 'Digital Marketing / Social Media Management',
    serviceDetails: `Social Media Marketing strategy and planning.
Social media profile setup and optimization.
Content Planning based on brand and target audience.
Creative Post Designing for social media platforms.
Reels & Short Video Creation.
Professional Video Shooting for reels, promotional videos, and brand content.
Product/Service Photography for marketing content.
Video editing, transitions, effects, and background music.
Reels Editing & Optimization for social media platforms.
Caption and content writing for posts and reels.
Hashtag research and content optimization.
Promotional creatives for offers, products, and services.
Brand-focused content creation and visual consistency.
Social media posting and content publishing.
Monthly Content Calendar preparation.
Campaign and promotional content planning.
Performance tracking and basic social media reporting.
Regular content updates based on marketing requirements.`
  },
  billing: {
    description: 'Billing S/W',
    serviceDetails: `Development of Billing & POS Software using the MERN Stack.
Secure Admin Login & Role-Based Access.
Admin Dashboard with sales, revenue, orders, and business statistics.
Product Management – add, edit, delete, and manage products.
Customer Management – maintain customer details and purchase history.
Billing / POS Module for creating and processing bills.
Generate GST/Tax Invoices with applicable tax calculations.
Discount Management for applying item-wise or bill-wise discounts.
Payment Management with Cash, UPI, Card, and other payment options.
Sales Management with daily, weekly, and monthly sales records.
Purchase Management for managing product purchases.
Inventory / Stock Management with stock-in and stock-out tracking.
Low Stock Alerts for inventory monitoring.
Supplier Management for maintaining supplier records.
Expense Management for tracking business expenses.
Return / Refund Management for sales and purchase returns.
Reports & Analytics for sales, purchases, inventory, expenses, and payments.
Search, filter, sorting, and pagination functionality.
Invoice Print & PDF generation.
User/Employee Management with role-based permissions.
Responsive interface for Desktop, Tablet, and Mobile.
REST API development using Node.js & Express.js.
MongoDB database integration.`
  },
  erp: {
    description: 'ERP/CRM',
    serviceDetails: `Development of a custom ERP/CRM software using the MERN Stack.
Admin, Employee, and Customer modules.Responsive UI for Desktop, Tablet, and Mobile.
Secure Login & Role-Based Access Control.
Admin dashboard with business overview and key statistics.
Customer Management – add, edit, delete, and manage customer records.
Employee Management – employee profiles, roles, and responsibilities.
Lead Management – create, assign, track, and manage leads.
Follow-up Management – schedule and track customer follow-ups.
Task Management – assign tasks to employees and track task status.
Sales Management – manage sales activities, quotations, and transactions.
Quotation Management – create, manage, and download quotations.
Invoice Management – create and manage invoices.
Payment Management – track received and pending payments.
Expense Management – record and manage business expenses.
Reports & Analytics – generate business and performance reports.
Notifications & Alerts for important activities and updates.
Dashboard with charts, tables, and graphical reports.

REST API development using Node.js & Express.js.
MongoDB database integration for data management.
JWT,API validation, error handling, and basic security implementation.
Deployment and production configuration.
Testing and bug fixing before final delivery.`
  },
  portfolio: {
    description: 'Portfolio Website',
    serviceDetails: `Professional Company Portfolio Website design and development.
Modern, responsive, and user-friendly UI/UX.
Home Page with company introduction, highlights, and key sections.
About Company section with company information, vision, mission, and objectives.
Services section to showcase company services.
Projects / Portfolio section to display completed projects and work.
Team Members section to showcase employees/team members.
Testimonials section for client reviews and feedback.
Gallery section for company images and activities.
Contact Us page with enquiry/contact form.
Integration of WhatsApp, Email, Google Maps, and Social Media links.
Admin Login with secure authentication.
Admin dashboard to manage website content.
Image upload and content management functionality.
Fully responsive website for Desktop, Tablet, and Mobile.
SEO-friendly website structure.
Basic performance optimization.
Website testing and bug fixing before deployment.
Production deployment and basic configuration.
6 Months Free Support for minor bug fixes and technical assistance.`
  },
  maintenance: {
    description: 'Maintenance & Support Services',
    serviceDetails: `Regular maintenance and monitoring of the website to ensure smooth and reliable operation.
Fixing bugs, errors, broken functionality, and UI issues identified during website usage.
Updating website content, text, images, banners, and other existing information as required.
Maintaining existing website pages, forms, components, and functionalities.
Performance optimization and troubleshooting of website-related issues.
Ensuring the website remains responsive and compatible across desktop, tablet, and mobile devices.
Monitoring and resolving issues related to website hosting, deployment, and configuration within the existing setup.
Making minor UI/UX improvements and layout adjustments wherever required.
Maintaining existing integrations and APIs and resolving issues related to their existing functionality.
Regular technical support for website-related issues and maintenance requirements.
Testing changes before deployment to ensure existing functionality is not affected.
Deployment of approved maintenance updates and bug fixes to the live website.
Note: Maintenance covers the existing website functionality and structure. Any major new module, feature, third-party API, redesign, or functionality outside the existing scope will be considered separately and may be charged additionally.`
  }
};

const digitalPackages = {
  basic: {
    description: 'Digital Marketing - Basic Package (4 Reels + 6 Posts)',
    unitPrice: '6000',
    serviceDetails: `Social Media Marketing strategy and planning.
Content Planning based on brand and target audience.
Creative Post Designing for social media platforms (6 Posts/month).
Reels & Short Video Creation and Editing (4 Reels/month).
Caption and content writing for posts and reels.
Hashtag research and content optimization.
Regular content updates and posting.`
  },
  standard: {
    description: 'Digital Marketing - Standard Package (6 Reels + 8 Posts)',
    unitPrice: '10000',
    serviceDetails: `Social Media Marketing strategy and planning.
Content Planning based on brand and target audience.
Creative Post Designing for social media platforms (8 Posts/month).
Reels & Short Video Creation and Editing (6 Reels/month).
Caption and content writing for posts and reels.
Hashtag research and content optimization.
Regular content updates and posting.
Basic performance tracking and reporting.`
  },
  premium: {
    description: 'Digital Marketing - Premium Package (10 Reels + 15 Posts)',
    unitPrice: '15000',
    serviceDetails: `Social Media Marketing strategy and planning.
Content Planning based on brand and target audience.
Creative Post Designing for social media platforms (15 Posts/month).
Reels & Short Video Creation and Editing (10 Reels/month).
Caption and content writing for posts and reels.
Hashtag research and content optimization.
Promotional creatives for offers, products, and services.
Regular content updates and posting.
Performance tracking and monthly reporting.`
  }
};

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
    { description: '', unitPrice: '', quantity: '1', sgstPercent: '9', cgstPercent: '9', includeGst: true, serviceDetails: '' }
  ]);

  const [additionalServices, setAdditionalServices] = useState<{ description: string, amount: string }[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

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
    setItems([...items, { description: '', unitPrice: '', quantity: '1', sgstPercent: '9', cgstPercent: '9', includeGst: true, serviceDetails: '' }]);
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

  const handleQuotationTemplateSelect = (value: string) => {
    setSelectedTemplate(value);
    if (quotationTemplates[value]) {
      const template = quotationTemplates[value];
      const newItems = [...items];
      newItems[0] = { ...newItems[0], description: template.description, serviceDetails: template.serviceDetails };
      setItems(newItems);
    }
  };

  const handleDigitalPackageSelect = (value: string) => {
    if (digitalPackages[value as keyof typeof digitalPackages]) {
      const pkg = digitalPackages[value as keyof typeof digitalPackages];
      const newItems = [...items];
      newItems[0] = {
        ...newItems[0],
        description: pkg.description,
        serviceDetails: pkg.serviceDetails,
        unitPrice: pkg.unitPrice,
        quantity: '1',
        cgstPercent: '9',
        sgstPercent: '9',
        includeGst: true
      };
      setItems(newItems);
    }
  };

  const removeAdditionalService = (index: number) => {
    setAdditionalServices(additionalServices.filter((_, i) => i !== index));
  };

  const calculations = items.reduce(
    (acc, item) => {
      const qty = item.quantity === '' ? 1 : Number(item.quantity);
      const subtotal = Number(item.unitPrice) * qty;
      acc.subtotal += subtotal;

      if (item.includeGst) {
        const sgst = (subtotal * (item.sgstPercent === '' ? 0 : Number(item.sgstPercent))) / 100;
        const cgst = (subtotal * (item.cgstPercent === '' ? 0 : Number(item.cgstPercent))) / 100;
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
    if (!formData.customerName || !formData.companyName || !formData.customerMobile || !formData.address || !formData.pincode || !formData.quoteNumber || !formData.date || !formData.validUntil || !formData.bdeName || items.some(i => !i.description || i.unitPrice === '' || Number(i.unitPrice) < 0 || i.quantity === '' || Number(i.quantity) <= 0)) {
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
            <div className="space-y-2 md:col-span-2">
              <Label>Select Quotation</Label>
              <Select onValueChange={handleQuotationTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ecommerce">1. E-commerce</SelectItem>
                  <SelectItem value="digital">2. Digital</SelectItem>
                  <SelectItem value="billing">3. Billing S/W</SelectItem>
                  <SelectItem value="erp">4. ERP/CRM</SelectItem>
                  <SelectItem value="portfolio">5. Portfolio</SelectItem>
                  <SelectItem value="maintenance">6. Maintenance & Support</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedTemplate === 'digital' && (
              <div className="space-y-2 md:col-span-2">
                <Label>Select Digital Package</Label>
                <Select onValueChange={handleDigitalPackageSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select digital package..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic (4 Reels + 6 Posts) - ₹6K</SelectItem>
                    <SelectItem value="standard">Standard (6 Reels + 8 Posts) - ₹10K</SelectItem>
                    <SelectItem value="premium">Premium (10 Reels + 15 Posts) - ₹15K</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
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
