import mongoose, { Schema } from 'mongoose';
import { Category as ICategory } from '@/types';

const CategorySchema = new Schema<ICategory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Nome da categoria é obrigatório'],
      trim: true,
    },
    color: {
      type: String,
      trim: true,
      match: [/^#[0-9A-F]{6}$/i, 'Cor deve ser um código hexadecimal válido'],
    },
  },
  {
    timestamps: true,
  }
);

CategorySchema.index({ userId: 1, name: 1 }, { unique: true });

export default mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);













