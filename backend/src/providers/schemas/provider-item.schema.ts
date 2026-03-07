import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CatalogItemDocument = HydratedDocument<CatalogItem>;

@Schema({ collection: 'catalog_items', versionKey: false, timestamps: true })
export class CatalogItem {
  @Prop({ required: true, index: true })
  providerId: string;

  @Prop({ required: true, index: true })
  catalogVersionId: string;

  @Prop({ required: true, index: true })
  providerCode: string;

  @Prop({ required: true })
  sku: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  active: boolean;

  @Prop({ required: false })
  tags: string[] | null;

  @Prop({ required: false, type: Object })
  attributes: Record<string, unknown> | null;
}

export const CatalogItemSchema = SchemaFactory.createForClass(CatalogItem);
