import { asyncHandler } from '../utils/asyncHandler.js';
import { getAttachment, deleteAttachment, getCompanyStorageUsage } from '../services/uploadService.js';

export const serveAttachment = asyncHandler(async (req, res) => {
  const { attachmentId } = req.params;
  const attachment = await getAttachment(attachmentId);
  
  if (!attachment) {
    return res.status(404).json({ success: false, error: 'Attachment not found' });
  }
  
  res.setHeader('Content-Type', attachment.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${attachment.fileName}"`);
  res.send(Buffer.from(attachment.dataBase64, 'base64'));
});

export const removeAttachment = asyncHandler(async (req, res) => {
  const { attachmentId } = req.params;
  const result = await deleteAttachment(attachmentId);
  
  if (!result.success) {
    return res.status(404).json({ success: false, error: 'Attachment not found' });
  }
  
  res.json({ success: true, message: 'Attachment deleted' });
});

export const getAttachmentStorageInfo = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const usage = await getCompanyStorageUsage(companyId);
  
  res.json({
    success: true,
    usage: {
      totalSizeMB: usage.totalSizeMB || 0,
      attachmentCount: usage.count || 0
    }
  });
});
