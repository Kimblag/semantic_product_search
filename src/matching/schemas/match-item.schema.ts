import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class Match {
  @Prop({ required: true })
  catalogItemId: string;

  @Prop({ required: true })
  sku: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop()
  category: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Object })
  attributes: Record<string, unknown>;

  @Prop({ required: true })
  providerId: string;

  @Prop({ required: true })
  catalogVersionId: string;

  @Prop({ required: true })
  score: number;
}
