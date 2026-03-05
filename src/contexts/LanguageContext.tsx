import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type Lang = "th" | "en";

const translations = {
  // Navbar
  "nav.fleet": { th: "รถของเรา", en: "Our Fleet" },
  "nav.why": { th: "ทำไมต้องเรา", en: "Why Us" },
  "nav.lookup": { th: "ตรวจสอบการจอง", en: "Check Booking" },
  "nav.contact": { th: "ติดต่อเรา", en: "Contact" },
  "nav.bookNow": { th: "จองเลย", en: "Book Now" },
  "nav.attractions": { th: "ที่เที่ยวน่าสนใจ", en: "Attractions" },
  "nav.events": { th: "กิจกรรม", en: "Events" },

  // Hero
  "hero.tag": { th: "บริการเช่ารถตู้พร้อมคนขับ", en: "Premium Van Rental with Driver" },
  "hero.title1": { th: "เดินทาง", en: "Travel in" },
  "hero.title2": { th: "สะดวกสบาย", en: "Executive" },
  "hero.title3": { th: "ระดับพรีเมียม", en: "Comfort" },
  "hero.desc": { th: "บริการรถตู้หรูพร้อมคนขับมืออาชีพ สำหรับงานองค์กร รับส่งสนามบิน และการเดินทาง VIP ทั่วไทย", en: "Luxury vans with professional drivers for corporate events, airport transfers, and VIP journeys across Thailand." },
  "hero.browse": { th: "เลือกดูรถ", en: "Browse Fleet" },
  "hero.contactUs": { th: "ติดต่อเรา", en: "Contact Us" },

  // Why Us
  "why.tag": { th: "ความมุ่งมั่นของเรา", en: "Our Commitment" },
  "why.title": { th: "ทำไมต้องเลือก GOLDMINE_TRAVEL?", en: "Why Choose GOLDMINE_TRAVEL?" },
  "why.licensed.title": { th: "มีใบอนุญาตและประกัน", en: "Licensed & Insured" },
  "why.licensed.desc": { th: "คนขับทุกคนมีใบอนุญาตขับขี่และประกันภัยครอบคลุม", en: "All drivers are professionally licensed with comprehensive insurance coverage." },
  "why.247.title": { th: "บริการ 24 ชั่วโมง", en: "24/7 Availability" },
  "why.247.desc": { th: "พร้อมให้บริการตลอด 24 ชั่วโมง ไม่ว่าจะเที่ยวบินเช้า งานดึก หรือกรณีฉุกเฉิน", en: "Round-the-clock service for early flights, late events, and emergency transfers." },
  "why.vip.title": { th: "ประสบการณ์ VIP", en: "VIP Experience" },
  "why.vip.desc": { th: "รถตู้ระดับพรีเมียมพร้อมสิ่งอำนวยความสะดวกครบครัน ออกแบบเพื่อความสะดวกสบายสูงสุด", en: "Premium vehicles with in-cabin amenities designed for executive comfort." },

  // Fleet
  "fleet.tag": { th: "รถของเรา", en: "Our Vehicles" },
  "fleet.title": { th: "เลือกรถตู้ของคุณ", en: "Select Your Van" },
  "fleet.desc": { th: "รถทุกคันได้รับการดูแลรักษาอย่างพิถีพิถัน พร้อมให้บริการประสบการณ์การเดินทางระดับเฟิร์สคลาส", en: "Each vehicle is meticulously maintained and equipped to deliver a first-class travel experience." },
  "fleet.seats": { th: "ที่นั่ง", en: "seats" },
  "fleet.perDay": { th: "ต่อวัน", en: "per day" },
  "fleet.busy": { th: "ไม่ว่าง", en: "Not Available" },
  "fleet.book": { th: "จองรถคันนี้", en: "Book This Van" },
  "fleet.passengers": { th: "ผู้โดยสาร", en: "Passengers" },
  "fleet.driver": { th: "คนขับ", en: "Driver" },
  "fleet.experience": { th: "ประสบการณ์", en: "Experience" },
  "fleet.years": { th: "ปี", en: "years" },
  "fleet.noImage": { th: "ไม่มีรูป", en: "No Image" },

  // Booking form
  "booking.title": { th: "จองรถ", en: "Reserve" },
  "booking.typeDaily": { th: "เช่าเหมาวัน", en: "Daily Rental" },
  "booking.typeTaxi": { th: "แท็กซี่ / รับ-ส่ง", en: "Taxi / Transfer" },
  "booking.startDate": { th: "วันรับรถ", en: "Start Date" },
  "booking.endDate": { th: "วันคืนรถ", en: "End Date" },
  "booking.pickDate": { th: "เลือกวัน", en: "Pick date" },
  "booking.day": { th: "วัน", en: "day" },
  "booking.days": { th: "วัน", en: "days" },
  "booking.name": { th: "ชื่อ-นามสกุล", en: "Full Name" },
  "booking.namePlaceholder": { th: "กรอกชื่อ-นามสกุล", en: "Full name" },
  "booking.phone": { th: "เบอร์โทรศัพท์", en: "Phone Number" },
  "booking.phonePlaceholder": { th: "0891234567", en: "0891234567" },
  "booking.phoneHint": { th: "รูปแบบ: 0XX-XXX-XXXX", en: "Thai format: 0XX-XXX-XXXX" },
  "booking.pickup": { th: "จุดรับรถ", en: "Pickup Location" },
  "booking.pickupPlaceholder": { th: "เช่น สนามบินสุวรรณภูมิ อาคาร 2", en: "e.g. Suvarnabhumi Airport, Terminal 2" },
  "booking.dropoff": { th: "จุดส่ง", en: "Drop-off Location" },
  "booking.dropoffPlaceholder": { th: "เช่น โรงแรมหาดป่าตอง", en: "e.g. Patong Beach Hotel" },
  "booking.taxiDate": { th: "วันที่ต้องการ", en: "Date" },
  "booking.taxiTime": { th: "เวลารับ", en: "Pickup Time" },
  "booking.pickupTime": { th: "เวลารับรถ", en: "Pickup Time" },
  "booking.notes": { th: "หมายเหตุเพิ่มเติม", en: "Additional Notes" },
  "booking.optional": { th: "(ไม่บังคับ)", en: "(optional)" },
  "booking.notesPlaceholder": { th: "คำขอพิเศษ, จำนวนผู้โดยสาร...", en: "Special requests, number of passengers..." },
  "booking.taxiNotesPlaceholder": { th: "จำนวนกระเป๋า, จุดแวะระหว่างทาง...", en: "Number of bags, stops along the way..." },
  "booking.submit": { th: "ยืนยันการจอง", en: "Confirm Booking Request" },
  "booking.submitting": { th: "กำลังส่ง...", en: "Sending..." },
  "booking.confirmNote": { th: "ทีมงานจะติดต่อกลับภายใน 2 ชั่วโมงเพื่อยืนยันการจอง", en: "Our team will contact you within 2 hours to confirm your booking." },
  "booking.taxiPriceNote": { th: "ทีมงานจะแจ้งราคาให้ทราบหลังยืนยันเส้นทาง", en: "Our team will provide a quote after confirming the route." },
  "booking.passengers": { th: "จำนวนผู้โดยสาร", en: "Number of Passengers" },

  // Success
  "success.title": { th: "จองสำเร็จ!", en: "Booking Confirmed!" },
  "success.code": { th: "รหัสการจองของคุณ:", en: "Your booking code:" },
  "success.copied": { th: "คัดลอกแล้ว!", en: "Copied!" },
  "success.copyHint": { th: "กดเพื่อคัดลอกรหัส • ใช้ค้นหาสถานะการจอง", en: "Click to copy • Use to check booking status" },
  "success.total": { th: "รวม", en: "Total" },
  "success.confirmNote": { th: "ทีมงานจะติดต่อกลับภายใน 2 ชั่วโมงเพื่อยืนยันการจอง", en: "Our team will contact you within 2 hours to confirm your booking." },
  "success.chatLine": { th: "แชทผ่าน LINE", en: "Chat via LINE" },
  "success.chatWhatsapp": { th: "ติดต่อผ่าน WhatsApp", en: "Contact via WhatsApp" },
  "success.taxiNote": { th: "ทีมงานจะติดต่อกลับเพื่อยืนยันเส้นทางและราคา", en: "Our team will contact you to confirm the route and price." },

  // Lookup
  "lookup.title": { th: "ค้นหาการจอง", en: "Find Booking" },
  "lookup.placeholder": { th: "กรอกรหัสการจอง หรือ เบอร์โทรศัพท์", en: "Enter booking code or phone number" },
  "lookup.hint": { th: "ค้นหาด้วยรหัสการจอง (เช่น A1B2C3) หรือเบอร์โทรศัพท์ (เช่น 0891234567)", en: "Search by booking code (e.g. A1B2C3) or phone number (e.g. 0891234567)" },
  "lookup.notFoundCode": { th: "ไม่พบการจองด้วยรหัสนี้ กรุณาตรวจสอบอีกครั้ง", en: "No booking found with this code. Please check again." },
  "lookup.notFoundPhone": { th: "ไม่พบการจองด้วยเบอร์โทรนี้ กรุณาตรวจสอบอีกครั้ง", en: "No booking found with this phone number. Please check again." },
  "lookup.found": { th: "พบ", en: "Found" },
  "lookup.bookings": { th: "รายการจอง", en: "booking(s)" },
  "lookup.back": { th: "กลับไปรายการ", en: "Back to list" },
  "lookup.bookingCode": { th: "รหัสการจอง", en: "Booking Code" },
  "lookup.bookerName": { th: "ชื่อผู้จอง", en: "Booked By" },
  "lookup.phoneLabel": { th: "เบอร์โทร", en: "Phone" },
  "lookup.startDate": { th: "วันรับรถ", en: "Start Date" },
  "lookup.endDate": { th: "วันคืนรถ", en: "End Date" },
  "lookup.pickupLocation": { th: "จุดรับรถ", en: "Pickup Location" },
  "lookup.dropoffLocation": { th: "จุดส่ง", en: "Drop-off" },
  "lookup.totalPrice": { th: "ราคารวม", en: "Total Price" },
  "lookup.notes": { th: "หมายเหตุ", en: "Notes" },
  "lookup.bookingType": { th: "ประเภท", en: "Type" },
  "lookup.daily": { th: "เช่าเหมาวัน", en: "Daily Rental" },
  "lookup.taxi": { th: "แท็กซี่ / รับ-ส่ง", en: "Taxi / Transfer" },

  // Status
  "status.confirmed": { th: "ยืนยันแล้ว", en: "Confirmed" },
  "status.pending": { th: "รอดำเนินการ", en: "Pending" },
  "status.proceed": { th: "กำลังดำเนินการ", en: "In Progress" },
  "status.completed": { th: "เสร็จสิ้น", en: "Completed" },
  "status.cancelled": { th: "ยกเลิก", en: "Cancelled" },

  // Attractions & Events
  "explore.tag": { th: "ภูเก็ต", en: "Phuket" },
  "explore.attractions": { th: "ที่เที่ยวน่าสนใจ", en: "Attractions" },
  "explore.events": { th: "กิจกรรมที่กำลังจะมาถึง", en: "Upcoming Events" },
  "explore.noAttractions": { th: "ยังไม่มีข้อมูลสถานที่ท่องเที่ยว", en: "No attractions available yet" },
  "explore.noEvents": { th: "ยังไม่มีกิจกรรมที่กำลังจะมาถึง", en: "No upcoming events" },

  // Footer
  "footer.rights": { th: "สงวนลิขสิทธิ์", en: "All rights reserved" },

  // Validation
  "val.invalidPhone": { th: "เบอร์โทรไม่ถูกต้อง", en: "Invalid Phone" },
  "val.invalidPhoneDesc": { th: "กรุณากรอกเบอร์โทรศัพท์ไทยที่ถูกต้อง", en: "Please enter a valid Thai phone number." },
  "val.invalidDates": { th: "วันที่ไม่ถูกต้อง", en: "Invalid Dates" },
  "val.invalidDatesDesc": { th: "วันคืนรถต้องหลังวันรับรถ", en: "End date must be after start date." },
  "val.bookingFailed": { th: "จองไม่สำเร็จ", en: "Booking Failed" },
} as const;

type TranslationKey = keyof typeof translations;

interface LanguageContextType {
  lang: Lang;
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem("lang");
    return (saved === "en" ? "en" : "th") as Lang;
  });

  const toggleLang = useCallback(() => {
    setLang(prev => {
      const next = prev === "th" ? "en" : "th";
      localStorage.setItem("lang", next);
      return next;
    });
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    return translations[key]?.[lang] ?? key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
