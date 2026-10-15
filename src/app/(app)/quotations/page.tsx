'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { getQuotationHistory } from '@/app/actions';
import { useAuth } from '@/lib/store';

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
  },
  rcs: {
    description: 'RCS Messaging',
    serviceDetails: `RCS messaging campaign setup and configuration.
Business profile setup and branding configuration.
Creation and configuration of RCS message templates.
Integration of recipient contact data.
Rich media messaging support, including images, videos, and interactive content.
Configuration of call-to-action buttons, website links, and customer response options.
Promotional and transactional message campaign execution, subject to applicable approvals.
Bulk message delivery to the provided recipient list.
Delivery status tracking and campaign monitoring.
Basic campaign performance reporting and delivery analytics.
Message template approval and platform compliance support.
Technical support for campaign configuration and execution.`
  },
  metaAds: {
    description: 'Meta Ads',
    serviceDetails: `Meta advertising campaign setup and configuration for Facebook and Instagram.
Audience research and targeting based on the campaign goals.
Campaign strategy, objectives, placements, and budget configuration.
Ad copy and creative setup using client-provided or approved materials.
Lead generation, website traffic, engagement, or conversion campaign execution.
Pixel and conversion event configuration where access and platform support are available.
Campaign monitoring and optimization during the agreed campaign period.
Basic reporting on reach, impressions, clicks, leads, and other available performance metrics.
Recommendations for improving campaign performance.
Advertising spend is paid separately by the client directly to Meta.
Campaign results depend on audience, budget, creative, platform review, and other factors; specific results are not guaranteed.`
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

interface SavedQuotation {
  _id: string;
  quoteNumber: string;
  date: string;
  validUntil: string;
  bdeName: string;
  customerName: string;
  companyName: string;
  customerMobile: string;
  customerMobile2?: string;
  address: string;
  pincode: string;
  email?: string;
  customerId?: string;
  items: {
    description: string;
    unitPrice: number;
    quantity: number;
    sgstPercent: number;
    cgstPercent: number;
    includeGst: boolean;
    serviceDetails: string;
  }[];
  additionalServices?: { description: string; amount: string }[];
}

export default function QuotationGenerator() {
  const user = useAuth();
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
  const [savedQuotations, setSavedQuotations] = useState<SavedQuotation[]>([]);
  const [loadingSavedQuotations, setLoadingSavedQuotations] = useState(false);

  useEffect(() => {
    if (!user) return;
    const userRole = user.role;
    let cancelled = false;

    async function loadSavedQuotations() {
      setLoadingSavedQuotations(true);
      try {
        const result = await getQuotationHistory(userRole);
        if (cancelled) return;
        if (!result.success) {
          toast.error(result.error || 'Failed to load saved quotations');
          return;
        }
        setSavedQuotations((result.quotations || []) as SavedQuotation[]);
      } catch (error) {
        console.error('Failed to load saved quotations:', error);
        if (!cancelled) toast.error('Failed to load saved quotations');
      } finally {
        if (!cancelled) setLoadingSavedQuotations(false);
      }
    }

    loadSavedQuotations();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSavedCustomerSelect = (quotationId: string) => {
    const quotation = savedQuotations.find((record) => record._id === quotationId);
    if (!quotation) return;
    setFormData((current) => ({
      ...current,
      customerName: quotation.customerName || '',
      companyName: quotation.companyName || '',
      customerMobile: quotation.customerMobile || '',
      customerMobile2: quotation.customerMobile2 || '',
      address: quotation.address || '',
      pincode: quotation.pincode || '',
      email: quotation.email || '',
      customerId: quotation.customerId || '',
    }));
  };

  const handleSavedQuoteSelect = (quotationId: string) => {
    const quotation = savedQuotations.find((record) => record._id === quotationId);
    if (!quotation) return;
    const toDateInput = (value: string) => value ? new Date(value).toISOString().slice(0, 10) : '';
    setFormData((current) => ({
      ...current,
      quoteNumber: quotation.quoteNumber || current.quoteNumber,
      date: toDateInput(quotation.date),
      validUntil: toDateInput(quotation.validUntil),
      bdeName: quotation.bdeName || '',
    }));
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

  const handleFirstItemDescriptionChange = (description: string) => {
    setItems((current) => current.map((item, index) => (
      index === 0 ? { ...item, description } : item
    )));
  };

  const handleItemPresetSelect = (index: number, value: string) => {
    const [type, key] = value.split(':');
    if (type === 'saved') {
      const savedItem = savedQuotations
        .find((quotation) => quotation._id === key)
        ?.items?.[Number(value.split(':')[2])];
      if (!savedItem) return;
      const newItems = [...items];
      newItems[index] = {
        description: savedItem.description || '',
        unitPrice: String(savedItem.unitPrice ?? ''),
        quantity: String(savedItem.quantity ?? '1'),
        sgstPercent: String(savedItem.sgstPercent ?? 0),
        cgstPercent: String(savedItem.cgstPercent ?? 0),
        includeGst: Boolean(savedItem.includeGst),
        serviceDetails: savedItem.serviceDetails || '',
      };
      setItems(newItems);
      return;
    }

    const preset = type === 'package'
      ? digitalPackages[key as keyof typeof digitalPackages]
      : type === 'template'
        ? quotationTemplates[key]
        : undefined;

    if (!preset) return;

    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      description: preset.description,
      serviceDetails: preset.serviceDetails,
      ...(type === 'package' ? {
        unitPrice: digitalPackages[key as keyof typeof digitalPackages].unitPrice,
        quantity: '1',
        cgstPercent: '9',
        sgstPercent: '9',
        includeGst: true,
      } : {}),
    };
    setItems(newItems);
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

  const validateQuotation = () => {
    const hasMissingDetails =
      !formData.customerName.trim() ||
      !formData.companyName.trim() ||
      !formData.customerMobile.trim() ||
      !formData.address.trim() ||
      !formData.pincode.trim() ||
      !formData.quoteNumber.trim() ||
      !formData.date ||
      !formData.validUntil ||
      !formData.bdeName.trim();
    const hasInvalidItems = items.some(item =>
      !item.description.trim() ||
      item.unitPrice === '' ||
      !Number.isFinite(Number(item.unitPrice)) ||
      Number(item.unitPrice) < 0 ||
      item.quantity === '' ||
      !Number.isFinite(Number(item.quantity)) ||
      Number(item.quantity) <= 0
    );

    if (hasMissingDetails || hasInvalidItems) {
      toast.error("Please fill all required fields correctly.");
      return false;
    }
    return true;
  };

  const openPreview = () => {
    if (!validateQuotation()) return;
    setIsPreviewing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const generatePDF = async () => {
    if (!validateQuotation()) return;

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

      const savedRecord: SavedQuotation = {
        _id: `quote-${formData.quoteNumber}`,
        ...formData,
        items: items.map((item) => ({
          ...item,
          unitPrice: Number(item.unitPrice),
          quantity: Number(item.quantity),
          sgstPercent: Number(item.sgstPercent || 0),
          cgstPercent: Number(item.cgstPercent || 0),
        })),
        additionalServices: [...additionalServices],
      };
      setSavedQuotations((current) => [
        savedRecord,
        ...current.filter((quotation) => quotation.quoteNumber !== savedRecord.quoteNumber),
      ].slice(0, 100));
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
        <p className="text-gray-500">
          {isPreviewing ? "Review the quotation before generating the PDF." : "Fill in the details, then preview your quotation before generating the PDF."}
        </p>
      </div>

      {isPreviewing ? (
        <div className="space-y-6">
          <Card className="overflow-hidden border shadow-sm">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Eye className="h-5 w-5 text-primary" />
                Quotation Preview
              </CardTitle>
              <CardDescription>Review the customer, quote, and item details before generating the PDF.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-5 sm:p-6">
              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Customer Information</h2>
                <div className="grid gap-4 rounded-lg border bg-background p-4 sm:grid-cols-2">
                  <PreviewField label="Customer Name" value={formData.customerName} />
                  <PreviewField label="Company" value={formData.companyName} />
                  <PreviewField label="Mobile Number" value={formData.customerMobile} />
                  <PreviewField label="Alternate Mobile" value={formData.customerMobile2} />
                  <PreviewField label="Address" value={formData.address} />
                  <PreviewField label="Pincode" value={formData.pincode} />
                  <PreviewField label="Email" value={formData.email} />
                  <PreviewField label="Customer ID" value={formData.customerId} />
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Quotation Details</h2>
                <div className="grid gap-4 rounded-lg border bg-background p-4 sm:grid-cols-2 lg:grid-cols-4">
                  <PreviewField label="Quotation Type" value={quotationTemplates[selectedTemplate]?.description || "Custom quotation"} />
                  <PreviewField label="Quote Number" value={formData.quoteNumber} />
                  <PreviewField label="Date" value={formData.date} />
                  <PreviewField label="Valid Until" value={formData.validUntil} />
                  <PreviewField label="BDE Name" value={formData.bdeName} />
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Items & Services</h2>
                <div className="space-y-4">
                  {items.map((item, index) => {
                    const baseAmount = Number(item.unitPrice) * Number(item.quantity);
                    const itemSgst = item.includeGst ? baseAmount * Number(item.sgstPercent || 0) / 100 : 0;
                    const itemCgst = item.includeGst ? baseAmount * Number(item.cgstPercent || 0) / 100 : 0;

                    return (
                      <div key={index} className="overflow-hidden rounded-lg border bg-background">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 p-4">
                          <div>
                            <p className="font-semibold">{item.description}</p>
                            <p className="text-xs text-muted-foreground">Item {index + 1}</p>
                          </div>
                          <p className="text-lg font-bold tabular-nums">₹{(baseAmount + itemSgst + itemCgst).toFixed(2)}</p>
                        </div>
                        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
                          <PreviewField label="Rate / Unit Price" value={`₹${Number(item.unitPrice).toFixed(2)}`} />
                          <PreviewField label="Quantity" value={item.quantity} />
                          <PreviewField label="SGST" value={item.includeGst ? `${item.sgstPercent || 0}% · ₹${itemSgst.toFixed(2)}` : "Not applicable"} />
                          <PreviewField label="CGST" value={item.includeGst ? `${item.cgstPercent || 0}% · ₹${itemCgst.toFixed(2)}` : "Not applicable"} />
                        </div>
                        {item.serviceDetails.trim() && (
                          <div className="border-t p-4">
                            <p className="mb-2 text-sm font-medium">Service Details</p>
                            <ul className="space-y-1.5 text-sm text-muted-foreground">
                              {item.serviceDetails.split(/\r?\n/).filter(line => line.trim()).map((line, detailIndex) => (
                                <li key={detailIndex} className="flex gap-2">
                                  <span className="text-primary">•</span>
                                  <span>{line.replace(/^•\s*/, "")}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {additionalServices.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Additional Services</h2>
                  <div className="divide-y rounded-lg border bg-background">
                    {additionalServices.map((service, index) => (
                      <div key={index} className="flex flex-wrap justify-between gap-3 p-4 text-sm">
                        <span>{service.description || "Additional service"}</span>
                        <span className="font-medium">{service.amount || "—"}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="ml-auto w-full space-y-2 rounded-lg border bg-muted/20 p-4 sm:max-w-sm">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">₹{calculations.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">SGST</span>
                  <span className="tabular-nums">₹{calculations.sgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">CGST</span>
                  <span className="tabular-nums">₹{calculations.cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-base font-bold">
                  <span>Total</span>
                  <span className="tabular-nums">₹{total.toFixed(2)}</span>
                </div>
              </section>
            </CardContent>
          </Card>
          <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => setIsPreviewing(false)} disabled={isGenerating}>
              <ArrowLeft className="h-4 w-4" />
              Edit Details
            </Button>
            <Button type="button" onClick={generatePDF} disabled={isGenerating} size="lg" className="bg-blue-600 text-white hover:bg-blue-700">
              <FileDown className="h-4 w-4" />
              {isGenerating ? "Generating PDF..." : "Generate PDF Quote"}
            </Button>
          </div>
        </div>
      ) : (
      <div className="space-y-6">
        <Card className="bg-slate-50 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Select Quotation</Label>
              <div className="space-y-3">
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
                    <SelectItem value="rcs">7. RCS Messaging</SelectItem>
                    <SelectItem value="metaAds">8. META ADS</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={items[0]?.description || ''}
                  onChange={(event) => handleFirstItemDescriptionChange(event.target.value)}
                  placeholder="Or type a custom service title"
                  aria-label="Custom service title"
                />
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Fill customer details from a saved quotation (optional)</Label>
              <div className="space-y-3">
                <Select onValueChange={handleSavedCustomerSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingSavedQuotations ? "Loading saved customers..." : "Choose a saved customer"} />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingSavedQuotations && (
                      <SelectItem value="loading-customers" disabled>Loading saved customers...</SelectItem>
                    )}
                    {!loadingSavedQuotations && savedQuotations.length === 0 && (
                      <SelectItem value="no-saved-customers" disabled>No saved customers yet</SelectItem>
                    )}
                    {savedQuotations.map((quotation) => (
                      <SelectItem key={quotation._id} value={quotation._id}>
                        {quotation.customerName} · {quotation.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  placeholder="Or enter customer name manually"
                  aria-label="Customer name"
                />
              </div>
            </div>
            {selectedTemplate === 'digital' && (
              <div className="space-y-2 md:col-span-2">
                <Label>Select Digital Package</Label>
                <div className="space-y-3">
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
                  <Input
                    value={items[0]?.description || ''}
                    onChange={(event) => handleFirstItemDescriptionChange(event.target.value)}
                    placeholder="Or enter a custom package name manually"
                    aria-label="Custom digital package name"
                  />
                </div>
              </div>
            )}
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
            <div className="space-y-2 md:col-span-2">
              <Label>Fill quote details from a saved quotation (optional)</Label>
              <div className="space-y-3">
                <Select onValueChange={handleSavedQuoteSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingSavedQuotations ? "Loading saved quotations..." : "Choose a saved quotation"} />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingSavedQuotations && (
                      <SelectItem value="loading-quotations" disabled>Loading saved quotations...</SelectItem>
                    )}
                    {!loadingSavedQuotations && savedQuotations.length === 0 && (
                      <SelectItem value="no-saved-quotations" disabled>No saved quotations yet</SelectItem>
                    )}
                    {savedQuotations.map((quotation) => (
                      <SelectItem key={quotation._id} value={quotation._id}>
                        {quotation.quoteNumber} · {quotation.customerName} · {quotation.date.slice(0, 10)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  name="quoteNumber"
                  value={formData.quoteNumber}
                  onChange={handleInputChange}
                  placeholder="Or enter quote number manually"
                  aria-label="Quote number"
                />
              </div>
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
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Choose a preset (optional)</Label>
                    <Select onValueChange={(value) => handleItemPresetSelect(index, value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a service preset..." />
                      </SelectTrigger>
                      <SelectContent>
                        {savedQuotations.flatMap((quotation) =>
                          (quotation.items || []).map((savedItem, savedItemIndex) => (
                            <SelectItem
                              key={`saved:${quotation._id}:${savedItemIndex}:${index}`}
                              value={`saved:${quotation._id}:${savedItemIndex}`}
                            >
                              Saved: {savedItem.description} · {quotation.customerName}
                            </SelectItem>
                          ))
                        )}
                        {Object.entries(quotationTemplates).map(([key, template]) => (
                          <SelectItem key={`template:${key}`} value={`template:${key}`}>
                            {template.description}
                          </SelectItem>
                        ))}
                        {Object.entries(digitalPackages).map(([key, pkg]) => (
                          <SelectItem key={`package:${key}`} value={`package:${key}`}>
                            {pkg.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={item.description}
                      onChange={e => handleItemChange(index, 'description', e.target.value)}
                      placeholder="Or enter a service description manually"
                      aria-label={`Manual description for item ${index + 1}`}
                    />
                  </div>
                </div>
                <div className={`grid grid-cols-1 gap-4 ${selectedTemplate === 'rcs' ? 'md:grid-cols-4' : 'md:grid-cols-5'}`}>
                  <div className="space-y-2">
                    <Label>{selectedTemplate === 'rcs' ? 'Rate' : 'Unit Price'}</Label>
                    <Input type="number" value={item.unitPrice} onChange={e => handleItemChange(index, 'unitPrice', e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} placeholder="1" />
                  </div>
                  {selectedTemplate === 'rcs' && (
                    <div className="space-y-2">
                      <Label>Amount</Label>
                      <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm font-semibold tabular-nums">
                        ₹{(Number(item.unitPrice || 0) * Number(item.quantity || 0)).toFixed(2)}
                      </div>
                    </div>
                  )}
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
              <div key={index} className="grid gap-4 items-start md:grid-cols-[minmax(0,1fr)_12rem_auto]">
                <div className="space-y-2">
                  <Label>Choose a saved additional service (optional)</Label>
                  <Select
                    onValueChange={(value) => {
                      const [quotationId, serviceIndex] = value.split(':');
                      const savedService = savedQuotations
                        .find((quotation) => quotation._id === quotationId)
                        ?.additionalServices?.[Number(serviceIndex)];
                      if (!savedService) return;
                      const updatedServices = [...additionalServices];
                      updatedServices[index] = { ...savedService };
                      setAdditionalServices(updatedServices);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingSavedQuotations ? "Loading saved services..." : "Choose a saved service"} />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingSavedQuotations && (
                        <SelectItem value="loading-services" disabled>Loading saved services...</SelectItem>
                      )}
                      {!loadingSavedQuotations && savedQuotations.every((quotation) => !quotation.additionalServices?.length) && (
                        <SelectItem value="no-saved-services" disabled>No saved services yet</SelectItem>
                      )}
                      {savedQuotations.flatMap((quotation) =>
                        (quotation.additionalServices || []).map((savedService, serviceIndex) => (
                          <SelectItem
                            key={`${quotation._id}:${serviceIndex}:${index}`}
                            value={`${quotation._id}:${serviceIndex}`}
                          >
                            {savedService.description} · {quotation.customerName}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Input
                    value={service.description}
                    onChange={e => updateAdditionalService(index, 'description', e.target.value)}
                    placeholder="Or enter a service description manually"
                    aria-label={`Manual description for additional service ${index + 1}`}
                  />
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
          <Button type="button" onClick={openPreview} size="lg" className="min-w-[200px] bg-blue-600 text-white hover:bg-blue-700">
            <Eye className="h-4 w-4" />
            Preview Quotation
          </Button>
        </div>
      </div>
      )}
    </div>
  );
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium">{value || "—"}</p>
    </div>
  );
}
