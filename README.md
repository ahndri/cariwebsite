# CariWebsite (Fake Domain Scanner)

CariWebsite adalah aplikasi berbasis web cerdas (Frontend Application) yang mendeteksi indikasi situs web palsu, phishing, atau *scam*.

Proyek ini dibangun menggunakan:
- HTML5
- Vanilla CSS3 (dengan desain *Glassmorphism* dan Animasi Moderen)
- JavaScript (Pengecekan Heuristik Dinamis)

## Cara Kerja (Pengecekan Heuristik)

Karena beroperasi sepenuhnya di peramban pengguna tanpa koneksi API *backend* eksternal (guna privasi dan kemudahan setup), CariWebsite mengandalkan logika pemindaian heuristik:
1. **Analisis TLD (Top-Level Domain):** Memprioritaskan domain berekstensi murahan atau gratis yang sering dimanfaatkan hacker (seperti `.xyz`, `.tk`, `.pw`).
2. ***Keyword Spoofer*:** Mendeteksi adanya kata-kata yang bertujuan menipu target seolah-olah menjadi entitas resmi (seperti `login`, `secure`, `verify`).
3. **Peringatan IP Address:** Menyaring indikasi penggunaan IP address mentah dibandingkan domain mask (contoh: `http://192.168.1.1/update`).
4. **Struktur URL:** Menganalisis kelebihan tanda hubung *(hyphen)* yang biasa dipakai untuk menyesatkan visualisasi target terhadap suatu entitas domain.

## Instalasi & Menjalankan

Aplikasi ini tidak memerlukan instalasi NPM atau *server backend*.
1. Cukup salin (*clone*) repositori ini.
2. Buka berkas `index.html` langsung dari *browser* Anda.

## Pratinjau Desain

Aplikasi ini mengusung tajuk *dark-mode* dengan ornamen palet warna neon dan refleksi latar yang imersif (*glassmorphism*). Animasi radar juga dirancang memukau layaknya aplikasi tingkat pro dari pakar *Cybersecurity*.
