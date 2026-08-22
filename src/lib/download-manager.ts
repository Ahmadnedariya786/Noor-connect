export interface DownloadedSurahInfo {
    reciterId: string;
    surahNumber: number;
    size: number;
}

export class QuranDownloadManager {
    private dbName = "noor-connect-quran-db";
    private storeName = "surahs";
    private version = 1;
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void> | null = null;

    constructor() {
        // Start initialization but don't block constructor
        void this.initDB();
    }

    private initDB(): Promise<void> {
        if (this.db) {
            return Promise.resolve();
        }
        if (!this.initPromise) {
            this.initPromise = new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, this.version);

                request.onerror = (event) => {
                    console.error("IndexedDB error:", event);
                    this.initPromise = null;
                    reject("Failed to open database");
                };

                request.onsuccess = (event) => {
                    this.db = (event.target as IDBOpenDBRequest).result;
                    resolve();
                };

                request.onupgradeneeded = (event) => {
                    const db = (event.target as IDBOpenDBRequest).result;
                    if (!db.objectStoreNames.contains(this.storeName)) {
                        // Key: "reciterId-surahId" (e.g., "1-2")
                        db.createObjectStore(this.storeName);
                    }
                };
            });
        }

        return this.initPromise;
    }

    private getStore(mode: IDBTransactionMode): IDBObjectStore {
        if (!this.db) throw new Error("Database not initialized");
        const transaction = this.db.transaction([this.storeName], mode);
        return transaction.objectStore(this.storeName);
    }

    private getKey(reciterId: string, surahNumber: number): string {
        return `${reciterId}-${surahNumber}`;
    }

    async saveSurah(reciterId: string, surahNumber: number, blob: Blob): Promise<void> {
        await this.initDB();
        return new Promise((resolve, reject) => {
            try {
                const store = this.getStore("readwrite");
                const key = this.getKey(reciterId, surahNumber);
                const request = store.put(blob, key);

                request.onsuccess = () => resolve();
                request.onerror = () => reject("Failed to save surah");
            } catch (e) {
                reject(e);
            }
        });
    }

    async getSurah(reciterId: string, surahNumber: number): Promise<Blob | null> {
        await this.initDB();
        return new Promise((resolve, reject) => {
            try {
                const store = this.getStore("readonly");
                const key = this.getKey(reciterId, surahNumber);
                const request = store.get(key);

                request.onsuccess = () => {
                    resolve(request.result as Blob || null);
                };
                request.onerror = () => reject("Failed to retrieve surah");
            } catch (e) {
                reject(e);
            }
        });
    }

    async removeSurah(reciterId: string, surahNumber: number): Promise<void> {
        await this.initDB();
        return new Promise((resolve, reject) => {
            try {
                const store = this.getStore("readwrite");
                const key = this.getKey(reciterId, surahNumber);
                const request = store.delete(key);
                request.onsuccess = () => resolve();
                request.onerror = () => reject("Failed to delete surah");
            } catch (e) {
                reject(e);
            }
        });
    }

    async isSurahDownloaded(reciterId: string, surahNumber: number): Promise<boolean> {
        const blob = await this.getSurah(reciterId, surahNumber);
        return !!blob;
    }

    async listDownloaded(): Promise<DownloadedSurahInfo[]> {
        await this.initDB();
        return new Promise((resolve, reject) => {
            try {
                const store = this.getStore("readonly");
                const items: DownloadedSurahInfo[] = [];
                const request = store.openCursor();

                request.onsuccess = (event) => {
                    const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
                    if (!cursor) {
                        resolve(items);
                        return;
                    }
                    const key = String(cursor.key);
                    // Keys are "${reciterId}-${surahNumber}"; reciterId itself may contain dashes
                    const idx = key.lastIndexOf("-");
                    if (idx > 0) {
                        const surahNumber = parseInt(key.slice(idx + 1), 10);
                        if (!isNaN(surahNumber)) {
                            items.push({
                                reciterId: key.slice(0, idx),
                                surahNumber,
                                size: cursor.value instanceof Blob ? cursor.value.size : 0,
                            });
                        }
                    }
                    cursor.continue();
                };

                request.onerror = () => reject("Failed to list downloads");
            } catch (e) {
                reject(e);
            }
        });
    }

    async clearAll(): Promise<void> {
        await this.initDB();
        return new Promise((resolve, reject) => {
            try {
                const store = this.getStore("readwrite");
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject("Failed to clear DB");
            } catch (e) {
                reject(e);
            }
        });
    }
}

export const downloadManager = new QuranDownloadManager();
