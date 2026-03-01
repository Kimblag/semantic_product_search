import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { RequirementItem } from './requirement-item.schema';
import { HydratedDocument } from 'mongoose';

export type MatchingResultDocument = HydratedDocument<MatchingResult>;

@Schema({ collection: 'matching_results', versionKey: false, timestamps: true })
export class MatchingResult {
  @Prop({ required: true, index: true })
  requirementId: string;

  @Prop({ required: true })
  executedBy: string;

  @Prop({ type: [RequirementItem], default: [] })
  items: RequirementItem[];
}

export const MatchingResultSchema =
  SchemaFactory.createForClass(MatchingResult);
