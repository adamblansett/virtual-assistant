/**
 * Sandboxed File System Integration.
 * Strictly enforces directory boundary containment (prevents path traversal / directory escape).
 */

import fs from 'fs';
import path from 'path';
import { IIntegrationAdapter, IntegrationMetadata } from '../base';

export interface FileItemInfo {
  name: string;
  path: string;
  sizeBytes: number;
  isDirectory: boolean;
  modifiedAt: string;
}

export class SandboxedFileService implements IIntegrationAdapter {
  private baseDir: string;

  constructor(customBaseDir?: string) {
    this.baseDir = path.resolve(/*turbopackIgnore: true*/ customBaseDir || path.join(process.cwd(), 'data', 'workspace'));
    this.ensureBaseDir();
  }

  private ensureBaseDir(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  public getBaseDir(): string {
    return this.baseDir;
  }

  /**
   * Strictly validates that a target path is contained within the allowed base directory.
   * Throws on any attempt at path traversal (e.g. '../', absolute roots outside baseDir).
   */
  private resolveSafePath(relPath: string): string {
    const resolved = path.resolve(this.baseDir, relPath.replace(/^[\/\\]+/, ''));
    if (!resolved.startsWith(this.baseDir)) {
      throw new Error(`SECURITY VIOLATION: Path traversal attempted. Target "${relPath}" is outside sandboxed workspace.`);
    }
    return resolved;
  }

  public async metadata(): Promise<IntegrationMetadata> {
    return {
      id: 'sandboxed_files',
      name: 'Sandboxed File System',
      description: `Restricted file workspace at ${this.baseDir}`,
      connected: true,
      scopesGranted: ['files.read', 'files.write'],
      lastSyncedAt: new Date().toISOString(),
      isMock: false
    };
  }

  public async isConnected(): Promise<boolean> {
    return true;
  }

  public async disconnect(): Promise<void> {
    // Local workspace always available
  }

  public async listFiles(subDir: string = ''): Promise<FileItemInfo[]> {
    const safePath = this.resolveSafePath(subDir);
    if (!fs.existsSync(safePath)) return [];

    const entries = fs.readdirSync(safePath, { withFileTypes: true });
    return entries.map(ent => {
      const fullPath = path.join(safePath, ent.name);
      const stat = fs.statSync(fullPath);
      return {
        name: ent.name,
        path: path.relative(this.baseDir, fullPath),
        sizeBytes: stat.size,
        isDirectory: ent.isDirectory(),
        modifiedAt: stat.mtime.toISOString()
      };
    });
  }

  public async readFile(filePath: string, maxBytes: number = 50000): Promise<{ content: string; truncated: boolean }> {
    const safePath = this.resolveSafePath(filePath);
    if (!fs.existsSync(safePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const stat = fs.statSync(safePath);
    if (stat.isDirectory()) {
      throw new Error(`Cannot read directory as file: ${filePath}`);
    }

    const raw = fs.readFileSync(safePath, 'utf-8');
    const truncated = raw.length > maxBytes;
    return {
      content: raw.slice(0, maxBytes),
      truncated
    };
  }

  public async writeFile(filePath: string, content: string): Promise<{ success: boolean; bytesWritten: number }> {
    const safePath = this.resolveSafePath(filePath);
    const parentDir = path.dirname(safePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(safePath, content, 'utf-8');
    return {
      success: true,
      bytesWritten: Buffer.byteLength(content, 'utf-8')
    };
  }

  public async moveFile(sourcePath: string, destPath: string): Promise<{ success: boolean; from: string; to: string }> {
    const safeSource = this.resolveSafePath(sourcePath);
    const safeDest = this.resolveSafePath(destPath);

    if (!fs.existsSync(safeSource)) {
      throw new Error(`Source file does not exist: ${sourcePath}`);
    }

    const parentDir = path.dirname(safeDest);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.renameSync(safeSource, safeDest);
    return {
      success: true,
      from: path.relative(this.baseDir, safeSource),
      to: path.relative(this.baseDir, safeDest)
    };
  }
}
