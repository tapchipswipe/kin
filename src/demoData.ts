/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FamilyMember } from './types';

export const STERLING_DEMO_DATA: FamilyMember[] = [
  // --- GENERATION 1 (Great-Great/Grandparents) ---
  {
    id: '1',
    firstName: 'Arthur',
    lastName: 'Sterling',
    gender: 'male',
    birthDate: '1885-04-12',
    birthPlace: 'Edinburgh, Scotland',
    deathDate: '1962-09-18',
    deathPlace: 'Boston, Massachusetts, USA',
    isDeceased: true,
    occupation: 'Master Stonemason',
    biography: 'Arthur immigrated to the United States in 1908 on the SS Mauretania. A skilled stonemason, he contributed to the construction of several historic brick and stone university buildings across Boston. He was known for his quiet demeanor, dedication to craftsmanship, and love of Scottish folk music.',
    avatarUrl: '#5c6bc0', // Slate Blue
    spouseIds: ['2'],
    childrenIds: ['3', '4'],
    fatherId: null,
    motherId: null,
    events: [
      { id: 'e1_1', year: 1908, title: 'Immigration to USA', description: 'Arrived at Ellis Island from Glasgow on the SS Mauretania with just a single chest of tools.', location: 'New York, USA' },
      { id: 'e1_2', year: 1910, title: 'Married Margaret Vance', description: 'Married Margaret in a quiet ceremony at St. Andrew\'s Methodist Church.', location: 'Boston, MA' },
      { id: 'e1_3', year: 1928, title: 'Established Sterling Masonry', description: 'Founded a local bricklaying and stone carving workshop that operated for nearly three decades.', location: 'Boston, MA' }
    ]
  },
  {
    id: '2',
    firstName: 'Margaret',
    lastName: 'Sterling',
    maidenName: 'Vance',
    gender: 'female',
    birthDate: '1888-11-22',
    birthPlace: 'Belfast, Ireland',
    deathDate: '1974-03-05',
    deathPlace: 'Boston, Massachusetts, USA',
    isDeceased: true,
    occupation: 'Lace Maker & Homemaker',
    biography: 'Margaret was a warm, resilient woman who came to Boston in 1906. An expert in traditional Irish lace-making, she sold fine table runners and bridal veils to wealthy Bostonian families. She was the cornerstone of the early Sterling household, famous for her traditional bread-making and sharp wit.',
    avatarUrl: '#ec407a', // Rosy Pink
    spouseIds: ['1'],
    childrenIds: ['3', '4'],
    fatherId: null,
    motherId: null,
    events: [
      { id: 'e2_1', year: 1906, title: 'Settled in North End', description: 'Arrived in Boston to live with her maternal aunt, working in a textile mill.', location: 'Boston, MA' },
      { id: 'e2_2', year: 1910, title: 'Marriage to Arthur', description: 'Began their shared life in a small flat on Hanover Street.', location: 'Boston, MA' }
    ]
  },

  // --- GENERATION 2 (Grandparents & Aunts/Uncles) ---
  {
    id: '3',
    firstName: 'Thomas',
    lastName: 'Sterling',
    gender: 'male',
    birthDate: '1912-08-30',
    birthPlace: 'Boston, Massachusetts',
    deathDate: '1995-12-04',
    deathPlace: 'Portland, Oregon, USA',
    isDeceased: true,
    occupation: 'Professor of Architecture',
    biography: 'The eldest son of Arthur and Margaret. Thomas inherited his father\'s affinity for structures but pursued academics. After serving in the US Army Corps of Engineers during World War II, he taught architectural history at the University of Oregon for 35 years. He authored two textbooks on American civic layout.',
    avatarUrl: '#3f51b5', // Royal Blue
    spouseIds: ['5'],
    childrenIds: ['7', '8'],
    fatherId: '1',
    motherId: '2',
    events: [
      { id: 'e3_1', year: 1934, title: 'Graduated from MIT', description: 'Earned his Bachelor of Science in Architectural Studies, the first Sterling to attend university.', location: 'Cambridge, MA' },
      { id: 'e3_2', year: 1943, title: 'Served in WWII', description: 'Deployed as a Lieutenant in the Army Corps of Engineers, assisting with bridge reconstruction in Europe.', location: 'Western Europe' },
      { id: 'e3_3', year: 1946, title: 'Married Eleanor Hayes', description: 'Married Eleanor post-war and moved west to Oregon for his teaching fellowship.', location: 'Eugene, OR' }
    ]
  },
  {
    id: '5',
    firstName: 'Eleanor',
    lastName: 'Sterling',
    maidenName: 'Hayes',
    gender: 'female',
    birthDate: '1915-05-14',
    birthPlace: 'Philadelphia, Pennsylvania',
    deathDate: '2004-11-20',
    deathPlace: 'Portland, Oregon, USA',
    isDeceased: true,
    occupation: 'Landscape Designer',
    biography: 'Eleanor was a pioneer in Pacific Northwest landscape architecture. She worked closely with city planners in Oregon to introduce native-plant parks and pedestrian walkways. She was an avid gardener, amateur watercolor artist, and lifelong conservationist.',
    avatarUrl: '#26a69a', // Teal
    spouseIds: ['3'],
    childrenIds: ['7', '8'],
    fatherId: null,
    motherId: null,
    events: [
      { id: 'e5_1', year: 1946, title: 'Marriage to Thomas', description: 'Relocated together across the country to start their careers.', location: 'Boston to Oregon' },
      { id: 'e5_2', year: 1965, title: 'The Rose Garden Project', description: 'Co-commissioned and landscaped the legendary local civic rose garden overlook.', location: 'Portland, OR' }
    ]
  },
  {
    id: '4',
    firstName: 'Beatrice',
    lastName: 'Wood',
    maidenName: 'Sterling',
    gender: 'female',
    birthDate: '1916-02-15',
    birthPlace: 'Boston, Massachusetts',
    deathDate: '2010-06-25',
    deathPlace: 'New York, New York, USA',
    isDeceased: true,
    occupation: 'Classical Violinist',
    biography: 'Beatrice demonstrated exceptional musical talent from childhood. After studying at Juilliard, she played violin with the New York Philharmonic for nearly 30 years. She traveled extensively on international symphonic tours and later taught classical violin to hundreds of young musicians in her Manhattan studio.',
    avatarUrl: '#ab47bc', // Purple
    spouseIds: ['6'],
    childrenIds: ['9'],
    fatherId: '1',
    motherId: '2',
    events: [
      { id: 'e4_1', year: 1938, title: 'Juilliard Audition', description: 'Accepted on a full-tuition fellowship, packing her bags for New York with her grandmother\'s lace.', location: 'New York, NY' },
      { id: 'e4_2', year: 1940, title: 'Married Charles Wood', description: 'Charles was a classical cellist with whom she shared a music stand and a 48-year loving marriage.', location: 'Brooklyn, NY' }
    ]
  },
  {
    id: '6',
    firstName: 'Charles',
    lastName: 'Wood',
    gender: 'male',
    birthDate: '1912-10-09',
    birthPlace: 'Brooklyn, New York',
    deathDate: '1988-01-30',
    deathPlace: 'New York, New York, USA',
    isDeceased: true,
    occupation: 'Orchestral Cellist',
    biography: 'An accomplished cellist and music scholar, Charles performed side-by-side with his wife Beatrice. Outside his orchestral work, he restored 18th-century antique stringed instruments with meticulous care in a small woodworking basement, maintaining a reputation as an expert luthier.',
    avatarUrl: '#78909c', // Blue Grey
    spouseIds: ['4'],
    childrenIds: ['9'],
    fatherId: null,
    motherId: null,
    events: [
      { id: 'e6_1', year: 1940, title: 'Marriage to Beatrice', description: 'Began playing together and holding chamber ensemble weekends in their loft.', location: 'New York, NY' }
    ]
  },

  // --- GENERATION 3 (Parents & Cousins) ---
  {
    id: '7',
    firstName: 'Robert',
    lastName: 'Sterling',
    gender: 'male',
    birthDate: '1942-07-04',
    birthPlace: 'Eugene, Oregon',
    isDeceased: false,
    occupation: 'Retired Civil Engineer',
    biography: 'Robert grew up exploring the Cascade Range, developing an interest in geological and hydraulic structures. He oversaw water delivery and dam safety systems for the state of Oregon. Now retired, he enjoys building wooden boat models, fly fishing, and tracing the family\'s genealogy.',
    avatarUrl: '#0288d1', // Rich Blue
    spouseIds: ['10'],
    childrenIds: ['12', '13'],
    fatherId: '3',
    motherId: '5',
    events: [
      { id: 'e7_1', year: 1968, title: 'Columbia River Project', description: 'Appointed Lead Field Inspector for the municipal water pipeline expansion.', location: 'Oregon, USA' },
      { id: 'e7_2', year: 1971, title: 'Married Sarah Connor', description: 'Celebrated a small outdoor wedding near Mount Hood.', location: 'Oregon, USA' }
    ]
  },
  {
    id: '10',
    firstName: 'Sarah',
    lastName: 'Sterling',
    maidenName: 'Connor',
    gender: 'female',
    birthDate: '1946-03-19',
    birthPlace: 'Seattle, Washington',
    isDeceased: false,
    occupation: 'High School History Teacher (Retired)',
    biography: 'Sarah spent 30 years teaching European and American history at Lincoln High School. Her passion for archival documents and oral histories inspired her family\'s interest in preserving their heritage. She is actively involved in the local historical society and organizing annual family reunions.',
    avatarUrl: '#66bb6a', // Green
    spouseIds: ['7'],
    childrenIds: ['12', '13'],
    fatherId: null,
    motherId: null,
    events: [
      { id: 'e10_1', year: 1971, title: 'Married Robert', description: 'Relocated permanently to Eugene and began teaching.', location: 'Oregon, USA' }
    ]
  },
  {
    id: '8',
    firstName: 'Diana',
    lastName: 'Bennett',
    maidenName: 'Sterling',
    gender: 'female',
    birthDate: '1948-09-12',
    birthPlace: 'Portland, Oregon',
    isDeceased: false,
    occupation: 'Clinical Pediatrician',
    biography: 'Diana is a dedicated pediatrician who worked in community clinics for nearly four decades. She established mobile pediatric outreach vans in rural Oregon to ensure children had access to basic healthcare. She is a passionate reader, hiker, and loves traveling through the Scottish Highlands.',
    avatarUrl: '#ff7043', // Deep Orange
    spouseIds: ['11'],
    childrenIds: ['14'],
    fatherId: '3',
    motherId: '5',
    events: [
      { id: 'e8_1', year: 1974, title: 'Medical Residency', description: 'Completed medical residency focusing on pediatric endocrinology.', location: 'Seattle, WA' },
      { id: 'e8_2', year: 1975, title: 'Married Richard Bennett', description: 'Married in Seattle before settling back in Portland.', location: 'Portland, OR' }
    ]
  },
  {
    id: '11',
    firstName: 'Richard',
    lastName: 'Bennett',
    gender: 'male',
    birthDate: '1945-12-14',
    birthPlace: 'Denver, Colorado',
    isDeceased: false,
    occupation: 'Journalist',
    biography: 'Richard worked as an environmental desk writer for regional newspapers. He spent decades reporting on Pacific Northwest timber, water rights, and conservation laws. He is an avid cyclist and collector of local vinyl recordings.',
    avatarUrl: '#8d6e63', // Warm Brown
    spouseIds: ['8'],
    childrenIds: ['14'],
    fatherId: null,
    motherId: null,
    events: []
  },
  {
    id: '9',
    firstName: 'Edward',
    lastName: 'Wood',
    gender: 'male',
    birthDate: '1941-11-28',
    birthPlace: 'Brooklyn, New York',
    deathDate: '2018-02-12',
    deathPlace: 'New Haven, Connecticut, USA',
    isDeceased: true,
    occupation: 'Curator of Rare Manuscripts',
    biography: 'Edward, the only child of musicians Beatrice and Charles, chose books over instruments. He worked at the Yale Beinecke Rare Book & Manuscript Library, spending his lifetime preserving medieval folios, early print books, and historical map collections. He never married and was a beloved uncle to the distant cousins.',
    avatarUrl: '#82b1ff', // Soft Blue Accent
    spouseIds: [],
    childrenIds: [],
    fatherId: '6',
    motherId: '4',
    events: [
      { id: 'e9_1', year: 1980, title: 'Acquisition of 15thc Bible', description: 'Successfully catalogued and brought a rare Gutenberg-era translation into Yale custody.', location: 'New Haven, CT' }
    ]
  },

  // --- GENERATION 4 (Children of Robert & Diana) ---
  {
    id: '12',
    firstName: 'James',
    lastName: 'Sterling',
    gender: 'male',
    birthDate: '1974-10-15',
    birthPlace: 'Eugene, Oregon',
    isDeceased: false,
    occupation: 'Software Engineer & Genealogist',
    biography: 'James is a technology enthusiast who spent much of his career building web platforms. Prompted by his mother Sarah\'s historical tales and his father Robert\'s box of old letters, James took up genealogy as a passionate pursuit, building digital tools to catalog his family\'s heritage. He lives with his family in Portland.',
    avatarUrl: '#00af91', // Emerald/Deep Green
    spouseIds: ['15'],
    childrenIds: ['16', '17'],
    fatherId: '7',
    motherId: '10',
    events: [
      { id: 'e12_1', year: 2002, title: 'Married Emily Watson', description: 'Held a dynamic autumnal forest wedding surrounded by relatives.', location: 'Oregon, USA' },
      { id: 'e12_2', year: 2020, title: 'Digital Archiving Initiative', description: 'Scanned over 1,500 family photos, creating the centralized digital Sterling archive.', location: 'Portland, OR' }
    ]
  },
  {
    id: '15',
    firstName: 'Emily',
    lastName: 'Watson-Sterling',
    maidenName: 'Watson',
    gender: 'female',
    birthDate: '1978-01-25',
    birthPlace: 'San Francisco, California',
    isDeceased: false,
    occupation: 'Elementary School Principal',
    biography: 'An inspirational educator who holds a deep belief in youth leadership. Emily started her career as a kindergarten teacher and rose to direct a progressive elementary academy in Portland. She is known for her infectious positivity, passion for baking, and love for hiking.',
    avatarUrl: '#f57c00', // Deep Amber
    spouseIds: ['12'],
    childrenIds: ['16', '17'],
    fatherId: null,
    motherId: null,
    events: []
  },
  {
    id: '13',
    firstName: 'Clara',
    lastName: 'Sterling',
    gender: 'female',
    birthDate: '1978-06-03',
    birthPlace: 'Eugene, Oregon',
    isDeceased: false,
    occupation: 'Botanical Researcher',
    biography: 'Clara completed her doctorate in ecology, focusing on forest fungal networks in the Great Pacific Northwest. Her work explores how trees communicate through subterranean root pathways—a concept she fondly jokes is identical to a family tree. She travels frequently to coordinate global ecological expeditions.',
    avatarUrl: '#9ccc65', // Light Green
    spouseIds: [],
    childrenIds: [],
    fatherId: '7',
    motherId: '10',
    events: [
      { id: 'e13_1', year: 2012, title: 'Mount Rainier Study', description: 'Published a groundbreaking paper on mycorrhizal associations in high-alpine old-growth forests.', location: 'Seattle, WA' }
    ]
  },
  {
    id: '14',
    firstName: 'Michael',
    lastName: 'Bennett',
    gender: 'male',
    birthDate: '1976-11-09',
    birthPlace: 'Portland, Oregon',
    isDeceased: false,
    occupation: 'Graphic Novel Designer',
    biography: 'Michael is a creative illustrator and graphic storyteller. Incorporating the adventurous outdoor spirit of his parents Diana and Richard, he writes and designs historic adventure comic series centered around 19th-century mountain pathfinders. He works out of a shared studio in Seattle.',
    avatarUrl: '#29b6f6', // Bright Blue
    spouseIds: [],
    childrenIds: [],
    fatherId: '11',
    motherId: '8',
    events: []
  },

  // --- GENERATION 5 (James & Emily\'s Children) ---
  {
    id: '16',
    firstName: 'Oliver',
    lastName: 'Sterling',
    gender: 'male',
    birthDate: '2008-04-14',
    birthPlace: 'Portland, Oregon',
    isDeceased: false,
    occupation: 'High School Student / Aspiring Coder',
    biography: 'Oliver represents the youngest generation of the Sterling line. Fascinated by robotics and video game coding, he built his first small-scale circuit board at age 12. He plays central midfield for his local soccer club and loves debating trivia facts with his mother.',
    avatarUrl: '#ea9085', // Coral Peachy Red
    spouseIds: [],
    childrenIds: [],
    fatherId: '12',
    motherId: '15',
    events: [
      { id: 'e16_1', year: 2024, title: 'State Science Fair Champion', description: 'Awarded first prize in Systems Software for designing a smart energy-routing model.', location: 'Salem, OR' }
    ]
  },
  {
    id: '17',
    firstName: 'Lily',
    lastName: 'Sterling',
    gender: 'female',
    birthDate: '2011-09-28',
    birthPlace: 'Portland, Oregon',
    isDeceased: false,
    occupation: 'Middle School Student / Gymnast',
    biography: 'Bright, energetic and creative, Lily spends her time practicing high-beam gymnastics, sketching abstract portraits, and training the household golden retriever, Mac. She possesses her great-grandmother Margaret\'s sharp wit and love of family storytellers.',
    avatarUrl: '#80deea', // Calm Teal Accent
    spouseIds: [],
    childrenIds: [],
    fatherId: '12',
    motherId: '15',
    events: []
  }
];
