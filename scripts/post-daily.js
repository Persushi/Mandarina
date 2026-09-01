import fs from 'fs';
import path from 'path';

const VALID_EXT = ['.jpg', '.jpeg', '.png'];
const ROOT = process.cwd();

const ACCESS_TOKEN = process.env.THREADS_ACCESS_TOKEN;
const USER_ID = process.env.THREADS_USER_ID;

if (!ACCESS_TOKEN || !USER_ID) {
  console.error('Faltan THREADS_ACCESS_TOKEN o THREADS_USER_ID en las env vars.');
  process.exit(1);
}

function pickRandomPhoto() {
  const files = fs
    .readdirSync(ROOT)
    .filter((f) => VALID_EXT.includes(path.extname(f).toLowerCase()));

  if (files.length === 0) {
    throw new Error('No se encontraron fotos .jpg/.jpeg/.png en la raíz del repo.');
  }

  return files[Math.floor(Math.random() * files.length)];
}

function buildImageUrl(filename) {
  const repo = process.env.GITHUB_REPOSITORY; // ej: "Persushi/Mandarina"
  const branch = process.env.GITHUB_REF_NAME || 'main';
  return `https://raw.githubusercontent.com/${repo}/${branch}/${encodeURIComponent(filename)}`;
}

async function createContainer(imageUrl) {
  const url = `https://graph.threads.net/v1.0/${USER_ID}/threads?media_type=IMAGE&image_url=${encodeURIComponent(
    imageUrl
  )}&access_token=${ACCESS_TOKEN}`;

  const res = await fetch(url, { method: 'POST' });
  const data = await res.json();

  if (!data.id) {
    throw new Error(`Error creando el contenedor: ${JSON.stringify(data)}`);
  }

  return data.id;
}

async function publishContainer(creationId) {
  const url = `https://graph.threads.net/v1.0/${USER_ID}/threads_publish?creation_id=${creationId}&access_token=${ACCESS_TOKEN}`;

  const res = await fetch(url, { method: 'POST' });
  const data = await res.json();

  if (!data.id) {
    throw new Error(`Error publicando: ${JSON.stringify(data)}`);
  }

  return data.id;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const photo = pickRandomPhoto();
  const imageUrl = buildImageUrl(photo);

  console.log(`Foto elegida: ${photo}`);
  console.log(`URL pública: ${imageUrl}`);

  const creationId = await createContainer(imageUrl);
  console.log(`Contenedor creado: ${creationId}`);

  // Meta recomienda esperar ~30s antes de publicar para que termine de procesar
  await sleep(30000);

  const mediaId = await publishContainer(creationId);
  console.log(`Publicado con éxito. Media ID: ${mediaId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
