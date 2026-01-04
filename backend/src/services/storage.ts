import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    logger.error('Error creating upload directory:', error);
  }
}

// Initialize on module load
ensureUploadDir();

export async function uploadToLocal(
  file: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  try {
    await ensureUploadDir();
    const filePath = path.join(UPLOAD_DIR, key);
    const dir = path.dirname(filePath);
    
    // Create directory if it doesn't exist
    await fs.mkdir(dir, { recursive: true });
    
    // Write file
    await fs.writeFile(filePath, file);
    
    const url = `local://${key}`;
    logger.info(`File uploaded locally: ${url}`);
    return url;
  } catch (error) {
    logger.error('Error uploading file locally:', error);
    throw error;
  }
}

export function extractKeyFromLocalUrl(localUrl: string): string {
  const match = localUrl.match(/local:\/\/(.+)/);
  return match ? match[1] : localUrl;
}

export async function getFileFromLocal(key: string): Promise<Buffer> {
  try {
    const filePath = path.join(UPLOAD_DIR, key);
    const fileBuffer = await fs.readFile(filePath);
    return fileBuffer;
  } catch (error) {
    logger.error('Error getting file from local storage:', error);
    throw error;
  }
}

// Keep S3 function names for compatibility, but use local storage
export async function uploadToS3(
  file: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  return uploadToLocal(file, key, contentType);
}

export async function getFileFromS3(key: string): Promise<Buffer> {
  return getFileFromLocal(key);
}

export function extractKeyFromS3Url(s3Url: string): string {
  // Handle both local:// and s3:// URLs
  if (s3Url.startsWith('local://')) {
    return extractKeyFromLocalUrl(s3Url);
  }
  const match = s3Url.match(/s3:\/\/[^/]+\/(.+)/);
  return match ? match[1] : s3Url;
}

export async function deleteFile(key: string): Promise<void> {
  try {
    const filePath = path.join(UPLOAD_DIR, key);
    await fs.unlink(filePath);
    logger.info(`File deleted: ${key}`);
  } catch (error: any) {
    // Ignore if file doesn't exist
    if (error.code !== 'ENOENT') {
      logger.error('Error deleting file:', error);
      throw error;
    }
  }
}
