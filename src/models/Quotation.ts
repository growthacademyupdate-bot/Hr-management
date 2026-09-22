import mongoose, { Schema, Document } from 'mongoose';

export interface IQuotationItem {
  description: string;
  unitPrice: number;
  quantity: number;
  sgstPercent: number;
  cgstPercent: number;
  includeGst: boolean;
  serviceDetails: string;
}

export interface IAdditionalService {
  description: string;
  amount: string; // 'Charges Applicable' or numeric value
}

export interface IQuotation extends Document {
  quoteNumber: string;
  date: Date;
  validUntil: Date;
  customerName: string;
  companyName: string;
  customerMobile: string;
  customerMobile2?: string;
  address: string;
  pincode: string;
  email?: string;
  customerId?: string;
  bdeName: string;
  bdeId?: mongoose.Types.ObjectId;
  items: IQuotationItem[];
  additionalServices: IAdditionalService[];
  subtotal: number;
  sgstAmount: number;
  cgstAmount: number;
  totalAmount: number;
  status: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const QuotationItemSchema = new Schema<IQuotationItem>({
  description: { type: String, required: true },
  unitPrice: { type: Number, required: true },
  quantity: { type: Number, required: true },
  sgstPercent: { type: Number, default: 0 },
  cgstPercent: { type: Number, default: 0 },
  includeGst: { type: Boolean, default: true },
  serviceDetails: { type: String, default: '' },
});

const AdditionalServiceSchema = new Schema<IAdditionalService>({
  description: { type: String, required: true },
  amount: { type: String, default: 'Charges Applicable' },
});

const QuotationSchema = new Schema<IQuotation>(
  {
    quoteNumber: { type: String, required: true, unique: true },
    date: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    customerName: { type: String, required: true },
    companyName: { type: String, required: true },
    customerMobile: { type: String, required: true },
    customerMobile2: { type: String },
    address: { type: String, required: true },
    pincode: { type: String, required: true },
    email: { type: String },
    customerId: { type: String },
    bdeName: { type: String, required: true },
    bdeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
    items: { type: [QuotationItemSchema], required: true },
    additionalServices: { type: [AdditionalServiceSchema], default: [] },
    subtotal: { type: Number, required: true },
    sgstAmount: { type: Number, required: true },
    cgstAmount: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['Draft', 'Generated'], default: 'Generated' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  },
  { timestamps: true }
);

export const Quotation = mongoose.models.Quotation || mongoose.model<IQuotation>('Quotation', QuotationSchema);
