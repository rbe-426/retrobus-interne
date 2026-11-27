const readAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error || new Error('Lecture du fichier impossible'));
  reader.readAsDataURL(file);
});

const loadImage = (src) => new Promise((resolve, reject) => {
  const image = new window.Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Image illisible'));
  image.src = src;
});

/**
 * Redimensionne une image (sans jamais l'agrandir) et la renvoie en data URL.
 * Les PNG restent des PNG (transparence conservée), le reste passe en JPEG.
 * En cas d'échec de décodage (SVG, format exotique), le fichier d'origine est conservé.
 */
export async function imageFileToDataUrl(file, { maxDimension = 1600, quality = 0.85 } = {}) {
  const original = await readAsDataUrl(file);
  if (!/^image\/(png|jpe?g|webp|bmp)$/i.test(file.type)) return original;

  try {
    const image = await loadImage(original);
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    if (scale === 1 && file.size <= 400 * 1024) return original;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);

    const keepPng = /png/i.test(file.type);
    const resized = canvas.toDataURL(keepPng ? 'image/png' : 'image/jpeg', quality);
    return resized.length < original.length ? resized : original;
  } catch {
    return original;
  }
}
