/**
 * Islamic Calendar Service
 * Provides centralized Islamic date calculations using Aladhan API
 * Ensures consistent and accurate Islamic dates across the app
 */

import { gToHApiResponseSchema, safeParseApiResponse } from '@/lib/api-schemas';

export interface IslamicDate {
  hijri: {
    date: string;
    format: string;
    day: string;
    weekday: {
      en: string;
      ar: string;
    };
    month: {
      number: number;
      en: string;
      ar: string;
    };
    year: string;
    designation: {
      abbreviated: string;
      expanded: string;
    };
    holidays: string[];
  };
  gregorian: {
    date: string;
    format: string;
    day: string;
    weekday: {
      en: string;
    };
    month: {
      number: number;
      en: string;
    };
    year: string;
    designation: {
      abbreviated: string;
      expanded: string;
    };
  };
}

export interface IslamicCalendarInfo {
  currentDate: IslamicDate;
  isRamadan: boolean;
  ramadanDay: number;
  daysUntilRamadan: number;
  isEidAlFitr: boolean;
  isEidAlAdha: boolean;
  hijriMonth: number;
  hijriDay: number;
  hijriYear: number;
}

class IslamicCalendarService {
  private static instance: IslamicCalendarService;
  private cache: Map<string, { data: IslamicDate; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 3600000; // 1 hour cache

  static getInstance(): IslamicCalendarService {
    if (!IslamicCalendarService.instance) {
      IslamicCalendarService.instance = new IslamicCalendarService();
    }
    return IslamicCalendarService.instance;
  }

  /**
   * Get Islamic date for a specific Gregorian date
   */
  async getIslamicDate(date: Date = new Date()): Promise<IslamicDate> {
    const cacheKey = date.toDateString();
    const cached = this.cache.get(cacheKey);

    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const formattedDate = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
      
      const response = await fetch(`https://api.aladhan.com/v1/gToH/${formattedDate}`);
      const rawData = await response.json();

      const parseResult = safeParseApiResponse(gToHApiResponseSchema, rawData);

      if (parseResult.success && parseResult.data.code === 200) {
        const islamicDate = parseResult.data.data as IslamicDate;
        
        // Cache the result
        this.cache.set(cacheKey, {
          data: islamicDate,
          timestamp: Date.now()
        });

        return islamicDate;
      } else {
        throw new Error("Invalid API response");
      }
    } catch (error) {
      console.error('Error fetching Islamic date:', error);
      
      // Fallback to calculation if API fails
      return this.calculateIslamicDate(date);
    }
  }

  /**
   * Get comprehensive Islamic calendar information
   */
  async getIslamicCalendarInfo(date: Date = new Date()): Promise<IslamicCalendarInfo> {
    const islamicDate = await this.getIslamicDate(date);
    
    const hijriMonth = parseInt(islamicDate.hijri.month.number.toString());
    const hijriDay = parseInt(islamicDate.hijri.day);
    const hijriYear = parseInt(islamicDate.hijri.year);

    const isRamadan = hijriMonth === 9;
    const ramadanDay = isRamadan ? hijriDay : 0;
    const isEidAlFitr = hijriMonth === 10 && hijriDay === 1;
    const isEidAlAdha = hijriMonth === 12 && hijriDay === 10;

    // Calculate days until next Ramadan
    const daysUntilRamadan = await this.calculateDaysUntilRamadan(date);

    return {
      currentDate: islamicDate,
      isRamadan,
      ramadanDay,
      daysUntilRamadan,
      isEidAlFitr,
      isEidAlAdha,
      hijriMonth,
      hijriDay,
      hijriYear
    };
  }

  /**
   * Check if today is Ramadan
   */
  async isRamadan(date: Date = new Date()): Promise<boolean> {
    const info = await this.getIslamicCalendarInfo(date);
    return info.isRamadan;
  }

  /**
   * Get current Ramadan day (1-30)
   */
  async getRamadanDay(date: Date = new Date()): Promise<number> {
    const info = await this.getIslamicCalendarInfo(date);
    return info.ramadanDay;
  }

  async calculateDaysUntilRamadan(date: Date = new Date()): Promise<number> {
    try {
      // Get current Hijri date
      const currentIslamicDate = await this.getIslamicDate(date);
      const currentHijriMonth = parseInt(currentIslamicDate.hijri.month.number.toString());
      const currentHijriDay = parseInt(currentIslamicDate.hijri.day);
      const currentHijriYear = parseInt(currentIslamicDate.hijri.year);

      // If we're in Ramadan, return 0
      if (currentHijriMonth.toString() === "9") {
        return 0;
      }

      // Try to get exact date by checking forward
      let daysUntil = 0;
      const checkDate = new Date(date);
      
      while (daysUntil < 365) { // Prevent infinite loop
        checkDate.setDate(checkDate.getDate() + 1);
        const futureIslamicDate = this.calculateIslamicDate(checkDate);
        
        if (parseInt(futureIslamicDate.hijri.month.number.toString()) === 9 && parseInt(futureIslamicDate.hijri.day) === 1) {
          break;
        }
        
        daysUntil++;
      }

      return daysUntil;
    } catch (error) {
      console.error('Error calculating days until Ramadan:', error);
      return -1; // Error value
    }
  }

  /**
   * Fallback calculation for Islamic date (approximate)
   */
  calculateIslamicDate(date: Date): IslamicDate {
    // This is a simplified fallback calculation
    // In a real implementation, you'd use a proper Hijri calendar library
    const hijriMonths = [
      { en: 'Muharram', ar: 'محرم' },
      { en: 'Safar', ar: 'صفر' },
      { en: 'Rabi al-Awwal', ar: 'ربيع الأول' },
      { en: 'Rabi al-Thani', ar: 'ربيع الثاني' },
      { en: 'Jumada al-Awwal', ar: 'جمادى الأولى' },
      { en: 'Jumada al-Thani', ar: 'جمادى الثانية' },
      { en: 'Rajab', ar: 'رجب' },
      { en: 'Shaban', ar: 'شعبان' },
      { en: 'Ramadan', ar: 'رمضان' },
      { en: 'Shawwal', ar: 'شوال' },
      { en: 'Dhul-Qadah', ar: 'ذو القعدة' },
      { en: 'Dhul-Hijjah', ar: 'ذو الحجة' }
    ];

    const hijriWeekdays = [
      { en: 'Al-Ahad', ar: 'الأحد' },
      { en: 'Al-Ithnayn', ar: 'الإثنين' },
      { en: 'Al-Thulatha', ar: 'الثلاثاء' },
      { en: 'Al-Arbaa', ar: 'الأربعاء' },
      { en: 'Al-Khamis', ar: 'الخميس' },
      { en: 'Al-Jumuah', ar: 'الجمعة' },
      { en: 'As-Sabt', ar: 'السبت' }
    ];

    // Approximate calculation (this is not accurate, just for fallback)
    const julianDay = this.getJulianDay(date);
    const hijriDay = Math.floor((julianDay - 1948439.5) % 30) + 1;
    const hijriMonth = Math.floor(((julianDay - 1948439.5) / 30) % 12) + 1;
    const hijriYear = Math.floor((julianDay - 1948439.5) / 354.4) + 1;

    return {
      hijri: {
        date: `${hijriDay}-${hijriMonth}-${hijriYear}`,
        format: `DD-MM-YYYY`,
        day: hijriDay.toString(),
        weekday: hijriWeekdays[date.getDay()],
        month: {
          number: hijriMonth,
          en: hijriMonths[hijriMonth - 1].en,
          ar: hijriMonths[hijriMonth - 1].ar
        },
        year: hijriYear.toString(),
        designation: {
          abbreviated: 'AH',
          expanded: 'After Hijra'
        },
        holidays: []
      },
      gregorian: {
        date: `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`,
        format: 'DD-MM-YYYY',
        day: date.getDate().toString(),
        weekday: {
          en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()]
        },
        month: {
          number: date.getMonth() + 1,
          en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][date.getMonth()]
        },
        year: date.getFullYear().toString(),
        designation: {
          abbreviated: 'CE',
          expanded: 'Common Era'
        }
      }
    };
  }

  /**
   * Convert Gregorian date to Julian Day Number
   */
  private getJulianDay(date: Date): number {
    const a = Math.floor((14 - (date.getMonth() + 1)) / 12);
    const y = date.getFullYear() + 4800 - a;
    const m = (date.getMonth() + 1) + 12 * a - 3;

    return date.getDate() + Math.floor((153 * m + 2) / 5) + 365 * y + 
           Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const islamicCalendarService = IslamicCalendarService.getInstance();
