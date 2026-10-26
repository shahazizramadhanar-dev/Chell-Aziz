/* ============================================================
   KONFIGURASI — ubah bagian ini saja
   ============================================================ */
const CONFIG = {
    groom: "Aziz",
    bride: "Chell",
    weddingDate: "2026-12-01T14:30:00+07:00",
    endDate: "2026-12-01T21:00:00+07:00",
    venue: "Grand Ballroom, Hotel Majestic Palace, Jl. Embong No. 16, Surabaya",
    // nomor WhatsApp tujuan RSVP (format 62...) — urutan sama dengan pilihan "Kirim Konfirmasi Ke"
    recipients: [
        { name: "Aziz",  phone: "6282338055466" },
        { name: "Chell", phone: "628962432355" }
    ]
};

const $ = (id) => document.getElementById(id);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- toast ---------- */
function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2400);
}

/* ---------- nama tamu dari link: ?to=Budi+Santoso ---------- */
(function guestFromUrl() {
    const to = new URLSearchParams(location.search).get("to");
    if (to) {
        $("guestName").textContent = to;
        $("name").value = to;
    }
})();

/* ---------- buka undangan + musik ---------- */
const opening = $("opening");
const audio = $("musicAudio");
const musicBtn = $("musicToggle");
const dock = $("dock");

function setPlaying(on) { musicBtn.classList.toggle("playing", on); }

$("openInvitation").addEventListener("click", () => {
    opening.classList.add("hidden");
    document.body.classList.remove("lock");
    window.scrollTo(0, 0);
    setTimeout(() => dock.classList.add("show"), 900);

    audio.play().then(() => setPlaying(true)).catch(() => {});
});

musicBtn.addEventListener("click", () => {
    if (audio.paused) { audio.play().then(() => setPlaying(true)).catch(() => toast("Musik tidak tersedia")); }
    else { audio.pause(); setPlaying(false); }
});

/* ---------- reveal on scroll ---------- */
const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("active"); io.unobserve(e.target); }
    });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

/* ---------- progress bar, parallax, dock aktif ---------- */
const progress = $("progress");
const heroBg = $("heroBg");
const dockLinks = [...document.querySelectorAll(".dock a")];
const sections = dockLinks.map((a) => document.querySelector(a.getAttribute("href")));

let ticking = false;
function onScroll() {
    const h = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = (scrollY / h) * 100 + "%";
    if (!reduceMotion && scrollY < innerHeight * 1.2) {
        heroBg.style.transform = `translateY(${scrollY * 0.25}px) scale(1.05)`;
    }
    const mid = scrollY + innerHeight / 2;
    sections.forEach((s, i) => {
        if (!s) return;
        const on = mid >= s.offsetTop && mid < s.offsetTop + s.offsetHeight;
        dockLinks[i].classList.toggle("active", on);
    });
    ticking = false;
}
addEventListener("scroll", () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
}, { passive: true });

/* ---------- countdown ---------- */
const target = new Date(CONFIG.weddingDate).getTime();
const pad = (n) => String(n).padStart(2, "0");

function countdown() {
    const left = Math.max(0, target - Date.now());
    $("days").textContent = pad(Math.floor(left / 864e5));
    $("hours").textContent = pad(Math.floor((left % 864e5) / 36e5));
    $("minutes").textContent = pad(Math.floor((left % 36e5) / 6e4));
    $("seconds").textContent = pad(Math.floor((left % 6e4) / 1e3));
}
countdown();
setInterval(countdown, 1000);

/* ---------- simpan ke kalender (.ics) ---------- */
$("addCalendar").addEventListener("click", () => {
    const fmt = (d) => new Date(d).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const ics = [
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Wedding//ID", "BEGIN:VEVENT",
        `UID:${Date.now()}@wedding`,
        `DTSTAMP:${fmt(Date.now())}`,
        `DTSTART:${fmt(CONFIG.weddingDate)}`,
        `DTEND:${fmt(CONFIG.endDate)}`,
        `SUMMARY:Pernikahan ${CONFIG.bride} & ${CONFIG.groom}`,
        `LOCATION:${CONFIG.venue}`,
        "DESCRIPTION:Prosesi 14.30 WIB · Resepsi 19.00 WIB",
        "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n");

    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = "undangan-pernikahan.ics";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Kalender diunduh ✓");
});

/* ---------- salin nomor rekening ---------- */
document.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
        const text = $(btn.dataset.copy).textContent.trim();
        try { await navigator.clipboard.writeText(text); }
        catch {
            const t = document.createElement("textarea");
            t.value = text; document.body.appendChild(t); t.select();
            document.execCommand("copy"); t.remove();
        }
        toast("Nomor rekening disalin ✓");
    });
});

/* ---------- lightbox galeri ---------- */
const lb = $("lightbox");
const lbImg = lb.querySelector("img");
document.querySelectorAll(".g").forEach((fig) => {
    fig.addEventListener("click", () => {
        const img = fig.querySelector("img");
        if (!img) return;
        lbImg.src = img.src;
        lb.classList.add("show");
    });
});
lb.addEventListener("click", () => lb.classList.remove("show"));
addEventListener("keydown", (e) => { if (e.key === "Escape") lb.classList.remove("show"); });

/* ---------- RSVP + buku ucapan ---------- */
const WISH_KEY = "wedding-wishes-v1";
const escapeHTML = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function loadWishes() {
    try { return JSON.parse(localStorage.getItem(WISH_KEY)) || []; } catch { return []; }
}
function renderWishes() {
    const list = $("wishList");
    const wishes = loadWishes();
    if (!wishes.length) { list.innerHTML = '<p class="empty">Jadilah yang pertama memberi ucapan ♡</p>'; return; }
    list.innerHTML = wishes.map((w) => `
        <div class="wish">
            <b>${escapeHTML(w.name)}</b><em>${w.attend ? "HADIR" : "TIDAK HADIR"}</em>
            <p>${escapeHTML(w.message)}</p>
        </div>`).join("");
}
renderWishes();

$("rsvp").addEventListener("submit", (e) => {
    e.preventDefault();

    const name = $("name").value.trim();
    const attendance = $("attendance").value;
    const guests = $("guests").value;
    const message = $("message").value.trim();

    if (message) {
        const wishes = loadWishes();
        wishes.unshift({ name, message, attend: attendance.startsWith("Ya") });
        try { localStorage.setItem(WISH_KEY, JSON.stringify(wishes.slice(0, 50))); } catch {}
        renderWishes();
    }

    const text = `Halo ${CONFIG.bride} & ${CONFIG.groom},

Saya ${name}.
Konfirmasi: ${attendance}
Jumlah tamu: ${guests}

Ucapan:
${message || "-"}`;

    toast("Membuka WhatsApp…");
    const to = CONFIG.recipients[Number($("sendTo").value)] || CONFIG.recipients[0];
    window.open(`https://wa.me/${to.phone}?text=${encodeURIComponent(text)}`, "_blank");
});

/* ---------- kelopak emas melayang ---------- */
(function petals() {
    if (reduceMotion) return;
    const c = $("petals");
    const ctx = c.getContext("2d");
    let w, h, items = [];
    const COUNT = innerWidth < 700 ? 16 : 28;

    function resize() { w = c.width = innerWidth; h = c.height = innerHeight; }
    addEventListener("resize", resize);
    resize();

    const make = (initial) => ({
        x: Math.random() * w,
        y: initial ? Math.random() * h : -20,
        s: 5 + Math.random() * 8,
        vy: 0.35 + Math.random() * 0.7,
        vx: -0.2 + Math.random() * 0.5,
        r: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.02,
        a: 0.25 + Math.random() * 0.45,
        sw: Math.random() * Math.PI * 2
    });
    for (let i = 0; i < COUNT; i++) items.push(make(true));

    function draw() {
        ctx.clearRect(0, 0, w, h);
        items.forEach((p, i) => {
            p.sw += 0.02;
            p.x += p.vx + Math.sin(p.sw) * 0.4;
            p.y += p.vy;
            p.r += p.vr;
            if (p.y > h + 20 || p.x > w + 30 || p.x < -30) items[i] = make(false);

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.r);
            ctx.globalAlpha = p.a;
            const g = ctx.createLinearGradient(0, -p.s, 0, p.s);
            g.addColorStop(0, "#f6e3bd");
            g.addColorStop(1, "#b98f52");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(0, -p.s);
            ctx.bezierCurveTo(p.s * 0.9, -p.s * 0.4, p.s * 0.7, p.s * 0.6, 0, p.s);
            ctx.bezierCurveTo(-p.s * 0.7, p.s * 0.6, -p.s * 0.9, -p.s * 0.4, 0, -p.s);
            ctx.fill();
            ctx.restore();
        });
        requestAnimationFrame(draw);
    }
    draw();
})();
