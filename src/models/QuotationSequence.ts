import { Schema, model, models } from 'mongoose';

interface IQuotationSequence {
  _id: string;
  sequence: number;
}

const QuotationSequenceSchema = new Schema<IQuotationSequence>({
  _id: { type: String },
  sequence: { type: Number, required: true, default: -1 },
});

export const QuotationSequence =
  models.QuotationSequence || model<IQuotationSequence>('QuotationSequence', QuotationSequenceSchema);
