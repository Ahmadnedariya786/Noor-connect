export type RadioCategory = 'adhkar' | 'fatwa' | 'hadith' | 'mosque' | 'reciter' | 'stories' | 'surah' | 'tafsir' | 'translation';

import { radioStations, type RadioStation } from "./radio-stations";

export interface ExtraRadioStation {
  id: number;
  nameAr: string;
  nameEn: string;
  url: string;
  slug: string;
  category: RadioCategory;
  img: string;
}

export const extraRadioStations: ExtraRadioStation[] = [
  { id: 3, nameAr: "إذاعة أحمد العجمي", nameEn: "Ahmad Al-Ajmy", url: "https://backup.qurango.net/radio/ahmad_alajmy", slug: "ahmad_alajmy", category: 'reciter', img: "/images/radio/reciters/3.webp" },
  { id: 4, nameAr: "إذاعة أحمد الحواشي", nameEn: "Ahmad Al-Hawashi", url: "https://backup.qurango.net/radio/ahmad_alhawashi", slug: "ahmad_alhawashi", category: 'reciter', img: "/images/radio/reciters/4.webp" },
  { id: 5, nameAr: "إذاعة أحمد صابر", nameEn: "Ahmad Saber", url: "https://backup.qurango.net/radio/ahmad_saber", slug: "ahmad_saber", category: 'reciter', img: "/images/radio/reciters/5.webp" },
  { id: 6, nameAr: "إذاعة أحمد نعينع", nameEn: "Ahmad Nauina", url: "https://backup.qurango.net/radio/ahmad_nauina", slug: "ahmad_nauina", category: 'reciter', img: "/images/radio/reciters/6.webp" },
  { id: 7, nameAr: "إذاعة أكرم العلاقمي", nameEn: "Akram Alalaqmi", url: "https://backup.qurango.net/radio/akram_alalaqmi", slug: "akram_alalaqmi", category: 'reciter', img: "/images/radio/reciters/7.webp" },
  { id: 8, nameAr: "إذاعة إدريس أبكر", nameEn: "Idrees Abkr", url: "https://backup.qurango.net/radio/idrees_abkr", slug: "idrees_abkr", category: 'reciter', img: "/images/radio/reciters/8.webp" },
  { id: 9, nameAr: "إذاعة الزين محمد أحمد", nameEn: "Alzain Mohammad Ahmad", url: "https://backup.qurango.net/radio/alzain_mohammad_ahmad", slug: "alzain_mohammad_ahmad", category: 'reciter', img: "/images/radio/reciters/9.webp" },
  { id: 10, nameAr: "إذاعة القارئ ياسين", nameEn: "Al-Qaria Yassen", url: "https://backup.qurango.net/radio/alqaria_yassen", slug: "alqaria_yassen", category: 'reciter', img: "/images/radio/reciters/10.webp" },
  { id: 11, nameAr: "إذاعة العيون الكوشي", nameEn: "Aloyoon Al-Koshi", url: "https://backup.qurango.net/radio/aloyoon_alkoshi", slug: "aloyoon_alkoshi", category: 'reciter', img: "/images/radio/reciters/11.webp" },
  { id: 12, nameAr: "إذاعة توفيق الصايغ", nameEn: "Tawfeeq As-Sayegh", url: "https://backup.qurango.net/radio/tawfeeq_assayegh", slug: "tawfeeq_assayegh", category: 'reciter', img: "/images/radio/reciters/12.webp" },
  { id: 13, nameAr: "إذاعة جمال شاكر عبدالله", nameEn: "Jamal Shaker Abdullah", url: "https://backup.qurango.net/radio/jamal_shaker_abdullah", slug: "jamal_shaker_abdullah", category: 'reciter', img: "/images/radio/reciters/13.webp" },
  { id: 14, nameAr: "إذاعة خالد القحطاني", nameEn: "Khaled Al-Qahtani", url: "https://backup.qurango.net/radio/khaled_alqahtani", slug: "khaled_alqahtani", category: 'reciter', img: "/images/radio/reciters/14.webp" },
  { id: 15, nameAr: "إذاعة خالد عبدالكافي", nameEn: "Khalid Abdulkafi", url: "https://backup.qurango.net/radio/khalid_abdulkafi", slug: "khalid_abdulkafi", category: 'reciter', img: "/images/radio/reciters/15.webp" },
  { id: 16, nameAr: "إذاعة خليفة الطنيجي", nameEn: "Khalifa Altunaiji", url: "https://backup.qurango.net/radio/khalifa_altunaiji", slug: "khalifa_altunaiji", category: 'reciter', img: "/images/radio/reciters/16.webp" },
  { id: 17, nameAr: "إذاعة سعد الغامدي", nameEn: "Saad Al-Ghamdi", url: "https://backup.qurango.net/radio/saad_alghamdi", slug: "saad_alghamdi", category: 'reciter', img: "/images/radio/reciters/17.webp" },
  { id: 18, nameAr: "إذاعة سعود الشريم", nameEn: "Saud Al-Shuraim", url: "https://backup.qurango.net/radio/saud_alshuraim", slug: "saud_alshuraim", category: 'reciter', img: "/images/radio/reciters/18.webp" },
  { id: 19, nameAr: "إذاعة سهل ياسين", nameEn: "Sahl Yassin", url: "https://backup.qurango.net/radio/sahl_yassin", slug: "sahl_yassin", category: 'reciter', img: "" },
  { id: 20, nameAr: "إذاعة زكي داغستاني", nameEn: "Zaki Daghistani", url: "https://backup.qurango.net/radio/zaki_daghistani", slug: "zaki_daghistani", category: 'reciter', img: "" },
  { id: 21, nameAr: "إذاعة سيد رمضان", nameEn: "Sayeed Ramadan", url: "https://backup.qurango.net/radio/sayeed_ramadan", slug: "sayeed_ramadan", category: 'reciter', img: "" },
  { id: 22, nameAr: "إذاعة شيرزاد عبدالرحمن طاهر", nameEn: "Shirazad Taher", url: "https://backup.qurango.net/radio/shirazad_taher", slug: "shirazad_taher", category: 'reciter', img: "" },
  { id: 23, nameAr: "إذاعة صابر عبدالحكم", nameEn: "Saber Abdulhakm", url: "https://backup.qurango.net/radio/saber_abdulhakm", slug: "saber_abdulhakm", category: 'reciter', img: "" },
  { id: 24, nameAr: "إذاعة صلاح البدير", nameEn: "Salah Albudair", url: "https://backup.qurango.net/radio/salah_albudair", slug: "salah_albudair", category: 'reciter', img: "/images/radio/reciters/24.webp" },
  { id: 27, nameAr: "إذاعة عادل ريان", nameEn: "Adel Ryyan", url: "https://backup.qurango.net/radio/adel_ryyan", slug: "adel_ryyan", category: 'reciter', img: "/images/radio/reciters/27.webp" },
  { id: 28, nameAr: "إذاعة عبدالبارئ الثبيتي", nameEn: "Abdelbari Al-Thoubayti", url: "https://backup.qurango.net/radio/abdelbari_altoubayti", slug: "abdelbari_altoubayti", category: 'reciter', img: "" },
  { id: 29, nameAr: "إذاعة عبدالبارئ محمد", nameEn: "Abdulbari Mohammad", url: "https://backup.qurango.net/radio/abdulbari_mohammad", slug: "abdulbari_mohammad", category: 'reciter', img: "" },
  { id: 33, nameAr: "إذاعة عبدالرحمن السديس", nameEn: "Abdulrahman Alsudaes", url: "https://backup.qurango.net/radio/abdulrahman_alsudaes", slug: "abdulrahman_alsudaes", category: 'reciter', img: "/images/radio/reciters/33.webp" },
  { id: 34, nameAr: "إذاعة عبدالعزيز الأحمد", nameEn: "Abdul Aziz Al-Ahmad", url: "https://backup.qurango.net/radio/abdul_aziz_alahmad", slug: "abdul_aziz_alahmad", category: 'reciter', img: "" },
  { id: 35, nameAr: "إذاعة عبدالله المطرود", nameEn: "Abdullah Al-Mattrod", url: "https://backup.qurango.net/radio/abdullah_almattrod", slug: "abdullah_almattrod", category: 'reciter', img: "" },
  { id: 36, nameAr: "إذاعة عبدالله بصفر", nameEn: "Abdullah Basfer", url: "https://backup.qurango.net/radio/abdullah_basfer", slug: "abdullah_basfer", category: 'reciter', img: "" },
  { id: 37, nameAr: "إذاعة عبدالله خياط", nameEn: "Abdullah Khayyat", url: "https://backup.qurango.net/radio/abdullah_khayyat", slug: "abdullah_khayyat", category: 'reciter', img: "/images/radio/reciters/37.webp" },
  { id: 38, nameAr: "إذاعة عبدالله عواد الجهني", nameEn: "Abdullah Al-Johany", url: "https://backup.qurango.net/radio/abdullah_aljohany", slug: "abdullah_aljohany", category: 'reciter', img: "/images/radio/reciters/38.webp" },
  { id: 39, nameAr: "إذاعة عبدالرشيد صوفي", nameEn: "Abdulrasheed Soufi", url: "https://backup.qurango.net/radio/abdulrasheed_soufi_khalaf", slug: "abdulrasheed_soufi_khalaf", category: 'reciter', img: "" },
  { id: 41, nameAr: "إذاعة عبدالمحسن الحارثي", nameEn: "Abdulmohsin Al-Harthy", url: "https://backup.qurango.net/radio/abdulmohsin_alharthy", slug: "abdulmohsin_alharthy", category: 'reciter', img: "/images/radio/reciters/41.webp" },
  { id: 42, nameAr: "إذاعة عبدالمحسن القاسم", nameEn: "Abdulmohsen Al-Qasim", url: "https://backup.qurango.net/radio/abdulmohsen_alqasim", slug: "abdulmohsen_alqasim", category: 'reciter', img: "/images/radio/reciters/42.webp" },
  { id: 43, nameAr: "إذاعة عبدالمحسن العبيكان", nameEn: "Abdulmohsin Al-Obaikan", url: "https://backup.qurango.net/radio/abdulmohsin_alobaikan", slug: "abdulmohsin_alobaikan", category: 'reciter', img: "" },
  { id: 44, nameAr: "إذاعة عبدالهادي أحمد كناكري", nameEn: "Abdulhadi Kanakeri", url: "https://backup.qurango.net/radio/abdulhadi_kanakeri", slug: "abdulhadi_kanakeri", category: 'reciter', img: "/images/radio/reciters/44.webp" },
  { id: 46, nameAr: "إذاعة علي بن عبدالرحمن الحذيفي", nameEn: "Ali Alhuthaifi", url: "https://backup.qurango.net/radio/ali_alhuthaifi", slug: "ali_alhuthaifi", category: 'reciter', img: "/images/radio/reciters/46.webp" },
  { id: 48, nameAr: "إذاعة علي جابر", nameEn: "Ali Jaber", url: "https://backup.qurango.net/radio/ali_jaber", slug: "ali_jaber", category: 'reciter', img: "/images/radio/reciters/48.webp" },
  { id: 49, nameAr: "إذاعة علي حجاج السويسي", nameEn: "Ali Hajjaj Alsouasi", url: "https://backup.qurango.net/radio/ali_hajjaj_alsouasi", slug: "ali_hajjaj_alsouasi", category: 'reciter', img: "/images/radio/reciters/49.webp" },
  { id: 50, nameAr: "إذاعة عماد زهير حافظ", nameEn: "Emad Hafez", url: "https://backup.qurango.net/radio/emad_hafez", slug: "emad_hafez", category: 'reciter', img: "" },
  { id: 51, nameAr: "إذاعة عمر القزابري", nameEn: "Omar Al-Qazabri", url: "https://backup.qurango.net/radio/omar_alqazabri", slug: "omar_alqazabri", category: 'reciter', img: "/images/radio/reciters/51.webp" },
  { id: 52, nameAr: "إذاعة فارس عباد", nameEn: "Fares Abbad", url: "https://backup.qurango.net/radio/fares_abbad", slug: "fares_abbad", category: 'reciter', img: "/images/radio/reciters/52.webp" },
  { id: 55, nameAr: "إذاعة نعمة الحسان", nameEn: "Neamah Al-Hassan", url: "https://backup.qurango.net/radio/neamah_alhassan", slug: "neamah_alhassan", category: 'reciter', img: "/images/radio/reciters/55.webp" },
  { id: 56, nameAr: "إذاعة هاني الرفاعي", nameEn: "Hani Arrifai", url: "https://backup.qurango.net/radio/hani_arrifai", slug: "hani_arrifai", category: 'reciter', img: "/images/radio/reciters/56.webp" },
  { id: 57, nameAr: "إذاعة وليد النائحي", nameEn: "Waleed Alnaehi", url: "https://backup.qurango.net/radio/waleed_alnaehi", slug: "waleed_alnaehi", category: 'reciter', img: "" },
  { id: 59, nameAr: "إذاعة ياسر القرشي", nameEn: "Yasser Al-Qurashi", url: "https://backup.qurango.net/radio/yasser_alqurashi", slug: "yasser_alqurashi", category: 'reciter', img: "/images/radio/reciters/59.webp" },
  { id: 60, nameAr: "إذاعة ياسر المزروعي", nameEn: "Yasser Al-Mazroyee", url: "https://backup.qurango.net/radio/yasser_almazroyee", slug: "yasser_almazroyee", category: 'reciter', img: "/images/radio/reciters/60.webp" },
  { id: 61, nameAr: "إذاعة يحيى حوا", nameEn: "Yahya Hawwa", url: "https://backup.qurango.net/radio/yahya_hawwa", slug: "yahya_hawwa", category: 'reciter', img: "/images/radio/reciters/61.webp" },
  { id: 62, nameAr: "إذاعة يوسف الشويعي", nameEn: "Yousef Alshoaey", url: "https://backup.qurango.net/radio/yousef_alshoaey", slug: "yousef_alshoaey", category: 'reciter', img: "/images/radio/reciters/62.webp" },
  { id: 64, nameAr: "إذاعة محمد الطبلاوي", nameEn: "Mohammad Al-Tablaway", url: "https://backup.qurango.net/radio/mohammad_altablaway", slug: "mohammad_altablaway", category: 'reciter', img: "/images/radio/reciters/64.webp" },
  { id: 65, nameAr: "إذاعة محمد اللحيدان", nameEn: "Mohammed Al-Lohaidan", url: "https://backup.qurango.net/radio/mohammed_allohaidan", slug: "mohammed_allohaidan", category: 'reciter', img: "/images/radio/reciters/65.webp" },
  { id: 66, nameAr: "إذاعة محمد أيوب", nameEn: "Mohammed Ayyub", url: "https://backup.qurango.net/radio/mohammed_ayyub", slug: "mohammed_ayyub", category: 'reciter', img: "/images/radio/reciters/66.webp" },
  { id: 67, nameAr: "إذاعة محمد صالح عالم شاه", nameEn: "Mohammad Saleh Alim Shah", url: "https://backup.qurango.net/radio/mohammad_saleh_alim_shah", slug: "mohammad_saleh_alim_shah", category: 'reciter', img: "" },
  { id: 68, nameAr: "إذاعة محمد جبريل", nameEn: "Mohammed Jibreel", url: "https://backup.qurango.net/radio/mohammed_jibreel", slug: "mohammed_jibreel", category: 'reciter', img: "/images/radio/reciters/68.webp" },
  { id: 71, nameAr: "إذاعة محمد عبدالكريم", nameEn: "Mohammad Abdullkarem", url: "https://backup.qurango.net/radio/mohammad_abdullkarem", slug: "mohammad_abdullkarem", category: 'reciter', img: "" },
  { id: 72, nameAr: "إذاعة محمد عبدالحكيم سعيد العبدالله", nameEn: "Mohammad Al-Abdullah", url: "https://backup.qurango.net/radio/mohammad_alabdullah_albizi", slug: "mohammad_alabdullah_albizi", category: 'reciter', img: "" },
  { id: 77, nameAr: "إذاعة محمود علي البنا", nameEn: "Mahmoud Ali  Albanna", url: "https://backup.qurango.net/radio/mahmoud_ali__albanna", slug: "mahmoud_ali__albanna", category: 'reciter', img: "/images/radio/reciters/77.webp" },
  { id: 80, nameAr: "إذاعة مصطفى إسماعيل", nameEn: "Mustafa Ismail", url: "https://backup.qurango.net/radio/mustafa_ismail", slug: "mustafa_ismail", category: 'reciter', img: "/images/radio/reciters/80.webp" },
  { id: 81, nameAr: "إذاعة مصطفى اللاهوني", nameEn: "Mustafa Al-Lahoni", url: "https://backup.qurango.net/radio/mustafa_allahoni", slug: "mustafa_allahoni", category: 'reciter', img: "/images/radio/reciters/81.webp" },
  { id: 83, nameAr: "إذاعة مفتاح السلطني", nameEn: "Muftah Alsaltany", url: "https://backup.qurango.net/radio/muftah_alsaltany_aldori_an_abi_amr ", slug: "muftah_alsaltany_aldori_an_abi_amr", category: 'reciter', img: "/images/radio/reciters/83.webp" },
  { id: 84, nameAr: "إذاعة ماهر شخاشيرو", nameEn: "Maher Shakhashero", url: "https://backup.qurango.net/radio/maher_shakhashero", slug: "maher_shakhashero", category: 'reciter', img: "/images/radio/reciters/84.webp" },
  { id: 85, nameAr: "إذاعة محمود الشيمي", nameEn: "Mahmood AlSheimy", url: "https://backup.qurango.net/radio/mahmood_alsheimy", slug: "mahmood_alsheimy", category: 'reciter', img: "/images/radio/reciters/85.webp" },
  { id: 86, nameAr: "إذاعة خالد المهنا", nameEn: "Khalid Almohana", url: "https://backup.qurango.net/radio/khalid_almohana", slug: "khalid_almohana", category: 'reciter', img: "" },
  { id: 87, nameAr: "إذاعة عادل الكلباني", nameEn: "Adel Al-Khalbany", url: "https://backup.qurango.net/radio/adel_alkhalbany", slug: "adel_alkhalbany", category: 'reciter', img: "/images/radio/reciters/87.webp" },
  { id: 88, nameAr: "إذاعة موسى بلال", nameEn: "Mousa Bilal", url: "https://backup.qurango.net/radio/mousa_bilal", slug: "mousa_bilal", category: 'reciter', img: "/images/radio/reciters/88.webp" },
  { id: 89, nameAr: "إذاعة حاتم فريد الواعر", nameEn: "Hatem Fareed Alwaer", url: "https://backup.qurango.net/radio/hatem_fareed_alwaer", slug: "hatem_fareed_alwaer", category: 'reciter', img: "/images/radio/reciters/89.webp" },
  { id: 90, nameAr: "إذاعة محمود الرفاعي", nameEn: "Mahmood Al rifai", url: "https://backup.qurango.net/radio/mahmood_al_rifai", slug: "mahmood_al_rifai", category: 'reciter', img: "/images/radio/reciters/90.webp" },
  { id: 91, nameAr: "إذاعة ابراهيم الدوسري", nameEn: "Ibrahim Aldosari", url: "https://backup.qurango.net/radio/ibrahim_aldosari", slug: "ibrahim_aldosari", category: 'reciter', img: "/images/radio/reciters/91.webp" },
  { id: 93, nameAr: "إذاعة جمعان العصيمي", nameEn: "Jamaan Alosaimi", url: "https://backup.qurango.net/radio/jamaan_alosaimi", slug: "jamaan_alosaimi", category: 'reciter', img: "/images/radio/reciters/93.webp" },
  { id: 95, nameAr: "إذاعة يوسف بن نوح أحمد", nameEn: "Yousef Bin Noah Ahmad", url: "https://backup.qurango.net/radio/yousef_bin_noah_ahmad", slug: "yousef_bin_noah_ahmad", category: 'reciter', img: "/images/radio/reciters/95.webp" },
  { id: 97, nameAr: "إذاعة معيض الحارثي", nameEn: "Moeedh Alharthi", url: "https://backup.qurango.net/radio/moeedh_alharthi", slug: "moeedh_alharthi", category: 'reciter', img: "/images/radio/reciters/97.webp" },
  { id: 98, nameAr: "إذاعة محمد رشاد الشريف", nameEn: "Mohammad Rashad Alshareef", url: "https://backup.qurango.net/radio/mohammad_rashad_alshareef", slug: "mohammad_rashad_alshareef", category: 'reciter', img: "/images/radio/reciters/98.webp" },
  { id: 100, nameAr: "إذاعة أحمد الطرابلسي", nameEn: "Ahmed Al-trabulsi", url: "https://backup.qurango.net/radio/ahmed_altrabulsi", slug: "ahmed_altrabulsi", category: 'reciter', img: "" },
  { id: 101, nameAr: "إذاعة عبدالله الكندري", nameEn: "Abdullah Al-Kandari", url: "https://backup.qurango.net/radio/abdullah_alkandari", slug: "abdullah_alkandari", category: 'reciter', img: "/images/radio/reciters/101.webp" },
  { id: 102, nameAr: "إذاعة أحمد عامر", nameEn: "Ahmed Amer", url: "https://backup.qurango.net/radio/ahmed_amer", slug: "ahmed_amer", category: 'reciter', img: "/images/radio/reciters/102.webp" },
  { id: 103, nameAr: "إذاعة محمد عثمان خان", nameEn: "Mohammed Osman Khan", url: "https://backup.qurango.net/radio/mohammed_osman_khan", slug: "mohammed_osman_khan", category: 'reciter', img: "/images/radio/reciters/103.webp" },
  { id: 104, nameAr: "إذاعة الدوكالي محمد العالم", nameEn: "Addokali Mohammad Alalim", url: "https://backup.qurango.net/radio/addokali_mohammad_alalim", slug: "addokali_mohammad_alalim", category: 'reciter', img: "/images/radio/reciters/104.webp" },
  { id: 106, nameAr: "إذاعة الفاتح محمد الزبير", nameEn: "Alfateh Alzubair", url: "https://backup.qurango.net/radio/alfateh_alzubair", slug: "alfateh_alzubair", category: 'reciter', img: "/images/radio/reciters/106.webp" },
  { id: 108, nameAr: "الإذاعة العامة - تلاوات متنوعة متواصلة", nameEn: "Main Quran Radio Mix 24/7", url: "https://backup.qurango.net/radio/mix", slug: "mix", category: 'mosque', img: "" },
  { id: 111, nameAr: "إذاعة عبدالرحمن الماجد", nameEn: "Abdulrahman Al-Majed", url: "https://backup.qurango.net/radio/abdulrahman_almajed", slug: "abdulrahman_almajed", category: 'reciter', img: "" },
  { id: 113, nameAr: "إذاعة الفتاوى العامة وأحكام الشريعة", nameEn: "General Fatwa Radio", url: "https://backup.qurango.net/radio/fatwa", slug: "fatwa", category: 'fatwa', img: "" },
  { id: 115, nameAr: "سورة البقرة - تلاوة متواصلة مباركة", nameEn: "Surah Al-Baqarah 24/7", url: "https://backup.qurango.net/radio/albaqarah", slug: "albaqarah", category: 'surah', img: "" },
  { id: 116, nameAr: "تفسير القرآن الكريم - دروس شاملة", nameEn: "Quran Tafseer Radio", url: "https://backup.qurango.net/radio/tafseer", slug: "tafseer", category: 'tafsir', img: "" },
  { id: 118, nameAr: "إذاعة ناصر الماجد", nameEn: "Nasser Almajed", url: "https://backup.qurango.net/radio/nasser_almajed", slug: "nasser_almajed", category: 'reciter', img: "/images/radio/reciters/118.webp" },
  { id: 120, nameAr: "إذاعة أحمد خليل شاهين", nameEn: "Ahmad Shaheen", url: "https://backup.qurango.net/radio/ahmad_shaheen", slug: "ahmad_shaheen", category: 'reciter', img: "/images/radio/reciters/120.webp" },
  { id: 121, nameAr: "إذاعة عبدالله الموسى", nameEn: "Abdullah Al-Mousa", url: "https://backup.qurango.net/radio/abdullah_almousa", slug: "abdullah_almousa", category: 'reciter', img: "" },
  { id: 122, nameAr: "إذاعة عبدالله الخلف", nameEn: "Abdullah Al-Khalaf", url: "https://backup.qurango.net/radio/abdullah_alkhalaf", slug: "abdullah_alkhalaf", category: 'reciter', img: "/images/radio/reciters/122.webp" },
  { id: 123, nameAr: "تراتيل قصيرة خاشعة ومتميزة", nameEn: "Amazing Short Recitations", url: "https://backup.qurango.net/radio/tarateel", slug: "tarateel", category: 'mosque', img: "" },
  { id: 139, nameAr: "إذاعة ماجد الزامل", nameEn: "Majed Al-Zamil", url: "https://backup.qurango.net/radio/majed_alzamel", slug: "majed_alzamel", category: 'reciter', img: "/images/radio/reciters/139.webp" },
  { id: 217, nameAr: "إذاعة بندر بليلة", nameEn: "Bandar Balilah", url: "https://backup.qurango.net/radio/bandar_balilah", slug: "bandar_balilah", category: 'reciter', img: "/images/radio/reciters/217.webp" },
  { id: 248, nameAr: "إذاعة ناصر العصفور", nameEn: "Nasser Alosfor", url: "https://backup.qurango.net/radio/nasser_alosfor", slug: "nasser_alosfor", category: 'reciter', img: "" },
  { id: 265, nameAr: "إذاعة أحمد ديبان", nameEn: "Ahmad Deban", url: "https://backup.qurango.net/radio/ahmad_deban", slug: "ahmad_deban", category: 'reciter', img: "" },
  { id: 274, nameAr: "إذاعة محمد أبوسنينة", nameEn: "Muhammad Abu Sneina", url: "https://backup.qurango.net/radio/sneineh", slug: "sneineh", category: 'reciter', img: "/images/radio/reciters/274.webp" },
  { id: 275, nameAr: "إذاعة محمد الأمين قنيوة", nameEn: "Mohammed Al-Amin Qeniwa", url: "https://backup.qurango.net/radio/qeniwa", slug: "qeniwa", category: 'reciter', img: "" },
  { id: 287, nameAr: "إذاعة عبدالرحمن الشحات", nameEn: "Abdulrahman Alshahhat", url: "https://backup.qurango.net/radio/a_alshahhat", slug: "a_alshahhat", category: 'reciter', img: "" },
  { id: 10902, nameAr: "آيات السكينة والطمأنينة وتفريج الهموم", nameEn: "Ayat Al-Sakina — Verses of Serenity", url: "https://backup.qurango.net/radio/salma", slug: "salma", category: 'surah', img: "" },
  { id: 10903, nameAr: "صور من حياة الصحابة والتابعين رضوان الله عليهم", nameEn: "Lives of the Sahabah & Tabi'een", url: "https://backup.qurango.net/radio/sahabah", slug: "sahabah", category: 'stories', img: "" },
  { id: 10906, nameAr: "أذكار الصباح وتحصين المسلم اليومي", nameEn: "Morning Remembrance — Adhkar Al-Sabah", url: "https://backup.qurango.net/radio/athkar_sabah", slug: "athkar_sabah", category: 'adhkar', img: "" },
  { id: 10907, nameAr: "أذكار المساء وحفظ الليل المبارك", nameEn: "Evening Remembrance — Adhkar Al-Masa'", url: "https://backup.qurango.net/radio/athkar_masa", slug: "athkar_masa", category: 'adhkar', img: "" },
  { id: 21114, nameAr: "في ظلال السيرة النبوية الشريفة", nameEn: "In the Shadows of the Prophet's ﷺ Seerah", url: "https://backup.qurango.net/radio/fi_zilal_alsiyra", slug: "fi_zilal_alsiyra", category: 'stories', img: "" },
  { id: 21115, nameAr: "المختصر في السيرة النبوية العطرة", nameEn: "The Abridged Seerah Nabawiyyah", url: "https://backup.qurango.net/radio/almukhtasar_fi_alsiyra", slug: "almukhtasar_fi_alsiyra", category: 'stories', img: "" },
  { id: 21116, nameAr: "السنة النبوية والفقه الإسلامي اليومي", nameEn: "Sunnah & Daily Fiqh Radio", url: "https://backup.qurango.net/radio/alaikhtiarat_alfiqhayh_bin_baz", slug: "alaikhtiarat_alfiqhayh_bin_baz", category: 'hadith', img: "" },
  { id: 21117, nameAr: "تفسير القرآن الكريم - تفسير الطبري", nameEn: "Tafsir Al-Tabari Radio", url: "https://backup.qurango.net/radio/tabri", slug: "tabri", category: 'tafsir', img: "" },
  { id: 109038, nameAr: "إذاعة صالح الهبدان", nameEn: "Saleh Al-Habdan", url: "https://backup.qurango.net/radio/saleh_alhabdan", slug: "saleh_alhabdan", category: 'reciter', img: "" },
  { id: 109039, nameAr: "ترجمة معاني القرآن باللغة الأردية", nameEn: "Urdu Quran Translation Radio", url: "https://backup.qurango.net/radio/translation_quran_urdu_basit", slug: "translation_quran_urdu_basit", category: 'translation', img: "" },
  { id: 109040, nameAr: "ترجمة معاني القرآن باللغة الأسبانية", nameEn: "Quran translation into Spanish", url: "https://backup.qurango.net/radio/translation_quran_spanish_afs", slug: "translation_quran_spanish_afs", category: 'translation', img: "" },
  { id: 109041, nameAr: "ترجمة معاني القرآن باللغة الألبانية", nameEn: "Quran translation into Albanian", url: "https://backup.qurango.net/radio/translation_quran_albanian", slug: "translation_quran_albanian", category: 'translation', img: "" },
  { id: 109042, nameAr: "ترجمة معاني القرآن باللغة الألمانية", nameEn: "Quran translation into German", url: "https://backup.qurango.net/radio/translation_quran_german", slug: "translation_quran_german", category: 'translation', img: "" },
  { id: 109043, nameAr: "ترجمة معاني القرآن باللغة الأمازيغية", nameEn: "Quran translation into Amazigh", url: "https://backup.qurango.net/radio/translation_quran_tamazight", slug: "translation_quran_tamazight", category: 'translation', img: "" },
  { id: 109044, nameAr: "ترجمة القرآن باللغة الهندية والأردية", nameEn: "Hindi & South Asian Translation", url: "https://backup.qurango.net/radio/translation_quran_urdu_sds_shur", slug: "translation_quran_urdu_sds_shur", category: 'translation', img: "" },
  { id: 109045, nameAr: "ترجمة معاني القرآن باللغة الأردية - المنشاوي", nameEn: "Quran in Urdu - Qari Muhammad Manshawi", url: "https://backup.qurango.net/radio/translation_quran_urdu_minsh", slug: "translation_quran_urdu_minsh", category: 'translation', img: "" },
  { id: 109046, nameAr: "ترجمة معاني القرآن باللغة الإنجليزية", nameEn: "English Quran Translation Radio", url: "https://backup.qurango.net/radio/translation_quran_english_basit", slug: "translation_quran_english_basit", category: 'translation', img: "" },
  { id: 109047, nameAr: "ترجمة معاني القرآن باللغة الإنجليزية - بصفر", nameEn: "Quran translation into English - Abdullah Basfar", url: "https://backup.qurango.net/radio/translation_quran_english_bsfr", slug: "translation_quran_english_bsfr", category: 'translation', img: "" },
  { id: 109048, nameAr: "ترجمة معاني القرآن باللغة الإنجليزية - والك", nameEn: "Quran translation into English - translated by Walk", url: "https://backup.qurango.net/radio/translation_quran_english_walk_basit", slug: "translation_quran_english_walk_basit", category: 'translation', img: "" },
  { id: 109049, nameAr: "ترجمة معاني القرآن باللغة البرتغالية", nameEn: "Quran translation into Portuguese", url: "https://backup.qurango.net/radio/translation_quran_portuguese", slug: "translation_quran_portuguese", category: 'translation', img: "" },
  { id: 109050, nameAr: "ترجمة معاني القرآن باللغة البوسنية", nameEn: "Quran translation into Bosnian", url: "https://backup.qurango.net/radio/translation_quran_bosnia", slug: "translation_quran_bosnia", category: 'translation', img: "" },
  { id: 109051, nameAr: "ترجمة معاني القرآن باللغة التركية", nameEn: "Quran translation into Turkish", url: "https://backup.qurango.net/radio/translation_quran_turkish", slug: "translation_quran_turkish", category: 'translation', img: "" },
  { id: 109052, nameAr: "ترجمة معاني القرآن باللغة الروسية", nameEn: "Quran translation into Russian", url: "https://backup.qurango.net/radio/translation_quran_Russia", slug: "translation_quran_Russia", category: 'translation', img: "" },
  { id: 109053, nameAr: "ترجمة معاني القرآن باللغة الصينية", nameEn: "Quran translation into Chinese", url: "https://backup.qurango.net/radio/translation_quran_chinese", slug: "translation_quran_chinese", category: 'translation', img: "" },
  { id: 109054, nameAr: "ترجمة معاني القرآن باللغة الفارسية", nameEn: "Quran translation into Persian", url: "https://backup.qurango.net/radio/translation_quran_farsi", slug: "translation_quran_farsi", category: 'translation', img: "" },
  { id: 109055, nameAr: "ترجمة معاني القرآن باللغة الفرنسية", nameEn: "French & International Translation", url: "https://backup.qurango.net/radio/translation_quran_french", slug: "translation_quran_french", category: 'translation', img: "" },
  { id: 109056, nameAr: "ترجمة معاني القرآن باللغة الكردية", nameEn: "Quran translation into Kurdish", url: "https://backup.qurango.net/radio/translation_quran_kurdish", slug: "translation_quran_kurdish", category: 'translation', img: "" },
  { id: 109058, nameAr: "ترجمة معاني القرآن باللغة المجرية", nameEn: "Quran translation into Hungarian", url: "https://backup.qurango.net/radio/translation_quran_hungarian", slug: "translation_quran_hungarian", category: 'translation', img: "" },
  { id: 109059, nameAr: "ترجمة معاني القرآن باللغة اليونانية", nameEn: "Quran translation into Greek", url: "https://backup.qurango.net/radio/translation_quran_greek", slug: "translation_quran_greek", category: 'translation', img: "" },
  { id: 109060, nameAr: "سورة الملك - تلاوات ليلية مباركة", nameEn: "Surah Al-Mulk Night Recitations", url: "https://backup.qurango.net/radio/Surah_Al-Mulk", slug: "Surah_Al-Mulk", category: 'surah', img: "" },
  { id: 109061, nameAr: "فضائل وأحكام شهر رمضان المبارك", nameEn: "Virtues of Ramadan & Seasons of Worship", url: "https://backup.qurango.net/radio/ramadan", slug: "ramadan", category: 'fatwa', img: "" },
  { id: 109062, nameAr: "ترجمة معاني القرآن باللغة الهوسا", nameEn: "Translation of the meanings of the Quran in Hausa", url: "https://backup.qurango.net/radio/Translation_Quran_Hausa", slug: "Translation_Quran_Hausa", category: 'translation', img: "" },
  { id: 109066, nameAr: "صحيح الإمام مسلم رضي الله عنه", nameEn: "Sahih Muslim Radio", url: "https://backup.qurango.net/radio/saheh-muslim", slug: "saheh-muslim", category: 'hadith', img: "" },
  { id: 109067, nameAr: "صحيح الإمام البخاري رضي الله عنه", nameEn: "Sahih Al-Bukhari Radio", url: "https://backup.qurango.net/radio/saheh-bokharee", slug: "saheh-bokharee", category: 'hadith', img: "" },
  { id: 109069, nameAr: "قصص الأنبياء عليهم الصلاة والسلام", nameEn: "Stories of the Prophets — Qasas Al-Anbiya", url: "https://backup.qurango.net/radio/alanbiya", slug: "alanbiya", category: 'stories', img: "" },
  { id: 109074, nameAr: "عبدالله البعيجان", nameEn: "Abdullah Albuajan", url: "https://backup.qurango.net/radio/buajan", slug: "buajan", category: 'reciter', img: "/images/radio/reciters/109074.webp" },
  { id: 109075, nameAr: "أحمد طالب بن حميد", nameEn: "Ahmad Talib bin Humaid", url: "https://backup.qurango.net/radio/a_binhameed", slug: "a_binhameed", category: 'reciter', img: "" },
  { id: 109076, nameAr: "تفسير غريب القرآن الكريم", nameEn: "Tafsir Ghareeb Al-Quran", url: "https://backup.qurango.net/radio/gareeb-quran", slug: "gareeb-quran", category: 'tafsir', img: "" },
  { id: 109077, nameAr: "بدر التركي", nameEn: "Bader Alturki", url: "https://backup.qurango.net/radio/bader", slug: "bader", category: 'reciter', img: "/images/radio/reciters/109077.webp" },
  { id: 109078, nameAr: "هزاع البلوشي", nameEn: "Hazza Al-Balushi", url: "https://backup.qurango.net/radio/hazza", slug: "hazza", category: 'reciter', img: "/images/radio/reciters/109078.webp" },
  { id: 109082, nameAr: "إذاعة القرآن الكريم من المملكة العربية السعودية", nameEn: "Holy Quran Radio from Saudi Arabia", url: "https://backup.qurango.net/radio/mix", slug: "saudi_mix", category: 'mosque', img: "" },
  { id: 21118, nameAr: "تفسير القرآن الكريم - تفسير الطبري", nameEn: "Tafsir Al-Tabari", url: "https://backup.qurango.net/radio/tabri", slug: "tabri", category: 'tafsir', img: "" },
  { id: 21119, nameAr: "المختصر في تفسير القرآن الكريم", nameEn: "Al-Mukhtasar fi Tafsir", url: "https://backup.qurango.net/radio/mukhtasartafsir", slug: "mukhtasartafsir", category: 'tafsir', img: "" },
  { id: 21120, nameAr: "تفسير القرآن الكريم - دروس شاملة", nameEn: "Quran Tafseer Radio", url: "https://backup.qurango.net/radio/tafseer", slug: "tafseer", category: 'tafsir', img: "" },
  { id: 21121, nameAr: "رياض الصالحين من كلام سيد المرسلين", nameEn: "Riyad as-Salihin Hadith Radio", url: "https://backup.qurango.net/radio/riyad_alsaliheen", slug: "riyad_alsaliheen", category: 'hadith', img: "" },
  { id: 21122, nameAr: "سورة الملك - تلاوات ليلية مباركة", nameEn: "Surah Al-Mulk Night Recitations", url: "https://backup.qurango.net/radio/Surah_Al-Mulk", slug: "Surah_Al-Mulk", category: 'surah', img: "" },
  { id: 21123, nameAr: "آيات السكينة والطمأنينة وتفريج الهموم", nameEn: "Ayat Al-Sakina — Verses of Serenity", url: "https://backup.qurango.net/radio/salma", slug: "salma", category: 'surah', img: "" },
  { id: 21124, nameAr: "الرقية الشرعية الشاملة للشفاء والحفظ", nameEn: "Ruqyah Ash-Shar'iyyah 24/7", url: "https://backup.qurango.net/radio/roqiah", slug: "roqiah", category: 'adhkar', img: "" },
  { id: 21125, nameAr: "أذكار الصباح وتحصين المسلم اليومي", nameEn: "Morning Remembrance — Adhkar Al-Sabah", url: "https://backup.qurango.net/radio/athkar_sabah", slug: "athkar_sabah", category: 'adhkar', img: "" },
  { id: 21126, nameAr: "في ظلال السيرة النبوية الشريفة", nameEn: "In the Shadows of the Prophet's ﷺ Seerah", url: "https://backup.qurango.net/radio/fi_zilal_alsiyra", slug: "fi_zilal_alsiyra", category: 'stories', img: "" },
  { id: 21127, nameAr: "إذاعة الفتاوى العامة وأحكام الشريعة", nameEn: "General Fatwa Radio", url: "https://backup.qurango.net/radio/fatwa", slug: "fatwa", category: 'fatwa', img: "" },
  { id: 21128, nameAr: "فتاوى الشيخ عبدالعزيز بن باز - نور على الدرب", nameEn: "Fatawa Sheikh Ibn Baz — Noor Ala Al-Darb", url: "https://backup.qurango.net/radio/alaikhtiarat_alfiqhayh_bin_baz", slug: "alaikhtiarat_alfiqhayh_bin_baz", category: 'fatwa', img: "" },
  { id: 21129, nameAr: "إذاعة القرآن الكريم من القاهرة والحرمين", nameEn: "Cairo & Haramain Radio", url: "https://backup.qurango.net/radio/misr", slug: "misr", category: 'mosque', img: "" },
  { id: 21130, nameAr: "تراتيل قصيرة خاشعة ومتميزة", nameEn: "Amazing Short Recitations", url: "https://backup.qurango.net/radio/tarateel", slug: "tarateel", category: 'mosque', img: "" },
];

/** ── Station Localizations across 4 Languages ─────────────────── */
export interface LocalizedStationStrings {
  title: Record<string, string>;
  subtitle: Record<string, string>;
}

export const STATION_LOCALIZATIONS: Record<string, LocalizedStationStrings> = {
  // Translations
  translation_quran_urdu_basit: {
    title: {
      en: "Urdu Quran Translation Radio",
      ur: "ترجمہ قرآنِ مجید — اردو",
      gu: "કુર્આન શરીફ اردو/ગુજરાતી અનુવાદ",
      hi: "क़ुरआन पाक उर्दू/हिन्दी अनुवाद",
    },
    subtitle: {
      en: "Qari Abdul Basit • Urdu Translation",
      ur: "قاری عبد الباسط • اردو ترجمہ",
      gu: "કારી અબ્દુલ બાસિત • અનુવાદ",
      hi: "क़ारी अब्दुल बासित • अनुवाद",
    },
  },
  translation_quran_english_basit: {
    title: {
      en: "English Quran Translation Radio",
      ur: "انگریزی ترجمہ قرآنِ کریم",
      gu: "અંગ્રેજી કુર્આન અનુવાદ રેડિયો",
      hi: "अंग्रेज़ी क़ुरआन अनुवाद रेडियो",
    },
    subtitle: {
      en: "Clear Verses & Meanings in English",
      ur: "انگریزی مفہوم و تلاوت",
      gu: "અંગ્રેજી અર્થ સાથે પવિત્ર કુર્આન",
      hi: "अंग्रेज़ी अनुवाद सहित पवित्र क़ुरआन",
    },
  },
  translation_quran_urdu_sds_shur: {
    title: {
      en: "Hindi & South Asian Translation",
      ur: "ہندی و جنوبی ایشیائی ترجمہ قرآن",
      gu: "હિન્દી કુર્આન અનુવાદ",
      hi: "हिन्दी क़ुरआन अनुवाद",
    },
    subtitle: {
      en: "Sheikh Al-Shuraim & Al-Sudais",
      ur: "سعود الشریم و عبدالرحمن السدیس",
      gu: "પવિત્ર કુર્આન સરળ અર્થ સાથે",
      hi: "पवित्र क़ुरआन सरल अर्थ सहित",
    },
  },
  translation_quran_french: {
    title: {
      en: "French & International Translation",
      ur: "فرانسیسی و بین الاقوامی ترجمہ قرآن",
      gu: "ફ્રેન્ચ કુર્આન અનુવાદ",
      hi: "फ़्रेंच क़ुरआन अनुवाद",
    },
    subtitle: {
      en: "Le Saint Coran traduit en français",
      ur: "فرانسیسی زبان میں کلام الٰہی",
      gu: "આંતરરાષ્ટ્રીય ફ્રેન્ચ ભાષાંતર",
      hi: "अंतर्राष्ट्रीय फ़्रेंच अनुवाद",
    },
  },

  // Tafsir
  tabri: {
    title: {
      en: "Tafsir Al-Tabari Radio",
      ur: "تفسیر طبری — خلاصہ جامع البیان",
      gu: "તફસીર અલ-તબરી",
      hi: "तफ़सीर अल-तबरी",
    },
    subtitle: {
      en: "Essence of Jami' al-Bayan",
      ur: "امام ابن جریر طبری رحمہ اللہ",
      gu: "કુર્આન શરીફનો ઊંડો અભ્યાસ",
      hi: "क़ुरआन पाक की विस्तृत व्याख्या",
    },
  },
  mukhtasartafsir: {
    title: {
      en: "Al-Mukhtasar fi Tafsir",
      ur: "المختصر فی تفسیر القرآن الکریم",
      gu: "અલ-મુખ્તસર ફી તફસીર",
      hi: "अल-मुख़्तसर फ़ी तफ़सीर",
    },
    subtitle: {
      en: "Concise & Authentic Commentary",
      ur: "جامع اور مستند قرآنی تفاسیر",
      gu: "સરળ અને સચોટ ખુલાસો",
      hi: "संक्षिप्त और प्रामाणिक व्याख्या",
    },
  },
  tafseer: {
    title: {
      en: "Quran Tafseer Radio",
      ur: "درس و تفسیر قرآنِ مجید",
      gu: "કુર્આન તફસીર દરસ",
      hi: "क़ुरआन तफ़सीर दर्स",
    },
    subtitle: {
      en: "Comprehensive Lessons & Reflections",
      ur: "آیاتِ بینات کا فہم و تدبر",
      gu: "બોધપાઠ અને માર્ગદર્શન",
      hi: "क़ुरआन के गहरे संदेश और सीख",
    },
  },
  gareeb_quran: {
    title: {
      en: "Tafsir Ghareeb Al-Quran",
      ur: "تفسیر غریب القرآن الکریم",
      gu: "તફસીર ગરીબ અલ-કુર્આન",
      hi: "तफ़सीर ग़रीब अल-क़ुरआन",
    },
    subtitle: {
      en: "Meanings of Uncommon Vocabulary",
      ur: "قرآنی الفاظ و لغات کی تشریح",
      gu: "વિશિષ્ટ કુર્આની શબ્દોનો અર્થ",
      hi: "क़ुरआनी शब्दों का अर्थ व विवेचन",
    },
  },

  // Hadith
  riyad_alsaliheen: {
    title: {
      en: "Riyad as-Salihin Hadith Radio",
      ur: "احادیث ریاض الصالحین",
      gu: "હદીસ રિયાદુસ સાલિહીન",
      hi: "हदीस रियादुस सालिहीन",
    },
    subtitle: {
      en: "Gardens of the Righteous — Imam An-Nawawi",
      ur: "امام نووی رحمہ اللہ کے منتخب فرامین",
      gu: "ઇમામ નવવીનું ઉત્કૃષ્ટ સંકલન",
      hi: "इमाम नववी का प्रामाणिक संकलन",
    },
  },
  saheh_bokharee: {
    title: {
      en: "Sahih Al-Bukhari Radio",
      ur: "صحیح البخاری شریف",
      gu: "સહીહ અલ-બુખારી શરીફ",
      hi: "सहीह अल-बुख़ारी शरीफ़",
    },
    subtitle: {
      en: "Most Authentic Prophetic Traditions",
      ur: "اصح الکتب بعد کتاب اللہ",
      gu: "રસૂલુલ્લાહ ﷺ ના સૌથી પ્રમાણભૂત વચનો",
      hi: "रसूलुल्लाह ﷺ के सबसे प्रामाणिक कथन",
    },
  },
  saheh_muslim: {
    title: {
      en: "Sahih Muslim Radio",
      ur: "صحیح مسلم شریف",
      gu: "સહીહ મુસ્લિમ શરીફ",
      hi: "सहीह मुस्लिम शरीफ़",
    },
    subtitle: {
      en: "Authentic Prophetic Narrations",
      ur: "نبی کریم ﷺ کے مبارک فرامین",
      gu: "હઝરત મુહમ્મદ ﷺ ના મુબારક ફરમાનો",
      hi: "हज़रत मुहम्मद ﷺ के मुबारक फ़रमान",
    },
  },
  alaikhtiarat_alfiqhayh_bin_baz: {
    title: {
      en: "Sunnah & Daily Fiqh Radio",
      ur: "سنت نبوی ﷺ اور فقہی مسائل",
      gu: "સુન્નત અને રોજીંદા મસાઈલ",
      hi: "सुन्नत और दैनिक फ़िक़्ह",
    },
    subtitle: {
      en: "Matters of Worship and Transactions",
      ur: "عبادات اور معاملات کے احکام",
      gu: "ઇબાદત અને વ્યવહારના નિયમો",
      hi: "इबादत और मामलात के नियम",
    },
  },

  // Surahs
  albaqarah: {
    title: {
      en: "Surah Al-Baqarah 24/7",
      ur: "سورة البقرة — تلاوتِ متواصل",
      gu: "સૂરહ અલ-બકરહ ૨૪/૭",
      hi: "सूरा अल-बक़रह २४/७",
    },
    subtitle: {
      en: "Continuous Protection & Barakah",
      ur: "برکت و حفاظت • نامور قراء کی تلاوت",
      gu: "બરકત અને શૈતાની અસરોથી રક્ષણ",
      hi: "बरकत और सुरक्षा • प्रमुख क़ारियों की आवाज़",
    },
  },
  Surah_Al_Mulk: {
    title: {
      en: "Surah Al-Mulk Night Recitations",
      ur: "سورة الملك — نجات دہندہ",
      gu: "સૂરહ અલ-મુલ્ક રાત્રિ તિલાવત",
      hi: "सूरा अल-मुल्क रात्रि पाठ",
    },
    subtitle: {
      en: "Savior from the Punishment of the Grave",
      ur: "عذابِ قبر سے حفاظت کی نبوی سنت",
      gu: "કબરના અઝાબથી બચાવનાર સૂરત",
      hi: "क़ब्र के अज़ाब से सुरक्षा की सुन्नत",
    },
  },
  salma: {
    title: {
      en: "Ayat Al-Sakina — Verses of Serenity",
      ur: "آیاتِ سکینہ و اطمینانِ قلب",
      gu: "આયાતે સકીના — દિલની શાંતિ",
      hi: "आयते सकीना — दिल का सुकून",
    },
    subtitle: {
      en: "Deep Tranquility & Calming Verses",
      ur: "تلاوتِ خاشعہ • دلوں کا سکون اور راحت",
      gu: "હૃદયને શાંતિ આપતી પવિત્ર આયતો",
      hi: "दिलों को शांति देने वाली आयतें",
    },
  },

  // Adhkar
  athkar_sabah: {
    title: {
      en: "Morning Remembrance — Adhkar Al-Sabah",
      ur: "مسنون اذکارِ صبح",
      gu: "સવારના મસ્નૂન અઝકાર",
      hi: "सुबह के मसनून अज़कार",
    },
    subtitle: {
      en: "Prophetic Fortification for Daybreak",
      ur: "صبح کی برکت اور دن بھر کی حفاظت",
      gu: "આખા દિવસની બરકત અને સુરક્ષા",
      hi: "दिन की बरकत और सुरक्षा",
    },
  },
  athkar_masa: {
    title: {
      en: "Evening Remembrance — Adhkar Al-Masa'",
      ur: "مسنون اذکارِ شام",
      gu: "સાંજના મસ્નૂન અઝકાર",
      hi: "शाम के मसनून अज़कार",
    },
    subtitle: {
      en: "Evening Shield & Peaceful Night Duas",
      ur: "شام کی پناہ اور رات کا تحفظ",
      gu: "રાત્રિની સુરક્ષા અને શાંતિ",
      hi: "रात की सुरक्षा और सुकून",
    },
  },
  roqiah: {
    title: {
      en: "Ruqyah Ash-Shar'iyyah 24/7",
      ur: "الرقیۃ الشرعیۃ — شفائے کامل",
      gu: "રૂક્યા શરીફ — રોગનિવારણ",
      hi: "रुक़्या शरीफ़ — शिफ़ा व सुरक्षा",
    },
    subtitle: {
      en: "Divine Healing & Spiritual Shield",
      ur: "نظرِ بد اور ہر شر سے قرآنی دم",
      gu: "બુરી નજર અને તકલીફોથી સુરક્ષા",
      hi: "बुरी नज़र और हर बुराई से बचाव",
    },
  },
  eid: {
    title: {
      en: "Eid & Hajj Takbeerat",
      ur: "تکبیراتِ عید و حج مبارک",
      gu: "ઈદ અને હજની તકબીરાત",
      hi: "ईद और हज की तकबीरात",
    },
    subtitle: {
      en: "Allahu Akbar — Sacred Chants",
      ur: "اللہ اکبر وللہ الحمد کے نغمات",
      gu: "અલ્લાહુ અકબરના મુબારક તરાના",
      hi: "अल्लाहु अकबर के पावन स्वर",
    },
  },

  // Stories
  fi_zilal_alsiyra: {
    title: {
      en: "In the Shadows of the Prophet's ﷺ Seerah",
      ur: "فی ظلال السیرۃ النبویۃ ﷺ",
      gu: "પયગંબર ﷺ ની પવિત્ર સીરત",
      hi: "रसूलुल्लाह ﷺ की पावन सीरत",
    },
    subtitle: {
      en: "400 Episodes of the Blessed Life",
      ur: "۴۰۰ اقساط پر محیط حیاتِ طیبہ",
      gu: "૪૦૦ એપિસોડમાં મુબારક જીવનચરિત્ર",
      hi: "४०० कड़ियों में मुबारक जीवन चरित्र",
    },
  },
  alanbiya: {
    title: {
      en: "Stories of the Prophets — Qasas Al-Anbiya",
      ur: "قصص الانبیاء علیہم السلام",
      gu: "અંબિયા અ.સ. ના પ્રેરણાદાયી કિસ્સા",
      hi: "अंबिया अ.स. के प्रेरक क़िस्से",
    },
    subtitle: {
      en: "Lessons from Adam to Muhammad ﷺ",
      ur: "آدم علیہ السلام سے خاتم النبیین ﷺ تک",
      gu: "આદમ અ.સ. થી હઝરત મુહમ્મદ ﷺ સુધી",
      hi: "आदम अ.स. से हज़रत मुहम्मद ﷺ तक",
    },
  },
  sahabah: {
    title: {
      en: "Lives of the Sahabah & Tabi'een",
      ur: "حیاتِ صحابہ و تابعین کرام",
      gu: "સહાબા અને તાબિઈન (રદિ.) નું જીવન",
      hi: "सहाबा और ताबिईन (रज़ि.) का जीवन",
    },
    subtitle: {
      en: "The Radiant Generation of Faith",
      ur: "ایمان اور استقامت کے درخشاں مینار",
      gu: "ઈમાન અને બલિદાનની અનોખી મિસાલ",
      hi: "ईमान और त्याग के आदर्श",
    },
  },
  almukhtasar_fi_alsiyra: {
    title: {
      en: "The Abridged Seerah Nabawiyyah",
      ur: "المختصر فی السیرۃ النبویۃ",
      gu: "સંક્ષિપ્ત પયગંબર સીરત",
      hi: "संक्षिप्त पैग़म्बर सीरत",
    },
    subtitle: {
      en: "Milestones of the Messenger of Allah ﷺ",
      ur: "رسول اللہ ﷺ کی سیرت کے روشن سنگِ میل",
      gu: "અલ્લાહના રસૂલ ﷺ ના મુખ્ય સંસ્મરણો",
      hi: "अल्लाह के रसूल ﷺ के प्रमुख पड़ाव",
    },
  },

  // Main / Mix
  mix: {
    title: {
      en: "Main Quran Radio Mix 24/7",
      ur: "الإذاعۃ العامۃ — مرکزی ریڈیو مکس",
      gu: "મુખ્ય કુર્આન રેડિયો મિક્સ",
      hi: "मुख्य क़ुरआन रेडियो मिक्स",
    },
    subtitle: {
      en: "Continuous Diverse Recitations",
      ur: "عالمِ اسلام کے نامور قراء کی تلاوت",
      gu: "વિવિધ જાણીતા કારીઓની સતત તિલાવત",
      hi: "विश्व प्रसिद्ध क़ारियों की सतत तिलावत",
    },
  },
  tarateel: {
    title: {
      en: "Amazing Short Recitations",
      ur: "تراتیل قصیرۃ خاشعۃ",
      gu: "શ્રેષ્ઠ ટૂંકી તિલાવત",
      hi: "सर्वश्रेष्ठ संक्षिप्त तिलावत",
    },
    subtitle: {
      en: "Soul-Stirring Verses and Melodies",
      ur: "دل نشین اور منتخب قرآنی تلاوتیں",
      gu: "દિલને સ્પર્શતી મધુર આયતો",
      hi: "मन को छूने वाली मधुर आयतें",
    },
  },
  misr: {
    title: {
      en: "Cairo & Haramain Holy Quran Radio",
      ur: "إذاعۃ القرآن الکریم — قاہرہ و حرمین",
      gu: "કાહિરા અને હરમૈન રેડિયો",
      hi: "क़ाहिरा व हरमैन रेडियो",
    },
    subtitle: {
      en: "Timeless Golden Era Broadcasts",
      ur: "سنہری دور کی لازوال اور خاشع تلاوتیں",
      gu: "ઐતિહાસિક અને પ્રખ્યાત અવાજો",
      hi: "ऐतिहासिक व विख्यात स्वर",
    },
  },

  // Fatwa
  fatwa: {
    title: {
      en: "General Fatwa Radio (Dar Al-Ifta)",
      ur: "إذاعۃ الفتاویٰ العامۃ",
      gu: "જનરલ ફતવા રેડિયો",
      hi: "जनरल फ़तवा रेडियो",
    },
    subtitle: {
      en: "Authoritative Answers to Islamic Questions",
      ur: "دار الافتاء • شرعی مسائل کے مدلل جوابات",
      gu: "શરઈ પ્રશ્નોના આધારભૂત જવાબો",
      hi: "दीनी सवालों के प्रामाणिक उत्तर",
    },
  },
  ramadan: {
    title: {
      en: "Virtues & Fiqh of Ramadan",
      ur: "احکام و فضائلِ رمضان و طاعات",
      gu: "રમઝાન અને ઇબાદતના મસાઈલ",
      hi: "रमज़ान और इबादत के फ़ज़ाइल",
    },
    subtitle: {
      en: "Rulings on Fasting, Charity & Prayers",
      ur: "روزہ، تراویح، زکوٰۃ اور اعتکاف کے مسائل",
      gu: "રોઝા, ઝકાત અને તરાવીહના અહકામ",
      hi: "रोज़ा, ज़कात और नमाज़ के नियम",
    },
  },
};

/** Get localized title and subtitle for any radio station in 4 languages */
export function getLocalizedStation(
  station: { id: number; name: string; nameEn?: string; url?: string; slug?: string; category?: RadioCategory },
  lang: string
): { title: string; subtitle: string } {
  const effectiveLang = (['en', 'ur', 'gu', 'hi'].includes(lang) ? lang : 'en');

  // Match by slug or URL segment
  const urlSlug = (station.url || '').split('/').filter(Boolean).pop()?.replace(/[-]/g, '_') || '';
  const directSlug = (station.slug || '').replace(/[-]/g, '_');

  const loc = STATION_LOCALIZATIONS[directSlug] ||
              STATION_LOCALIZATIONS[urlSlug] ||
              STATION_LOCALIZATIONS[String(station.id)];

  if (loc) {
    return {
      title: loc.title[effectiveLang] || loc.title.en,
      subtitle: loc.subtitle[effectiveLang] || loc.subtitle.en,
    };
  }

  // Clean raw names removing ugly dashes
  const cleanAr = station.name
    .replace(/-{2,}/g, ' — ')
    .replace(/^[-—\s]+|[-—\s]+$/g, '')
    .trim();
  const cleanEn = (station.nameEn || '')
    .replace(/-{2,}/g, ' — ')
    .replace(/^[-—\s]+|[-—\s]+$/g, '')
    .trim();

  // For reciters:
  if (station.category === 'reciter' || !station.category) {
    if (effectiveLang === 'ur') {
      return {
        title: cleanAr,
        subtitle: 'اسلامی ریڈیو • تلاوتِ کلامِ پاک',
      };
    }
    if (effectiveLang === 'gu') {
      return {
        title: cleanEn || cleanAr,
        subtitle: 'ઇસ્લામિક રેડિયો • પવિત્ર તિલાવત',
      };
    }
    if (effectiveLang === 'hi') {
      return {
        title: cleanEn || cleanAr,
        subtitle: 'इस्लामिक रेडियो • पवित्र क़ुरआन पाठ',
      };
    }
    return {
      title: cleanEn || cleanAr,
      subtitle: 'Islamic Radio • 24/7 Recitation',
    };
  }

  return {
    title: effectiveLang === 'ur' ? cleanAr : (cleanEn || cleanAr),
    subtitle: cleanEn || 'Islamic Radio',
  };
}

/** Union of base + extra stations for artwork/lookup purposes. */
export type AnyRadioStation = RadioStation | ExtraRadioStation;

/** Find the display image for any station (by url first, then id). */
export const getStationImage = (url: string, id?: number): string => {
  const match = [...radioStations, ...extraRadioStations].find(
    (s) => s.url === url || (id != null && s.id === id)
  );
  return match?.img || "/icon-192x192.png";
};
