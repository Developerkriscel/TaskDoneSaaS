import { v2 as cloudinary } from 'cloudinary';

let configured = false;

function configureCloudinary() {
  if (configured) return;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return;
  }

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
  configured = true;
}

function toDataUri(payload) {
  if (!payload) return null;

  if (typeof payload === 'string' && payload.startsWith('data:')) {
    return payload;
  }

  if (typeof payload === 'string') {
    return `data:application/octet-stream;base64,${payload}`;
  }

  if (payload.base64Data) {
    const mimeType = payload.mimeType || 'application/octet-stream';
    return `data:${mimeType};base64,${payload.base64Data}`;
  }

  return null;
}

export async function uploadAttachmentDataUri(payload, fileName = 'attachment.bin') {
  configureCloudinary();
  if (!configured) {
    return { success: false, provider: 'cloudinary', error: 'Cloudinary not configured.' };
  }

  const dataUri = toDataUri(payload);
  if (!dataUri) {
    return { success: false, provider: 'cloudinary', error: 'Invalid attachment payload.' };
  }

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: 'taskdone/attachments',
    public_id: `${Date.now()}-${String(fileName || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_')}`,
    resource_type: 'auto'
  });

  return {
    success: true,
    provider: 'cloudinary',
    url: result.secure_url,
    publicId: result.public_id
  };
}
