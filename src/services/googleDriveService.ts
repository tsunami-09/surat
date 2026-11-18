import type { DriveFileItem } from '../types/letter';

export const DRIVE_ROOT_FOLDER_NAME = 'Arsip Surat Keluar - UPT Pelatihan Pertanian';

export class DriveAuthError extends Error {
  constructor(message = 'Sesi akses Google Drive telah berakhir. Silakan hubungkan kembali Google Drive.') {
    super(message);
    this.name = 'DriveAuthError';
  }
}

async function driveFetch(
  url: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers || {}),
    },
  });

  if (res.status === 401 || res.status === 403) {
    const bodyText = await res.text().catch(() => '');
    if (res.status === 401 || bodyText.includes('insufficient') || bodyText.includes('Invalid Credentials')) {
      throw new DriveAuthError();
    }
    throw new Error(`Akses Google Drive ditolak (${res.status}): ${bodyText || 'Periksa izin Google Drive.'}`);
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Permintaan Google Drive gagal (${res.status}): ${errText || res.statusText}`);
  }

  return res;
}

function escapeDriveQuery(val: string): string {
  return val.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function findFolderByName(
  accessToken: string,
  name: string,
  parentId?: string,
): Promise<string | null> {
  const clauses = [
    `mimeType = 'application/vnd.google-apps.folder'`,
    `name = '${escapeDriveQuery(name)}'`,
    'trashed = false',
  ];
  if (parentId) {
    clauses.push(`'${escapeDriveQuery(parentId)}' in parents`);
  }
  const q = encodeURIComponent(clauses.join(' and '));
  const res = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=10`,
    accessToken,
  );
  const data = (await res.json()) as { files?: { id: string; name: string }[] };
  return data.files?.[0]?.id ?? null;
}

async function createFolder(
  accessToken: string,
  name: string,
  parentId?: string,
): Promise<string> {
  const metadata: Record<string, unknown> = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    metadata.parents = [parentId];
  }

  const res = await driveFetch(
    'https://www.googleapis.com/drive/v3/files?fields=id,name',
    accessToken,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metadata),
    },
  );
  const created = (await res.json()) as { id: string };
  return created.id;
}

export async function ensureArchiveFolder(
  accessToken: string,
  year?: number,
): Promise<{
  rootFolderId: string;
  targetFolderId: string;
  rootFolderUrl: string;
  targetFolderUrl: string;
}> {
  let rootFolderId = await findFolderByName(accessToken, DRIVE_ROOT_FOLDER_NAME);
  if (!rootFolderId) {
    rootFolderId = await createFolder(accessToken, DRIVE_ROOT_FOLDER_NAME);
  }

  let targetFolderId = rootFolderId;
  if (year) {
    const yearName = `Tahun ${year}`;
    const existingYearId = await findFolderByName(accessToken, yearName, rootFolderId);
    targetFolderId =
      existingYearId ?? (await createFolder(accessToken, yearName, rootFolderId));
  }

  return {
    rootFolderId,
    targetFolderId,
    rootFolderUrl: `https://drive.google.com/drive/folders/${rootFolderId}`,
    targetFolderUrl: `https://drive.google.com/drive/folders/${targetFolderId}`,
  };
}

export async function listDriveArchiveFiles(accessToken: string): Promise<DriveFileItem[]> {
  const q = encodeURIComponent(
    "trashed = false and mimeType != 'application/vnd.google-apps.folder'",
  );
  const fields = encodeURIComponent(
    'files(id,name,mimeType,size,webViewLink,webContentLink,createdTime,modifiedTime,description,parents)',
  );
  const res = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=modifiedTime%20desc&pageSize=100`,
    accessToken,
  );
  const data = (await res.json()) as { files?: DriveFileItem[] };
  return data.files ?? [];
}

export async function uploadFileToDrive(params: {
  accessToken: string;
  file: Blob;
  fileName: string;
  mimeType: string;
  folderId: string;
  description?: string;
}): Promise<DriveFileItem> {
  const { accessToken, file, fileName, mimeType, folderId, description } = params;

  const metadata = {
    name: fileName,
    parents: [folderId],
    ...(description ? { description } : {}),
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' }),
  );
  form.append('file', file, fileName);

  const fields = encodeURIComponent(
    'id,name,mimeType,size,webViewLink,webContentLink,createdTime,modifiedTime,description,parents',
  );
  const res = await driveFetch(
    `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=${fields}`,
    accessToken,
    {
      method: 'POST',
      body: form,
    },
  );

  return (await res.json()) as DriveFileItem;
}

export async function deleteDriveFile(accessToken: string, fileId: string): Promise<void> {
  await driveFetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    accessToken,
    { method: 'DELETE' },
  );
}

export async function renameDriveFile(
  accessToken: string,
  fileId: string,
  newName: string,
): Promise<DriveFileItem> {
  const fields = encodeURIComponent(
    'id,name,mimeType,size,webViewLink,webContentLink,createdTime,modifiedTime,description,parents',
  );
  const res = await driveFetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=${fields}`,
    accessToken,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    },
  );
  return (await res.json()) as DriveFileItem;
}

export function formatDriveFileSize(sizeStr?: string): string {
  const bytes = Number(sizeStr ?? 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
