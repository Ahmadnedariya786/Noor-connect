// Tafsir API utility for fetching Quranic commentary
// API Source: https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/

export interface TafsirResponse {
    ayah: number;
    surah: number;
    text: string;
}

export interface TafsirEdition {
    id: string;
    name: string;
    language: string;
    author?: string; // Optional author field for additional context
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function coerceNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const n = Number.parseInt(value, 10);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

function coerceString(value: unknown): string | null {
    if (typeof value === "string") return value;
    return null;
}

function extractTafsirItems(raw: unknown): unknown[] {
    if (Array.isArray(raw)) return raw;

    if (isRecord(raw)) {
        const candidateKeys = ["tafsir", "tafsirs", "items", "data", "verses", "ayahs"];
        for (const key of candidateKeys) {
            const candidate = raw[key];
            if (Array.isArray(candidate)) return candidate;
        }

        // Some datasets are keyed by ayah number: { "1": "...", "2": "..." }
        const numericKeys = Object.keys(raw).filter((k) => /^\d+$/.test(k));
        if (numericKeys.length > 0) {
            return numericKeys
                .sort((a, b) => Number(a) - Number(b))
                .map((k) => raw[k]);
        }
    }

    return [];
}

function normalizeSurahTafsir(raw: unknown, surah: number): TafsirResponse[] {
    const items = extractTafsirItems(raw);

    const entries: TafsirResponse[] = [];
    for (let index = 0; index < items.length; index++) {
        const item = items[index];
        const fallbackAyah = index + 1;

        if (typeof item === "string") {
            entries.push({ surah, ayah: fallbackAyah, text: item });
            continue;
        }

        if (!isRecord(item)) continue;

        const text =
            coerceString(item.text) ??
            coerceString(item.tafsir) ??
            coerceString(item.commentary) ??
            coerceString(item.value);

        if (!text) continue;

        const ayah =
            coerceNumber(item.ayah) ??
            coerceNumber(item.aya) ??
            coerceNumber(item.verse) ??
            coerceNumber(item.number) ??
            fallbackAyah;

        const itemSurah =
            coerceNumber(item.surah) ??
            coerceNumber(item.sura) ??
            coerceNumber(item.chapter) ??
            surah;

        entries.push({ surah: itemSurah, ayah, text });
    }

    return entries.sort((a, b) => a.ayah - b.ayah);
}

// Available Tafsir editions from spa5k API
export const TAFSIR_EDITIONS: TafsirEdition[] = [
    // English Tafsirs
    { id: "en-tafisr-ibn-kathir", name: "Tafsir Ibn Kathir (abridged)", language: "English", author: "Hafiz Ibn Kathir" },
    { id: "en-al-jalalayn", name: "Al-Jalalayn", language: "English", author: "Al-Jalalayn" },
    { id: "en-al-qushairi-tafsir", name: "Al Qushairi Tafsir", language: "English", author: "Al Qushairi" },
    { id: "en-tafsir-maarif-ul-quran", name: "Maarif-ul-Quran", language: "English", author: "Mufti Muhammad Shafi" },
    { id: "en-kashani-tafsir", name: "Kashani Tafsir", language: "English", author: "Kashani" },
    { id: "en-tafsir-al-tustari", name: "Tafsir al-Tustari", language: "English", author: "Tafsir al-Tustari" },
    { id: "en-asbab-al-nuzul-by-al-wahidi", name: "Asbab Al-Nuzul by Al-Wahidi", language: "English", author: "Al-Wahidi" },
    { id: "en-tafsir-ibn-abbas", name: "Tanwîr al-Miqbâs min Tafsîr Ibn 'Abbâs", language: "English", author: "Ibn 'Abbâs" },
    { id: "en-kashf-al-asrar-tafsir", name: "Kashf Al-Asrar Tafsir", language: "English", author: "Kashf Al-Asrar" },
    { id: "en-tazkirul-quran", name: "Tazkirul Quran", language: "English", author: "Maulana Wahid Uddin Khan" },
    
    // Arabic Tafsirs
    { id: "ar-tafsir-ibn-kathir", name: "Tafsir Ibn Kathir", language: "Arabic", author: "Hafiz Ibn Kathir" },
    { id: "ar-tafseer-al-saddi", name: "Tafseer Al Saddi", language: "Arabic", author: "Saddi" },
    { id: "ar-tafsir-al-baghawi", name: "Tafseer Al-Baghawi", language: "Arabic", author: "Baghawy" },
    { id: "ar-tafseer-tanwir-al-miqbas", name: "Tafseer Tanwir al-Miqbas", language: "Arabic", author: "Tanweer" },
    { id: "ar-tafsir-al-wasit", name: "Tafsir Al Wasit", language: "Arabic", author: "Waseet" },
    { id: "ar-tafsir-al-tabari", name: "Tafsir al-Tabari", language: "Arabic", author: "Tabari" },
    { id: "ar-tafsir-muyassar", name: "Tafsir Muyassar", language: "Arabic", author: "المیسر" },
    { id: "ar-tafseer-al-qurtubi", name: "Tafseer Al Qurtubi", language: "Arabic", author: "Qurtubi" },
    
    // Bengali Tafsirs
    { id: "bn-tafisr-fathul-majid", name: "Tafsir Fathul Majid", language: "Bengali", author: "AbdulRahman Bin Hasan Al-Alshaikh" },
    { id: "bn-tafseer-ibn-e-kaseer", name: "Tafseer ibn Kathir", language: "Bengali", author: "Tawheed Publication" },
    { id: "bn-tafsir-ahsanul-bayaan", name: "Tafsir Ahsanul Bayaan", language: "Bengali", author: "Bayaan Foundation" },
    { id: "bn-tafsir-abu-bakr-zakaria", name: "Tafsir Abu Bakr Zakaria", language: "Bengali", author: "King Fahd Quran Printing Complex" },
    
    // Urdu Tafsirs
    { id: "ur-tafseer-ibn-e-kaseer", name: "Tafsir Ibn Kathir", language: "Urdu", author: "Hafiz Ibn Kathir" },
    { id: "ur-tafsir-bayan-ul-quran", name: "Tafsir Bayan ul Quran", language: "Urdu", author: "Dr. Israr Ahmad" },
    { id: "ur-tazkirul-quran", name: "Tazkirul Quran", language: "Urdu", author: "Maulana Wahid Uddin Khan" },
    
    // Russian Tafsirs
    { id: "ru-tafseer-al-saddi", name: "Tafseer Al Saddi", language: "Russian", author: "Saddi" },
    
    // Kurdish Tafsirs
    { id: "kurd-tafsir-rebar", name: "Rebar Kurdish Tafsir", language: "Kurdish", author: "Rebar Kurdish" }
];

const BASE_URL = "https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir";
const LOCAL_BASE_URL = "/data/tafsir";

// Offline editions available locally
const OFFLINE_EDITIONS = [
    "en-tafisr-ibn-kathir",
    "ar-tafsir-ibn-kathir",
    "ur-tafseer-ibn-e-kaseer"
];

/**
 * Check if an edition is available offline
 */
function isOfflineEdition(edition: string): boolean {
    return OFFLINE_EDITIONS.includes(edition);
}

/**
 * Fetches tafsir for a specific ayah
 * @param surah - Surah number (1-114)
 * @param ayah - Ayah number within the surah
 * @param edition - Tafsir edition slug (e.g., "en-tafisr-ibn-kathir")
 * @returns The tafsir response with text, or throws an error
 */
export async function fetchTafsir(
    surah: number,
    ayah: number,
    edition: string
): Promise<TafsirResponse> {
    // Try local file first if edition is offline
    if (isOfflineEdition(edition)) {
        try {
            const localUrl = `${LOCAL_BASE_URL}/${edition}/${surah}/${ayah}.json`;
            const response = await fetch(localUrl);
            if (response.ok) {
                const data = await response.json();
                return data as TafsirResponse;
            }
        } catch (error) {
            console.warn(`Failed to load local tafsir for ${edition}/${surah}:${ayah}, falling back to API`);
        }
    }

    // Fallback to API
    const url = `${BASE_URL}/${edition}/${surah}/${ayah}.json`;

    const response = await fetch(url);

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error(`Tafsir not available for this ayah`);
        }
        throw new Error(`Failed to fetch tafsir: ${response.statusText}`);
    }

    const data = await response.json();
    return data as TafsirResponse;
}

/**
 * Fetches complete tafsir for a surah (all ayahs)
 * @param surah - Surah number (1-114)
 * @param edition - Tafsir edition slug
 * @returns Array of tafsir responses for all ayahs in the surah
 */
export async function fetchSurahTafsir(
    surah: number,
    edition: string
): Promise<TafsirResponse[]> {
    // Try local file first if edition is offline
    if (isOfflineEdition(edition)) {
        try {
            const localUrl = `${LOCAL_BASE_URL}/${edition}/${surah}.json`;
            const response = await fetch(localUrl);
            if (response.ok) {
                const data = await response.json();
                const normalized = normalizeSurahTafsir(data, surah);
                if (normalized.length === 0) {
                    if (import.meta.env.DEV) {
                        console.error("[fetchSurahTafsir] Unexpected tafsir payload:", data);
                    }
                    throw new Error("Invalid tafsir data format");
                }
                return normalized;
            }
        } catch (error) {
            console.warn(`Failed to load local surah tafsir for ${edition}/${surah}, falling back to API`);
        }
    }

    // Fallback to API
    const url = `${BASE_URL}/${edition}/${surah}.json`;

    const response = await fetch(url);

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error(`Tafsir not available for this surah`);
        }
        throw new Error(`Failed to fetch surah tafsir: ${response.statusText}`);
    }

    const data = await response.json();
    const normalized = normalizeSurahTafsir(data, surah);
    if (normalized.length === 0) {
        if (import.meta.env.DEV) {
            console.error("[fetchSurahTafsir] Unexpected tafsir payload:", data);
        }
        throw new Error("Invalid tafsir data format");
    }
    return normalized;
}
