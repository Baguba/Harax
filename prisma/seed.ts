/* Harax seed — realistic Haramaya University community data.
   Run: bun prisma/seed.ts */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const AV = (name: string) => `/api/avatar?name=${encodeURIComponent(name)}&seed=${encodeURIComponent(name.toLowerCase().replace(/\s+/g, "-"))}`;
const OG = (title: string, cat: string, seed: string) => `/api/og?title=${encodeURIComponent(title)}&cat=${cat}&seed=${encodeURIComponent(seed)}`;

const days = (n: number) => new Date(Date.now() + n * 86400_000);
const mins = (n: number) => new Date(Date.now() + n * 60_000);

async function main() {
  console.log("🌱 Seeding Harax…");

  const pass = await bcrypt.hash("harax2026", 12);

  // ── People ────────────────────────────────────────────────
  const ict = await db.user.create({ data: {
    email: "ict.office@haramaya.edu.et", passwordHash: pass, name: "Haramaya ICT Office",
    role: "SUPERADMIN", verified: true, avatarUrl: AV("Haramaya ICT"),
    department: "ICT Directorate", bio: "Official superadmin of Harax. We keep the platform safe.",
    provider: "credentials",
  }});
  const registrar = await db.user.create({ data: {
    email: "registrar@haramaya.edu.et", passwordHash: pass, name: "Registrar Office",
    role: "ADMIN", verified: true, avatarUrl: AV("Registrar Office"),
    department: "Registrar", bio: "Announcements, schedules, deadlines — straight from the source.",
  }});
  const union = await db.user.create({ data: {
    email: "union@haramaya.edu.et", passwordHash: pass, name: "Haramaya Student Union",
    role: "ADMIN", verified: true, avatarUrl: AV("Student Union"),
    department: "Student Union", bio: "By students, for students. Your voice on campus.",
  }});

  const lecturers = await Promise.all([
    { email: "dr.meron@haramaya.edu.et", name: "Dr. Meron Tadesse", department: "Computer Science",
      bio: "Lecturer @ CS · AI & data enthusiast · office hours Tue/Thu 2–4pm, Block C." },
    { email: "alemayehu.w@haramaya.edu.et", name: "Dr. Alemayehu Wassie", department: "Plant Sciences",
      bio: "Plant Sciences lecturer. If it photosynthesizes, I probably love it." },
    { email: "bekele.g@haramaya.edu.et", name: "Prof. Bekele Gulilat", department: "Agricultural Economics",
      bio: "Agri-Econ professor. 25 years at Haramaya. Coffee & econometrics." },
    { email: "yonas.k@haramaya.edu.et", name: "Dr. Yonas Kibret", department: "Medicine",
      bio: "Medicine lecturer, campus health advocate." },
  ].map((l) => db.user.create({ data: {
    ...l, passwordHash: pass, role: "LECTURER", verified: true, avatarUrl: AV(l.name), provider: "credentials",
  }})));
  const [meron, alemayehu, bekele, yonas] = lecturers;

  const studentsData = [
    { email: "selam.awoke@gmail.com", name: "Selam Awoke", department: "Computer Science", year: "3rd Year",
      bio: "CS 3rd year 💻 · baking enthusiast · will debug your code for injera" },
    { email: "dawit.mengistu@gmail.com", name: "Dawit Mengistu", department: "Agricultural Economics", year: "2nd Year",
      bio: "Agri-econ, football on weekends, FIFA on weeknights ⚽" },
    { email: "hanna.gebre@gmail.com", name: "Hanna Gebre", department: "Medicine", year: "4th Year",
      bio: "Med student surviving on coffee and call shifts 🩺" },
    { email: "yonas.haile@gmail.com", name: "Eyob Haile", department: "Law", year: "3rd Year",
      bio: "Law student. Debating since birth." },
    { email: "tigist.bekele@gmail.com", name: "Tigist Bekele", department: "Business Management", year: "2nd Year",
      bio: "Future CEO, currently a professional procrastinator ✨" },
    { email: "bereket.tesfaye@gmail.com", name: "Bereket Tesfaye", department: "Engineering", year: "1st Year",
      bio: "Freshman energy 🔋 campus explorer" },
    { email: "mahlet.assefa@gmail.com", name: "Mahlet Assefa", department: "Nursing", year: "3rd Year",
      bio: "Nursing student, plant mom 🌿" },
    { email: "rediet.girma@gmail.com", name: "Rediet Girma", department: "Education", year: "2nd Year",
      bio: "Future teacher, current choir soloist 🎶" },
    { email: "abenezer.ayalew@gmail.com", name: "Abenezer Ayalew", department: "Computer Science", year: "4th Year",
      bio: "Senior dev guy. Building things at 3am. Hire me." },
    { email: "fatuma.ahmed@gmail.com", name: "Fatuma Ahmed", department: "Veterinary Medicine", year: "3rd Year",
      bio: "Vet student — yes, I will look at your dog." },
    { email: "kidus.wolde@gmail.com", name: "Kidus Wolde", department: "Economics", year: "1st Year",
      bio: "Econ freshman. Chess club recruit." },
    { email: "betty.solomon@gmail.com", name: "Betty Solomon", department: "Natural Sciences", year: "2nd Year",
      bio: "Biology + photography 📸" },
    { email: "naol.girma@gmail.com", name: "Naol Girma", department: "Computer Science", year: "2nd Year",
      bio: "Just here for the memes." },
    { email: "heran.mesfin@gmail.com", name: "Heran Mesfin", department: "Social Sciences", year: "4th Year",
      bio: "Final year. Thesis mode ON." },
    { email: "samuel.tade@gmail.com", name: "Samuel Tade", department: "Plant Sciences", year: "3rd Year",
      bio: "Greenhouse gang 🌱" },
  ];
  const students = await Promise.all(
    studentsData.map((s) => db.user.create({ data: {
      ...s, passwordHash: pass, role: "STUDENT", verified: true, avatarUrl: AV(s.name), provider: "credentials",
    }}))
  );
  const [selam, dawit, hanna, eyob, tigist, bereket, mahlet, rediet, abenezer, fatuma, kidus, betty, naol, heran, samuel] = students;

  // ── Channels ──────────────────────────────────────────────
  const chOfficial = await db.channel.create({ data: {
    name: "Haramaya Official", handle: "haramaya", description: "Verified news & announcements from Haramaya University management.",
    official: true, ownerId: ict.id, avatarUrl: AV("Haramaya University"),
  }});
  const chRegistrar = await db.channel.create({ data: {
    name: "Registrar Announcements", handle: "registrar", description: "Deadlines, registration windows, exam schedules, results.",
    official: true, ownerId: registrar.id, avatarUrl: AV("Registrar"),
  }});
  const chUnion = await db.channel.create({ data: {
    name: "Student Union HQ", handle: "union", description: "Union events, welfare updates and campus improvement projects.",
    official: true, ownerId: union.id, avatarUrl: AV("Union HQ"),
  }});
  const chStartups = await db.channel.create({ data: {
    name: "Campus Startups", handle: "startups", description: "Student founders, pitch nights and innovation hub updates.",
    ownerId: meron.id, avatarUrl: AV("Campus Startups"),
  }});
  const chCafeteria = await db.channel.create({ data: {
    name: "Cafeteria Watch", handle: "cafeteria", description: "Daily menu + honest reviews. Community-powered.",
    ownerId: dawit.id, avatarUrl: AV("Cafeteria"),
  }});

  for (const u of [ict, registrar, union, meron, ...students.slice(0, 10)]) {
    await db.channelSubscriber.create({ data: { channelId: chOfficial.id, userId: u.id } }).catch(() => undefined);
    await db.channelSubscriber.create({ data: { channelId: chRegistrar.id, userId: u.id } }).catch(() => undefined);
  }
  for (const u of [union, selam, dawit, hanna, tigist, bereket, mahlet, rediet]) {
    await db.channelSubscriber.create({ data: { channelId: chUnion.id, userId: u.id } }).catch(() => undefined);
  }

  // ── Groups ────────────────────────────────────────────────
  const gCS = await db.group.create({ data: {
    name: "CS 3rd Year Squad", description: "Computer Science class of 2027 — assignments, memes and late-night lab sessions.",
    emoji: "🔥", ownerId: selam.id,
  }});
  const gAgri = await db.group.create({ data: {
    name: "Agri-Econ Study Circle", description: "Weekly study sessions for Agribusiness & Econometrics. Coffee provided ☕",
    emoji: "📚", ownerId: bekele.id,
  }});
  const gFootball = await db.group.create({ data: {
    name: "Haramaya Football Fans", description: "Campus league talk, matchday meetups, FIFA tournaments.",
    emoji: "⚽", ownerId: dawit.id,
  }});
  const gMed = await db.group.create({ data: {
    name: "Med Students Hangout", description: "Med & nursing students. Call-shift survival tips.",
    emoji: "🩺", ownerId: hanna.id,
  }});
  const gDorm = await db.group.create({ data: {
    name: "Dorm 7 Brotherhood", description: "Dorm 7 residents only. Loud after 10pm, sorry not sorry.",
    emoji: "🛏️", ownerId: bereket.id,
  }});
  const gPoetry = await db.group.create({ data: {
    name: "Spoken Word Club", description: "Poetry nights, open mics, Amharic & Afaan Oromo poetry.",
    emoji: "🎤", ownerId: rediet.id,
  }});

  const memberships: Array<[string, typeof students, string]> = [
    [gCS.id, [selam, abenezer, naol, betty, mahlet], "MEMBER"],
    [gAgri.id, [dawit, kidus, tigist, heran, samuel], "MEMBER"],
    [gFootball.id, [dawit, bereket, eyob, kidus, samuel, naol], "MEMBER"],
    [gMed.id, [hanna, mahlet, fatuma, rediet], "MEMBER"],
    [gDorm.id, [bereket, kidus, naol, samuel, dawit], "MEMBER"],
    [gPoetry.id, [rediet, heran, betty, selam, tigist], "MEMBER"],
  ];
  for (const [gid, users, role] of memberships) {
    for (const u of users) {
      await db.groupMember.create({ data: { groupId: gid, userId: u.id, role } }).catch(() => undefined);
    }
  }

  // ── SideChat rooms (the fun zone) ─────────────────────────
  const teaRoom = await db.sideRoom.create({ data: {
    key: "leku-tea", name: "Leku Tea Room", emoji: "☕",
    description: "Campus tea, lightly spilled. Keep it fun, keep it kind.",
  }});
  const memeRoom = await db.sideRoom.create({ data: {
    key: "meme-factory", name: "Meme Factory", emoji: "😂",
    description: "The campus meme economy. Post or lurk, no judgement.",
  }});
  const confessionRoom = await db.sideRoom.create({ data: {
    key: "confessions", name: "Confession Booth", emoji: "🤫",
    description: "Anonymous confessions. Zero names, zero shame.",
  }});
  const foodRoom = await db.sideRoom.create({ data: {
    key: "food-court", name: "Food Court Reviews", emoji: "🍟",
    description: "Live reviews of today's shiro, firfir and everything in between.",
  }});
  const crushRoom = await db.sideRoom.create({ data: {
    key: "crush-radar", name: "Crush Radar", emoji: "💘",
    description: "Anonymous crushes & campus matcha-mance. PG-rated only!",
  }});

  // ── Events ────────────────────────────────────────────────
  const events = [
    { title: "Freshman Welcome Night", cat: "CULTURE", loc: "Main Campus Amphitheatre",
      startsAt: days(3), endsAt: days(3), organizer: union.id,
      cover: OG("Freshman Welcome Night", "CULTURE", "freshman-night"),
      desc: "The biggest welcome party of the year! Live music from campus bands, cultural dance shows, free buffet and the legendary seniors-vs-freshers dance battle. Gates open 6:00 PM. Bring your student ID and your best energy." },
    { title: "Haramaya Research Symposium 2026", cat: "ACADEMIC", loc: "Main Library Conference Hall",
      startsAt: days(8), endsAt: days(9), organizer: ict.id,
      cover: OG("Research Symposium 2026", "ACADEMIC", "research-symposium"),
      desc: "Two days of research presentations from all colleges. Guest keynote from Addis Ababa University. Poster sessions, PhD showcases and networking lunch. Register early — seats fill fast." },
    { title: "Inter-College Football Final", cat: "SPORTS", loc: "Haramaya Stadium",
      startsAt: days(5), organizer: dawit.id,
      cover: OG("Inter-College Football Final", "SPORTS", "football-final"),
      desc: "CS College vs Agriculture College — the rematch everyone has been waiting for. Kick-off 4:00 PM. Face paint station at gate 2. Losers buy the winners dinner for a week." },
    { title: "Career & Job Fair", cat: "CAREER", loc: "Student Center",
      startsAt: days(12), endsAt: days(13), organizer: registrar.id,
      cover: OG("Career & Job Fair", "CAREER", "career-fair"),
      desc: "40+ employers including Ethiopian Airlines, CBE, Safaricom and local agri-tech startups. Bring printed CVs. Free LinkedIn headshot booth. Mock interview slots available at the union desk." },
    { title: "Ethiopian Culture Day", cat: "CULTURE", loc: "Central Lawn",
      startsAt: days(15), organizer: union.id,
      cover: OG("Ethiopian Culture Day", "CULTURE", "culture-day"),
      desc: "Traditional food bazaar, coffee ceremony, Oromo/Amhara/Tigray/Somali cultural exhibitions and a fashion show of habesha kemis and kaba. Wear your cultural outfit!" },
    { title: "Hack Haramaya — 48h Hackathon", cat: "CLUB", loc: "Innovation Hub, Block C",
      startsAt: days(20), endsAt: days(22), organizer: meron.id,
      cover: OG("Hack Haramaya 48h", "CLUB", "hack-haramaya"),
      desc: "Build an app in 48 hours that solves a campus problem. Teams of 4. Free wi-fi, unlimited coffee, sleeping bags allowed. Winning team takes 15,000 ETB and internship interviews." },
    { title: "Blood Donation Drive", cat: "CAMPUS", loc: "Near Main Gate",
      startsAt: days(1), organizer: yonas.id,
      cover: OG("Blood Donation Drive", "CAMPUS", "blood-donation"),
      desc: "Haramaya Teaching Hospital blood bank needs 200 units before the rainy season. Donation takes 15 minutes, juice and biscuits provided. Bring a friend, save a life." },
    { title: "Poetry Night: Voices of Harar", cat: "CLUB", loc: "Spoken Word Garden",
      startsAt: days(-2), organizer: rediet.id,
      cover: OG("Poetry Night", "CLUB", "poetry-night"),
      desc: "Open mic poetry night under the acacia tree. Amharic, Afaan Oromo and English poems. Was beautiful — thank you everyone who performed!" },
  ];
  const evRecords = [];
  for (const e of events) {
    evRecords.push(await db.event.create({ data: {
      title: e.title, description: e.desc, location: e.loc, category: e.cat,
      startsAt: e.startsAt, endsAt: e.endsAt, organizerId: e.organizer, coverUrl: e.cover,
    }}));
  }
  const rsvpPool = [selam, dawit, hanna, tigist, bereket, mahlet, rediet, abenezer, fatuma, kidus, betty, naol, heran, samuel, eyob];
  for (let i = 0; i < evRecords.length; i++) {
    for (let j = 0; j < rsvpPool.length; j++) {
      if ((i + j) % 3 !== 0) {
        await db.rsvp.create({ data: {
          eventId: evRecords[i].id, userId: rsvpPool[j].id,
          status: (i + j) % 5 === 0 ? "INTERESTED" : "GOING",
        }}).catch(() => undefined);
      }
    }
  }

  // ── Public posts (the feed) ───────────────────────────────
  type PostSeed = { author: string; content: string; media?: string; mediaType?: string; days: number };
  const postSeeds: PostSeed[] = [
    { author: selam.id, days: 0.05, content: "Sunset over the experimental farms today hit different 🌅 No filter, straight from the iPhone. Haramaya really said 'let me show off before finals week.' ☕📚" },
    { author: ict.id, days: 0.2, content: "⚡ NETWORK MAINTENANCE: Internet will be down in the dorms this Saturday 2:00–5:00 AM for fiber upgrades. Plan your Netflix accordingly 😅 Use the library hotspot if you must." },
    { author: dawit.id, days: 0.35, content: "Lost my student ID somewhere between the cafeteria and Dorm 7. Name's on it. Free doro kit meal from me if you return it 🙏", media: OG("Lost ID Card", "CAMPUS", "lost-id"), mediaType: "image" },
    { author: meron.id, days: 0.5, content: "Reminder to my CS students: assignment 3 deadline is Friday midnight. Yes, GitHub Copilot counts only if you can explain every line — I will ask you in the viva 😌" },
    { author: tigist.id, days: 0.8, content: "Marketing class group project and my team just chose 'Selling Harar coffee to Gen Z' as our topic. Honestly? Easy A. ☕📈", media: OG("Harar Coffee Gen Z", "ACADEMIC", "coffee-project"), mediaType: "image" },
    { author: hanna.id, days: 1.1, content: "Survived my first night shift rotation at the teaching hospital. 14 hours. Respect to every nurse out there — you are the real MVPs 🩺💪" },
    { author: bereket.id, days: 1.4, content: "Freshman survival tip #47: the 7:30 AM bus from main campus fills by 7:15. Ask me how I walked 40 minutes in the sun to Plant Sciences today ☠️☀️" },
    { author: rediet.id, days: 1.7, content: "Choir practice recordings from yesterday. We are so ready for Culture Day, my voice is GONE but my spirit is UP 🎶✨", media: OG("Choir Practice", "CULTURE", "choir"), mediaType: "image" },
    { author: abenezer.id, days: 2, content: "Shipped my final year project: an offline Amharic flashcard app for primary schools. Built it in the innovation hub at 3am. Demo link in comments — feedback welcome! 🇪🇹📱" },
    { author: alemayehu.id, days: 2.3, content: "Greenhouse field trip with the Plant Sciences 3rd years this Thursday. Wear closed shoes. Yes, you will be quizzed on coffee leaf rust — consider this a gentle warning 🌱" },
    { author: naol.id, days: 2.6, content: "they upgraded the cafeteria shiro recipe and nobody is talking about it?? this is the biggest news on campus 🍲" },
    { author: mahlet.id, days: 2.9, content: "Study spot tier list, final edition:\nS-tier: 4th floor library corner (silence + sockets)\nA-tier: Innovation hub (coffee machine)\nB-tier: under the acacia tree (weather dependent)\nF-tier: dorm common room (good luck) 📚", media: OG("Study Spot Tier List", "CAMPUS", "study-tierlist"), mediaType: "image" },
    { author: fatuma.id, days: 3.2, content: "Vet clinic open day photos! We vaccinated 60 campus cats and dogs today. If the orange cat near Block D likes you, that's a sign 🐈" },
    { author: samuel.id, days: 3.5, content: "The greenhouse tomatoes are READY. First harvest of the semester. Shoutout to the 5:30 AM watering crew, legends only 🍅", media: OG("Harvest Day", "CAMPUS", "harvest"), mediaType: "image" },
    { author: kidus.id, days: 3.8, content: "Chess club crushed it at the inter-college tournament — we took 1st and 3rd! ♟️🏆 Next beginners' workshop is open to all, zero experience needed." },
    { author: heran.id, days: 4.1, content: "Thesis update: 61 pages, 2 chapters left, 4 mental breakdowns. Mileage may vary. Send coffee ☕😭" },
    { author: betty.id, days: 4.5, content: "Photography club golden hour walk this Friday — meeting at the water tower at 5:30 PM. Bring any camera, phones totally fine. Last walk gave us the most insane fog shots 📷", media: OG("Golden Hour Walk", "CLUB", "golden-hour"), mediaType: "image" },
    { author: eyob.id, days: 4.9, content: "Moot court practice went 3 hours over and I loved every minute. If you see a law student wandering campus muttering 'objection', mind your business 🧑‍⚖️" },
  ];

  const reactionSets = [
    { users: [selam, dawit, hanna, tigist, mahlet, betty], reactions: ["LIKE", "LOVE", "FIRE", "LIKE", "CLAP", "LOVE"] },
    { users: [dawit, bereket, naol, kidus], reactions: ["LAUGH", "LIKE", "LAUGH", "LIKE"] },
    { users: [hanna, fatuma, rediet, selam, mahlet], reactions: ["LOVE", "LOVE", "CLAP", "LIKE", "FIRE"] },
    { users: [abenezer, naol, samuel], reactions: ["FIRE", "LIKE", "CLAP"] },
  ];

  const posts: string[] = [];
  for (let i = 0; i < postSeeds.length; i++) {
    const s = postSeeds[i];
    const post = await db.post.create({ data: {
      authorId: s.author, content: s.content,
      mediaUrl: s.media, mediaType: s.mediaType, audience: "PUBLIC",
      createdAt: days(-s.days), pinned: i === 1,
    }});
    posts.push(post.id);
    const rs = reactionSets[i % reactionSets.length];
    for (let j = 0; j < rs.users.length; j++) {
      await db.like.create({ data: { postId: post.id, userId: rs.users[j].id, reaction: rs.reactions[j] } }).catch(() => undefined);
    }
    const commenters = [selam, dawit, hanna, naol, tigist, mahlet];
    const commentTexts = [
      "This is so real 😂", "W badge, congrats!! 🔥", "Screaming, crying, throwing up (positive)", "Adding this to my notes immediately 📝",
      "See you there!", "Okay but the campus really does look like this every evening, we're blessed 🙏",
    ];
    const nComments = (i % 3) + 1;
    for (let j = 0; j < nComments; j++) {
      await db.comment.create({ data: {
        postId: post.id, authorId: commenters[(i + j) % commenters.length].id,
        content: commentTexts[(i * 2 + j) % commentTexts.length],
        createdAt: days(-s.days + 0.05),
      }});
    }
  }

  // Channel posts (broadcasts)
  const channelPosts = [
    { ch: chOfficial.id, author: ict.id, content: "📢 OFFICIAL: The university calendar for 2026/27 academic year is now live on the notice board and the portal. Semester 1 exams begin January 12. Full schedule → office of the registrar.", days: 0.3 },
    { ch: chRegistrar.id, author: registrar.id, content: "⚠️ ADD/DROP DEADLINE: Course registration changes close this Friday at 4:00 PM. No extensions after that — plan with your advisor now.", days: 0.7 },
    { ch: chRegistrar.id, author: registrar.id, content: "📚 Exam seating charts for the mid-terms have been posted outside the registrar's office. Check your block & bench number before exam day.", days: 1.9 },
    { ch: chUnion.id, author: union.id, content: "🗳 STUDENT UNION ELECTIONS: Candidate registration is open for the 2026 student union elections! Pick up forms at the union office. Deadline in 10 days. Your campus, your voice.", days: 1.2 },
    { ch: chUnion.id, author: union.id, content: "🚰 We heard you — 3 new water stations are being installed at the dorms and the stadium starting next week. Report anything broken via the union desk.", days: 2.4 },
    { ch: chStartups.id, author: meron.id, content: "🚀 Applications for the Innovation Hub incubator cohort 4 are OPEN. 12 weeks, mentors, workspace and seed funding up to 50k ETB. Apply via the hub office in Block C.", days: 1.6 },
    { ch: chCafeteria.id, author: dawit.id, content: "🍟 CAFETERIA TODAY: Shiro + rice (7.5/10, the upgrade is REAL), pasta with tomato sauce (6/10, bring your own pepper), and bean soup that actually slaps (8/10). Prices unchanged.", days: 0.4 },
  ];
  for (const cp of channelPosts) {
    const post = await db.post.create({ data: {
      authorId: cp.author, content: cp.content, audience: "CHANNEL", channelId: cp.ch, createdAt: days(-cp.days),
    }});
    posts.push(post.id);
    for (const u of [selam, dawit, hanna, tigist].slice(0, (cp.days % 3) + 1)) {
      await db.like.create({ data: { postId: post.id, userId: u.id, reaction: "LIKE" } }).catch(() => undefined);
    }
  }

  // Group posts
  await db.post.create({ data: { authorId: selam.id, content: "Lab 4 report submission moved to Sunday 11:59 PM. You're welcome 😌", audience: "GROUP", groupId: gCS.id, createdAt: days(-0.3) } });
  await db.post.create({ data: { authorId: abenezer.id, content: "Who has the Data Structures past paper from 2023? Trading for my coffee place in line ☕", audience: "GROUP", groupId: gCS.id, createdAt: days(-1.1) } });
  await db.post.create({ data: { authorId: bekele.id, content: "Thursday study circle topic: supply curves under price ceilings. Bring your problem set 2 attempts.", audience: "GROUP", groupId: gAgri.id, createdAt: days(-0.6) } });
  await db.post.create({ data: { authorId: dawit.id, content: "5-a-side signup sheet is in the pinned messages. First come first serve, no 'my cousin said he'd play' excuses this time ⚽", audience: "GROUP", groupId: gFootball.id, createdAt: days(-0.4) } });

  // ── Chat messages (groups) ────────────────────────────────
  const groupMsgs: Array<[string, string, string, number]> = [
    [gCS.id, selam.id, "guys the lab machines in room 12 are running the OLD compiler, if your code fails with no errors that's why", -500],
    [gCS.id, naol.id, "spent 3 hours on a missing semicolon. this degree is a scam", -490],
    [gCS.id, abenezer.id, "@naol welcome to programming 😂", -488],
    [gCS.id, betty.id, "who else is coming to the hackathon interest meeting tomorrow?", -300],
    [gFootball.id, dawit.id, "matchday 🗓️ Saturday 4PM, stadium. Agriculture thinks they're ready for us. they are NOT", -400],
    [gFootball.id, bereket.id, "scouting report: their #10 has fancy footwork but gets tired by 70th minute", -380],
    [gFootball.id, kidus.id, "my roommate wants to be goalkeeper, he has never kept in his LIFE 💀", -200],
    [gMed.id, hanna.id, "call shift ended 6am. i have become one with the hospital chair", -350],
    [gMed.id, mahlet.id, "hanna GO TO SLEEP", -340],
    [gPoetry.id, rediet.id, "open mic theme this month: 'letters we never sent' 💌 start writing!", -600],
    [gPoetry.id, heran.id, "i have three drafts already, one of them made ME cry", -590],
    [gDorm.id, bereket.id, "who's microwave is beeping since 6am... face me in the common room", -150],
  ];
  for (const [rid, uid, content, m] of groupMsgs) {
    await db.message.create({ data: { roomType: "GROUP", roomId: rid, senderId: uid, content, createdAt: mins(m) } });
  }

  // SideChat messages (anonymous vibes)
  const sideMsgs: Array<[string, string | null, string, string | null, number]> = [
    [teaRoom.id, selam.id, "someone left a full tray of sambusa in block B corridor. it disappeared in 4 minutes. who are you, heroes?", "NightOwl", -420],
    [teaRoom.id, dawit.id, "the drama in the economics department is better than netflix", "LekuLurker", -410],
    [teaRoom.id, null, "a squirrel stole my biscuit during the library all-nighter and honestly? respect", "Guest42", -390],
    [teaRoom.id, hanna.id, "prof walked into the wrong class and taught for 20 minutes before anyone said anything 😭", "LibraryGhost", -300],
    [memeRoom.id, naol.id, "day 47 of posting 'harihari' memes until the cafeteria gets the hint", "MemeLord", -350],
    [memeRoom.id, null, "me watching my GPA like it's a horror movie", "CouchPotato", -330],
    [memeRoom.id, betty.id, "photography students at golden hour are a different species", "ShutterBug", -310],
    [confessionRoom.id, null, "i pretended to study abroad applications but i was watching football highlights in the library. for 3 hours.", "Anon", -280],
    [confessionRoom.id, null, "i have a crush on the girl from the choir who sings the high notes. she will never know. this is my truth", "Anon", -260],
    [confessionRoom.id, null, "told my mom the wifi died to explain my grades. the wifi is fine. i am not.", "Anon", -240],
    [foodRoom.id, fatuma.id, "today's rice-to-shiro ratio was CRIMINAL. we need accountability", "FoodCritic", -200],
    [foodRoom.id, samuel.id, "bro the cafeteria aunty gave me extra firfir today because i complimented her scarf. strategy unlocked", "FirfirFan", -190],
    [crushRoom.id, null, "saw someone reading a whole novel under the acacia tree at sunset. i'm not saying i'm in love but i'm not NOT saying it 💚", "Anon", -150],
    [crushRoom.id, null, "to the person who held the door at the science block: your vibes? immaculate.", "Anon", -140],
  ];
  for (const [rid, uid, content, anon, m] of sideMsgs) {
    await db.message.create({ data: { roomType: "SIDECHAT", roomId: rid, senderId: uid, content, anonName: anon, createdAt: mins(m) } });
  }

  // ── Notifications for demo accounts ───────────────────────
  const notifs = [
    { userId: selam.id, type: "POST_REACTION", title: "Hanna Gebre loved your post", body: "\"Sunset over the experimental farms…\"", link: "feed" },
    { userId: selam.id, type: "POST_COMMENT", title: "Dawit commented on your post", body: "\"This is so real 😂\"", link: "feed" },
    { userId: selam.id, type: "CHANNEL_POST", title: "Haramaya Official", body: "📢 OFFICIAL: The university calendar for 2026/27…", link: "channel:haramaya" },
    { userId: selam.id, type: "EVENT_NEW", title: "New event: Freshman Welcome Night", body: "Sat at Main Campus Amphitheatre", link: "events" },
    { userId: dawit.id, type: "SYSTEM", title: "Welcome to Harax! ⚡", body: "Your campus, connected. Complete your profile to shine.", link: "settings" },
  ];
  for (const n of notifs) {
    await db.notification.create({ data: { ...n, read: false, createdAt: mins(-90) } });
  }

  // A couple of moderation reports to fill the admin queue
  const firstPost = await db.post.findFirst({ where: { audience: "PUBLIC" }, orderBy: { createdAt: "asc" } });
  if (firstPost) {
    await db.report.create({ data: { reporterId: tigist.id, targetType: "POST", targetId: firstPost.id, reason: "Spam-like content — please review.", status: "OPEN" } });
  }
  await db.report.create({ data: { reporterId: mahlet.id, targetType: "USER", targetId: naol.id, reason: "Posting memes at 4am, my phone won't stop buzzing 😅", status: "OPEN" } });

  const counts = {
    users: await db.user.count(), posts: await db.post.count(), events: await db.event.count(),
    groups: await db.group.count(), channels: await db.channel.count(),
    messages: await db.message.count(), sideRooms: await db.sideRoom.count(),
  };
  console.log("✅ Seed complete:", counts);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
