import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, ReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, resolve, sep } from 'node:path';

export interface StoredFile {
  storageKey: string;
  sizeBytes: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: string;
  private readonly rootDir: string;

  constructor(private readonly config: ConfigService) {
    this.driver = this.config.get<string>('STORAGE_DRIVER') ?? 'local';
    const configured = this.config.get<string>('STORAGE_LOCAL_DIR') ?? './storage';
    this.rootDir = resolve(process.cwd(), configured);
    if (this.driver !== 'local') {
      this.logger.warn(
        `STORAGE_DRIVER="${this.driver}" no implementado; se usará el driver local en ${this.rootDir}.`,
      );
    }
  }

  async save(key: string, content: Buffer): Promise<StoredFile> {
    const absolute = this.resolveKey(key);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, content);
    return { storageKey: key, sizeBytes: content.byteLength };
  }

  async read(storageKey: string): Promise<ReadStream> {
    return createReadStream(this.resolveKey(storageKey));
  }

  async exists(storageKey: string): Promise<boolean> {
    try {
      await stat(this.resolveKey(storageKey));
      return true;
    } catch {
      return false;
    }
  }

  async remove(storageKey: string): Promise<void> {
    await rm(this.resolveKey(storageKey), { force: true });
  }

  private resolveKey(storageKey: string): string {
    const normalized = normalize(storageKey).replace(/^([/\\])+/, '');
    const absolute = resolve(this.rootDir, normalized);
    if (absolute !== this.rootDir && !absolute.startsWith(this.rootDir + sep)) {
      throw new Error('storageKey fuera del directorio de almacenamiento.');
    }
    return join(absolute);
  }
}
