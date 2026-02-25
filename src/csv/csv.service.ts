import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as csv from 'csv-parser';

@Injectable()
export class CsvService {
  // read csv
  async readCsv<T>(path: string): Promise<T[]> {
    // We wrap stream events in a Promise so callers can await this method;
    // without it, readCsv would return before the async 'data/end/error' events finish.
    return new Promise((resolve, reject) => {
      const results: T[] = [];

      fs.createReadStream(path)
        .pipe(csv())
        .on('data', (row: unknown) => results.push(row as T))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }
}
