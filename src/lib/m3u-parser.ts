/**
 * M3U Playlist Parser
 * Fetches and parses IPTV playlist from iptv-org
 * License: MIT
 */

export interface Channel {
  name: string;
  url: string;
  group?: string;
  logo?: string;
}

export interface ParsedPlaylist {
  makkah: Channel | null;
  madinah: Channel | null;
  allChannels: Channel[];
}

const M3U_URL = 'https://iptv-org.github.io/iptv/countries/sa.m3u';

// Channel name mappings to identify Makkah and Madinah streams
const MAKKAH_NAMES = ['Al-Quran Al-Kareem', 'Al Quran Al Kareem', 'Quran TV'];
const MADINAH_NAMES = ['As-Sunnah', 'Al-Sunnah', 'Sunnah TV', 'Al Sunnah Al Nabawiyah'];

/**
 * Parse M3U playlist content
 */
function parseM3U(content: string): Channel[] {
  const channels: Channel[] = [];
  const lines = content.split('\n');
  
  let currentChannel: Partial<Channel> = {};
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('#EXTINF:')) {
      // Parse EXTINF line for metadata
      const tvgNameMatch = trimmed.match(/tvg-name="([^"]+)"/i);
      const tvgLogoMatch = trimmed.match(/tvg-logo="([^"]+)"/i);
      const groupTitleMatch = trimmed.match(/group-title="([^"]+)"/i);
      
      // Extract name (after the last comma if no tvg-name)
      let name = '';
      if (tvgNameMatch) {
        name = tvgNameMatch[1];
      } else {
        const commaIndex = trimmed.lastIndexOf(',');
        if (commaIndex !== -1) {
          name = trimmed.substring(commaIndex + 1).trim();
        }
      }
      
      currentChannel = {
        name,
        logo: tvgLogoMatch?.[1],
        group: groupTitleMatch?.[1],
      };
    } else if (trimmed && !trimmed.startsWith('#') && currentChannel.name) {
      // This is the URL line
      currentChannel.url = trimmed;
      channels.push(currentChannel as Channel);
      currentChannel = {};
    }
  }
  
  return channels;
}

/**
 * Find Makkah or Madinah channel from list
 */
function findChannel(channels: Channel[], names: string[]): Channel | null {
  for (const channel of channels) {
    const lowerName = channel.name.toLowerCase();
    for (const name of names) {
      if (lowerName.includes(name.toLowerCase())) {
        return channel;
      }
    }
  }
  return null;
}

/**
 * Fetch and parse Saudi Arabia IPTV playlist
 */
export async function fetchSaudiPlaylist(): Promise<ParsedPlaylist> {
  try {
    const response = await fetch(M3U_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.apple.mpegurl, audio/mpegurl, application/x-mpegURL, text/plain, */*',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const content = await response.text();
    const allChannels = parseM3U(content);
    
    const makkah = findChannel(allChannels, MAKKAH_NAMES);
    const madinah = findChannel(allChannels, MADINAH_NAMES);
    
    return { makkah, madinah, allChannels };
  } catch (error) {
    console.error('Failed to fetch IPTV playlist:', error);
    return { makkah: null, madinah: null, allChannels: [] };
  }
}

/**
 * Fallback URLs if IPTV playlist fails
 * SBA official streams via Globecast/Akamai CDN (HTTPS, CORS-enabled globally).
 * Verified working Aug 2026. Both native and web use the same endpoint.
 */
export const FALLBACK_STREAMS = {
  makkah: {
    name: 'Al-Quran Al-Kareem (Makkah)',
    nativeUrl: 'https://cdn-globecast.akamaized.net/live/eds/saudi_quran/hls_roku/index.m3u8',
    webUrl: 'https://cdn-globecast.akamaized.net/live/eds/saudi_quran/hls_roku/index.m3u8',
    fallbackUrl: 'https://live.kwikmotion.com/sbrksaquranradiolive/srpksaquranradio/playlist.m3u8',
  },
  madinah: {
    name: 'As-Sunnah (Madinah)',
    nativeUrl: 'https://cdn-globecast.akamaized.net/live/eds/saudi_sunnah/hls_roku/index.m3u8',
    webUrl: 'https://cdn-globecast.akamaized.net/live/eds/saudi_sunnah/hls_roku/index.m3u8',
    fallbackUrl: null as string | null,
  },
};

// For GlobalRadioPlayer — CORS-safe radio streams
export const RADIO_STREAMS = {
  makkah: 'https://Qurango.net/radio/tarateel',  // no CORS block
  madinah: 'https://Qurango.net/radio/quran_kareem',
};
