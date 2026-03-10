/**
 * Cloud Storage Service - VetPro
 * Suporte para AWS S3, Google Cloud Storage e Cloudinary
 */

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs/promises');
const path = require('path');

const UPLOADS_BASE_DIR = path.join(__dirname, '../../uploads');

async function ensureDirectoryExists(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

class CloudStorageService {
  constructor() {
    this.provider = process.env.CLOUD_STORAGE_PROVIDER || 'local';
    this.s3Client = null;
    this.bucket = process.env.CLOUD_BUCKET_NAME || 'vetpro-uploads';
    this.region = process.env.CLOUD_REGION || 'us-east-1';

    this.initializeS3();
  }

  initializeS3() {
    if (this.provider === 's3') {
      this.s3Client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
    }
  }

  /**
   * Upload de arquivo
   * @param {Buffer} fileBuffer - Conteúdo do arquivo
   * @param {string} filename - Nome do arquivo
   * @param {string} mimeType - Tipo MIME
   * @param {string} folder - Pasta no bucket
   */
  async upload(fileBuffer, filename, mimeType, folder = 'uploads') {
    const key = `${folder}/${Date.now()}-${filename}`;

    if (this.provider === 's3') {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
      });

      await this.s3Client.send(command);

      return {
        url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`,
        key,
        provider: 's3',
      };
    }

    // Fallback para armazenamento local
    return this.uploadLocal(fileBuffer, filename, folder);
  }

  /**
   * Upload local (fallback)
   */
  async uploadLocal(fileBuffer, filename, folder) {
    const uploadDir = path.join(UPLOADS_BASE_DIR, folder);
    await ensureDirectoryExists(uploadDir);

    const key = `${folder}/${Date.now()}-${filename}`;
    const filePath = path.join(UPLOADS_BASE_DIR, key);

    await fs.writeFile(filePath, fileBuffer);

    return {
      url: `/uploads/${key}`,
      key,
      provider: 'local',
    };
  }

  /**
   * Gera URL temporária para download
   * @param {string} key - Chave do arquivo
   * @param {number} expiresIn - Tempo de expiração em segundos
   */
  async getSignedDownloadUrl(key, expiresIn = 3600) {
    if (this.provider === 's3') {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    }

    // Retorna URL local
    return `/uploads/${key}`;
  }

  /**
   * Gera URL temporária para upload (upload direto)
   * @param {string} key - Chave do arquivo
   * @param {string} mimeType - Tipo MIME
   * @param {number} expiresIn - Tempo de expiração
   */
  async getSignedUploadUrl(key, mimeType, expiresIn = 3600) {
    if (this.provider === 's3') {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: mimeType,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    }

    return null;
  }

  /**
   * Deleta arquivo
   * @param {string} key - Chave do arquivo
   */
  async delete(key) {
    if (this.provider === 's3') {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    }

    // Delete local
    const filePath = path.join(UPLOADS_BASE_DIR, key);

    if (await fileExists(filePath)) {
      await fs.unlink(filePath);
    }

    return true;
  }

  /**
   * Move arquivo existente (útil para processamento)
   */
  async move(sourceKey, destinationKey) {
    // Para S3, seria necessário copiar e depois deletar
    // Implementação simplificada para local
    const sourcePath = path.join(UPLOADS_BASE_DIR, sourceKey);
    const destPath = path.join(UPLOADS_BASE_DIR, destinationKey);

    if (await fileExists(sourcePath)) {
      const destDir = path.dirname(destPath);
      await ensureDirectoryExists(destDir);
      await fs.rename(sourcePath, destPath);
      return { url: `/uploads/${destinationKey}`, key: destinationKey };
    }

    return null;
  }
}

module.exports = new CloudStorageService();
