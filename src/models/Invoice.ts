import mongoose from "mongoose";

const InvoiceItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  hsn: { type: String },
  quantity: { type: Number, required: true },
  rate: { type: Number, required: true },
  taxable: { type: Number, required: true },
  gstPercent: { type: Number, required: true },
  gstAmount: { type: Number, required: true },
  total: { type: Number, required: true },
}, { _id: false });

const InvoiceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // e.g., Inv-1
  employeeId: { type: String, required: true },
  invoiceDate: { type: String, required: true }, // YYYY-MM-DD
  paymentMode: { type: String, default: "UPI" },
  reverseCharge: { type: String, default: "YES" },
  
  // Buyer (Company details, normally static, but we can store here)
  buyerOrderNo: { type: String },
  supplierRef: { type: String },
  vehicleNumber: { type: String },
  deliveryDate: { type: String },
  transportDetails: { type: String },
  termsOfDelivery: { type: String },

  items: [InvoiceItemSchema],

  totalQuantity: { type: Number, default: 0 },
  subTotal: { type: Number, required: true },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  roundOff: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },

  status: { type: String, enum: ["Draft", "Generated", "Paid", "Cancelled"], default: "Generated" },
  
  createdBy: { type: String, required: true } // admin id
}, { timestamps: true });

InvoiceSchema.index({ employeeId: 1 });
InvoiceSchema.index({ invoiceDate: 1 });

delete mongoose.models.Invoice;
export const Invoice = mongoose.models.Invoice || mongoose.model("Invoice", InvoiceSchema);
