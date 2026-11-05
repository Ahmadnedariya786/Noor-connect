/**
 * E-Books Storage - LocalForage for IndexedDB persistence
 * Handles PDF downloads, caching, and user books
 */
import localforage from 'localforage';
import {
  getPdfBlob as getIdbPdfBlob,
  savePdfBlob as saveIdbPdfBlob,
  deletePdfBlob as deleteIdbPdfBlob,
} from './idb-pdf-store';

// Initialize stores
const pdfStore = localforage.createInstance({
  name: 'islamic-companion',
  storeName: 'pdfs',
  description: 'Downloaded PDF books'
});

const metaStore = localforage.createInstance({
  name: 'islamic-companion',
  storeName: 'ebooks-meta',
  description: 'E-book metadata and user books'
});

export interface EBook {
  title: string;
  url: string;
  category: string;
}

export interface DownloadedBook extends EBook {
  localKey: string;
  downloadedAt: number;
  fileSize: number;
}

export interface UserBook {
  id: string;
  title: string;
  localKey: string;
  addedAt: number;
  fileSize: number;
}

// Sanitize filename for storage
export const sanitizeFilename = (title: string): string => {
  return `${Date.now()}_${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
};

// Ensure HTTPS for URLs
export const ensureHttps = (url: string): string => {
  return url.replace(/^http:\/\//i, 'https://');
};

// Get all downloaded books metadata
export const getDownloadedBooks = async (): Promise<DownloadedBook[]> => {
  try {
    const books = await metaStore.getItem<DownloadedBook[]>('downloaded-books');
    return books || [];
  } catch {
    return [];
  }
};

// Check if a book is downloaded
export const isBookDownloaded = async (url: string): Promise<boolean> => {
  const books = await getDownloadedBooks();
  return books.some(b => b.url === ensureHttps(url));
};

// Get downloaded book by URL
export const getDownloadedBook = async (url: string): Promise<DownloadedBook | null> => {
  const books = await getDownloadedBooks();
  return books.find(b => b.url === ensureHttps(url)) || null;
};

// Download and save a PDF book
export const downloadBook = async (
  book: EBook,
  onProgress?: (progress: number) => void
): Promise<DownloadedBook> => {
  const secureUrl = ensureHttps(book.url);
  
  try {
    // Try fetch with no-cors mode first, then regular fetch
    const response = await fetch(secureUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf',
      },
    });
    
    if (!response.ok) throw new Error('Failed to download book');
    
    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    let loaded = 0;
    
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        if (onProgress && total) {
          onProgress(Math.round((loaded / total) * 100));
        }
      }
    }
    
    // Combine chunks into a single array
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    
    // Convert to base64 using chunks to avoid call stack size exceeded
    const chunkSize = 8192;
    let binary = '';
    for (let i = 0; i < combined.length; i += chunkSize) {
      const slice = combined.subarray(i, Math.min(i + chunkSize, combined.length));
      binary += String.fromCharCode.apply(null, Array.from(slice));
    }
    const base64 = btoa(binary);

    const localKey = sanitizeFilename(book.title);
    
    // Save PDF data
    await pdfStore.setItem(localKey, base64);
    
    // Save metadata
    const downloadedBook: DownloadedBook = {
      ...book,
      url: secureUrl,
      localKey,
      downloadedAt: Date.now(),
      fileSize: totalLength
    };
    
    const books = await getDownloadedBooks();
    books.push(downloadedBook);
    await metaStore.setItem('downloaded-books', books);
    
    return downloadedBook;
  } catch (error) {
    console.error('Download failed:', error);
    throw new Error('Download blocked by browser security. Try opening in browser instead.');
  }
};

// Get PDF blob URL for viewing
export const getPdfBlobUrl = async (localKey: string): Promise<string | null> => {
  try {
    // 1. First check IndexedDB large-file store (handles 50MB, 150MB, 300MB+ with 0 base64 overhead)
    const idbBlob = await getIdbPdfBlob(localKey);
    if (idbBlob) {
      return URL.createObjectURL(idbBlob);
    }

    // 2. Fallback to legacy localForage base64 store
    const base64 = await pdfStore.getItem<string>(localKey);
    if (!base64) return null;
    
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const blob = new Blob([bytes], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
};

// Delete a downloaded book
export const deleteDownloadedBook = async (url: string): Promise<void> => {
  const books = await getDownloadedBooks();
  const book = books.find(b => b.url === ensureHttps(url));
  
  if (book) {
    await pdfStore.removeItem(book.localKey);
    const updatedBooks = books.filter(b => b.url !== ensureHttps(url));
    await metaStore.setItem('downloaded-books', updatedBooks);
  }
};

// User-added books
export const getUserBooks = async (): Promise<UserBook[]> => {
  try {
    const books = await metaStore.getItem<UserBook[]>('user-books');
    return books || [];
  } catch {
    return [];
  }
};

export const addUserBook = async (file: File, title: string): Promise<UserBook> => {
  const localKey = sanitizeFilename(title);

  // Store directly into IndexedDB large-file store without base64 encoding bloat
  await saveIdbPdfBlob(localKey, file, file.name);
  
  const userBook: UserBook = {
    id: localKey,
    title,
    localKey,
    addedAt: Date.now(),
    fileSize: file.size
  };
  
  const books = await getUserBooks();
  books.push(userBook);
  await metaStore.setItem('user-books', books);
  
  return userBook;
};

export const deleteUserBook = async (id: string): Promise<void> => {
  const books = await getUserBooks();
  const book = books.find(b => b.id === id);
  
  if (book) {
    await deleteIdbPdfBlob(book.localKey);
    await pdfStore.removeItem(book.localKey);
    const updatedBooks = books.filter(b => b.id !== id);
    await metaStore.setItem('user-books', updatedBooks);
  }
};

// Storage statistics
export const getStorageStats = async (): Promise<{ totalBooks: number; totalSize: number }> => {
  const downloaded = await getDownloadedBooks();
  const userBooks = await getUserBooks();
  
  const downloadedSize = downloaded.reduce((sum, b) => sum + b.fileSize, 0);
  const userSize = userBooks.reduce((sum, b) => sum + b.fileSize, 0);
  
  return {
    totalBooks: downloaded.length + userBooks.length,
    totalSize: downloadedSize + userSize
  };
};

// Clear all cached PDFs
export const clearAllBooks = async (): Promise<void> => {
  await pdfStore.clear();
  await metaStore.removeItem('downloaded-books');
  await metaStore.removeItem('user-books');
};

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
