import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class RequirementRawItem {
  @Prop({ required: true })
  productName: string;

  @Prop()
  description: string;

  @Prop()
  category: string;

  @Prop()
  brand: string;

  @Prop()
  color: string;

  @Prop()
  size: string;

  @Prop()
  material: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  comments: string;
}
