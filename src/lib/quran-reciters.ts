/**
 * Noor Connect — Authentic Quran Reciters Registry (45+ Curated Reciters)
 *
 * Backed by the global EveryAyah CDN:
 * https://everyayah.com/data/{everyAyahDir}/{surah3}{ayah3}.mp3
 * and Islamic Network CDN where mapped:
 * https://cdn.islamic.network/quran/audio/128/{id}/{globalAyahNumber}.mp3
 */

export type ReciterStyle = 'Murattal' | 'Mujawwad' | 'Teacher (Muallim)';

export interface AuthenticReciter {
  id: string;
  name: string;
  arabicName: string;
  shortName: string;
  everyAyahDir: string;
  bitrate: string;
  style: ReciterStyle;
  country?: string;
  note?: string;
}

export const QURAN_RECITERS: AuthenticReciter[] = [
  // 1. Mishary Rashid Alafasy
  {
    id: 'ar.alafasy',
    name: 'Mishary Rashid Alafasy',
    arabicName: 'مشاري بن راشد العفاسي',
    shortName: 'Alafasy',
    everyAyahDir: 'Alafasy_128kbps',
    bitrate: '128 kbps',
    style: 'Murattal',
    country: 'Kuwait',
    note: 'World-renowned melodious & clear recitation',
  },
  // 2. Yasser Ad-Dussary
  {
    id: 'ar.yasseraldussary',
    name: 'Yasser Ad-Dussary',
    arabicName: 'ياسر الدوسري',
    shortName: 'Ad-Dussary',
    everyAyahDir: 'Yasser_Ad-Dussary_128kbps',
    bitrate: '128 kbps',
    style: 'Murattal',
    country: 'Saudi Arabia',
    note: 'Imam of Masjid al-Haram, emotive & soulful',
  },
  // 3. Abdul Rahman Al-Sudais
  {
    id: 'ar.abdurrahmaansudais',
    name: 'Abdul Rahman Al-Sudais',
    arabicName: 'عبد الرحمن السديس',
    shortName: 'As-Sudais',
    everyAyahDir: 'Abdurrahmaan_As-Sudais_192kbps',
    bitrate: '192 kbps',
    style: 'Murattal',
    country: 'Saudi Arabia',
    note: 'Chief Imam of Masjid al-Haram',
  },
  // 4. Saud Al-Shuraim
  {
    id: 'ar.saodalshuraim',
    name: 'Saud Al-Shuraim',
    arabicName: 'سعود الشريم',
    shortName: 'Al-Shuraim',
    everyAyahDir: 'Saood_ash-Shuraym_128kbps',
    bitrate: '128 kbps',
    style: 'Murattal',
    country: 'Saudi Arabia',
    note: 'Former Imam of Masjid al-Haram',
  },
  // 5. Maher Al-Muaiqly
  {
    id: 'ar.mahermuaiqly',
    name: 'Maher Al-Muaiqly',
    arabicName: 'ماهر المعيقلي',
    shortName: 'Al-Muaiqly',
    everyAyahDir: 'MaherAlMuaiqly128kbps',
    bitrate: '128 kbps',
    style: 'Murattal',
    country: 'Saudi Arabia',
    note: 'Imam of Masjid al-Haram, serene pace',
  },
  // 6. Abdul Basit (Murattal)
  {
    id: 'ar.abdulbasitmurattal',
    name: 'Abdul Basit Abdus Samad (Murattal)',
    arabicName: 'عبد الباسط عبد الصمد (مرتل)',
    shortName: 'Abdul Basit (Murattal)',
    everyAyahDir: 'Abdul_Basit_Murattal_192kbps',
    bitrate: '192 kbps',
    style: 'Murattal',
    country: 'Egypt',
    note: 'Golden Era Cairo recitation standard',
  },
  // 7. Abdul Basit (Mujawwad)
  {
    id: 'ar.abdulbasitmujawwad',
    name: 'Abdul Basit Abdus Samad (Mujawwad)',
    arabicName: 'عبد الباسط عبد الصمد (مجود)',
    shortName: 'Abdul Basit (Mujawwad)',
    everyAyahDir: 'Abdul_Basit_Mujawwad_128kbps',
    bitrate: '128 kbps',
    style: 'Mujawwad',
    country: 'Egypt',
    note: 'Legendary melodic Tajweed mastery',
  },
  // 8. Abdul Samad
  {
    id: 'ar.abdulsamad',
    name: 'Abdul Samad',
    arabicName: 'عبد الصمد',
    shortName: 'Abdul Samad',
    everyAyahDir: 'AbdulSamad_64kbps_QuranExplorer.Com',
    bitrate: '64 kbps',
    style: 'Murattal',
    country: 'Egypt',
  },
  // 9. Saad Al-Ghamdi
  {
    id: 'ar.saadalghamdi',
    name: 'Saad Al-Ghamdi',
    arabicName: 'سعد الغامدي',
    shortName: 'Al-Ghamdi',
    everyAyahDir: 'Ghamadi_40kbps',
    bitrate: '128 kbps',
    style: 'Murattal',
    country: 'Saudi Arabia',
    note: 'Calm, gentle & reflective',
  },
  // 10. Abu Bakr Ash-Shaatree
  {
    id: 'ar.shaatree',
    name: 'Abu Bakr Ash-Shaatree',
    arabicName: 'أبو بكر الشاطري',
    shortName: 'Ash-Shaatree',
    everyAyahDir: 'Abu_Bakr_Ash-Shaatree_128kbps',
    bitrate: '128 kbps',
    style: 'Murattal',
    country: 'Saudi Arabia',
    note: 'Distinguished resonant tone',
  },
  // 11. Ahmed ibn Ali al-Ajamy
  {
    id: 'ar.ahmedajamy',
    name: 'Ahmed ibn Ali al-Ajamy',
    arabicName: 'أحمد بن علي العجمي',
    shortName: 'Al-Ajamy',
    everyAyahDir: 'ahmed_ibn_ali_al_ajamy_128kbps',
    bitrate: '128 kbps',
    style: 'Murattal',
    country: 'Saudi Arabia',
    note: 'Powerful emotional Khushu',
  },
  // 12. Nasser Al-Qatami
  {
    id: 'ar.nasseralqatami',
    name: 'Nasser Al-Qatami',
    arabicName: 'ناصر القطامي',
    shortName: 'Al-Qatami',
    everyAyahDir: 'Nasser_Alqatami_128kbps',
    bitrate: '128 kbps',
    style: 'Murattal',
    country: 'Saudi Arabia',
    note: 'Heart-touching Taraweeh cadence',
  },
  // 13. Fares Abbad
  {
    id: 'ar.faresabbad',
    name: 'Fares Abbad',
    arabicName: 'فارس عباد',
    shortName: 'Fares Abbad',
    everyAyahDir: 'Fares_Abbad_64kbps',
    bitrate: '64 kbps',
    style: 'Murattal',
    country: 'Yemen',
    note: 'Deep melodious Yemenite recitation',
  },
  // 14. Hani Ar-Rifai
  {
    id: 'ar.hanirifai',
    name: 'Hani Ar-Rifai',
    arabicName: 'هاني الرفاعي',
    shortName: 'Ar-Rifai',
    everyAyahDir: 'Hani_Rifai_192kbps',
    bitrate: '192 kbps',
    style: 'Murattal',
    country: 'Saudi Arabia',
    note: 'Tearful, poignant recitation',
  },
  // 15. Ali Jaber
  {
    id: 'ar.alijaber',
    name: 'Ali Jaber',
    arabicName: 'علي جابر',
    shortName: 'Ali Jaber',
    everyAyahDir: 'Ali_Jaber_64kbps',
    bitrate: '64 kbps',
    style: 'Murattal',
    country: 'Saudi Arabia',
    note: 'Beloved historic Imam of Masjid al-Haram',
  },
  // 16. Salah Al-Budair
  {
    id: 'ar.salahalbudair',
    name: 'Salah Al-Budair',
    arabicName: 'صلاح البدير',
    shortName: 'Al-Budair',
    everyAyahDir: 'Salah_Al_Budair_128kbps',
    bitrate: '128 kbps',
    style: 'Murattal',
    country: 'Saudi Arabia',
    note: 'Imam of Masjid an-Nabawi',
  },
  // 17. Salaah AbdulRahman Bukhatir
  {
    id: 'ar.salaahbukhatir',
    name: 'Salaah AbdulRahman Bukhatir',
    arabicName: 'صلاح بو خاطر',
    shortName: 'Bukhatir',
    everyAyahDir: 'Salaah_AbdulRahman_Bukhatir_128kbps',
    bitrate: '128 kbps',
    style: 'Murattal',
    country: 'UAE',
    note: 'Calm Sudais-inspired harmony',
  },
  // 18. Abdullaah Awaad Al-Juhaynee
  {
    id: 'ar.abdullahaljuhaynee',
    name: 'Abdullah Awaad Al-Juhaynee',
    arabicName: 'عبد الله عواد الجهني',
    shortName: 'Al-Juhaynee',
    everyAyahDir: 'Abdullaah_3awwaad_Al-Juhaynee_128kbps',
    bitrate: '128 kbps',
    style: 'Murattal',
    country: 'Saudi Arabia',
    note: 'Imam of Masjid al-Haram',
  },
  // 19. Abdullah Basfar
  {
    id: 'ar.abdullahbasfar',
    name: 'Abdullah Basfar',
    arabicName: 'عبد الله بصفر',
    shortName: 'Basfar',
    everyAyahDir: 'Abdullah_Basfar_192kbps',
    bitrate: '192 kbps',
    style: 'Murattal',
    country: 'Saudi Arabia',
    note: 'Crisp articulation for learners',
  },
  // 20. Abdullah Matroud
  {
    id: 'ar.abdullahmatroud',
    name: 'Abdullah Matroud',
    arabicName: 'عبد الله مطرود',
    shortName: 'Matroud',
    everyAyahDir: 'Abdullah_Matroud_128kbps',
    bitrate: '128 kbps',
    style: 'Murattal',
    country: 'Saudi Arabia',
    note: 'Measured, tranquil cadence',
  },
  // 21. Mahmoud Khalil Al-Husary (Murattal)
  {
    id: 'ar.husary',
    name: 'Mahmoud Khalil Al-Husary (Murattal)',
    arabicName: 'محمود خليل الحصري (مرتل)',
    shortName: 'Al-Husary (Murattal)',
    everyAyahDir: 'Husary_128kbps',
    bitrate: '128 kbps',
    style: 'Murattal',
    country: 'Egypt',
    note: 'The universal benchmark for Tajweed rules',
  },
  // 22. Mahmoud Khalil Al-Husary (Mujawwad)
  {
    id: 'ar.husarymujawwad',
    name: 'Mahmoud Khalil Al-Husary (Mujawwad)',
    arabicName: 'محمود خليل الحصري (مجود)',
    shortName: 'Al-Husary (Mujawwad)',
    everyAyahDir: 'Husary_128kbps_Mujawwad',
    bitrate: '128 kbps',
    style: 'Mujawwad',
    country: 'Egypt',
    note: 'Deeply reverent slow melodic recitation',
  },
  // 23. Mahmoud Khalil Al-Husary (Teacher / Muallim)
  {
    id: 'ar.husarymuallim',
    name: 'Mahmoud Khalil Al-Husary (Muallim / Teacher)',
    arabicName: 'محمود خليل الحصري (المعلم)',
    shortName: 'Al-Husary (Teacher)',
    everyAyahDir: 'Husary_Muallim_128kbps',
    bitrate: '128 kbps',
    style: 'Teacher (Muallim)',
    country: 'Egypt',
    note: 'Pedagogical pauses for students repeating each ayah',
  },
  // 24. Siddiq Al-Minshawi (Murattal)
  {
    id: 'ar.minshawimurattal',
    name: 'Muhammad Siddiq Al-Minshawi (Murattal)',
    arabicName: 'محمد صديق المنشاوي (مرتل)',
    shortName: 'Al-Minshawi (Murattal)',
    everyAyahDir: 'Minshawy_Murattal_128kbps',
    bitrate: '128 kbps',
    style: 'Murattal',
    country: 'Egypt',
    note: 'Heart-melting spiritual clarity',
  },
  // 25. Siddiq Al-Minshawi (Mujawwad)
  {
    id: 'ar.minshawimujawwad',
    name: 'Muhammad Siddiq Al-Minshawi (Mujawwad)',
    arabicName: 'محمد صديق المنشاوي (مجود)',
    shortName: 'Al-Minshawi (Mujawwad)',
    everyAyahDir: 'Minshawy_Mujawwad_192kbps',
    bitrate: '192 kbps',
    style: 'Mujawwad',
    country: 'Egypt',
    note: 'Unrivaled maqam mastery and emotion',
  },
  // 26. Siddiq Al-Minshawi (Teacher)
  {
    id: 'ar.minshawiteacher',
    name: 'Muhammad Siddiq Al-Minshawi (Teacher)',
    arabicName: 'محمد صديق المنشاوي (المعلم)',
    shortName: 'Al-Minshawi (Teacher)',
    everyAyahDir: 'Minshawy_Teacher_128kbps',
    bitrate: '128 kbps',
    style: 'Teacher (Muallim)',
    country: 'Egypt',
    note: 'Student repeat pauses for Hifz learners',
  },
  // 27. Muhammad Ayyoub
  {
    id: 'ar.muhammadayyoub',
    name: 'Muhammad Ayyoub',
    arabicName: 'محمد أيوب',
    shortName: 'Ayyoub',
    everyAyahDir: 'Muhammad_Ayyoub_128kbps',
    bitrate: '128 kbps',
    style: 'Murattal',
    country: 'Saudi Arabia',
    note: 'Historic Imam of Masjid an-Nabawi (Hijazi style)',
  },
  // 28. Muhammad Jibreel
  {
    id: 'ar.muhammadjibreel',
    name: 'Muhammad Jibreel',
    arabicName: 'محمد جبريل',
    shortName: 'Jibreel',
    everyAyahDir: 'Muhammad_Jibreel_128kbps',
    bitrate: '128 kbps',
    style: 'Murattal',
    country: 'Egypt',
    note: 'Renowned for emotional Dua & Ramadan recitations',
  },
  // 29. Muhammad AbdulKareem
  {
    id: 'ar.muhammadabdulkareem',
    name: 'Muhammad AbdulKareem',
    arabicName: 'محمد عبد الكريم',
    shortName: 'AbdulKareem',
    everyAyahDir: 'Muhammad_AbdulKareem_128kbps',
    bitrate: '128 kbps',
    style: 'Murattal',
    country: 'Sudan',
    note: 'Sudanese melodic cadence',
  },
  // 30. Muhsin Al-Qasim
  {
    id: 'ar.muhsinalqasim',
    name: 'Muhsin Al-Qasim',
    arabicName: 'عبد المحسن القاسم',
    shortName: 'Al-Qasim',
    everyAyahDir: 'Muhsin_Al_Qasim_192kbps',
    bitrate: '192 kbps',
    style: 'Murattal',
    country: 'Saudi Arabia',
    note: 'Imam and Khateeb of Masjid an-Nabawi',
  },
  // 31. Mustafa Ismail
  {
    id: 'ar.mustafaismail',
    name: 'Mustafa Ismail',
    arabicName: 'مصطفى إسماعيل',
    shortName: 'Mustafa Ismail',
    everyAyahDir: 'Mustafa_Ismail_48kbps',
    bitrate: '48 kbps',
    style: 'Mujawwad',
    country: 'Egypt',
    note: 'The "Architect of Tajweed" and maqam titan',
  },
  // 32. Mahmoud Ali Al-Banna
  {
    id: 'ar.mahmoudalibanna',
    name: 'Mahmoud Ali Al-Banna',
    arabicName: 'محمود علي البنا',
    shortName: 'Al-Banna',
    everyAyahDir: 'mahmoud_ali_al_banna_32kbps',
    bitrate: '32 kbps',
    style: 'Murattal',
    country: 'Egypt',
    note: 'Classic Egyptian broadcast purity',
  },
  // 33. Mohammad al-Tablaway
  {
    id: 'ar.tablaway',
    name: 'Mohammad al-Tablaway',
    arabicName: 'محمد محمود الطبلاوي',
    shortName: 'Al-Tablaway',
    everyAyahDir: 'Mohammad_al_Tablaway_128kbps',
    bitrate: '128 kbps',
    style: 'Murattal',
    country: 'Egypt',
    note: 'Distinctive resonant baritone',
  },
  // 34. Ayman Sowaid (Tajweed Master)
  {
    id: 'ar.aymansowaid',
    name: 'Dr. Ayman Sowaid (Tajweed Master)',
    arabicName: 'أيمن سويد',
    shortName: 'Dr. Ayman Sowaid',
    everyAyahDir: 'Ayman_Sowaid_64kbps',
    bitrate: '64 kbps',
    style: 'Teacher (Muallim)',
    country: 'Syria',
    note: 'Global authority on Qira\'at & Makhaarij',
  },
  // 35. Ibrahim Akhdar
  {
    id: 'ar.ibrahimakhdar',
    name: 'Ibrahim Akhdar',
    arabicName: 'إبراهيم الأخضر',
    shortName: 'Akhdar',
    everyAyahDir: 'Ibrahim_Akhdar_32kbps',
    bitrate: '32 kbps',
    style: 'Murattal',
    country: 'Saudi Arabia',
    note: 'Shaykh al-Qurra of Medina',
  },
  // 36. Khalefa Al-Tunaiji
  {
    id: 'ar.khalefatunaiji',
    name: 'Khalefa Al-Tunaiji',
    arabicName: 'خليفة الطنيجي',
    shortName: 'Al-Tunaiji',
    everyAyahDir: 'khalefa_al_tunaiji_64kbps',
    bitrate: '64 kbps',
    style: 'Murattal',
    country: 'UAE',
    note: 'Clear, modern Emirati recitation',
  },
  // 37. Yasser Salamah
  {
    id: 'ar.yassersalamah',
    name: 'Yasser Salamah',
    arabicName: 'ياسر سلامة',
    shortName: 'Yasser Salamah',
    everyAyahDir: 'Yaser_Salamah_128kbps',
    bitrate: '128 kbps',
    style: 'Murattal',
    country: 'Egypt',
    note: 'Fluid, uplifting tempo',
  },
  // 38. Yassin Al-Hudhaify
  {
    id: 'ar.hudhaify',
    name: 'Ali Abdur-Rahman Al-Hudhaify',
    arabicName: 'علي بن عبد الرحمن الحذيفي',
    shortName: 'Al-Hudhaify',
    everyAyahDir: 'Hudhaify_128kbps',
    bitrate: '128 kbps',
    style: 'Murattal',
    country: 'Saudi Arabia',
    note: 'Chief Imam of Masjid an-Nabawi, deliberative Tajweed',
  },
  // 39. Sahl Yassin
  {
    id: 'ar.sahlyassin',
    name: 'Sahl Yassin',
    arabicName: 'سهل ياسين',
    shortName: 'Sahl Yassin',
    everyAyahDir: 'Sahl_Yassin_128kbps',
    bitrate: '128 kbps',
    style: 'Murattal',
    country: 'Saudi Arabia',
    note: 'Gentle, meditative rhythm',
  },
  // 40. Aziz Alili
  {
    id: 'ar.azizalili',
    name: 'Aziz Alili',
    arabicName: 'عزيز عليلي',
    shortName: 'Aziz Alili',
    everyAyahDir: 'aziz_alili_128kbps',
    bitrate: '128 kbps',
    style: 'Murattal',
    country: 'Bosnia',
    note: 'European Balkan Islamic melody',
  },
  // 41. Akram AlAlaqimy
  {
    id: 'ar.akramalaqimy',
    name: 'Akram Al-Alaqimy',
    arabicName: 'أكرم العلاقمي',
    shortName: 'Al-Alaqimy',
    everyAyahDir: 'Akram_AlAlaqimy_128kbps',
    bitrate: '128 kbps',
    style: 'Murattal',
    country: 'Egypt',
    note: 'Precise vocal clarity',
  },
  // 42. Ali Hajjaj Al-Suesy
  {
    id: 'ar.alihajjajalsuesy',
    name: 'Ali Hajjaj Al-Suesy',
    arabicName: 'علي حجاج السويسي',
    shortName: 'Al-Suesy',
    everyAyahDir: 'Ali_Hajjaj_AlSuesy_128kbps',
    bitrate: '128 kbps',
    style: 'Mujawwad',
    country: 'Egypt',
    note: 'Classical Egyptian radio master',
  },
  // 43. Ahmed Neana
  {
    id: 'ar.ahmedneana',
    name: 'Ahmed Neana',
    arabicName: 'أحمد نعينع',
    shortName: 'Neana',
    everyAyahDir: 'Ahmad_Neana_128kbps',
    bitrate: '128 kbps',
    style: 'Mujawwad',
    country: 'Egypt',
    note: 'Student of Mustafa Ismail, physician-qari',
  },
  // 44. Karim Mansoori
  {
    id: 'ar.karimmansoori',
    name: 'Karim Mansoori',
    arabicName: 'كريم منصوري',
    shortName: 'Mansoori',
    everyAyahDir: 'Karim_Mansoori_40kbps',
    bitrate: '40 kbps',
    style: 'Mujawwad',
    country: 'Iran',
    note: 'International Quran competition laureate',
  },
  // 45. Shahriar Parhizgar
  {
    id: 'ar.parhizgar',
    name: 'Shahriar Parhizgar',
    arabicName: 'شهريار پرهيزكار',
    shortName: 'Parhizgar',
    everyAyahDir: 'Parhizgar_48kbps',
    bitrate: '48 kbps',
    style: 'Murattal',
    country: 'Iran',
    note: 'Pioneering accurate Hafiz recitation standard',
  },
  // 46. Bandar Baleela
  {
    id: 'ar.bandarbaleela',
    name: 'Bandar Baleela',
    arabicName: 'بندر بليلة',
    shortName: 'Baleela',
    everyAyahDir: 'Bandar_Baleela_128kbps',
    bitrate: '128 kbps',
    style: 'Murattal',
    country: 'Saudi Arabia',
    note: 'Imam of Masjid al-Haram, peaceful delivery',
  },
  // 47. Hatem Fareed
  {
    id: 'ar.hatemfareed',
    name: 'Hatem Fareed Al-Waer',
    arabicName: 'حاتم فريد الواعر',
    shortName: 'Hatem Fareed',
    everyAyahDir: 'Hatem_Fareed_128kbps',
    bitrate: '128 kbps',
    style: 'Murattal',
    country: 'Egypt',
    note: 'Alexandrian Taraweeh favorite',
  },
];

export const DEFAULT_QURAN_RECITER = QURAN_RECITERS[0]; // Mishary Alafasy
