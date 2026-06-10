"use client";

import {
  CalendarDays,
  ChevronDown,
  Gift,
  Heart,
  Home,
  Images,
  MapPin,
  MessageCircleHeart,
  Music,
  Pause,
  Send,
  Sparkles,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  galleryBucket,
  galleryPath,
  isSupabaseConfigured,
  supabase,
  type Wish,
} from "../lib/supabase";

type WeddingInvitationProps = {
  guestName: string;
};

type GalleryImage = {
  src: string;
  alt: string;
};

const eventDate = new Date("2026-06-21T09:00:00+07:00").getTime();

const fallbackWishes: Wish[] = [
  {
    id: "fallback-1",
    name: "Teman-teman semua",
    attendance: "datang",
    message:
      "Semoga lancar sampai hari H dan menjadi keluarga sakinah, mawaddah, warahmah.",
    created_at: new Date().toISOString(),
  },
];

const fallbackGallery: GalleryImage[] = [
  { src: "/wedding-gallery-1.png", alt: "Cincin Pernikahan Umi & Riski" },
  { src: "/wedding-gallery-2.png", alt: "Dekorasi Akad Pernikahan Umi & Riski" },
  { src: "/wedding-gallery-3.png", alt: "Meja Jamuan Pernikahan Umi & Riski" },
];

function getCountdown() {
  const distance = Math.max(eventDate - Date.now(), 0);

  return {
    hari: Math.floor(distance / (1000 * 60 * 60 * 24)),
    jam: Math.floor((distance / (1000 * 60 * 60)) % 24),
    menit: Math.floor((distance / (1000 * 60)) % 60),
    detik: Math.floor((distance / 1000) % 60),
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function WeddingInvitation({ guestName }: WeddingInvitationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [countdown, setCountdown] = useState(getCountdown);
  const [gallery, setGallery] = useState<GalleryImage[]>(fallbackGallery);
  const [wishes, setWishes] = useState<Wish[]>(fallbackWishes);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);

  const calendarUrl = useMemo(() => {
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: "Pernikahan Umiyati & Riskinurfajar",
      dates: "20260621T020000Z/20260622T100000Z",
      details:
        "Akad Nikah pukul 09.00 WIB dan resepsi 21-22 Juni 2026 pukul 10.00 WIB sampai selesai.",
      location:
        "Kp. Kebon RT. 001 RW. 002, Ds. Pagenjahan, Kec. Kronjo, Kab. Tangerang, Banten",
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }, []);

  // Sync audio element with isMusicPlaying state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMusicPlaying) {
      audio.play().catch(() => {
        // Autoplay dibatalkan browser — tidak perlu error
        setIsMusicPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [isMusicPlaying]);

  // Mulai musik otomatis saat undangan dibuka
  useEffect(() => {
    if (isOpen) {
      setIsMusicPlaying(true);
    }
  }, [isOpen]);

  // Scroll reveal — Intersection Observer
  useEffect(() => {
    const targets = document.querySelectorAll(
      ".reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-stagger"
    );
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target); // hanya trigger sekali
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [isOpen]); // re-run saat undangan dibuka

  useEffect(() => {
    const timer = window.setInterval(() => setCountdown(getCountdown()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadSupabaseData() {
      if (!supabase) {
        return;
      }

      const client = supabase;
      const [{ data: wishRows }, { data: files }] = await Promise.all([
        client
          .from("wishes")
          .select("id,name,attendance,message,created_at")
          .order("created_at", { ascending: false })
          .limit(30),
        client.storage.from(galleryBucket).list(galleryPath, {
          limit: 24,
          sortBy: { column: "name", order: "asc" },
        }),
      ]);

      if (wishRows?.length) {
        setWishes(wishRows as Wish[]);
      }

      const storageImages =
        files
          ?.filter((file) => file.name.match(/\.(jpg|jpeg|png|webp)$/i))
          .map((file) => {
            const filePath = galleryPath
              ? `${galleryPath.replace(/\/$/, "")}/${file.name}`
              : file.name;
            const { data } = client.storage
              .from(galleryBucket)
              .getPublicUrl(filePath);

            return {
              src: data.publicUrl,
              alt: `Galeri pernikahan ${file.name}`,
            };
          }) || [];

      if (storageImages.length) {
        setGallery(storageImages);
      }
    }

    loadSupabaseData();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      attendance: String(formData.get("attendance") || "datang") as
        | "datang"
        | "berhalangan",
      message: String(formData.get("message") || "").trim(),
    };

    if (!payload.name || !payload.message) {
      setNotice("Nama dan ucapan wajib diisi.");
      return;
    }

    setIsSubmitting(true);

    if (!supabase) {
      const optimisticWish: Wish = {
        ...payload,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      };
      setWishes((current) => [optimisticWish, ...current]);
      setNotice("Ucapan ditampilkan lokal. Isi env Supabase agar tersimpan.");
      form.reset();
      setIsSubmitting(false);
      return;
    }

    const { data, error } = await supabase
      .from("wishes")
      .insert(payload)
      .select("id,name,attendance,message,created_at")
      .single();

    if (error || !data) {
      setNotice("Ucapan belum terkirim. Periksa tabel Supabase dan RLS policy.");
    } else {
      setWishes((current) => [data as Wish, ...current]);
      setNotice("Terima kasih, ucapan sudah terkirim.");
      form.reset();
    }

    setIsSubmitting(false);
  }

  return (
    <main className="wedding-shell">
      {/* Audio player — ganti /wedding-music.mp3 dengan file musik Anda */}
      <audio ref={audioRef} src="/wedding-music.mp3" loop preload="none" />
      <section className={`invitation-cover ${isOpen ? "is-open" : ""}`}>
        <div className="cover-frame">
          <p>The Wedding Of</p>
          <h1>Umiyati & Riski</h1>
          <span>Minggu, 21 Juni 2026</span>
          <div className="guest-card">
            <small>Kepada Yth.</small>
            <strong>{guestName}</strong>
          </div>
          <button className="primary-button" onClick={() => setIsOpen(true)}>
            <Heart size={18} />
            Open Invitation
          </button>
        </div>
      </section>

      <section id="home" className="hero-section">
        <div className="flower-corner top-left" />
        <div className="flower-corner bottom-right" />
        <p className="eyebrow">Undangan Pernikahan</p>
        <h1>Umiyati & Riskinurfajar</h1>
        <p className="hero-date">Minggu, 21 Juni 2026</p>
        <a href={calendarUrl} target="_blank" rel="noreferrer" className="ghost-button">
          <CalendarDays size={18} />
          Save Google Calendar
        </a>
        <a className="scroll-cue" href="#mempelai" aria-label="Scroll ke mempelai">
          <ChevronDown size={28} />
        </a>
      </section>

      <section id="mempelai" className="section intro-section">
        <p className="arabic reveal">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيْمِ</p>
        <h2 className="reveal">Assalamualaikum Warahmatullahi Wabarakatuh</h2>
        <p className="reveal">
          Tanpa mengurangi rasa hormat, kami mengundang Bapak/Ibu/Saudara/i
          untuk berkenan menghadiri acara pernikahan kami.
        </p>

        <div className="couple-grid">
          <article className="couple-card reveal-left">
            <div className="portrait">U</div>
            <h3>Umiyati / Umi</h3>
            <p>Putri Bpk. Madiyah/Mad &amp; Ibu. Salkah (Almh)</p>
            <span>Kp. Kebon</span>
          </article>
          <div className="ampersand reveal-scale">&amp;</div>
          <article className="couple-card reveal-right">
            <div className="portrait">R</div>
            <h3>Riskinurfajar / Riski</h3>
            <p>Putra Bpk. Mapis &amp; Ibu. Saryati/Yati</p>
            <span>Kp. Klebet</span>
          </article>
        </div>
      </section>

      <section className="quote-section">
        <Sparkles size={28} className="reveal-scale" />
        <h2 className="reveal">Allah Subhanahu Wa Ta&apos;ala berfirman</h2>
        <p className="reveal">
          Dan segala sesuatu Kami ciptakan berpasang-pasangan agar kamu
          mengingat kebesaran Allah.
        </p>
        <span className="reveal">QS. Adh-Dhariyat: 49</span>
      </section>

      <section className="section story-section">
        <p className="eyebrow reveal">Kisah Cinta</p>
        <h2 className="reveal">Langkah Menuju Bahagia</h2>
        <div className="timeline reveal-stagger">
          <article>
            <span>1</span>
            <h3>Awal Pertemuan</h3>
            <p>
              Dengan izin Allah, pertemuan sederhana menjadi awal niat baik
              untuk saling mengenal dalam restu keluarga.
            </p>
          </article>
          <article>
            <span>2</span>
            <h3>Lamaran</h3>
            <p>
              Setelah doa dan musyawarah keluarga, keduanya memantapkan hati
              untuk melangkah menuju pernikahan.
            </p>
          </article>
          <article>
            <span>3</span>
            <h3>Akad Nikah</h3>
            <p>
              InsyaAllah akad nikah akan dilaksanakan pada Minggu, 21 Juni 2026
              pukul 09.00 WIB sampai selesai.
            </p>
          </article>
        </div>
      </section>

      <section id="tanggal" className="section event-section">
        <p className="eyebrow reveal">Moment Bahagia</p>
        <h2 className="reveal">Menuju Hari Pernikahan</h2>
        <div className="countdown-grid reveal-stagger">
          {Object.entries(countdown).map(([label, value]) => (
            <div key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div className="event-grid reveal-stagger">
          <article>
            <CalendarDays size={28} />
            <h3>Akad Nikah</h3>
            <p>Minggu, 21 Juni 2026</p>
            <strong>09.00 WIB s/d Selesai</strong>
          </article>
          <article>
            <UsersRound size={28} />
            <h3>Resepsi</h3>
            <p>Minggu Malam Senin, 21-22 Juni 2026</p>
            <strong>10.00 WIB s/d Selesai</strong>
          </article>
        </div>

        <div className="location-panel reveal">
          <MapPin size={24} />
          <p>
            Kp. Kebon RT. 001 RW. 002, Ds. Pagenjahan, Kec. Kronjo, Kab.
            Tangerang - Banten
          </p>
          <a
            href="https://www.google.com/maps/search/?api=1&query=Kp.%20Kebon%20RT.%20001%20RW.%20002%20Ds.%20Pagenjahan%20Kec.%20Kronjo%20Kab.%20Tangerang%20Banten"
            target="_blank"
            rel="noreferrer"
          >
            Lihat Google Maps
          </a>
        </div>
      </section>

      <section id="galeri" className="section gallery-section">
        <p className="eyebrow reveal">Galeri</p>
        <h2 className="reveal">Foto Pernikahan</h2>
        <div className="gallery-grid reveal-stagger">
          {gallery.map((image) => (
            <Image
              key={image.src}
              src={image.src}
              alt={image.alt}
              width={420}
              height={560}
              unoptimized={image.src.startsWith("http")}
            />
          ))}
        </div>
      </section>

      <section className="section gift-section">
        <p className="eyebrow reveal">Love Gift</p>
        <h2 className="reveal">Doa Restu Anda</h2>
        <p className="reveal">
          Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila
          Bapak/Ibu/Saudara/i berkenan hadir untuk memberikan doa restu.
        </p>
        <div className="gift-grid reveal-stagger">
          <article>
            <Gift size={26} />
            <h3>Transfer</h3>
            <p>Bank dapat disesuaikan</p>
            <strong>Atas Nama Umiyati / Riski</strong>
          </article>
          <article>
            <Gift size={26} />
            <h3>Kirim Hadiah</h3>
            <p>Kp. Kebon RT. 001 RW. 002</p>
            <strong>Ds. Pagenjahan, Kronjo, Tangerang</strong>
          </article>
        </div>
      </section>

      <section id="ucapan" className="section wishes-section">
        <p className="eyebrow reveal">Ucapan &amp; Doa</p>
        <h2 className="reveal">Kirim Ucapan Terbaik</h2>
        {!isSupabaseConfigured && (
          <p className="config-warning">
            Supabase belum dikonfigurasi. Isi `.env.local` agar ucapan dan
            galeri tersambung ke backend.
          </p>
        )}
        <form onSubmit={handleSubmit} className="wish-form reveal">
          <input name="name" placeholder="Nama" required />
          <select name="attendance" defaultValue="datang">
            <option value="datang">Konfirmasi Presensi: Datang</option>
            <option value="berhalangan">Konfirmasi Presensi: Berhalangan</option>
          </select>
          <textarea
            name="message"
            placeholder="Ucapan & Doa"
            rows={4}
            required
          />
          <button type="submit" disabled={isSubmitting}>
            <Send size={18} />
            {isSubmitting ? "Mengirim..." : "Send"}
          </button>
        </form>
        {notice && <p className="form-notice">{notice}</p>}

        <div className="wish-list">
          {wishes.map((wish) => (
            <article key={wish.id}>
              <div>
                <strong>{wish.name}</strong>
                <span>{formatDate(wish.created_at)}</span>
              </div>
              <p>{wish.message}</p>
              <small className={wish.attendance === "datang" ? "attendance-datang" : "attendance-berhalangan"}>
                {wish.attendance === "datang" ? "Akan datang" : "Berhalangan"}
              </small>
            </article>
          ))}
        </div>
      </section>

      <section className="closing-section">
        <p className="reveal">
          Terima kasih atas perhatian dan doa restu Anda, yang menjadi
          kebahagiaan serta kehormatan besar bagi kami.
        </p>
        <h2 className="reveal">Wassalamualaikum Warahmatullahi Wabarakatuh</h2>
        <p className="arabic reveal">اَلْحَمْدُ لِلّٰهِ رَبِّ الْعٰلَمِيْنَۙ</p>
        <strong className="reveal">Umiyati &amp; Riski</strong>
      </section>

      <button
        className={`music-button ${isMusicPlaying ? "is-playing" : ""}`}
        onClick={() => setIsMusicPlaying((current) => !current)}
        aria-label="Toggle music"
      >
        {isMusicPlaying ? <Music size={20} /> : <Pause size={20} />}
      </button>

      <nav className="bottom-nav" aria-label="Navigasi undangan">
        <a href="#home">
          <Home size={18} />
          <span>Home</span>
        </a>
        <a href="#mempelai">
          <Heart size={18} />
          <span>Mempelai</span>
        </a>
        <a href="#tanggal">
          <CalendarDays size={18} />
          <span>Tanggal</span>
        </a>
        <a href="#galeri">
          <Images size={18} />
          <span>Galeri</span>
        </a>
        <a href="#ucapan">
          <MessageCircleHeart size={18} />
          <span>Ucapan</span>
        </a>
      </nav>
    </main>
  );
}
