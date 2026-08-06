export type Dhikr = {
  id: string;
  arabic: string;
  transliteration: string;
  /** English meaning shown under the selected dhikr */
  meaning: string;
  /** canonical phrase forms for matching (normalized without diacritics) */
  canonical: string[];
};

export const DHIKR_LIST: Dhikr[] = [
  {
    id: "astaghfirullah",
    arabic: "أَسْتَغْفِرُ ٱللَّٰه",
    transliteration: "Astaghfirullah",
    meaning: "I seek forgiveness from Allah.",
    canonical: [
      "astaghfirullah",
      "astagfirullah",
      "astaghfir allah",
      "astagh ferullah",
      "استغفر الله",
      "أستغفر الله",
    ],
  },
  {
    id: "la-ilaha-illallah",
    arabic: "لَا إِلَٰهَ إِلَّا ٱللَّٰه",
    transliteration: "La ilaha illallah",
    meaning: "There is no god worthy of worship except Allah.",
    canonical: [
      "la ilaha illallah",
      "la ilaha illa allah",
      "la ilaha ilallah",
      "laa ilaaha illallah",
      "لا اله الا الله",
      "لا إله إلا الله",
    ],
  },
  {
    id: "subhanallah",
    arabic: "سُبْحَانَ ٱللَّٰه",
    transliteration: "SubhanAllah",
    meaning: "Glory be to Allah.",
    canonical: [
      "subhanallah",
      "subhan allah",
      "subhaanallah",
      "sobhanallah",
      "سبحان الله",
    ],
  },
  {
    id: "alhamdulillah",
    arabic: "ٱلْحَمْدُ لِلَّٰه",
    transliteration: "Alhamdulillah",
    meaning: "All praise is due to Allah.",
    canonical: [
      "alhamdulillah",
      "alhamdu lillah",
      "al hamdu lillah",
      "alhamdulilah",
      "الحمد لله",
    ],
  },
  {
    id: "allahu-akbar",
    arabic: "ٱللَّٰهُ أَكْبَر",
    transliteration: "Allahu Akbar",
    meaning: "Allah is the Greatest.",
    canonical: [
      "allahu akbar",
      "allah akbar",
      "allahuakbar",
      "allaahu akbar",
      "الله اكبر",
      "الله أكبر",
    ],
  },
];


export const getDhikr = (id: string) => DHIKR_LIST.find((d) => d.id === id);
