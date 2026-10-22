import { callUserApi } from './userApi.js';

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function addFaceGalleryPhoto(nip, type, blob) {
  const photoBase64 = await blobToBase64(blob);
  try {
    const data = await callUserApi('add', { nip, type, photoBase64, contentType: blob.type || 'image/jpeg' });
    return data.id;
  } catch (error) {
    if (error.message?.includes('gallery_full')) {
      const fullError = new Error('gallery_full');
      fullError.code = 'gallery_full';
      throw fullError;
    }
    throw error;
  }
}

export async function listFaceGalleryPhotos(nip) {
  const data = await callUserApi('list', { nip });
  return (data.photos || []).map((row) => ({
    id: row.id,
    type: row.attendance_type,
    base64: `data:${row.content_type};base64,${row.photo_base64}`,
    createdAt: row.created_at,
  }));
}

export async function deleteFaceGalleryPhoto(id, nip) {
  await callUserApi('delete', { id, nip });
}
