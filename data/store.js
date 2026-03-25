// ===== IN-MEMORY DATA STORE =====
// This will be replaced with a real database later.
// All data is structured so switching to DB is straightforward.

const store = {
  // ---- Users ----
  users: [
    {
      id: 1,
      fullName: 'Admin User',
      email: 'admin@uniconnect.ru',
      password: 'admin123',
      role: 'admin',
      phoneNumber: '+7-000-000-0000',
      isVerified: true,
      avatarUrl: '/img/avatars/default_admin.png',
      avatarStatus: 'approved',
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      fullName: 'ITMO Representative',
      email: 'rep@itmo.ru',
      password: 'rep123',
      role: 'representative',
      universityId: 7, // ITMO University
      universityName: 'ITMO University',
      isVerified: true,
      avatarUrl: '/img/universities/uni_7_logo.png',
      avatarStatus: 'approved',
      createdAt: new Date().toISOString()
    },
    {
      id: 3,
      fullName: 'HSE Representative',
      email: 'rep@hse.ru',
      password: 'rep123',
      role: 'representative',
      universityId: 1, // Higher School of Economics
      universityName: 'Higher School of Economics',
      isVerified: true,
      avatarUrl: '/img/universities/uni_10_logo.png',
      avatarStatus: 'approved',
      createdAt: new Date().toISOString()
    },
    {
      id: 4,
      fullName: 'MSU Representative',
      email: 'rep@msu.ru',
      password: 'rep123',
      role: 'representative',
      universityId: 2, // Lomonosov Moscow State University
      universityName: 'Lomonosov Moscow State University',
      isVerified: true,
      avatarUrl: '/img/universities/uni_2_logo.jpg',
      avatarStatus: 'approved',
      createdAt: new Date().toISOString()
    },
    {
      id: 5,
      fullName: 'Student (ITMO)',
      email: 'student@itmo.ru',
      password: 'student123',
      role: 'student',
      universityId: 7,
      universityName: 'ITMO University',
      isVerified: true,
      karmaPoints: 500,
      avatarUrl: null,
      avatarStatus: 'approved',
      createdAt: new Date().toISOString()
    },
    {
      id: 6,
      fullName: 'Student (HSE)',
      email: 'ivan@hse.ru',
      password: 'ivan123',
      role: 'student',
      universityId: 1,
      universityName: 'Higher School of Economics',
      isVerified: true,
      karmaPoints: 100,
      avatarUrl: null,
      avatarStatus: 'approved',
      createdAt: new Date().toISOString()
    },
    {
      id: 7,
      fullName: 'Sample Applicant',
      email: 'applicant@test.com',
      password: 'app123',
      role: 'applicant',
      nationality: 'Italy',
      isVerified: false,
      avatarUrl: null,
      avatarStatus: 'approved',
      createdAt: new Date().toISOString()
    },
    {
      id: 8,
      fullName: 'Maria Applicant',
      email: 'maria@test.com',
      password: 'maria123',
      role: 'applicant',
      nationality: 'Nigeria',
      isVerified: false,
      avatarUrl: null,
      avatarStatus: 'approved',
      createdAt: new Date().toISOString()
    }
  ],
  nextUserId: 9,

  // ---- Universities ----
  universities: [
    { 
      id: 1, 
      name: 'RUDN University', 
      city: 'Moscow', 
      logo: '/img/universities/uni_1_logo.jpg', 
      image: '/img/universities/uni_1_building.png',
      description: 'The Peoples\' Friendship University of Russia is a world-class research university, famous for its international student community and diverse academic programs.' 
    },
    { 
      id: 2, 
      name: 'Moscow State University (MSU)', 
      city: 'Moscow', 
      logo: '/img/universities/uni_2_logo.jpg', 
      image: '/img/universities/uni_2_building.jpg',
      description: 'Lomonosov Moscow State University is the oldest and largest Russian university, consistently ranked as the best in the country.' 
    },
    { 
      id: 3, 
      name: 'Saint Petersburg State University (SPbSU)', 
      city: 'Saint Petersburg', 
      logo: '/img/universities/uni_3_logo.jpg', 
      image: '/img/universities/uni_3_building.jpg',
      description: 'A premier educational institution in the cultural capital, offering a rich history and excellence in science and humanities.' 
    },
    { 
      id: 4, 
      name: 'Kazan Federal University', 
      city: 'Kazan', 
      logo: '/img/universities/uni_4_logo.jpg', 
      image: '/img/universities/uni_4_building.jpg',
      description: 'One of the oldest universities in Russia, located in the multi-ethnic city of Kazan, blending tradition with modern research.' 
    },
    { 
      id: 5, 
      name: 'Novosibirsk State University', 
      city: 'Novosibirsk', 
      logo: '/img/universities/uni_5_logo.jpg', 
      image: '/img/universities/uni_5_building.jpg',
      description: 'Located in the famous Akademgorodok, NSU is a leading center for physics, mathematics, and natural sciences.' 
    },
    { 
      id: 6, 
      name: 'Tomsk State University', 
      city: 'Tomsk', 
      logo: '/img/universities/uni_6_logo.png', 
      image: '/img/universities/uni_6_building.jpg',
      description: 'The first university in Siberia, known for its high-quality research and vibrant student life in the "Siberian Athens".' 
    },
    { 
      id: 7, 
      name: 'ITMO University', 
      city: 'Saint Petersburg', 
      logo: '/img/universities/uni_7_logo.png', 
      image: '/img/universities/uni_7_building.jpg',
      description: 'Russia\'s first non-classical university, focusing on information technology, photonics, and robotics.' 
    },
    { 
      id: 8, 
      name: 'Bauman Moscow State Technical University', 
      city: 'Moscow', 
      logo: '/img/universities/uni_8_logo.jpg', 
      image: '/img/universities/uni_8_building.jpg',
      description: 'The oldest and largest technical university in Russia, producing top-tier engineers and space technology experts.' 
    },
    { 
      id: 9, 
      name: 'Ural Federal University', 
      city: 'Yekaterinburg', 
      logo: '/img/universities/uni_9_logo.jpg', 
      image: '/img/universities/uni_9_building.jpg',
      description: 'One of the largest higher educational institutions in Russia, acting as a core of the research and innovation cluster in the Urals.' 
    },
    { 
      id: 10, 
      name: 'Higher School of Economics (HSE)', 
      city: 'Moscow', 
      logo: '/img/universities/uni_10_logo.png', 
      image: '/img/universities/uni_10_building.jpg',
      description: 'A leading center for economics and social sciences in Russia, implementing modern international standards of education.' 
    }
  ],

  // ---- Countries (for country groups) ----
  countries: [
    { code: 'EG', name: 'Egypt', icon: 'flag' },
    { code: 'DZ', name: 'Algeria', icon: 'flag' },
    { code: 'MA', name: 'Morocco', icon: 'flag' },
    { code: 'IN', name: 'India', icon: 'flag' },
    { code: 'CN', name: 'China', icon: 'flag' },
    { code: 'TR', name: 'Turkey', icon: 'flag' },
    { code: 'IQ', name: 'Iraq', icon: 'flag' },
    { code: 'SY', name: 'Syria', icon: 'flag' },
    { code: 'NG', name: 'Nigeria', icon: 'flag' },
    { code: 'VN', name: 'Vietnam', icon: 'flag' },
    { code: 'TN', name: 'Tunisia', icon: 'flag' },
    { code: 'JO', name: 'Jordan', icon: 'flag' },
    { code: 'PK', name: 'Pakistan', icon: 'flag' },
    { code: 'BD', name: 'Bangladesh', icon: 'flag' },
    { code: 'YE', name: 'Yemen', icon: 'flag' }
  ],

  // ---- Country Groups ----
  groups: [], // Will be auto-generated from countries on init

  // ---- Group Messages ----
  messages: [],
  nextMessageId: 1,

  // ---- Group Memberships ----
  memberships: [], // { userId, groupId, joinedAt }

  // ---- Group Join Requests ----
  groupRequests: [], // { id, userId, userName, groupId, groupName, reason, status, requestedAt }
  nextGroupRequestId: 1,

  // ---- Verification Documents ----
  documents: [], // Global tracking for admin
  nextDocId: 1,

  // ---- Service Types ----
  serviceTypes: [
    { id: 'airport_pickup', name: 'Airport Pickup', icon: 'airplane', price: 50, description: 'A verified student meets you at the airport and helps with transport and settlement.' },
    { id: 'student_consultation', name: 'Student Consultation', icon: 'chat', price: 10, description: 'Voice/video call with a real student at your target university. First session free!', firstFree: true },
    { id: 'representative_call', name: 'University Representative Call', icon: 'building', price: 0, description: 'Direct call with an official university representative.' },
    { id: 'scholarship_guidance', name: 'Scholarship Guidance', icon: 'clipboard', price: 15, description: 'Navigate scholarship opportunities and application processes.' },
    { id: 'migration_help', name: 'Migration Assistance', icon: 'document', price: 20, description: 'Help with visa, registration, and document requirements.' },
    { id: 'bank_sim', name: 'Bank Account & SIM Card', icon: 'creditcard', price: 0, description: 'Guidance for opening bank accounts and getting SIM cards via our partners.' }
  ],

  // ---- Service Bookings ----
  bookings: [],
  nextBookingId: 1,

  // ---- Private Chats (between Student & Applicant) ----
  privateChats: [], // { id, bookingId, studentId, applicantId, createdAt }
  nextPrivateChatId: 1,

  // ---- Private Messages ----
  privateMessages: [], // { id, chatId, senderId, text, sentAt }
  nextPrivateMessageId: 1,

  // ---- University-Service Mapping ----
  universityServices: [], // { universityId, serviceTypeId }

  // ---- Events ----
  events: [
    {
      id: 1,
      title: 'World Youth Festival',
      date: '2026-03-01',
      location: 'Sirius (Sochi)',
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1000',
      description: 'The largest youth event in the world, bringing together top leaders, activists, and students from across the globe.',
      link: 'https://fest2024.com/en',
      category: 'Forum'
    },
    {
      id: 2,
      title: 'Kazan Digital Week',
      date: '2026-09-20',
      location: 'Kazan Expo',
      image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1000',
      description: 'An international platform for discussing digital transformation in economy, social sphere, and governance.',
      link: 'https://kazandigitalweek.com/en',
      category: 'Tech'
    },
    {
      id: 3,
      title: 'SPIEF 2026',
      date: '2026-06-12',
      location: 'St. Petersburg',
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1000',
      description: 'St. Petersburg International Economic Forum — a unique event in the world of business and economy.',
      link: 'https://forumspb.com/en',
      category: 'Economy'
    },
    {
      id: 4,
      title: 'Russia — Land of Opportunity',
      date: '2026-05-15',
      location: 'Moscow, VDNKh',
      image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=1000',
      description: 'A platform for personal growth and professional development for young people in Russia.',
      link: 'https://rsv.ru',
      category: 'Social'
    }
  ]
};

// Allocate random services to universities (except bank_sim)
function initUniversityServices() {
  const uniServiceTypes = store.serviceTypes.filter(s => s.id !== 'bank_sim');

  store.universities.forEach(uni => {
    // Each uni gets 2-4 random services
    const count = 2 + Math.floor(Math.random() * 3);
    const shuffled = [...uniServiceTypes].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);

    selected.forEach(service => {
      store.universityServices.push({
        universityId: uni.id,
        serviceTypeId: service.id
      });
    });
  });
}

// Auto-generate country groups + one "All Foreign Students" group
function initGroups() {
  let id = 1;
  store.countries.forEach(country => {
    store.groups.push({
      id: id++,
      countryCode: country.code,
      name: `${country.name} Students in Russia`,
      flag: country.icon,
      description: `Verified community for ${country.name} students studying in Russia.`,
      isCountryGroup: true
    });
  });
  // Add the unified group
  store.groups.push({
    id: id++,
    countryCode: 'ALL',
    name: 'All Foreign Students',
    flag: 'globe',
    description: 'Unified community for all verified foreign students in Russia.',
    isCountryGroup: false
  });

  // Add University specific groups
  store.universities.forEach(uni => {
    let shortMatch = uni.name.match(/\(([^)]+)\)/);
    let shortName = shortMatch ? shortMatch[1] : uni.name.split(' ')[0];
    
    store.groups.push({
      id: id++,
      isUniversityGroup: true,
      universityId: uni.id,
      name: `University chat (${shortName})`,
      flag: 'building',
      description: `Official group chat for students of ${uni.name}.`
    });
  });
}

initGroups();
initUniversityServices();

module.exports = store;
