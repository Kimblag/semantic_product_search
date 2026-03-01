import { Prop, Schema } from '@nestjs/mongoose';
import { RequirementRawItem } from './requirement-raw-item.schema';
import { Match } from './match-item.schema';

@Schema({ _id: false })
export class RequirementItem {
  @Prop({ type: RequirementRawItem, required: true })
  item: RequirementRawItem;

  @Prop({ type: [Match], default: [] })
  matches: Match[];
}
