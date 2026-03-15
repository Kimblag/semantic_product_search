import { RequirementItemRaw } from 'src/requirements/types/requirement-item.type';
import { RequirementCsvItem } from '../types/requirement-item-csv.type';

export class RequirementMapper {
  static toRequirementItems(items: RequirementCsvItem[]): RequirementItemRaw[] {
    return items.map((item) => ({
      ...item,
      tags: item.tags ? item.tags.split('|') : [],
    }));
  }
}
