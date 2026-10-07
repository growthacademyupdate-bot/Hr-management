import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IDataScraping extends Document {
  id: string;
  employeeId: string;
  employeeName: string;
  businessName: string;
  state: string;
  totalDataCollected: number;
  createdAt: string;
  updatedAt: string;
}

const DataScrapingSchema = new Schema<IDataScraping>(
  {
    id: { type: String, required: true, unique: true },
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    businessName: { type: String, required: true },
    state: { type: String, required: true },
    totalDataCollected: { type: Number, required: true, default: 0 },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  {
    timestamps: false,
  }
);

// Force Mongoose to recompile the schema during Next.js hot reload
delete mongoose.models.DataScraping;

export const DataScraping: Model<IDataScraping> =
  mongoose.models.DataScraping || mongoose.model<IDataScraping>('DataScraping', DataScrapingSchema);
