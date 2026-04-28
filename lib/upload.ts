import { getServiceClient } from './supabase'

const BUCKET = 'candidate-files'

export async function uploadFile(
  file: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const client = getServiceClient()
  const path = `${Date.now()}-${fileName}`

  const { error } = await client.storage
    .from(BUCKET)
    .upload(path, file, { contentType: mimeType })

  if (error) throw new Error(`Upload failed: ${error.message}`)

  return path
}

export async function deleteFile(path: string): Promise<void> {
  const client = getServiceClient()
  await client.storage.from(BUCKET).remove([path])
}

export async function downloadFile(path: string): Promise<Buffer> {
  const client = getServiceClient()
  const { data, error } = await client.storage.from(BUCKET).download(path)
  if (error) throw new Error(`Download failed: ${error.message}`)
  const arrayBuffer = await data.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
