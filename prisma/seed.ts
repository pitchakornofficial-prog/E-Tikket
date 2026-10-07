import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();
const BCRYPT_COST = 12;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required seed configuration: ${name}`);
  return value;
}

function staffConfig(prefix: "ADMIN" | "ORGANIZER") {
  const email = requiredEnv(`SEED_${prefix}_EMAIL`).toLowerCase();
  const name = requiredEnv(`SEED_${prefix}_NAME`);
  const password = requiredEnv(`SEED_${prefix}_PASSWORD`);
  if (password.length < 8) {
    throw new Error(`SEED_${prefix}_PASSWORD must contain at least 8 characters`);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`SEED_${prefix}_EMAIL must be a valid email address`);
  }
  return { email, name, password, role: prefix as Role };
}

async function seedStaffAccount(prefix: "ADMIN" | "ORGANIZER") {
  const account = staffConfig(prefix);
  const passwordHash = await bcrypt.hash(account.password, BCRYPT_COST);

  return prisma.user.upsert({
    where: { email: account.email },
    create: {
      email: account.email,
      name: account.name,
      passwordHash,
      role: account.role,
    },
    update: {
      name: account.name,
      passwordHash,
      role: account.role,
    },
  });
}

async function seedCleanSampleEvents(organizerId: string) {
  // Clean up existing test data (including articles first to release event foreign keys)
  await prisma.article.deleteMany({});
  await prisma.articleTag.deleteMany({});
  await prisma.ticketScan.deleteMany({});
  await prisma.ticket.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.event.deleteMany({});

  const sampleEvents = [
    {
      name: "Summer Live Concert 2026",
      category: "Indie Pop",
      description: "คอนเสิร์ตอินดี้รับลมริมแม่น้ำเจ้าพระยา รวมศิลปินอินดี้ป็อปแถวหน้า พร้อมระบบเสียงคุณภาพระดับสตูดิโอ",
      imageUrl: "/poster-summer.svg",
      venue: "The Riverfront Warehouse (เจริญกรุง)",
      eventDate: new Date("2026-10-24"),
      startTime: "18:00",
      ticketPrice: 450.00,
      totalTickets: 100,
      status: "PUBLISHED" as const,
    },
    {
      name: "Neon Indie Rock Fest",
      category: "Rock",
      description: "ค่ำคืนแห่งเสียงกีตาร์ริฟฟ์หนักแน่น แสงไฟนีออน และดนตรี Indie Rock / Post-Punk แบบสดๆ เต็มอิ่ม",
      imageUrl: "/poster-indie.svg",
      venue: "The Underground Club (เอกมัย)",
      eventDate: new Date("2026-11-15"),
      startTime: "19:30",
      ticketPrice: 650.00,
      totalTickets: 120,
      status: "PUBLISHED" as const,
    },
    {
      name: "Acoustic in the Garden",
      category: "Acoustic",
      description: "ดนตรีโฟล์คและอคูสติกท่ามกลางสวนธรรมชาติ บรรยากาศสบายๆ ยามเย็น เหมาะสำหรับการพักผ่อนฟังเพลงชิลๆ",
      imageUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1200&q=80",
      venue: "Saranrom Garden Live Stage (พระนคร)",
      eventDate: new Date("2026-12-19"),
      startTime: "17:00",
      ticketPrice: 250.00,
      totalTickets: 80,
      status: "PUBLISHED" as const,
    },
    {
      name: "Midnight Electronic Wave",
      category: "EDM",
      description: "ปาร์ตี้ส่งท้ายปีเก่าต้อนรับปีใหม่กับดนตรี Electronic, Synthwave และ Bassline สั่นสะเทือนเวที",
      imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
      venue: "Space BKK Arena (รัชดา)",
      eventDate: new Date("2026-12-31"),
      startTime: "21:00",
      ticketPrice: 890.00,
      totalTickets: 200,
      status: "PUBLISHED" as const,
    },
  ];

  const eventMap: Record<string, string> = {};
  for (const eventData of sampleEvents) {
    const created = await prisma.event.create({
      data: {
        ...eventData,
        organizerId,
      },
    });
    eventMap[created.name] = created.id;
  }
  return eventMap;
}

async function seedArticles(
  adminId: string,
  organizerId: string,
  eventMap: Record<string, string>
) {
  // Categories
  const defaultCategories = [
    { name: "ข่าวอีเวนต์", slug: "event-news" },
    { name: "รีวิวคอนเสิร์ต", slug: "concert-reviews" },
    { name: "บทสัมภาษณ์ศิลปิน", slug: "artist-interviews" },
    { name: "แนะนำดนตรี", slug: "music-guides" },
  ];

  const categoryMap: Record<string, string> = {};
  for (const cat of defaultCategories) {
    const c = await prisma.articleCategory.upsert({
      where: { slug: cat.slug },
      create: cat,
      update: { name: cat.name },
    });
    categoryMap[cat.slug] = c.id;
  }

  // Tags
  const defaultTags = [
    { name: "ดนตรีสด", slug: "live-music" },
    { name: "Indie Rock", slug: "indie-rock" },
    { name: "Indie Pop", slug: "indie-pop" },
    { name: "Acoustic & Folk", slug: "acoustic" },
    { name: "Electronic & EDM", slug: "electronic" },
    { name: "เวทีดนตรีกรุงเทพ", slug: "bangkok-venues" },
    { name: "เทศกาลดนตรี", slug: "festival" },
    { name: "สัมภาษณ์พิเศษ", slug: "interview" },
    { name: "ทริกซื้อบัตร", slug: "ticket-tips" },
  ];

  for (const tag of defaultTags) {
    await prisma.articleTag.upsert({
      where: { slug: tag.slug },
      create: tag,
      update: { name: tag.name },
    });
  }

  const articlesData = [
    {
      title: "เปิดไลน์อัพและตารางเวลา Summer Live Concert 2026: รับลมริมเจ้าพระยา",
      slug: "summer-live-concert-2026-lineup-schedule",
      excerpt: "เตรียมพบกับคอนเสิร์ตอินดี้รับลมริมแม่น้ำเจ้าพระยา รวมศิลปินอินดี้ป็อปแถวหน้า พร้อมระบบเสียงคุณภาพระดับสตูดิโอ และตารางการแสดงฉบับเต็ม",
      coverImageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80",
      content: `## ปรากฏการณ์ดนตรีอินดี้ป็อปริมแม่น้ำเจ้าพระยา

**Summer Live Concert 2026** กำลังจะกลับมาสร้างความประทับใจอีกครั้งในวันเสาร์ที่ 24 ตุลาคม 2026 ณ **The Riverfront Warehouse (เจริญกรุง)** ท่ามกลางบรรยากาศโกดังเก่าริมแม่น้ำเจ้าพระยาที่ถูกเนรมิตให้เป็นเวทีคอนเสิร์ตระดับพรีเมียม

### ตารางการแสดง (Timetable)
- **17:00 น.** — ประตูเปิด (Doors Open) / รับบัตรและเครื่องดื่ม
- **18:00 - 19:00 น.** — วงเปิดพิเศษ (Opening Act โดย Local Indie Band)
- **19:15 - 20:30 น.** — Sunset Session ดนตรีฟีลกู๊ดรับลมเย็น
- **20:45 - 22:30 น.** — Main Headline Act การแสดงเต็มรูปแบบ 1 ชั่วโมง 45 นาที

### ไฮไลท์พิเศษที่คุณไม่ควรพลาด
1. **Studio Sound System:** ระบบเสียงระดับสตูดิโอ ออกแบบ acoustic ให้เหมาะกับโครงสร้างโกดังริมน้ำโดยเฉพาะ
2. **Food & Craft Beverage Market:** โซนอาหารและเครื่องดื่มคราฟต์จากร้านดังย่านเจริญกรุง
3. **E-Ticket Fast Track:** สแกน QR Code เข้างานได้ทันทีผ่านระบบ E-Tikket พร้อมสิทธิ์ Re-entry เข้าออกได้ตลอดทั้งงาน

> "เราอยากให้ทุกคนได้สัมผัสทั้งเสียงดนตรีและสายลมริมแม่น้ำในค่ำคืนที่ผ่อนคลายที่สุดของปี" — ทีมผู้จัดงาน

สำหรับผู้ที่สนใจ บัตรมีจำนวนจำกัดเพียง 100 ใบเท่านั้น สามารถจับจองบัตรได้แล้ววันนี้ผ่านระบบ E-Tikket!`,
      status: "PUBLISHED" as const,
      authorId: adminId,
      categoryId: categoryMap["event-news"],
      publishedAt: new Date(Date.now() - 2 * 86400000),
      tagSlugs: ["live-music", "indie-pop", "festival"],
      eventName: "Summer Live Concert 2026",
    },
    {
      title: "รีวิวค่ำคืนสุดเดือด Neon Indie Rock Fest: ริฟฟ์กีตาร์และแสงนีออนใต้ดิน",
      slug: "review-neon-indie-rock-fest",
      excerpt: "เจาะลึกบรรยากาศคอนเสิร์ตใต้ดินเอกมัย แสงนีออนตัดกับพลังดนตรี Post-Punk ที่ทำเอาแฟนเพลงเหงื่อท่วมฮอลล์ตั้งแต่เพลงแรก",
      coverImageUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80",
      content: `## ดนตรีสดที่ไม่ประนีประนอม ณ The Underground Club เอกมัย

หากคุณกำลังมองหาประสบการณ์ดนตรีสดที่ดิบ แน่น และทรงพลัง **Neon Indie Rock Fest** คือคำตอบที่ชัดเจนที่สุดของค่ำคืนนี้

### บรรยากาศภายในงาน
ตั้งแต่ก้าวแรกที่ลงสู่ชั้นใต้ดิน แสงไฟนีออนสีแดงและม่วงสลัวสะท้อนกับกำแพงปูนเปลือย เสียงเบสไลน์ที่กระแทกกระทั้นทำให้ทั้งห้องสั่นสะเทือน แฟนเพลงกว่า 100 คนยืนเบียดเสียดกันหน้าเวทีเล็กๆ ที่ไร้ที่กั้น ให้ความรู้สึกใกล้ชิดกับศิลปินอย่างแท้จริง

### ริฟฟ์กีตาร์ที่กรีดร้องและจังหวะที่ไม่หยุดพัก
- โชว์เปิดตัวด้วยดนตรี Post-Punk ที่มีจังหวะกลองแน่นหนึบ
- การโซโล่กีตาร์ที่ดุดันพร้อมการร้องประสานเสียงสดๆ ที่สะกดผู้ชมได้อยู่หมัด
- มอสพิท (Mosh Pit) เล็กๆ ที่เกิดขึ้นอย่างเป็นกันเองและปลอดภัย

### ความประทับใจโดยรวม
Neon Indie Rock Fest พิสูจน์ให้เห็นว่า ดนตรีอินดี้ร็อกไทยยังมีพลังงานที่ล้นเหลือ สถานที่อย่าง The Underground Club เอกมัย คือหนึ่งในหมุดหมายสำคัญของชาวอันเดอร์กราวด์อย่างแท้จริง`,
      status: "PUBLISHED" as const,
      authorId: adminId,
      categoryId: categoryMap["concert-reviews"],
      publishedAt: new Date(Date.now() - 3 * 86400000),
      tagSlugs: ["indie-rock", "live-music", "bangkok-venues"],
      eventName: "Neon Indie Rock Fest",
    },
    {
      title: "บทสัมภาษณ์พิเศษ: เสียงสะท้อนของวงอินดี้รุ่นใหม่ และความหมายของ Bar Gig",
      slug: "interview-nextgen-thai-indie-artists",
      excerpt: "พูดคุยกับตัวแทนศิลปินรุ่นใหม่ถึงเสน่ห์ของเวทีขนาดเล็ก และพลังขับเคลื่อนวงการเพลงอินดี้ไทยที่เริ่มจากร้านคราฟต์เบียร์และบาร์ดนตรีสด",
      coverImageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80",
      content: `## เสน่ห์ของ Bar Gig: เวทีที่ศิลปินและคนฟังมองตากันได้ชัดที่สุด

ในยุคที่สตรีมมิ่งทำให้เพลงเข้าถึงผู้คนได้นับล้าน แต่ศิลปินอินดี้หลายคนกลับยืนยันว่า **"การเล่นสดในบาร์ขนาดเล็ก"** คือหัวใจที่ทำให้ดนตรียังคงมีชีวิตชีวา

### Q: อะไรคือความพิเศษของการเล่นสดในสเกล 50-100 คน?
> "ในฮอลล์ใหญ่ คุณจะเห็นคนดูเป็นเงาดำๆ และทะเลแสงไฟจากมือถือ แต่ในบาร์หรือไลฟ์เฮาส์ขนาดเล็ก คุณเห็นแววตาของคนที่กำลังร้องตามเพลงคุณ คุณได้ยินเสียงปรบมือของคนที่ยืนอยู่ห่างไปแค่สองเมตร มันคือความจริงใจที่หาไม่ได้จากที่อื่น"

### Q: คิดอย่างไรกับการจัดคอนเสิร์ตแบบ Guest Checkout ไม่ต้องสมัครสมาชิก?
> "การที่คนดูสามารถจองบัตรได้ง่ายๆ ภายในไม่กี่นาที โอนเงิน อัปโหลดสลิป แล้วได้ QR Code ทันที มันลดกำแพงในการมาดูคอนเสิร์ตเยอะมาก โดยเฉพาะคนรุ่นใหม่ที่อยากแวะมาฟังเพลงหลังเลิกงาน"

### ก้าวต่อไปของซีนดนตรีอิสระ
ศิลปินทุกคนต่างเห็นตรงกันว่า การสนับสนุนพื้นที่ดนตรีสดขนาดเล็กของคนในท้องถิ่น คือรากฐานที่สำคัญที่สุดในการผลักดันให้ดนตรีไทยเติบโตอย่างยั่งยืน`,
      status: "PUBLISHED" as const,
      authorId: organizerId,
      categoryId: categoryMap["artist-interviews"],
      publishedAt: new Date(Date.now() - 5 * 86400000),
      tagSlugs: ["interview", "live-music", "bangkok-venues"],
    },
    {
      title: "ชวนฟัง Acoustic in the Garden: ดนตรีโฟล์คท่ามกลางสวนสราญรมย์ยามเย็น",
      slug: "acoustic-in-the-garden-folk-experience",
      excerpt: "สัมผัสความอบอุ่นของบทเพลงอะคูสติกและโฟล์คกลางธรรมชาติ พร้อมโซนเสื่อปิกนิกและเครื่องดื่มคราฟต์สุดชิล",
      coverImageUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1200&q=80",
      content: `## หลีกหนีความเร่งรีบ สู่เสียงดนตรีอะคูสติกใต้ร่มไม้ใหญ่

สำหรับใครที่เหน็ดเหนื่อยจากความวุ่นวายของชีวิตเมือง **Acoustic in the Garden** วันที่ 19 ธันวาคม 2026 ณ **Saranrom Garden Live Stage** คืออีเวนต์ที่คุณไม่ควรพลาด

### สัมผัสธรรมชาติกับเสียงเพลงโฟล์ค
- **เวลาจัดงาน:** 17:00 น. เป็นต้นไป ช่วงเวลาที่แดดร่มลมตกและแสงอาทิตย์สีทองสาดส่องผ่านยอดไม้
- **บัตรเข้างาน:** เพียง 250 บาท พร้อมเสื่อปิกนิกสำหรับนั่งฟังเพลงบนสนามหญ้า
- **เครื่องดนตรี Acoustic แท้ๆ:** กีตาร์โปร่ง, ไวโอลิน, ฮาร์โมนิก้า และเครื่องเคาะเพอร์คัสชัน

เตรียมตัวหยิบหนังสือเล่มโปรด ชวนเพื่อนหรือคนพิเศษมานั่งปล่อยใจไปกับเสียงเพลงโฟล์คอันอบอุ่นกันได้เลย!`,
      status: "PUBLISHED" as const,
      authorId: adminId,
      categoryId: categoryMap["event-news"],
      publishedAt: new Date(Date.now() - 6 * 86400000),
      tagSlugs: ["acoustic", "live-music"],
      eventName: "Acoustic in the Garden",
    },
    {
      title: "คู่มือเตรียมตัวไป Midnight Electronic Wave ปาร์ตี้ส่งท้ายปีอย่างไรให้ฟินและปลอดภัย",
      slug: "guide-midnight-electronic-wave-party",
      excerpt: "สรุปสิ่งที่ต้องเตรียมตัว Dress code การเดินทางด้วยรถไฟฟ้า และข้อควรรู้เกี่ยวกับ E-Ticket QR Code เพื่อการเข้างานที่รวดเร็ว",
      coverImageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
      content: `## เคาท์ดาวน์ส่งท้ายปีเก่ากับจังหวะ Synthwave & Electronic

ค่ำคืนวันที่ 31 ธันวาคมนี้ **Space BKK Arena (รัชดา)** จะลุกเป็นไฟกับงาน **Midnight Electronic Wave 2026** นี่คือคู่มือสำคัญสำหรับการเตรียมตัว!

### ข้อควรรู้ก่อนเดินทาง
1. **การเดินทาง:** แนะนำให้ใช้ MRT ลงสถานีศูนย์วัฒนธรรมฯ หรือห้วยขวาง แล้วต่อวินมอเตอร์ไซค์ 3 นาที หลีกเลี่ยงการนำรถยนต์ส่วนตัวมาเนื่องจากที่จอดรถมีจำกัด
2. **Dress Code:** Cyberpunk, Neon, Futuristic หรือชุดดำคุมโทนที่เคลื่อนไหวสะดวก
3. **การเข้างานด้วย E-Ticket:**
   - แคปหน้าจอหรือเปิดหน้าบัตร QR Code จากอีเมล/ลิงก์ยืนยันให้พร้อม
   - ปรับความสว่างหน้าจอโทรศัพท์ให้สูงสุดก่อนเข้าแถวสแกนบัตร
   - งานนี้รองรับการ **Re-entry** หากต้องการออกไปรับลมด้านนอก สามารถสแกนบัตรออก (Check-out) และสแกนกลับเข้า (Re-entry) ได้ตลอดเวลา

เตรียมพลังงานและรองเท้าที่ใส่สบาย แล้วมาเต้นข้ามปีไปด้วยกัน!`,
      status: "PUBLISHED" as const,
      authorId: organizerId,
      categoryId: categoryMap["music-guides"],
      publishedAt: new Date(Date.now() - 7 * 86400000),
      tagSlugs: ["electronic", "ticket-tips", "bangkok-venues"],
      eventName: "Midnight Electronic Wave",
    },
    {
      title: "5 พิกัด Live House และบาร์ดนตรีอินดี้ขนาดเล็กในกรุงเทพฯ ที่คอดนตรีสดห้ามพลาด",
      slug: "top-5-bangkok-indie-music-venues",
      excerpt: "รวมจุดเช็คอินของคนรักเสียงเพลงสด ตั้งแต่ย่านเจริญกรุง เอกมัย ยันอารีย์ ที่มีวงดนตรีเล่นสดคุณภาพแน่นทุกสัปดาห์",
      coverImageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80",
      content: `## ลายแทงเวทีดนตรีสดขนาดเล็กในกรุงเทพมหานคร

กรุงเทพฯ เป็นเมืองที่มีซีนดนตรีอินดี้ซ่อนตัวอยู่ตามตรอกซอกซอยมากมาย และนี่คือ 5 พิกัดเด็ดที่เราคัดสรรมาให้คุณ:

### 1. The Riverfront Warehouse (เจริญกรุง)
โกดังเก่าที่ปรับปรุงเป็นพื้นที่จัดแสดงคอนเสิร์ตและอาร์ตมาร์เก็ต จุดเด่นคือทำเลริมแม่น้ำและบรรยากาศลมโกรกสบาย

### 2. The Underground Club (เอกมัย)
คลับชั้นใต้ดินสำหรับสาย Rock, Post-Punk และดนตรีอัลเทอร์เนทีฟ เสียงเบสหนักแน่นและคอมมูนิตี้ที่เหนียวแน่น

### 3. Saranrom Garden Live Stage (พระนคร)
เวทีกลางแจ้งที่เน้นดนตรีโฟล์ค อะคูสติก และแจ๊ส บรรยากาศเงียบสงบร่มรื่นใจกลางเกาะรัตนโกสินทร์

### 4. Space BKK Arena (รัชดา)
ฮอลล์จัดงานสไตล์อินดัสเทรียล เหมาะสำหรับงานปาร์ตี้ดนตรีอิเล็กทรอนิกส์และ Synthwave

### 5. Acoustic Alley (อารีย์)
บาร์คราฟต์เบียร์ขนาดอบอุ่นที่มีศิลปินเดี่ยวและดูโอผลัดเปลี่ยนกันมาเล่นสดทุกค่ำคืนวันศุกร์และเสาร์`,
      status: "PUBLISHED" as const,
      authorId: adminId,
      categoryId: categoryMap["music-guides"],
      publishedAt: new Date(Date.now() - 8 * 86400000),
      tagSlugs: ["bangkok-venues", "live-music"],
    },
    {
      title: "วิธีใช้ E-Ticket สแกนเข้างานคอนเสิร์ตผ่าน QR Code สะดวก รวดเร็ว ไม่ต้องพิมพ์กระดาษ",
      slug: "how-to-use-etikket-qr-code-entry",
      excerpt: "ขั้นตอนง่ายๆ ในการเปิด QR Ticket ผ่านสมาร์ทโฟนเพื่อ Check-in เข้างาน พร้อมระบบ Re-entry เข้า-ออกงานได้ตลอดเวลา",
      coverImageUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80",
      content: `## เช็คอินงานคอนเสิร์ตยุคใหม่ด้วย E-Tikket Secure QR Code

แพลตฟอร์ม E-Tikket ออกแบบมาเพื่อประสบการณ์การซื้อบัตรและเข้างานที่สะดวก ปลอดภัย และไร้กระดาษ 100%

### ขั้นตอนการใช้งาน
1. **รับลิงก์หน้าบัตร:** เมื่อแอดมินตรวจสอบสลิปโอนเงินเรียบร้อย คุณจะได้รับอีเมลพร้อมลิงก์ส่วนตัวสำหรับเปิดดู E-Ticket
2. **แสดง QR Code ที่หน้าประตู:** เมื่อถึงหน้างาน ให้เปิดหน้าเว็บบัตรบนมือถือ เจ้าหน้าที่จะใช้กล้องสมาร์ทโฟนสแกนเพื่อตรวจสอบความถูกต้อง
3. **ระบบความปลอดภัยสองชั้น:** แต่ละ QR Code ถูกเข้ารหัสด้วย CSPRNG + SHA-256 ป้องกันการปลอมแปลงหรือนำบัตรซ้ำมาใช้งาน
4. **Re-entry อิสระ:** หากต้องการออกไปนอกบริเวณงานเพื่อรับประทานอาหารหรือซื้อของ เพียงยื่น QR Code ให้สแกน 'Check-out' และสแกน 'Re-entry' เมื่อกลับเข้ามา`,
      status: "PUBLISHED" as const,
      authorId: adminId,
      categoryId: categoryMap["music-guides"],
      publishedAt: new Date(Date.now() - 10 * 86400000),
      tagSlugs: ["ticket-tips"],
    },
    {
      title: "เตรียมพบกับงานดนตรีทดลอง Sound Experiment BKK 2027 (รอการอนุมัติ)",
      slug: "sound-experiment-bkk-2027-pending",
      excerpt: "บทความแนะนำเทศกาลงานดนตรีแนวทดลอง (Sound Art / Ambient) ส่งตรวจสอบโดยผู้จัด เพื่อเตรียมเผยแพร่เร็วๆ นี้",
      coverImageUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80",
      content: `## มิติใหม่ของเสียงดนตรีทดลองและศิลปะจัดวาง

Sound Experiment BKK คือพื้นที่สำหรับการรวมตัวของศิลปิน Ambient, Modular Synth และ Sound Designer จากทั่วเอเชียตะวันออกเฉียงใต้ (บทความนี้อยู่ในระหว่างรอแอดมินพิจารณาอนุมัติการเผยแพร่)`,
      status: "PENDING_REVIEW" as const,
      authorId: organizerId,
      categoryId: categoryMap["event-news"],
      publishedAt: null,
      tagSlugs: ["electronic", "live-music"],
    },
    {
      title: "[ร่าง] เจาะลึกแนวเพลง City Pop & Synthwave ในยุคปัจจุบัน",
      slug: "draft-city-pop-synthwave-trend",
      excerpt: "ร่างบทความเจาะลึกการฟื้นคืนชีพของดนตรีแนว City Pop ในหมู่คนรุ่นใหม่",
      coverImageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
      content: `## ความทรงจำแห่งยุค 80s ในท่วงทำนองสมัยใหม่

เนื้อหาบทความฉบับร่าง กำลังรวบรวมข้อมูลและสัมภาษณ์โปรดิวเซอร์เพลงเพิ่มเติม...`,
      status: "DRAFT" as const,
      authorId: organizerId,
      categoryId: categoryMap["music-guides"],
      publishedAt: null,
      tagSlugs: ["electronic"],
    },
  ];

  for (const art of articlesData) {
    const { tagSlugs, eventName, ...articleFields } = art;
    await prisma.article.create({
      data: {
        ...articleFields,
        tags: {
          connect: tagSlugs.map((slug) => ({ slug })),
        },
        ...(eventName && eventMap[eventName]
          ? {
              events: {
                connect: [{ id: eventMap[eventName] }],
              },
            }
          : {}),
      },
    });
  }
}

async function main() {
  const admin = staffConfig("ADMIN");
  const organizer = staffConfig("ORGANIZER");
  if (admin.email === organizer.email) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ORGANIZER_EMAIL must be different");
  }
  const adminUser = await seedStaffAccount("ADMIN");
  const organizerUser = await seedStaffAccount("ORGANIZER");
  console.info("Seeded configured ADMIN and ORGANIZER accounts.");

  const eventMap = await seedCleanSampleEvents(organizerUser.id);
  console.info("Seeded clean 4 sample published events with categories.");

  await seedArticles(adminUser.id, organizerUser.id, eventMap);
  console.info("Seeded comprehensive news articles, categories, and tags.");
}

main()
  .catch((error: unknown) => {
    console.error("Staff account seeding failed.");
    if (error instanceof Error && error.message.startsWith("Missing required seed configuration:")) {
      console.error(error.message);
    } else if (error instanceof Error && error.message.startsWith("SEED_")) {
      console.error(error.message);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
