import { Heart, CloudRain, Sun, Zap, Frown, Smile, Brain, Moon, Wind, Shield, Star, Coffee } from "lucide-react";

export interface MoodContent {
    type: 'surah' | 'ayah' | 'dua' | 'hadith' | 'dhikr';
    reference: string; // e.g., "Surah Ad-Duha" or "2:286"
    text: string;
    surahNumber?: number; // Only for 'surah' type, used for direct playback
    translation?: string;
    arabic?: string;
    category?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface Mood {
    id: string;
    label: string;
    icon: any;
    color: string;
    gradient: string;
    glow: string;
    content: MoodContent[];
    description?: string;
}

export const moods: Mood[] = [
    {
        id: "anxious",
        label: "Anxious",
        icon: CloudRain,
        color: "text-blue-500",
        gradient: "from-blue-500/20 via-blue-500/10 to-transparent",
        glow: "shadow-blue-500/20",
        description: "Find peace and tranquility",
        content: [
            {
                type: "surah",
                reference: "Surah Ad-Duha",
                text: "Your Lord has not taken leave of you, [O Muhammad], nor has He detested [you].",
                surahNumber: 93,
                arabic: "مَا وَدَّعَكَ رَبُّكَ وَمَا قَلَىٰ",
                category: "reassurance"
            },
            {
                type: "ayah",
                reference: "Quran 13:28",
                text: "Unquestionably, by the remembrance of Allah hearts are assured.",
                arabic: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ",
                category: "peace"
            },
            {
                type: "ayah",
                reference: "Quran 65:3",
                text: "And whoever relies upon Allah - then He is sufficient for him. Indeed Allah will accomplish His purpose.",
                arabic: "وَمَنْ يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ",
                category: "trust"
            },
            {
                type: "ayah",
                reference: "Quran 94:5-6",
                text: "For indeed, with hardship [will be] ease. Indeed, with hardship [will be] ease.",
                arabic: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا إِنَّ مَعَ الْعُسْرِ يُسْرًا",
                category: "relief"
            },
            {
                type: "dua",
                reference: "Prophetic Dua",
                text: "O Allah, I seek refuge in You from anxiety and sorrow, weakness and laziness.",
                arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ",
                category: "protection"
            },
            {
                type: "hadith",
                reference: "Sahih Bukhari",
                text: "When a servant commits a sin, a black dot is placed on his heart. When he repents, it is removed.",
                category: "forgiveness"
            },
            {
                type: "hadith",
                reference: "Sahih Muslim",
                text: "The Prophet (PBUH) said: 'If you feel no shame, then do as you wish.'",
                category: "mindfulness"
            },
            {
                type: "hadith",
                reference: "Sunan At-Tirmidhi",
                text: "Allah says: 'I am with My servant when he remembers Me and moves his lips with remembrance.'",
                category: "presence"
            },
            {
                type: "dhikr",
                reference: "Daily Dhikr",
                text: "La ilaha illallah wahdahu la sharika lah, lahul mulku wa lahul hamd.",
                arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ",
                category: "remembrance"
            }
        ]
    },
    {
        id: "sad",
        label: "Sad",
        icon: Frown,
        color: "text-indigo-500",
        gradient: "from-indigo-500/20 via-indigo-500/10 to-transparent",
        glow: "shadow-indigo-500/20",
        description: "Find comfort and hope",
        content: [
            {
                type: "surah",
                reference: "Surah Ash-Sharh",
                text: "For indeed, with hardship [will be] ease.",
                surahNumber: 94,
                arabic: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا",
                category: "comfort"
            },
            {
                type: "surah",
                reference: "Surah Yusuf",
                text: "Listening to the story of Prophet Yusuf (AS) brings comfort to the grieving heart.",
                surahNumber: 12,
                category: "story"
            },
            {
                type: "ayah",
                reference: "Quran 2:155",
                text: "And We will surely test you with something of fear and hunger and a loss of wealth and lives and fruits, but give good tidings to the patient.",
                arabic: "وَلَنَبْلُوَنَّكُمْ بِشَيْءٍ مِنَ الْخَوْفِ وَالْجُوعِ",
                category: "patience"
            },
            {
                type: "ayah",
                reference: "Quran 94:7",
                text: "So when you have finished [your duties], then stand up [for worship].",
                arabic: "فَإِذَا فَرَغْتَ فَانْصَبْ",
                category: "renewal"
            },
            {
                type: "ayah",
                reference: "Quran 39:53",
                text: "Say, 'O My servants who have transgressed against themselves [by sinning], do not despair of the mercy of Allah.'",
                arabic: "قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنْفُسِهِمْ",
                category: "hope"
            },
            {
                type: "dua",
                reference: "Dua for Sadness",
                text: "O Allah, make me content with what You have decreed for me, and make me live in ease.",
                arabic: "اللَّهُمَّ ارْضَنِي بِقَضَائِكَ وَبَارِكْ لِي فِيهِ",
                category: "acceptance"
            },
            {
                type: "hadith",
                reference: "Sahih Bukhari",
                text: "No fatigue, nor disease, nor sorrow, nor sadness, nor hurt, nor distress befalls a Muslim, even if it were the prick he receives from a thorn, but that Allah expiates some of his sins for that.",
                category: "redemption"
            },
            {
                type: "hadith",
                reference: "Sahih Muslim",
                text: "The Prophet (PBUH) said: 'Verily, the reward is in accordance with the hardship.'",
                category: "reward"
            }
        ]
    },
    {
        id: "happy",
        label: "Happy",
        icon: Smile,
        color: "text-amber-500",
        gradient: "from-amber-500/20 via-amber-500/10 to-transparent",
        glow: "shadow-amber-500/20",
        description: "Express gratitude and joy",
        content: [
            {
                type: "surah",
                reference: "Surah Ar-Rahman",
                text: "So which of the favors of your Lord would you deny?",
                surahNumber: 55,
                arabic: "فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ",
                category: "gratitude"
            },
            {
                type: "dua",
                reference: "Dua for Gratitude",
                text: "My Lord, enable me to be grateful for Your favor which You have bestowed upon me.",
                arabic: "رَبِّ أَوْزِعْنِي أَنْ أَشْكُرَ نِعْمَتَكَ الَّتِي أَنْعَمْتَ عَلَيَّ",
                category: "thanks"
            },
            {
                type: "ayah",
                reference: "Quran 10:58",
                text: "Say, 'In the bounty of Allah and in His mercy - in that let them rejoice.'",
                arabic: "قُلْ بِفَضْلِ اللَّهِ وَبِرَحْمَتِهِ فَبِذَلِكَ فَلْيَفْرَحُوا",
                category: "blessing"
            },
            {
                type: "ayah",
                reference: "Quran 16:53",
                text: "And whatever you have of favor - it is from Allah.",
                arabic: "وَمَا بِكُمْ مِنْ نِعْمَةٍ فَمِنَ اللَّهِ",
                category: "blessing"
            },
            {
                type: "ayah",
                reference: "Quran 31:31",
                text: "Do you not see that ships sail through the sea by the favor of Allah?",
                arabic: "أَلَمْ تَرَوْا أَنَّ الْفُلْكَ تَجْرِي فِي الْبَحْرِ",
                category: "wonder"
            },
            {
                type: "hadith",
                reference: "Sahih Muslim",
                text: "The Prophet (PBUH) was asked: 'Which people are the best?' He replied: 'Those who live longest and have the best conduct.'",
                category: "character"
            },
            {
                type: "hadith",
                reference: "Sahih Bukhari",
                text: "The Prophet (PBUH) said: 'Wealth is not in having many possessions. Rather, true wealth is the richness of the soul.'",
                category: "contentment"
            },
            {
                type: "hadith",
                reference: "Sunan Ibn Majah",
                text: "The Prophet (PBUH) said: 'He who is given his portion of mercy has been given a goodly portion indeed.'",
                category: "mercy"
            }
        ]
    },
    {
        id: "lost",
        label: "Lost",
        icon: Zap,
        color: "text-purple-500",
        gradient: "from-purple-500/20 via-purple-500/10 to-transparent",
        glow: "shadow-purple-500/20",
        description: "Find guidance and direction",
        content: [
            {
                type: "ayah",
                reference: "Quran 2:186",
                text: "And when My servants ask you concerning Me - indeed I am near. I respond to the invocation of the supplicant when he calls upon Me.",
                arabic: "وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ",
                category: "guidance"
            },
            {
                type: "surah",
                reference: "Surah Al-Fatiha",
                text: "Guide us to the straight path.",
                surahNumber: 1,
                arabic: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ",
                category: "path"
            },
            {
                type: "ayah",
                reference: "Quran 20:50",
                text: "Our Lord is He who gave each thing its form and then guided [it].",
                arabic: "رَبُّنَا الَّذِي أَعْطَىٰ كُلَّ شَيْءٍ خَلْقَهُ ثُمَّ هَدَىٰ",
                category: "guidance"
            },
            {
                type: "ayah",
                reference: "Quran 87:3",
                text: "And who determined and guided.",
                arabic: "وَالَّذِي قَدَّرَ فَهَدَىٰ",
                category: "direction"
            },
            {
                type: "dua",
                reference: "Dua for Guidance",
                text: "O Allah, show me the truth as truth and give me the ability to follow it. Show me falsehood as false and give me the ability to avoid it.",
                arabic: "اللَّهُمَّ أَرِنِي الْحَقَّ حَقًّا وَارْزُقْنِي اتِّبَاعَهُ",
                category: "clarity"
            },
            {
                type: "hadith",
                reference: "Sahih Bukhari",
                text: "The Prophet (PBUH) said: 'Ask Allah for guidance and adhere to it, for whoever is guided to something will have it made easy for him.'",
                category: "guidance"
            },
            {
                type: "hadith",
                reference: "Sahih Muslim",
                text: "The Prophet (PBUH) said: 'The heart of the believer is between two fingers of the Most Merciful.'",
                category: "heart"
            }
        ]
    },
    {
        id: "grateful",
        label: "Grateful",
        icon: Heart,
        color: "text-rose-500",
        gradient: "from-rose-500/20 via-rose-500/10 to-transparent",
        glow: "shadow-rose-500/20",
        description: "Cultivate thankfulness",
        content: [
            {
                type: "ayah",
                reference: "Quran 14:7",
                text: "If you are grateful, I will surely increase you [in favor].",
                arabic: "لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ",
                category: "increase"
            },
            {
                type: "surah",
                reference: "Surah Ar-Rahman",
                text: "All that is in the heavens and earth exalts Him. And He is the Exalted in Might, the Wise.",
                surahNumber: 55,
                arabic: "تُسَبِّحُ لَهُ السَّمَاوَاتُ وَالْأَرْضُ",
                category: "praise"
            },
            {
                type: "ayah",
                reference: "Quran 27:40",
                text: "Whoever has done an atom's weight of good will see it.",
                arabic: "مَنْ عَمِلَ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُ",
                category: "reward"
            },
            {
                type: "ayah",
                reference: "Quran 2:152",
                text: "So remember Me; I will remember you. And be grateful to Me and do not deny Me.",
                arabic: "فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ",
                category: "remembrance"
            },
            {
                type: "dua",
                reference: "Morning Dua",
                text: "O Allah, whatever blessing You have bestowed upon me and any of Your creation, grant me its increase.",
                arabic: "اللَّهُمَّ مَا أَصْبَحَ بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ",
                category: "blessing"
            },
            {
                type: "hadith",
                reference: "Sahih Bukhari",
                text: "He who does not thank people has not thanked Allah.",
                category: "gratitude"
            },
            {
                type: "hadith",
                reference: "Sahih Muslim",
                text: "The Prophet (PBUH) said: 'Whoever does not thank people has not thanked Allah.'",
                category: "gratitude"
            },
            {
                type: "hadith",
                reference: "Sunan At-Tirmidhi",
                text: "The Prophet (PBUH) said: 'Allah is pleased with His servant who eats a meal and praises Him for it.'",
                category: "praise"
            }
        ]
    },
    {
        id: "tired",
        label: "Tired",
        icon: Sun,
        color: "text-orange-500",
        gradient: "from-orange-500/20 via-orange-500/10 to-transparent",
        glow: "shadow-orange-500/20",
        description: "Find strength and energy",
        content: [
            {
                type: "ayah",
                reference: "Quran 2:286",
                text: "Allah does not charge a soul except [with that within] its capacity.",
                arabic: "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا",
                category: "strength"
            },
            {
                type: "surah",
                reference: "Surah Al-Insan",
                text: "And We have certainly created man and We know what his soul whispers to him, and We are closer to him than [his] jugular vein.",
                surahNumber: 76,
                arabic: "وَلَقَدْ خَلَقْنَا الْإِنْسَانَ وَنَعْلَمُ مَا تُوَسْوِسُ بِهِ نَفْسُهُ",
                category: "closeness"
            },
            {
                type: "ayah",
                reference: "Quran 2:153",
                text: "O you who have believed, seek help through patience and prayer. Indeed Allah is with the patient.",
                arabic: "يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ",
                category: "patience"
            },
            {
                type: "ayah",
                reference: "Quran 94:5",
                text: "For indeed, with hardship [will be] ease.",
                arabic: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا",
                category: "relief"
            },
            {
                type: "dua",
                reference: "Dua for Energy",
                text: "O Allah, I seek refuge in You from laziness and old age.",
                arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكَسَلِ وَالْهَرَمِ",
                category: "protection"
            },
            {
                type: "hadith",
                reference: "Sahih Bukhari",
                text: "The Prophet (PBUH) said: 'Fatigue is a portion of every deed, so whoever gets tired in his portion will have it.'",
                category: "reward"
            },
            {
                type: "hadith",
                reference: "Sahih Muslim",
                text: "The Prophet (PBUH) said: 'The strong believer is better and more beloved to Allah than the weak believer.'",
                category: "strength"
            }
        ]
    },
    {
        id: "stressed",
        label: "Stressed",
        icon: Brain,
        color: "text-red-500",
        gradient: "from-red-500/20 via-red-500/10 to-transparent",
        glow: "shadow-red-500/20",
        description: "Find relief from stress",
        content: [
            {
                type: "ayah",
                reference: "Quran 3:200",
                text: "O you who have believed, persevere through patience and prayer. Indeed, Allah is with the patient.",
                arabic: "يَا أَيُّهَا الَّذِينَ آمَنُوا اصْبِرُوا وَصَابِرُوا",
                category: "patience"
            },
            {
                type: "surah",
                reference: "Surah Al-Baqarah",
                text: "Allah does not burden a soul beyond its capacity.",
                surahNumber: 2,
                arabic: "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا",
                category: "ease"
            },
            {
                type: "ayah",
                reference: "Quran 2:208",
                text: "O you who have believed, enter into peace completely and perfectly.",
                arabic: "يَا أَيُّهَا الَّذِينَ آمَنُوا ادْخُلُوا فِي السِّلْمِ كَافَّةً",
                category: "peace"
            },
            {
                type: "ayah",
                reference: "Quran 65:3",
                text: "And whoever relies upon Allah - then He is sufficient for him.",
                arabic: "وَمَنْ يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ",
                category: "trust"
            },
            {
                type: "dua",
                reference: "Stress Relief Dua",
                text: "O Allah, I am Your servant, son of Your servant, son of Your female servant. My forelock is in Your hand.",
                arabic: "اللَّهُمَّ عَبْدُكَ ابْنُ عَبْدِكَ ابْنُ أَمَتِكَ",
                category: "submission"
            },
            {
                type: "dhikr",
                reference: "Stress Relief Dhikr",
                text: "HasbiAllahu la ilaha illa hu, alayhi tawakkaltu wa huwa rabbul arshil adheem.",
                arabic: "حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ",
                category: "trust"
            },
            {
                type: "hadith",
                reference: "Sahih Bukhari",
                text: "The Prophet (PBUH) said: 'There is no disease that Allah has created, except that He has also created its treatment.'",
                category: "healing"
            },
            {
                type: "hadith",
                reference: "Sahih Muslim",
                text: "The Prophet (PBUH) said: 'When Allah loves a servant, He tests him.'",
                category: "trial"
            }
        ]
    },
    {
        id: "angry",
        label: "Angry",
        icon: Wind,
        color: "text-teal-500",
        gradient: "from-teal-500/20 via-teal-500/10 to-transparent",
        glow: "shadow-teal-500/20",
        description: "Find calm and forgiveness",
        content: [
            {
                type: "ayah",
                reference: "Quran 3:134",
                text: "Those who spend [in Allah's cause] during ease and hardship and who restrain anger.",
                arabic: "الَّذِينَ يُنْفِقُونَ فِي السَّرَّاءِ وَالضَّرَّاءِ وَالْكَاظِمِينَ الْغَيْظَ",
                category: "anger management"
            },
            {
                type: "hadith",
                reference: "Sahih Bukhari",
                text: "The strong is not the one who overcomes the people by his strength, but the strong is the one who controls himself while in anger.",
                category: "self-control"
            },
            {
                type: "ayah",
                reference: "Quran 42:37",
                text: "And those who avoid the major sins and immoralities, and when they are angry, they forgive.",
                arabic: "وَالَّذِينَ يَجْتَنِبُونَ كَبَائِرَ الْإِثْمِ وَالْفَوَاحِشَ وَإِذَا مَا غَضِبُوا هُمْ يَغْفِرُونَ",
                category: "forgiveness"
            },
            {
                type: "ayah",
                reference: "Quran 7:199",
                text: "Take what is given freely, enjoin what is good, and turn away from the ignorant.",
                arabic: "خُذِ الْعَفْوَ وَأْمُرْ بِالْعُرْفِ وَأَعْرِضْ عَنِ الْجَاهِلِينَ",
                category: "patience"
            },
            {
                type: "dua",
                reference: "Anger Control Dua",
                text: "I seek refuge in Allah from the evil of myself and from the evil of every creature that You have given control over.",
                arabic: "أَعُوذُ بِاللَّهِ مِنْ شَرِّ نَفْسِي وَمِنْ شَرِّ كُلِّ دَابَّةٍ",
                category: "protection"
            },
            {
                type: "surah",
                reference: "Surah Al-Imran",
                text: "And hasten to forgiveness from your Lord and a garden as wide as the heavens and earth.",
                surahNumber: 3,
                arabic: "وَسَارِعُوا إِلَى مَغْفِرَةٍ مِنْ رَبِّكُمْ وَجَنَّةٍ",
                category: "forgiveness"
            },
            {
                type: "hadith",
                reference: "Sahih Muslim",
                text: "The Prophet (PBUH) said: 'Do not get angry, and Paradise will be yours.'",
                category: "reward"
            },
            {
                type: "hadith",
                reference: "Sunan Abu Dawood",
                text: "The Prophet (PBUH) said: 'Anger comes from Satan, and Satan was created from fire.'",
                category: "origin"
            }
        ]
    },
    {
        id: "confused",
        label: "Confused",
        icon: Moon,
        color: "text-cyan-500",
        gradient: "from-cyan-500/20 via-cyan-500/10 to-transparent",
        glow: "shadow-cyan-500/20",
        description: "Find clarity and wisdom",
        content: [
            {
                type: "ayah",
                reference: "Quran 2:269",
                text: "He gives wisdom to whom He wills, and whoever has been given wisdom has been given much good.",
                arabic: "يُؤْتِي الْحِكْمَةَ مَنْ يَشَاءُ وَمَنْ يُؤْتَ الْحِكْمَةَ فَقَدْ أُوتِيَ خَيْرًا كَثِيرًا",
                category: "wisdom"
            },
            {
                type: "dua",
                reference: "Dua for Knowledge",
                text: "O Allah, benefit me through what You have taught me, and teach me what will benefit me.",
                arabic: "اللَّهُمَّ انْفَعْنِي بِمَا عَلَّمْتَنِي وَعَلِّمْنِي مَا يَنْفَعُنِي",
                category: "learning"
            },
            {
                type: "surah",
                reference: "Surah Al-Alaq",
                text: "Read in the name of your Lord who created. Created man from a clot.",
                surahNumber: 96,
                arabic: "اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ",
                category: "knowledge"
            },
            {
                type: "ayah",
                reference: "Quran 20:114",
                text: "My Lord, increase me in knowledge.",
                arabic: "رَبِّ زِدْنِي عِلْمًا",
                category: "growth"
            },
            {
                type: "ayah",
                reference: "Quran 3:190",
                text: "Indeed, in the creation of the heavens and earth and the alternation of the night and the day are signs for those of understanding.",
                arabic: "إِنَّ فِي خَلْقِ السَّمَاوَاتِ وَالْأَرْضِ وَاخْتِلَافِ اللَّيْلِ وَالنَّهَارِ",
                category: "reflection"
            },
            {
                type: "hadith",
                reference: "Sahih Bukhari",
                text: "Whoever follows a path to seek knowledge, Allah will make the path to Paradise easy for him.",
                category: "education"
            },
            {
                type: "hadith",
                reference: "Sahih Muslim",
                text: "The Prophet (PBUH) said: 'Ask Allah for forgiveness and health, for after being granted certainty, one is given nothing better than health.'",
                category: "wisdom"
            },
            {
                type: "hadith",
                reference: "Sunan At-Tirmidhi",
                text: "The Prophet (PBUH) said: 'The seeking of knowledge is obligatory for every Muslim.'",
                category: "obligation"
            }
        ]
    },
    {
        id: "lonely",
        label: "Lonely",
        icon: Shield,
        color: "text-[var(--accent)]",
        gradient: "from-[var(--accent)]/20 via-[var(--accent)]/10 to-transparent",
        glow: "shadow-[var(--accent)]/20",
        description: "Find companionship and comfort",
        content: [
            {
                type: "ayah",
                reference: "Quran 50:16",
                text: "And We have already created man and know what his soul whispers to him. And We are closer to him than his jugular vein.",
                arabic: "وَلَقَدْ خَلَقْنَا الْإِنْسَانَ وَنَعْلَمُ مَا تُوَسْوِسُ بِهِ نَفْسُهُ",
                category: "closeness"
            },
            {
                type: "surah",
                reference: "Surah Ad-Duha",
                text: "And your Lord is going to give you, and you will be satisfied.",
                surahNumber: 93,
                arabic: "وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَى",
                category: "promise"
            },
            {
                type: "ayah",
                reference: "Quran 2:152",
                text: "So remember Me; I will remember you.",
                arabic: "فَاذْكُرُونِي أَذْكُرْكُمْ",
                category: "remembrance"
            },
            {
                type: "ayah",
                reference: "Quran 57:4",
                text: "It is He who created the heavens and earth in six days and then established Himself above the Throne. He knows what penetrates into the earth and what emerges from it and what descends from the heaven and what ascends therein; and He is with you wherever you are.",
                arabic: "هُوَ الَّذِي خَلَقَ السَّمَاوَاتِ وَالْأَرْضَ فِي سِتَّةِ أَيَّامٍ",
                category: "presence"
            },
            {
                type: "dua",
                reference: "Dua for Loneliness",
                text: "O Allah, You are my companion in this journey and my successor in my family.",
                arabic: "اللَّهُمَّ أَنْتَ الصَّاحِبُ فِي السَّفَرِ وَالْخَلِيفَةُ فِي الْأَهْلِ",
                category: "companionship"
            },
            {
                type: "hadith",
                reference: "Sahih Bukhari",
                text: "Allah says: 'I am as My servant thinks of Me, and I am with him when he remembers Me.'",
                category: "presence"
            },
            {
                type: "hadith",
                reference: "Sahih Muslim",
                text: "The Prophet (PBUH) said: 'The believer is not stung twice from the same hole.'",
                category: "protection"
            },
            {
                type: "hadith",
                reference: "Sunan Ibn Majah",
                text: "The Prophet (PBUH) said: 'Verily, Allah has angels who roam the roads seeking those who remember Allah.'",
                category: "angels"
            }
        ]
    },
    {
        id: "sick",
        label: "Sick",
        icon: Star,
        color: "text-violet-500",
        gradient: "from-violet-500/20 via-violet-500/10 to-transparent",
        glow: "shadow-violet-500/20",
        description: "Find healing and recovery",
        content: [
            {
                type: "ayah",
                reference: "Quran 17:82",
                text: "And We reveal of the Quran that which is healing and mercy for the believers.",
                arabic: "وَنُنَزِّلُ مِنَ الْقُرْآنِ مَا هُوَ شِفَاءٌ وَرَحْمَةٌ",
                category: "healing"
            },
            {
                type: "dua",
                reference: "Dua for Healing",
                text: "O Allah, heal me from all diseases and grant me health and wellness.",
                arabic: "اللَّهُمَّ اشْفِنِي وَعَافِنِي وَعَافِنِي فِي جَسَدِي",
                category: "recovery"
            },
            {
                type: "hadith",
                reference: "Sahih Bukhari",
                text: "There is no disease that Allah has created, except that He has also created its treatment.",
                category: "medicine"
            },
            {
                type: "surah",
                reference: "Surah Ash-Shu'ara",
                text: "And when I am ill, it is He who cures me.",
                surahNumber: 26,
                arabic: "وَإِذَا مَرِضْتُ فَهُوَ يَشْفِينِ",
                category: "cure"
            },
            {
                type: "ayah",
                reference: "Quran 26:80",
                text: "And when I am ill, it is He who cures me.",
                arabic: "وَإِذَا مَرِضْتُ فَهُوَ يَشْفِينِ",
                category: "healing"
            },
            {
                type: "ayah",
                reference: "Quran 2:195",
                text: "And spend in the way of Allah and do not throw [yourselves] with your [own] hands into destruction.",
                arabic: "وَأَنفِقُوا فِي سَبِيلِ اللَّهِ وَلَا تُلْقُوا بِأَيْدِيكُمْ إِلَى التَّهْلُكَةِ",
                category: "protection"
            },
            {
                type: "hadith",
                reference: "Sahih Muslim",
                text: "The Prophet (PBUH) said: 'No fatigue, nor disease, nor sorrow, nor sadness comes upon a Muslim, even if it were the prick he receives from a thorn, but that Allah expiates some of his sins for that.'",
                category: "redemption"
            },
            {
                type: "hadith",
                reference: "Sunan At-Tirmidhi",
                text: "The Prophet (PBUH) said: 'When a believer is ill, even the hair of his body pray for forgiveness for him.'",
                category: "forgiveness"
            }
        ]
    },
    {
        id: "motivated",
        label: "Motivated",
        icon: Coffee,
        color: "text-pink-500",
        gradient: "from-pink-500/20 via-pink-500/10 to-transparent",
        glow: "shadow-pink-500/20",
        description: "Find inspiration and drive",
        content: [
            {
                type: "ayah",
                reference: "Quran 3:200",
                text: "O you who have believed, persevere through patience and prayer. Indeed, Allah is with the patient.",
                arabic: "يَا أَيُّهَا الَّذِينَ آمَنُوا اصْبِرُوا وَصَابِرُوا",
                category: "perseverance"
            },
            {
                type: "surah",
                reference: "Surah Al-Imran",
                text: "So do not weaken and do not grieve, and you will be superior if you are believers.",
                surahNumber: 3,
                arabic: "وَلَا تَهِنُوا وَلَا تَحْزَنُوا وَأَنْتُمُ الْأَعْلَوْنَ إِنْ كُنْتُمْ مُؤْمِنِينَ",
                category: "strength"
            },
            {
                type: "dua",
                reference: "Dua for Success",
                text: "O Allah, I ask You for beneficial knowledge, good deeds, and acceptable provision.",
                arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَعَمَلًا صَالِحًا وَرِزْقًا طَيِّبًا",
                category: "success"
            },
            {
                type: "hadith",
                reference: "Sahih Bukhari",
                text: "The believers who show the most perfect faith are those who have the best character.",
                category: "character"
            },
            {
                type: "ayah",
                reference: "Quran 29:69",
                text: "And those who strive for Us - We will surely guide them to Our ways. And indeed, Allah is with the doers of good.",
                arabic: "وَالَّذِينَ جَاهَدُوا فِينَا لَنَهْدِيَنَّهُمْ سُبُلَنَا",
                category: "guidance"
            },
            {
                type: "ayah",
                reference: "Quran 16:97",
                text: "Whoever does righteousness, whether male or female, while he is a believer - We will surely cause him to live a good life.",
                arabic: "مَنْ عَمِلَ صَالِحًا مِنْ ذَكَرٍ أَوْ أُنْثَىٰ وَهُوَ مُؤْمِنٌ",
                category: "reward"
            },
            {
                type: "hadith",
                reference: "Sahih Muslim",
                text: "The Prophet (PBUH) said: 'The deeds are presented on Monday and Thursday, so I love that my deeds are presented while I am fasting.'",
                category: "accountability"
            },
            {
                type: "hadith",
                reference: "Sunan Ibn Majah",
                text: "The Prophet (PBUH) said: 'Whoever takes a path upon which to obtain knowledge, Allah makes the path to Paradise easy for him.'",
                category: "education"
            }
        ]
    }
];
