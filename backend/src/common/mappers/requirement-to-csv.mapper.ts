// src/common/mappers/requirement-to-csv.mapper.ts
import { CsvDataRow } from 'src/csv/types/requirement-export.type';
import { RequirementMatchingResponseDto } from 'src/requirements/dtos/requirement-matchig-response.dto';

export function flattenRequirementsForCsv(
  requirements: RequirementMatchingResponseDto[],
): CsvDataRow[] {
  const rows: CsvDataRow[] = [];

  requirements.forEach((req) => {
    req.results.forEach((result) => {
      result.items.data.forEach((item) => {
        if (!item.matches.length) {
          rows.push({
            requirementId: req.requirementId,
            clientName: req.client,
            createdAt: req.createdAt.toISOString(),
            itemName: item.productName,
            itemCategory: item.category,
            itemBrand: item.brand,
            itemColor: item.color,
          });
        } else {
          item.matches.forEach((match) => {
            rows.push({
              requirementId: req.requirementId,
              clientName: req.client,
              createdAt: req.createdAt.toISOString(),
              itemName: item.productName,
              itemCategory: item.category,
              itemBrand: item.brand,
              itemColor: item.color,
              matchProvider: match.providerName,
              matchName: match.name,
              matchCategory: match.category,
              matchSku: match.sku,
              matchScore: match.score,
            });
          });
        }
      });
    });
  });

  return rows;
}
