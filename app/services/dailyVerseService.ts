export interface DailyVerse {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  translation: string;
  date: string;
  theme: string;
}

class DailyVerseService {
  private verses: DailyVerse[] = [
    {
      id: "1",
      book: "John",
      chapter: 3,
      verse: 16,
      text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.",
      translation: "NIV",
      date: "2024-01-01",
      theme: "Love & Salvation",
    },
    {
      id: "2",
      book: "Jeremiah",
      chapter: 29,
      verse: 11,
      text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future.",
      translation: "NIV",
      date: "2024-01-02",
      theme: "Hope & Future",
    },
    {
      id: "3",
      book: "Philippians",
      chapter: 4,
      verse: 13,
      text: "I can do all this through him who gives me strength.",
      translation: "NIV",
      date: "2024-01-03",
      theme: "Strength & Power",
    },
    {
      id: "4",
      book: "Romans",
      chapter: 8,
      verse: 28,
      text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.",
      translation: "NIV",
      date: "2024-01-04",
      theme: "God's Purpose",
    },
    {
      id: "5",
      book: "Proverbs",
      chapter: 3,
      verse: 5,
      text: "Trust in the Lord with all your heart and lean not on your own understanding.",
      translation: "NIV",
      date: "2024-01-05",
      theme: "Trust & Wisdom",
    },
    {
      id: "6",
      book: "Isaiah",
      chapter: 40,
      verse: 31,
      text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.",
      translation: "NIV",
      date: "2024-01-06",
      theme: "Renewal & Strength",
    },
    {
      id: "7",
      book: "Matthew",
      chapter: 11,
      verse: 28,
      text: "Come to me, all you who are weary and burdened, and I will give you rest.",
      translation: "NIV",
      date: "2024-01-07",
      theme: "Rest & Peace",
    },
    {
      id: "8",
      book: "Psalm",
      chapter: 23,
      verse: 1,
      text: "The Lord is my shepherd, I lack nothing.",
      translation: "NIV",
      date: "2024-01-08",
      theme: "Provision & Care",
    },
    {
      id: "9",
      book: "2 Corinthians",
      chapter: 5,
      verse: 17,
      text: "Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!",
      translation: "NIV",
      date: "2024-01-09",
      theme: "New Creation",
    },
    {
      id: "10",
      book: "Galatians",
      chapter: 5,
      verse: 22,
      text: "But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness.",
      translation: "NIV",
      date: "2024-01-10",
      theme: "Fruit of the Spirit",
    },
    {
      id: "11",
      book: "Ephesians",
      chapter: 2,
      verse: 8,
      text: "For it is by grace you have been saved, through faith—and this is not from yourselves, it is the gift of God.",
      translation: "NIV",
      date: "2024-01-11",
      theme: "Grace & Faith",
    },
    {
      id: "12",
      book: "1 John",
      chapter: 4,
      verse: 19,
      text: "We love because he first loved us.",
      translation: "NIV",
      date: "2024-01-12",
      theme: "Love & Response",
    },
    {
      id: "13",
      book: "Psalm",
      chapter: 46,
      verse: 1,
      text: "God is our refuge and strength, an ever-present help in trouble.",
      translation: "NIV",
      date: "2024-01-13",
      theme: "Refuge & Help",
    },
    {
      id: "14",
      book: "Colossians",
      chapter: 3,
      verse: 23,
      text: "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.",
      translation: "NIV",
      date: "2024-01-14",
      theme: "Excellence & Purpose",
    },
    {
      id: "15",
      book: "Hebrews",
      chapter: 11,
      verse: 1,
      text: "Now faith is confidence in what we hope for and assurance about what we do not see.",
      translation: "NIV",
      date: "2024-01-15",
      theme: "Faith & Confidence",
    },
    {
      id: "16",
      book: "James",
      chapter: 1,
      verse: 2,
      text: "Consider it pure joy, my brothers and sisters, whenever you face trials of many kinds.",
      translation: "NIV",
      date: "2024-01-16",
      theme: "Joy in Trials",
    },
    {
      id: "17",
      book: "1 Peter",
      chapter: 5,
      verse: 7,
      text: "Cast all your anxiety on him because he cares for you.",
      translation: "NIV",
      date: "2024-01-17",
      theme: "Casting Cares",
    },
    {
      id: "18",
      book: "Psalm",
      chapter: 27,
      verse: 1,
      text: "The Lord is my light and my salvation—whom shall I fear? The Lord is the stronghold of my life—of whom shall I be afraid?",
      translation: "NIV",
      date: "2024-01-18",
      theme: "Light & Salvation",
    },
    {
      id: "19",
      book: "Romans",
      chapter: 12,
      verse: 2,
      text: "Do not conform to the pattern of this world, but be transformed by the renewing of your mind.",
      translation: "NIV",
      date: "2024-01-19",
      theme: "Transformation",
    },
    {
      id: "20",
      book: "Matthew",
      chapter: 6,
      verse: 33,
      text: "But seek first his kingdom and his righteousness, and all these things will be given to you as well.",
      translation: "NIV",
      date: "2024-01-20",
      theme: "Seeking God First",
    },
    {
      id: "21",
      book: "Psalm",
      chapter: 37,
      verse: 4,
      text: "Take delight in the Lord, and he will give you the desires of your heart.",
      translation: "NIV",
      date: "2024-01-21",
      theme: "Delight & Desires",
    },
    {
      id: "22",
      book: "Isaiah",
      chapter: 41,
      verse: 10,
      text: "So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand.",
      translation: "NIV",
      date: "2024-01-22",
      theme: "Fear Not",
    },
    {
      id: "23",
      book: "Psalm",
      chapter: 91,
      verse: 1,
      text: "Whoever dwells in the shelter of the Most High will rest in the shadow of the Almighty.",
      translation: "NIV",
      date: "2024-01-23",
      theme: "Divine Shelter",
    },
    {
      id: "24",
      book: "1 Corinthians",
      chapter: 13,
      verse: 4,
      text: "Love is patient, love is kind. It does not envy, it does not boast, it is not proud.",
      translation: "NIV",
      date: "2024-01-24",
      theme: "Love's Nature",
    },
    {
      id: "25",
      book: "Psalm",
      chapter: 139,
      verse: 14,
      text: "I praise you because I am fearfully and wonderfully made; your works are wonderful, I know that full well.",
      translation: "NIV",
      date: "2024-01-25",
      theme: "Wonderfully Made",
    },
    {
      id: "26",
      book: "Joshua",
      chapter: 1,
      verse: 9,
      text: "Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.",
      translation: "NIV",
      date: "2024-01-26",
      theme: "Courage & Presence",
    },
    {
      id: "27",
      book: "Psalm",
      chapter: 16,
      verse: 11,
      text: "You make known to me the path of life; you will fill me with joy in your presence, with eternal pleasures at your right hand.",
      translation: "NIV",
      date: "2024-01-27",
      theme: "Path of Life",
    },
    {
      id: "28",
      book: "Romans",
      chapter: 15,
      verse: 13,
      text: "May the God of hope fill you with all joy and peace as you trust in him, so that you may overflow with hope by the power of the Holy Spirit.",
      translation: "NIV",
      date: "2024-01-28",
      theme: "Hope & Joy",
    },
    {
      id: "29",
      book: "Psalm",
      chapter: 34,
      verse: 8,
      text: "Taste and see that the Lord is good; blessed is the one who takes refuge in him.",
      translation: "NIV",
      date: "2024-01-29",
      theme: "Taste & See",
    },
    {
      id: "30",
      book: "2 Timothy",
      chapter: 1,
      verse: 7,
      text: "For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline.",
      translation: "NIV",
      date: "2024-01-30",
      theme: "Power & Self-Discipline",
    },
    {
      id: "31",
      book: "Revelation",
      chapter: 21,
      verse: 4,
      text: "He will wipe every tear from their eyes. There will be no more death or mourning or crying or pain, for the old order of things has passed away.",
      translation: "NIV",
      date: "2024-01-31",
      theme: "New Heaven & Earth",
    },
  ];

  getTodaysVerse(): DailyVerse {
    const today = new Date();
    const dayOfMonth = today.getDate();

    // Use day of month to get verse (1-31)
    const verseIndex = (dayOfMonth - 1) % this.verses.length;
    const verse = this.verses[verseIndex];

    // Update the date to today
    return {
      ...verse,
      date: today.toISOString().split("T")[0],
    };
  }

  getVerseByDate(date: Date): DailyVerse {
    const dayOfMonth = date.getDate();
    const verseIndex = (dayOfMonth - 1) % this.verses.length;
    const verse = this.verses[verseIndex];

    return {
      ...verse,
      date: date.toISOString().split("T")[0],
    };
  }

  getAllVerses(): DailyVerse[] {
    return this.verses;
  }
}

export default new DailyVerseService();
