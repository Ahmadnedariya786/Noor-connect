export interface Dua {
  id: string;
  category: string;
  arabic: string;
  transliteration: string;
  translation: string;
  reference?: string;
  repeatCount?: number;
  tags?: string[];
}

export const duasData: Dua[] = [
  // Morning Duas
  {
    id: "morning_1",
    category: "Morning",
    arabic: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ",
    transliteration: "Asbahna wa asbahal-mulku lillah walhamdulillah",
    translation: "We have entered a new day and with it all dominion is Allah's, and praise is to Allah",
    reference: "Muslim"
  },
  {
    id: "morning_2",
    category: "Morning",
    arabic: "اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ",
    transliteration: "Allahumma bika asbahna wa bika amsayna wa bika nahya wa bika namutu wa ilaykan-nushur",
    translation: "O Allah, by You we enter the morning and by You we enter the evening, by You we live and by You we die, and to You is the resurrection",
    reference: "Abu Dawud, Tirmidhi"
  },
  {
    id: "morning_3",
    category: "Morning",
    arabic: "أَصْبَحْنَا عَلَى فِطْرَةِ الْإِسْلَامِ وَعَلَى كَلِمَةِ الْإِخْلَاصِ",
    transliteration: "Asbahna 'ala fitratil-Islam wa 'ala kalimatil-ikhlas",
    translation: "We rise upon the fitrah of Islam, and upon the word of sincerity",
    reference: "Ahmad"
  },

  // Evening Duas
  {
    id: "evening_1",
    category: "Evening",
    arabic: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ",
    transliteration: "Amsayna wa amsal-mulku lillah",
    translation: "We have entered the evening and with it all dominion is Allah's",
    reference: "Muslim"
  },
  {
    id: "evening_2",
    category: "Evening",
    arabic: "اللَّهُمَّ إِنِّي أَمْسَيْتُ أُشْهِدُكَ وَأُشْهِدُ حَمَلَةَ عَرْشِكَ",
    transliteration: "Allahumma inni amsaytu ushhiduka wa ushhidu hamalata 'arshik",
    translation: "O Allah, I have entered the evening and call You to witness and call the bearers of Your Throne to witness",
    reference: "Abu Dawud"
  },
  {
    id: "evening_3",
    category: "Evening",
    arabic: "اللَّهُمَّ مَا أَمْسَى بِي مِنْ نِعْمَةٍ فَمِنْكَ وَحْدَكَ",
    transliteration: "Allahumma ma amsa bi min ni'matin fa-minka wahdak",
    translation: "O Allah, whatever blessing has come to me this evening is from You alone",
    reference: "Abu Dawud"
  },

  // Travel Duas
  {
    id: "travel_1",
    category: "Travel",
    arabic: "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ",
    transliteration: "Subhanal-ladhi sakhkhara lana hadha wa ma kunna lahu muqrinin",
    translation: "Glory be to Him Who has brought this under our control, and we could never have done it by ourselves",
    reference: "Tirmidhi"
  },
  {
    id: "travel_2",
    category: "Travel",
    arabic: "اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى",
    transliteration: "Allahumma inna nas'aluka fi safarina hadhal-birra wat-taqwa",
    translation: "O Allah, we ask You for righteousness and piety on this journey of ours",
    reference: "Tirmidhi"
  },
  {
    id: "travel_3",
    category: "Travel",
    arabic: "اللَّهُمَّ أَنْتَ الصَّاحِبُ فِي السَّفَرِ وَالْخَلِيفَةُ فِي الْأَهْلِ",
    transliteration: "Allahumma antas-sahibu fis-safari wal-khalifatu fil-ahli",
    translation: "O Allah, You are the Companion on the journey and the Guardian of the family",
    reference: "Muslim"
  },

  // Eating & Drinking
  {
    id: "eating_1",
    category: "Eating",
    arabic: "بِسْمِ اللَّهِ",
    transliteration: "Bismillah",
    translation: "In the name of Allah",
    reference: "Bukhari, Muslim"
  },
  {
    id: "eating_2",
    category: "Eating",
    arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ",
    transliteration: "Alhamdulillahil-ladhi at'amana wa saqana wa ja'alana muslimin",
    translation: "Praise be to Allah Who has given us food and drink and made us Muslims",
    reference: "Abu Dawud, Tirmidhi"
  },

  // Sleeping
  {
    id: "sleeping_1",
    category: "Sleeping",
    arabic: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا",
    transliteration: "Bismika Allahumma amutu wa ahya",
    translation: "In Your name O Allah, I die and I live",
    reference: "Bukhari"
  },
  {
    id: "sleeping_2",
    category: "Sleeping",
    arabic: "اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ",
    transliteration: "Allahumma qini 'adhabaka yawma tab'athu 'ibadak",
    translation: "O Allah, protect me from Your punishment on the Day You resurrect Your servants",
    reference: "Abu Dawud"
  },

  // Illness & Healing
  {
    id: "illness_1",
    category: "Illness",
    arabic: "أَذْهِبِ الْبَاسَ رَبَّ النَّاسِ وَاشْفِ أَنْتَ الشَّافِي",
    transliteration: "Adh-hibil-ba'sa rabban-nas washfi antash-shafi",
    translation: "Remove the hardship, O Lord of mankind, and heal, You are the Healer",
    reference: "Bukhari, Muslim"
  },
  {
    id: "illness_2",
    category: "Illness",
    arabic: "اللَّهُمَّ رَبَّ النَّاسِ أَذْهِبِ الْبَأْسَ",
    transliteration: "Allahumma rabban-nasi adhhibil-ba's",
    translation: "O Allah, Lord of mankind, remove the suffering",
    reference: "Bukhari"
  },

  // Anxiety & Distress
  {
    id: "distress_1",
    category: "Distress",
    arabic: "لَا إِلَهَ إِلَّا اللَّهُ الْعَظِيمُ الْحَلِيمُ",
    transliteration: "La ilaha illallahul-'Adhimul-Halim",
    translation: "There is no god but Allah, the Magnificent, the Forbearing",
    reference: "Bukhari, Muslim"
  },
  {
    id: "distress_2",
    category: "Distress",
    arabic: "اللَّهُمَّ رَحْمَتَكَ أَرْجُو فَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ",
    transliteration: "Allahumma rahmataka arju fala takilni ila nafsi tarfata 'ayn",
    translation: "O Allah, I hope for Your mercy, so do not leave me to myself even for the blink of an eye",
    reference: "Abu Dawud"
  },

  // Gratitude
  {
    id: "gratitude_1",
    category: "Gratitude",
    arabic: "الْحَمْدُ لِلَّهِ حَمْدًا كَثِيرًا طَيِّبًا مُبَارَكًا فِيهِ",
    transliteration: "Alhamdulillahi hamdan kathiran tayyiban mubarakan fih",
    translation: "All praise is due to Allah, abundant good and blessed praise",
    reference: "Bukhari"
  },
  {
    id: "gratitude_2",
    category: "Gratitude",
    arabic: "اللَّهُمَّ لَكَ الْحَمْدُ كُلُّهُ",
    transliteration: "Allahumma lakal-hamdu kulluh",
    translation: "O Allah, all praise is due to You",
    reference: "Muslim"
  },

  // Forgiveness
  {
    id: "forgiveness_1",
    category: "Forgiveness",
    arabic: "رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ",
    transliteration: "Rabbighfir li wa tub 'alayya innaka antat-tawwabur-rahim",
    translation: "My Lord, forgive me and accept my repentance, for You are the Oft-Returning, the Most Merciful",
    reference: "Abu Dawud, Tirmidhi"
  },
  {
    id: "forgiveness_2",
    category: "Forgiveness",
    arabic: "أَسْتَغْفِرُ اللَّهَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ",
    transliteration: "Astaghfirullahallathi la ilaha illa huwal-Hayyul-Qayyumu wa atubu ilayh",
    translation: "I seek forgiveness from Allah, besides Whom there is no god, the Ever-Living, the Sustainer, and I repent to Him",
    reference: "Abu Dawud, Tirmidhi"
  },

  // Protection
  {
    id: "protection_1",
    category: "Protection",
    arabic: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",
    transliteration: "A'udhu bikalimatillahit-tammati min sharri ma khalaq",
    translation: "I seek refuge in the perfect words of Allah from the evil of what He has created",
    reference: "Muslim"
  },
  {
    id: "protection_2",
    category: "Protection",
    arabic: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ",
    transliteration: "Bismillahil-ladhi la yadurru ma'asmihi shay'un fil-ardi wa la fis-sama'",
    translation: "In the name of Allah, with Whose name nothing can harm on earth or in heaven",
    reference: "Abu Dawud, Tirmidhi"
  },

  // Rain
  {
    id: "rain_1",
    category: "Weather",
    arabic: "اللَّهُمَّ صَيِّبًا نَافِعًا",
    transliteration: "Allahumma sayyiban nafi'a",
    translation: "O Allah, (bring) beneficial rain",
    reference: "Bukhari"
  },

  // After Prayer
  {
    id: "after_prayer_1",
    category: "After Prayer",
    arabic: "أَسْتَغْفِرُ اللَّهَ، أَسْتَغْفِرُ اللَّهَ، أَسْتَغْفِرُ اللَّهَ",
    transliteration: "Astaghfirullah, Astaghfirullah, Astaghfirullah",
    translation: "I seek Allah's forgiveness (said three times)",
    reference: "Muslim"
  },
  {
    id: "after_prayer_2",
    category: "After Prayer",
    arabic: "اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ",
    transliteration: "Allahumma antas-salamu wa minkas-salamu tabarakta ya dhal-jalali wal-ikram",
    translation: "O Allah, You are Peace and from You comes peace. Blessed are You, O Owner of Majesty and Honor",
    reference: "Muslim"
  },

  // Before Entering Home
  {
    id: "home_1",
    category: "Home",
    arabic: "بِسْمِ اللَّهِ وَلَجْنَا وَبِسْمِ اللَّهِ خَرَجْنَا وَعَلَى اللَّهِ رَبِّنَا تَوَكَّلْنَا",
    transliteration: "Bismillahi walajna wa bismillahi kharajna wa 'alallahi rabbina tawakkalna",
    translation: "In the name of Allah we enter, in the name of Allah we leave, and upon Allah our Lord we rely",
    reference: "Abu Dawud"
  },

  // Leaving Home
  {
    id: "leaving_home_1",
    category: "Home",
    arabic: "بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ",
    transliteration: "Bismillah, tawakkaltu 'alallah, la hawla wa la quwwata illa billah",
    translation: "In the name of Allah, I place my trust in Allah, there is no might nor power except with Allah",
    reference: "Abu Dawud, Tirmidhi"
  },

  // Entering Mosque
  {
    id: "mosque_1",
    category: "Mosque",
    arabic: "اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ",
    transliteration: "Allahummaftah li abwaba rahmatik",
    translation: "O Allah, open for me the doors of Your mercy",
    reference: "Muslim"
  },

  // Leaving Mosque
  {
    id: "mosque_2",
    category: "Mosque",
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ",
    transliteration: "Allahumma inni as'aluka min fadlik",
    translation: "O Allah, I ask You from Your bounty",
    reference: "Muslim"
  },

  // Entering Bathroom
  {
    id: "bathroom_1",
    category: "Daily",
    arabic: "بِسْمِ اللَّهِ، اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ",
    transliteration: "Bismillah, Allahumma inni a'udhu bika minal-khubthi wal-khaba'ith",
    translation: "In the name of Allah. O Allah, I seek refuge in You from male and female evil spirits",
    reference: "Bukhari, Muslim"
  },

  // Waking Up
  {
    id: "waking_1",
    category: "Daily",
    arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ",
    transliteration: "Alhamdulillahil-ladhi ahyana ba'da ma amatana wa ilayhin-nushur",
    translation: "Praise is to Allah Who gave us life after having taken it from us, and unto Him is the resurrection",
    reference: "Bukhari"
  },

  // Wearing Clothes
  {
    id: "clothes_1",
    category: "Daily",
    arabic: "الْحَمْدُ لِلَّهِ الَّذِي كَسَانِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ",
    transliteration: "Alhamdulillahil-ladhi kasani hadha wa razaqanihi min ghayri hawlin minni wa la quwwah",
    translation: "Praise is to Allah Who has clothed me with this and provided it for me without any might or power from myself",
    reference: "Abu Dawud, Tirmidhi"
  },

  // Looking in Mirror
  {
    id: "mirror_1",
    category: "Daily",
    arabic: "اللَّهُمَّ كَمَا حَسَّنْتَ خَلْقِي فَحَسِّنْ خُلُقِي",
    transliteration: "Allahumma kama hassanta khalqi fa-hassin khuluqi",
    translation: "O Allah, as You have made my external features beautiful, make my character beautiful as well",
    reference: "Ahmad"
  },

  // Friday
  {
    id: "friday_1",
    category: "Special Days",
    arabic: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ",
    transliteration: "Allahumma salli 'ala Muhammadin wa 'ala ali Muhammad",
    translation: "O Allah, send prayers upon Muhammad and the family of Muhammad",
    reference: "Bukhari, Muslim"
  },

  // Knowledge
  {
    id: "knowledge_1",
    category: "Knowledge",
    arabic: "رَبِّ زِدْنِي عِلْمًا",
    transliteration: "Rabbi zidni 'ilma",
    translation: "My Lord, increase me in knowledge",
    reference: "Quran 20:114"
  },
  {
    id: "knowledge_2",
    category: "Knowledge",
    arabic: "اللَّهُمَّ انْفَعْنِي بِمَا عَلَّمْتَنِي وَعَلِّمْنِي مَا يَنْفَعُنِي",
    transliteration: "Allahumma infa'ni bima 'allamtani wa 'allimni ma yanfa'uni",
    translation: "O Allah, benefit me with what You have taught me, and teach me what will benefit me",
    reference: "Ibn Majah"
  },

  // Patience
  {
    id: "patience_1",
    category: "Character",
    arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْعَجْزِ وَالْكَسَلِ",
    transliteration: "Allahumma inni a'udhu bika minal-'ajzi wal-kasal",
    translation: "O Allah, I seek refuge in You from incapacity and laziness",
    reference: "Bukhari, Muslim"
  },

  // Marriage
  {
    id: "marriage_1",
    category: "Marriage",
    arabic: "بَارَكَ اللَّهُ لَكَ وَبَارَكَ عَلَيْكَ وَجَمَعَ بَيْنَكُمَا فِي خَيْرٍ",
    translation: "May Allah bless you, and shower His blessings upon you, and join you together in goodness",
    transliteration: "Barakallahu laka wa baraka 'alayka wa jama'a baynakuma fi khayr",
    reference: "Abu Dawud, Tirmidhi"
  },

  // Children
  {
    id: "children_1",
    category: "Family",
    arabic: "رَبِّ هَبْ لِي مِنْ لَدُنْكَ ذُرِّيَّةً طَيِّبَةً",
    transliteration: "Rabbi hab li min ladunka dhurriyyatan tayyibah",
    translation: "My Lord, grant me from Yourself a good offspring",
    reference: "Quran 3:38"
  },

  // Debt
  {
    id: "debt_1",
    category: "Financial",
    arabic: "اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ",
    transliteration: "Allahummakfini bihalalika 'an haramika wa aghnini bifadlika 'amman siwak",
    translation: "O Allah, make what is lawful enough for me, as opposed to what is unlawful, and spare me by Your grace, of need of others",
    reference: "Tirmidhi"
  },

  // Anger
  {
    id: "anger_1",
    category: "Character",
    arabic: "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ",
    transliteration: "A'udhu billahi minash-shaytanir-rajim",
    translation: "I seek refuge with Allah from Satan, the accursed",
    reference: "Bukhari, Muslim"
  },

  // Paradise
  {
    id: "paradise_1",
    category: "Afterlife",
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْجَنَّةَ وَأَعُوذُ بِكَ مِنَ النَّارِ",
    transliteration: "Allahumma inni as'alukal-jannata wa a'udhu bika minan-nar",
    translation: "O Allah, I ask You for Paradise and seek refuge in You from the Fire",
    reference: "Abu Dawud"
  },
  
  // ===== Additional Morning Duas =====
  {
    id: "morning_4",
    category: "Morning",
    arabic: "اللَّهُمَّ إِنِّي أَصْبَحْتُ أُشْهِدُكَ وَأُشْهِدُ حَمَلَةَ عَرْشِكَ وَمَلَائِكَتَكَ وَجَمِيعَ خَلْقِكَ أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ وَأَنَّ مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ",
    transliteration: "Allahumma inni asbahtu ushhiduka wa ushhidu hamalata 'arshika wa mala'ikataka wa jami'a khalqika annaka antallahu la ilaha illa anta wa anna Muhammadan 'abduka wa rasuluk",
    translation: "O Allah, I have entered the morning calling You to witness, and the bearers of Your Throne, Your angels, and all of Your creation that You are Allah, there is no god but You, and Muhammad is Your servant and Messenger",
    reference: "Abu Dawud"
  },
  {
    id: "morning_5",
    category: "Morning",
    arabic: "اللَّهُمَّ مَا أَصْبَحَ بِي مِنْ نِعْمَةٍ فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ",
    transliteration: "Allahumma ma asbaha bi min ni'matin fa-minka wahdaka la sharika laka falakal-hamdu wa lakash-shukr",
    translation: "O Allah, whatever blessing has come to me this morning is from You alone, no partner has You, so to You is all praise and to You is all thanks",
    reference: "Abu Dawud, Nasa'i"
  },
  {
    id: "morning_6",
    category: "Morning",
    arabic: "رَضِيتُ بِاللَّهِ رَبًّا وَبِالْإِسْلَامِ دِينًا وَبِمُحَمَّدٍ نَبِيًّا",
    transliteration: "Raditu billahi rabban wa bil-islami dinan wa bi Muhammadin nabiyya",
    translation: "I am pleased with Allah as my Lord, with Islam as my religion, and with Muhammad as my Prophet",
    reference: "Abu Dawud, Tirmidhi",
    repeatCount: 3
  },

  // ===== Additional Evening Duas =====
  {
    id: "evening_4",
    category: "Evening",
    arabic: "اللَّهُمَّ بِكَ أَمْسَيْنَا وَبِكَ أَصْبَحْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ الْمَصِيرُ",
    transliteration: "Allahumma bika amsayna wa bika asbahna wa bika nahya wa bika namutu wa ilaykal-masir",
    translation: "O Allah, by You we enter the evening and by You we enter the morning, by You we live and by You we die, and to You is the final return",
    reference: "Abu Dawud, Tirmidhi"
  },
  {
    id: "evening_5",
    category: "Evening",
    arabic: "اللَّهُمَّ إِنِّي أَمْسَيْتُ أَشْهَدُكَ وَأَشْهَدُ حَمَلَةَ عَرْشِكَ وَمَلَائِكَتَكَ وَجَمِيعَ خَلْقِكَ أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ وَأَنَّ مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ",
    transliteration: "Allahumma inni amsaytu ash-haduka wa ash-hadu hamalata 'arshika wa mala'ikataka wa jami'a khalqika annaka antallahu la ilaha illa anta wa anna Muhammadan 'abduka wa rasuluk",
    translation: "O Allah, I enter the evening bearing witness that You are Allah and Muhammad is Your Messenger",
    reference: "Abu Dawud"
  },
  {
    id: "evening_6",
    category: "Evening",
    arabic: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",
    transliteration: "A'udhu bikalimatillahit-tammati min sharri ma khalaq",
    translation: "I seek refuge in the perfect words of Allah from the evil of what He has created",
    reference: "Muslim",
    repeatCount: 3
  },

  // ===== Additional Sleeping Duas =====
  {
    id: "sleeping_3",
    category: "Sleeping",
    arabic: "بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي وَبِكَ أَرْفَعُهُ فَإِنْ أَمْسَكْتَ نَفْسِي فَارْحَمْهَا وَإِنْ أَرْسَلْتَهَا فَاحْفَظْهَا بِمَا تَحْفَظُ بِهِ عِبَادَكَ الصَّالِحِينَ",
    transliteration: "Bismika Rabbi wada'tu jambi wa bika arfa'uhu fa-in amsakta nafsi farhamha wa in arsaltaha fahfazha bima tahfazu bihi 'ibadakas-salihin",
    translation: "In Your name my Lord, I lay my side down and by You I raise it. If You take my soul, have mercy on it. If You send it back, protect it as You protect Your righteous servants",
    reference: "Bukhari, Muslim"
  },
  {
    id: "sleeping_4",
    category: "Sleeping",
    arabic: "اللَّهُمَّ إِنَّكَ خَلَقْتَ نَفْسِي وَأَنْتَ تَوَفَّاهَا لَكَ مَمَاتُهَا وَمَحْيَاهَا إِنْ أَحْيَيْتَهَا فَاحْفَظْهَا وَإِنْ أَمَتَّهَا فَاغْفِرْ لَهَا",
    transliteration: "Allahumma innaka khalaqta nafsi wa anta tawaffaha laka mamat uha wa mahyaha in ahyaytaha fahfazha wa in amattaha faghfir laha",
    translation: "O Allah, You created my soul and You take it back. To You belong its death and its life. If You keep it alive, protect it. If You cause it to die, forgive it",
    reference: "Muslim"
  },
  {
    id: "sleeping_5",
    category: "Sleeping",
    arabic: "اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ",
    transliteration: "Allahumma qini 'adhabaka yawma tab'athu 'ibadak",
    translation: "O Allah, protect me from Your punishment on the Day You resurrect Your servants",
    reference: "Abu Dawud",
    repeatCount: 3
  },
  {
    id: "sleeping_6",
    category: "Sleeping",
    arabic: "سُبْحَانَ اللَّهِ ثَلَاثًا وَثَلَاثِينَ وَالْحَمْدُ لِلَّهِ ثَلَاثًا وَثَلَاثِينَ وَاللَّهُ أَكْبَرُ ثَلَاثًا وَثَلَاثِينَ",
    transliteration: "SubhanAllah 33x, Alhamdulillah 33x, Allahu Akbar 34x",
    translation: "Glory be to Allah (33 times), Praise be to Allah (33 times), Allah is the Greatest (34 times) — completes 100",
    reference: "Bukhari, Muslim",
    repeatCount: 100
  },

  // ===== Repentance (Tawbah) =====
  {
    id: "tawbah_1",
    category: "Repentance",
    arabic: "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيَّ الْقَيُّومَ وَأَتُوبُ إِلَيْهِ",
    transliteration: "Astaghfirullahal-'adhim alladhi la ilaha illa huwal-Hayyul-Qayyuma wa atubu ilayh",
    translation: "I seek forgiveness from Allah the Almighty, besides Whom there is no god, the Ever-Living, the Self-Sustaining, and I repent to Him",
    reference: "Abu Dawud, Tirmidhi",
    repeatCount: 3
  },
  {
    id: "tawbah_2",
    category: "Repentance",
    arabic: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ",
    transliteration: "Allahumma anta Rabbi la ilaha illa anta khalaqtani wa ana 'abduka wa ana 'ala 'ahdika wa wa'dika mastata'tu a'udhu bika min sharri ma sana'tu abu'u laka bini'matika 'alayya wa abu'u bidhanbi faghfir li fa-innahu la yaghfirudh-dhunuba illa ant",
    translation: "O Allah, You are my Lord, there is no god but You. You created me and I am Your servant. I am upon Your covenant and promise as best I can. I seek refuge in You from the evil of what I have done. I acknowledge Your blessings upon me and I confess my sins, so forgive me, for none forgives sins but You",
    reference: "Bukhari",
    tags: ["sayyidul-istighfar"]
  },
  {
    id: "tawbah_3",
    category: "Repentance",
    arabic: "رَبَّنَا ظَلَمْنَا أَنْفُسَنَا وَإِنْ لَمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ",
    transliteration: "Rabbana zalamna anfusana wa in lam taghfir lana wa tarhamna lanakunanna minal-khasirin",
    translation: "Our Lord, we have wronged ourselves, and if You do not forgive us and have mercy on us, we will surely be among the losers",
    reference: "Quran 7:23"
  },

  // ===== Parents =====
  {
    id: "parents_1",
    category: "Parents",
    arabic: "رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا",
    transliteration: "Rabbirhamhuma kama rabbayani saghira",
    translation: "My Lord, have mercy on them (my parents) as they raised me when I was small",
    reference: "Quran 17:24"
  },
  {
    id: "parents_2",
    category: "Parents",
    arabic: "رَبِّ اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ",
    transliteration: "Rabbighfir li wa liwalidayya wa lil-mu'minina yawma yaqumul-hisab",
    translation: "My Lord, forgive me and my parents and the believers on the Day the account is established",
    reference: "Quran 14:41"
  },

  // ===== Gratitude (additional) =====
  {
    id: "gratitude_3",
    category: "Gratitude",
    arabic: "الْحَمْدُ لِلَّهِ الَّذِي بِنِعْمَتِهِ تَتِمُّ الصَّالِحَاتُ",
    transliteration: "Alhamdulillahil-ladhi bini'matihi tatimmus-salihat",
    translation: "All praise is due to Allah, by whose grace good deeds are completed",
    reference: "Ibn Majah"
  },
  {
    id: "gratitude_4",
    category: "Gratitude",
    arabic: "رَبِّ أَوْزِعْنِي أَنْ أَشْكُرَ نِعْمَتَكَ الَّتِي أَنْعَمْتَ عَلَيَّ وَعَلَى وَالِدَيَّ وَأَنْ أَعْمَلَ صَالِحًا تَرْضَاهُ",
    transliteration: "Rabbi awzi'ni an ashkura ni'matakallati an'amta 'alayya wa 'ala walidayya wa an a'mala salihan tardah",
    translation: "My Lord, enable me to be grateful for Your favor which You have bestowed upon me and upon my parents, and to do righteous deeds that please You",
    reference: "Quran 46:15"
  },

  // ===== Distress & Anxiety (additional) =====
  {
    id: "distress_3",
    category: "Distress",
    arabic: "لَا إِلَهَ إِلَّا اللَّهُ الْحَلِيمُ الْكَرِيمُ سُبْحَانَ اللَّهِ رَبِّ الْعَرْشِ الْعَظِيمِ الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
    transliteration: "La ilaha illallahul-Halimul-Karim, SubhanAllahi Rabbil-'arshil-'adhim, Alhamdulillahi Rabbil-'alamin",
    translation: "There is no god but Allah, the Forbearing, the Generous. Glory be to Allah, Lord of the Great Throne. Praise be to Allah, Lord of the worlds",
    reference: "Ibn Majah"
  },
  {
    id: "distress_4",
    category: "Distress",
    arabic: "اللَّهُمَّ رَحْمَتَكَ أَرْجُو فَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ وَأَصْلِحْ لِي شَأْنِي كُلَّهُ لَا إِلَهَ إِلَّا أَنْتَ",
    transliteration: "Allahumma rahmataka arju fala takilni ila nafsi tarfata 'aynin wa aslih li sha'ni kullahu la ilaha illa ant",
    translation: "O Allah, I hope for Your mercy, so do not entrust me to myself even for a blink of an eye. Rectify all my affairs. There is no god but You",
    reference: "Abu Dawud"
  },
  {
    id: "distress_5",
    category: "Distress",
    arabic: "لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ",
    transliteration: "La ilaha illa anta subhanaka inni kuntu minaz-zalimin",
    translation: "There is no god but You, glory be to You, indeed I have been among the wrongdoers",
    reference: "Quran 21:87",
    tags: ["younis", "dua-of-prophet-yunus"]
  },

  // ===== After Prayer (additional) =====
  {
    id: "after_prayer_3",
    category: "After Prayer",
    arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ وَلَا مُعْطِيَ لِمَا مَنَعْتَ وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ",
    transliteration: "La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu wa huwa 'ala kulli shay'in qadir. Allahumma la mani'a lima a'tayta wa la mu'tiya lima mana'ta wa la yanfa'u dhal-jaddi minkal-jadd",
    translation: "There is no god but Allah, alone, no partner has He. His is the sovereignty and His is the praise, and He is over all things capable. O Allah, none can withhold what You give, and none can give what You withhold, and no wealth can benefit anyone against You",
    reference: "Bukhari, Muslim"
  },
  {
    id: "after_prayer_4",
    category: "After Prayer",
    arabic: "سُبْحَانَ اللَّهِ ثَلَاثًا وَثَلَاثِينَ وَالْحَمْدُ لِلَّهِ ثَلَاثًا وَثَلَاثِينَ وَاللَّهُ أَكْبَرُ ثَلَاثًا وَثَلَاثِينَ ثُمَّ قَالَ: لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
    transliteration: "SubhanAllah 33x, Alhamdulillah 33x, Allahu Akbar 33x, then La ilaha illallahu wahdahu la sharika lah...",
    translation: "Glory be to Allah (33), Praise be to Allah (33), Allah is Greatest (33), then the declaration of faith completes 100",
    reference: "Muslim",
    repeatCount: 100,
    tags: ["tasbeeh", "after-prayer"]
  },

  // ===== Protection (additional) =====
  {
    id: "protection_3",
    category: "Protection",
    arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ وَالْعَجْزِ وَالْكَسَلِ وَالْبُخْلِ وَالْجُبْنِ وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ",
    transliteration: "Allahumma inni a'udhu bika minal-hammi wal-hazani wal-'ajzi wal-kasali wal-bukhli wal-jubni wa dhala'id-dayni wa ghalabatir-rijal",
    translation: "O Allah, I seek refuge in You from anxiety and sorrow, weakness and laziness, miserliness and cowardice, the burden of debts and from being overpowered by men",
    reference: "Bukhari"
  },
  {
    id: "protection_4",
    category: "Protection",
    arabic: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
    transliteration: "Bismillahil-ladhi la yadurru ma'asmihi shay'un fil-ardi wa la fis-sama'i wa huwas-Sami'ul-'Alim",
    translation: "In the name of Allah, with Whose name nothing can harm on earth or in heaven, and He is the All-Hearing, the All-Knowing",
    reference: "Abu Dawud, Tirmidhi, Ibn Majah",
    repeatCount: 3
  },

  // ===== Fasting & Ramadan =====
  {
    id: "fasting_1",
    category: "Fasting",
    arabic: "اللَّهُمَّ إِنِّي لَكَ صُمْتُ وَبِكَ آمَنْتُ وَعَلَيْكَ تَوَكَّلْتُ وَعَلَى رِزْقِكَ أَفْطَرْتُ",
    transliteration: "Allahumma inni laka sumtu wa bika amantu wa 'alayka tawakkaltu wa 'ala rizqika aftartu",
    translation: "O Allah, I have fasted for You, I believe in You, I rely on You, and with Your provision I break my fast",
    reference: "Abu Dawud"
  },
  {
    id: "fasting_2",
    category: "Fasting",
    arabic: "ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ",
    transliteration: "Dhahabaz-zama'u wabtallatil-'uruqu wa thabatal-ajru insha-Allah",
    translation: "The thirst is gone, the veins are moistened, and the reward is confirmed, if Allah wills",
    reference: "Abu Dawud"
  },

  // ===== Hajj & Umrah =====
  {
    id: "hajj_1",
    category: "Hajj & Umrah",
    arabic: "لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ لَا شَرِيكَ لَكَ",
    transliteration: "Labbayka Allahumma labbayk, labbayka la sharika laka labbayk, innal-hamda wan-ni'mata laka wal-mulk, la sharika lak",
    translation: "Here I am, O Allah, here I am. Here I am, no partner has You, here I am. Indeed all praise, grace, and sovereignty are Yours. No partner has You",
    reference: "Bukhari, Muslim"
  },
  {
    id: "hajj_2",
    category: "Hajj & Umrah",
    arabic: "اللَّهُمَّ اجْعَلْهُ حَجًّا مَبْرُورًا وَذَنْبًا مَغْفُورًا وَسَعْيًا مَشْكُورًا",
    transliteration: "Allahummaj'alhu hajjan mabruraw wa dhanbam maghfooraw wa sa'yam mashkoora",
    translation: "O Allah, make it an accepted Hajj, a forgiven sin, and a praiseworthy effort",
    reference: "Ahmad"
  },

  // ===== New Moon =====
  {
    id: "moon_1",
    category: "New Moon",
    arabic: "اللَّهُ أَكْبَرُ اللَّهُمَّ أَهِلَّهُ عَلَيْنَا بِالْأَمْنِ وَالْإِيمَانِ وَالسَّلَامَةِ وَالْإِسْلَامِ وَالتَّوْفِيقِ لِمَا تُحِبُّ وَتَرْضَى رَبُّنَا وَرَبُّكَ اللَّهُ",
    transliteration: "Allahu Akbar, Allahumma ahillahu 'alayna bil-amni wal-imani was-salamati wal-Islami wat-tawfiqi lima tuhibbu wa tarda. Rabbuna wa rabbukallah",
    translation: "Allah is Greatest. O Allah, bring this new moon upon us with security, faith, safety, Islam, and success in what You love and are pleased with. Our Lord and your Lord is Allah",
    reference: "Tirmidhi, Darimi"
  },

  // ===== Sickness & Visiting the Sick =====
  {
    id: "sick_visit_1",
    category: "Illness",
    arabic: "لَا بَأْسَ طَهُورٌ إِنْ شَاءَ اللَّهُ",
    transliteration: "La ba'sa tahurun insha-Allah",
    translation: "No worry, it is a purification, if Allah wills",
    reference: "Bukhari",
    tags: ["visiting-sick"]
  },
  {
    id: "sick_visit_2",
    category: "Illness",
    arabic: "أَسْأَلُ اللَّهَ الْعَظِيمَ رَبَّ الْعَرْشِ الْعَظِيمِ أَنْ يَشْفِيَكَ",
    transliteration: "As'alullahal-'adhim Rabbal-'arshil-'adhim an yashfiyak",
    translation: "I ask Allah the Almighty, Lord of the Great Throne, to cure you",
    reference: "Tirmidhi, Abu Dawud",
    repeatCount: 7,
    tags: ["visiting-sick"]
  },

  // ===== Journey & Travel (additional) =====
  {
    id: "travel_return_1",
    category: "Travel",
    arabic: "آيِبُونَ تَائِبُونَ عَابِدُونَ لِرَبِّنَا حَامِدُونَ",
    transliteration: "Ayibuna ta'ibuna 'abiduna lirabbina hamidun",
    translation: "Returning, repenting, worshipping, and praising our Lord",
    reference: "Bukhari, Muslim"
  },

  // ===== Sneeze =====
  {
    id: "sneeze_1",
    category: "Daily",
    arabic: "الْحَمْدُ لِلَّهِ",
    transliteration: "Alhamdulillah",
    translation: "Praise be to Allah (said after sneezing)",
    reference: "Bukhari"
  },
  {
    id: "sneeze_2",
    category: "Daily",
    arabic: "يَرْحَمُكَ اللَّهُ",
    transliteration: "Yarhamukallah",
    translation: "May Allah have mercy on you (said to one who sneezes and praises Allah)",
    reference: "Bukhari"
  },

  // ===== Entering Market =====
  {
    id: "market_1",
    category: "Daily",
    arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ يُحْيِي وَيُمِيتُ وَهُوَ حَيٌّ لَا يَمُوتُ بِيَدِهِ الْخَيْرُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
    transliteration: "La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu yuhyi wa yumitu wa huwa hayyun la yamutu biyadihil-khayru wa huwa 'ala kulli shay'in qadir",
    translation: "There is no god but Allah, alone with no partner. His is the dominion and His is the praise. He gives life and causes death, and He is Living and does not die. In His hand is all good, and He is over all things capable",
    reference: "Tirmidhi, Ibn Majah"
  },

  // ===== New Clothes =====
  {
    id: "clothes_new_1",
    category: "Daily",
    arabic: "اللَّهُمَّ لَكَ الْحَمْدُ أَنْتَ كَسَوْتَنِيهِ أَسْأَلُكَ مِنْ خَيْرِهِ وَخَيْرِ مَا صُنِعَ لَهُ وَأَعُوذُ بِكَ مِنْ شَرِّهِ وَشَرِّ مَا صُنِعَ لَهُ",
    transliteration: "Allahumma lakal-hamdu anta kasawtanihi as'aluka min khayrihi wa khayri ma suni'a lahu wa a'udhu bika min sharrihi wa sharri ma suni'a lah",
    translation: "O Allah, to You be all praise. You have clothed me with this. I ask You for its goodness and the goodness of what it was made for, and I seek refuge in You from its evil and the evil of what it was made for",
    reference: "Abu Dawud, Tirmidhi"
  },

  // ===== Protection of Children =====
  {
    id: "children_protect_1",
    category: "Family",
    arabic: "أُعِيذُكُمَا بِكَلِمَاتِ اللَّهِ التَّامَّةِ مِنْ كُلِّ شَيْطَانٍ وَهَامَّةٍ وَمِنْ كُلِّ عَيْنٍ لَامَّةٍ",
    transliteration: "U'idhukuma bikalimatillahit-tammati min kulli shaytanin wa hammatin wa min kulli 'aynin lammah",
    translation: "I seek protection for both of you in the perfect words of Allah from every devil, every poisonous creature, and every evil eye",
    reference: "Bukhari"
  }
];

export const duaCategories = [
  "All",
  "Morning",
  "Evening",
  "Travel",
  "Eating",
  "Sleeping",
  "Illness",
  "Distress",
  "Gratitude",
  "Forgiveness",
  "Protection",
  "Weather",
  "After Prayer",
  "Home",
  "Mosque",
  "Daily",
  "Special Days",
  "Knowledge",
  "Character",
  "Marriage",
  "Family",
  "Financial",
  "Afterlife",
  "Repentance",
  "Parents",
  "Fasting",
  "Hajj & Umrah",
  "New Moon"
];
