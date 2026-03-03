import { Injectable } from '@nestjs/common';
import * as csv from 'fast-csv';
import * as fs from 'fs';
import { PassThrough } from 'stream';
import { CsvDataRow } from './types/requirement-export.type';

@Injectable()
export class CsvService {
  // read csv
  async readCsv<T>(path: string): Promise<{ results: T[]; headers: string[] }> {
    // We wrap stream events in a Promise so callers can await this method;
    // without it, readCsv would return before the async 'data/end/error' events finish.
    return new Promise((resolve, reject) => {
      const results: T[] = [];
      let headers: string[] = [];

      fs.createReadStream(path)
        .pipe(csv.parse({ headers: true }))
        .on('headers', (h: string[]) => {
          headers = h;
        })
        .on('data', (row: unknown) => results.push(row as T))
        .on('end', () => resolve({ results, headers }))
        .on('error', (error) => reject(error));
    });
  }

  exportCsvStream(data: CsvDataRow[], headers: string[]): PassThrough {
    const stream = new PassThrough();
    const csvStream = csv.format({ headers, writeBOM: true });

    csvStream.pipe(stream);

    data.forEach((row) => csvStream.write(row));
    csvStream.end();

    return stream;
  }
}
