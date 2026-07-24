export type Dhikr = {
  id: string;
  arabic: string;
  transliteration: string;
  /** canonical phrase forms for matching (normalized without diacritics) */
  canonical: string[];
};

export const DHIKR_LIST: Dhikr[] = [
  {
    id: "astaghfirullah",
    arabic: "أَسْتَغْفِرُ ٱللَّٰه",
    transliteration: "Astaghfirullah",
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
    canonical: [
      "la ilaha illallah",
      "la ilaha illa allah",
      "la ilaha ilallah",
      "laa ilaaha illallah",
      "لا اله الا الله",
      "لا إله إلا الله",
    ],
  },
];

export const getDhikr = (id: string) => DHIKR_LIST.find((d) => d.id === id);
