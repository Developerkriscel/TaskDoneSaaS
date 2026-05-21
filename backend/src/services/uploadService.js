import { Company } from '../models/Company.js';
import { Attachment } from '../models/Attachment.js';

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

function extractBase64(dataUri) {
  if (!dataUri) return null;
  const match = dataUri.match(/^data:[^;]+;base64,(.+)$/);
  return match ? match[1] : null;
}

function getFileSizeMB(dataUri) {
  if (!dataUri) return 0;
  const base64Part = dataUri.replace(/^data:[^;]+;base64,/, '');
  const byteLength = (base64Part.length * 3) / 4;
  return byteLength / (1024 * 1024);
}

export async function getCompanyStorageUsage(companyId) {
  if (!companyId) return 0;
  
  const result = await Attachment.aggregate([
    { $match: { companyId: companyId } },
    { $group: { _id: null, totalSizeMB: { $sum: '$sizeMB' }, count: { $sum: 1 } } }
  ]);
  
  return result[0] || { totalSizeMB: 0, count: 0 };
}

export async function uploadAttachmentDataUri(payload, fileName = 'attachment.bin', companyId = null, userId = null, relatedType = 'other', relatedId = null) {
  const dataUri = toDataUri(payload);
  if (!dataUri) {
    return { success: false, provider: 'mongodb', error: 'Invalid attachment payload.' };
  }

  // Get company limits
  let attachmentLimitMB = 10;
  let storageLimitMB = 2048;
  
  if (companyId) {
    const company = await Company.findById(companyId).select('attachmentLimitMB storageLimitMB').lean();
    if (company) {
      attachmentLimitMB = company.attachmentLimitMB || 10;
      storageLimitMB = company.storageLimitMB || 2048;
    }
  }

  // Check per-file attachment limit
  const fileSizeMB = getFileSizeMB(dataUri);
  if (fileSizeMB > attachmentLimitMB) {
    return {
      success: false,
      provider: 'mongodb',
      error: `File size (${fileSizeMB.toFixed(2)}MB) exceeds the limit of ${attachmentLimitMB}MB.`
    };
  }

  // Check company storage quota
  const usage = await getCompanyStorageUsage(companyId);
  if (usage.totalSizeMB + fileSizeMB > storageLimitMB) {
    return {
      success: false,
      provider: 'mongodb',
      error: `Storage quota exceeded. Company has used ${usage.totalSizeMB.toFixed(2)}MB of ${storageLimitMB}MB limit. Cannot upload file of ${fileSizeMB.toFixed(2)}MB.`
    };
  }

  // Extract base64 data and store in MongoDB
  const base64Data = extractBase64(dataUri);
  const mimeMatch = dataUri.match(/^data:([^;]+);/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  
  // Calculate actual byte size from base64
  const sizeBytes = Math.ceil((base64Data.length * 3) / 4);

  const attachment = await Attachment.create({
    companyId,
    fileName,
    mimeType,
    dataBase64: base64Data,
    sizeBytes,
    sizeMB: fileSizeMB,
    uploadedBy: userId,
    relatedType,
    relatedId
  });

  return {
    success: true,
    provider: 'mongodb',
    attachmentId: attachment._id,
    fileName,
    mimeType,
    sizeMB: fileSizeMB.toFixed(2),
    sizeBytes,
    url: `/api/attachments/${attachment._id}`,
    storageUsedMB: (usage.totalSizeMB + fileSizeMB).toFixed(2),
    storageLimitMB
  };
}

export async function getAttachment(attachmentId) {
  const attachment = await Attachment.findById(attachmentId).lean();
  if (!attachment) return null;
  
  return {
    ...attachment,
    dataUri: `data:${attachment.mimeType};base64,${attachment.dataBase64}`
  };
}

export async function deleteAttachment(attachmentId) {
  const result = await Attachment.deleteOne({ _id: attachmentId });
  return { success: result.deletedCount > 0 };
}
