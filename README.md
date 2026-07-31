# ☕ Kopi Selon - Employee Management System (EMS)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node.js-v20%2B-green.svg)
![React](https://img.shields.io/badge/react-v19-blue.svg)
![TypeScript](https://img.shields.io/badge/typescript-v5-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue.svg)
![Proxmox VE](https://img.shields.io/badge/proxmox-LXC%2FVM-orange.svg)

Sistem Manajemen Karyawan, Presensi GPS/Selfie, Penjadwalan Shift, Penggajian, dan Laporan Operasional untuk **Kopi Selon**. Dibangun menggunakan arsitektur modern **Node.js + Express + React (Vite) + TypeScript + Prisma ORM + SQLite**.

---

## 📋 Daftar Isi

1. [Struktur & Urutan Hierarki Role](#-struktur--urutan-hierarki-role)
2. [Fitur & Persyaratan Sistem](#-fitur--persyaratan-sistem)
3. [Konfigurasi Environment (`.env`) & Akun Admin Awal](#-konfigurasi-environment-env--akun-admin-awal)
4. [Panduan Deployment dengan Docker (Rekomendasi)](#-panduan-deployment-dengan-docker-rekomendasi)
5. [Panduan Deployment di Proxmox VE (LXC & VM)](#-panduan-deployment-di-proxmox-ve-lxc--vm)
6. [Panduan Update Aplikasi di Proxmox / VPS](#-panduan-update-aplikasi-di-proxmox--vps)
7. [Panduan Deployment VPS Linux Native (PM2 + Nginx + SSL)](#-panduan-deployment-vps-linux-native-pm2--nginx--ssl)
8. [Pengembangan Lokal (Development)](#-pengembangan-lokal-development)
9. [Perawatan, Backup, & Reset Database](#-perawatan-backup--reset-database)
10. [Troubleshooting & Solusi Kendala Umum](#-troubleshooting--solusi-kendala-umum)

---

## 👑 Struktur & Urutan Hierarki Role

Sistem EMS Kopi Selon menggunakan model **Role-Based Access Control (RBAC)** dengan urutan tingkat kewenangan resmi sebagai berikut:

| Urutan | Role | Tingkat / Badge | Deskripsi Hak Akses Utama |
|---|---|---|---|
| **1** | **Administrator** | Super Admin | Akses penuh tanpa batasan ke seluruh modul sistem, penugasan role, audit log, backup & restore database, serta konfigurasi lokasi/radius Warkop. |
| **2** | **Owner** | Pemilik Usaha | Executive Analytics: Memantau performa outlet, analisa kedisiplinan, laporan penggajian (payroll), laporan absensi, dan audit log operasional. |
| **3** | **Staff** | Supervisor / Kasir | Store Operations: Mengelola operasional harian, membuat & mengatur shift kerja, mendaftarkan karyawan baru (Staff & Karyawan), melakukan approval izin/cuti/tukar shift, serta presensi toko. |
| **4** | **Karyawan** | Anggota Tim | Employee Portal: Melakukan absensi selfie via GPS, melihat jadwal shift kerja, mengajukan izin/cuti/tukar shift, dan melihat slip gaji mandiri. |

---

## ⚙️ Fitur & Persyaratan Sistem

### 🌟 Fitur Utama & Update Terbaru (Agustus 2026)
- 📍 **Absensi GPS & Geofencing Selfie**: Validasi jarak radius titik lokasi warkop & foto selfie real-time.
- 👤 **Verifikasi Deteksi Wajah Pintar (Anti-False-Positive)**: Absensi mewajibkan pendeteksian wajah asli di kamera depan (menggunakan Web Shape Detection API / fallback `tracking.js`). Dilengkapi dengan batasan ukuran minimum wajah 100px untuk mencegah deteksi palsu dari objek latar belakang (seperti motif langit-langit/plafon).
- 🖼️ **Kompresi Gambar Otomatis**: Foto selfie presensi otomatis dikompresi di sisi client (maks 640px, JPEG kualitas 75%) sebelum diunggah untuk menghemat penyimpanan server hingga 90%+.
- 📅 **Matriks Shift & Tukar Shift**: Manajemen jadwal kerja fleksibel, kalender matriks karyawan, dan approval tukar shift.
- 🗓️ **Penyaringan Roster Mingguan**: Builder matriks jadwal kini mendukung penyaringan per minggu (Minggu 1 s/d 5) di samping tampilan bulanan untuk memudahkan penataan shift tanpa perlu scroll horizontal berlebih.
- 💵 **Payroll, Bonus Lembur & Denda**: 
  - Perhitungan slip gaji otomatis berdasarkan denda keterlambatan/absen tanpa izin.
  - Fitur **Pengajuan Lembur (Overtime Request)** terintegrasi dari portal karyawan. Lembur yang disetujui mengurangi denda kurang jam kerja, sekaligus menambahkan **Bonus Lembur per Jam** yang bisa diatur pada aturan gaji (Salary Rules) serta disimulasikan secara real-time.
- ✏️ **Edit Profil Mandiri Karyawan**: Semua peran (Owner, Staff, Karyawan) dapat memperbarui nama lengkap dan nomor telepon mereka sendiri secara mandiri melalui pop-up Profil Saya di sistem.

### 🖥️ Persyaratan Minimal Server / Proxmox CT:
- **CPU**: 1 vCPU
- **RAM**: Minimal 1 GB (Disarankan 2 GB)
- **Storage**: 10 GB Free Disk Space
- **OS**: Ubuntu 22.04 LTS / Debian 12 (Proxmox LXC Container atau VM)
- **Runtime**: Docker & Docker Compose **atau** Node.js v20+, Nginx, PM2

---

## 🔑 Konfigurasi Environment (`.env`) & Akun Admin Awal

Aplikasi dikonfigurasi untuk **Fresh Installation**. Pada pertama kali server dijalankan, sistem secara otomatis menginisialisasi database bersih dan membuat **1 Akun Administrator Awal**.

### 👤 Kredensial Administrator Awal (Default)
- **Username**: `admin`
- **Password**: `admin123`

> ⚠️ **PENTING**: Setelah berhasil login pertama kali, segera ubah password akun `admin` melalui menu **Settings / Pengaturan**.

### 📝 Contoh Konfigurasi `.env`
Salin file `.env.example` ke `.env`:

```bash
cp .env.example .env
```

Sesuaikan isi `.env`:

```env
# Port Aplikasi (Default: 3333)
PORT=3333

# Node Environment
NODE_ENV=production

# Database Connection (SQLite)
DATABASE_URL="file:../database/dev.db"

# Secret Key Signing JWT Auth Token
JWT_SECRET="ganti_dengan_jwt_secret_yang_aman_dan_acak_12345"

# Gemini AI API Key (Opsional, untuk fitur AI Asisten)
GEMINI_API_KEY="your_gemini_api_key_here"

# Custom Kredensial Admin Awal (Opsional)
INITIAL_ADMIN_USERNAME="admin"
INITIAL_ADMIN_PASSWORD="admin123"
```

---

## 🐳 Panduan Deployment dengan Docker (Rekomendasi)

Deploy menggunakan Docker Compose adalah cara paling stabil dan direkomendasikan.

### 1. Install Docker & Docker Compose
Jika belum terpasang di Linux Server:

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
docker --version
docker compose version
```

### 2. Clone Repository & Setup Environment
```bash
git clone https://github.com/zaivnet/Kopi-Selon-EMS.git /opt/kopi-selon-ems
cd /opt/kopi-selon-ems
cp .env.example .env
nano .env
```

### 3. Jalankan Application Container
```bash
docker compose up -d --build
```

Aplikasi akan otomatis terkompilasi, menginisialisasi schema SQLite Prisma, menjalankan database seed, dan berjalan pada port `3333` (atau port sesuai variabel `PORT` di `.env`).

---

## 🚀 Panduan Deployment di Proxmox VE (LXC & VM)

Anda dapat melakukan deployment EMS Kopi Selon di **Proxmox Virtual Environment (PVE)** baik menggunakan **LXC Container** (Sangat Ringan) maupun **Virtual Machine (VM)**.

---

### 📦 Opsi A: Deployment di Proxmox LXC Container (Disarankan - Low Resource)

#### 1. Buat LXC Container Baru di Proxmox VE
- **Template**: Ubuntu 22.04 LTS atau Debian 12 Standard Template.
- **Resources**: 1 vCPU, 1024 MB RAM, 10 GB Storage.
- **Unprivileged Container**: Centang (Yes).
- **Features**: Centang **Nesting** (Diperlukan agar Docker / Container dapat berjalan di dalam LXC).

> 💡 *Jika membuat Unprivileged LXC dengan Docker, buka Proxmox Console dan pastikan `nesting: 1` diaktifkan di Options > Features container.*

#### 2. Install Docker di LXC Container
Masuk ke console LXC via SSH / Proxmox Web Shell:

```bash
apt update && apt upgrade -y
apt install -y curl git nano

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

#### 3. Setup Project & Docker Volume Persistent
```bash
# Clone repository
git clone https://github.com/zaivnet/Kopi-Selon-EMS.git /opt/kopi-selon-ems
cd /opt/kopi-selon-ems

# Setup .env
cp .env.example .env
nano .env

# Jalankan Container
docker compose up -d --build
```

Folder `./database` dan `./uploads` akan otomatis di-mount sebagai persistent volume di host LXC Proxmox.

---

### 🖥️ Opsi B: Deployment di Proxmox VM (Virtual Machine)

1. Buat VM Ubuntu Server 22.04 LTS di Proxmox VE (2 vCPU, 2GB RAM).
2. Install Docker & Docker Compose di dalam VM.
3. Clone repository dan jalankan `docker compose up -d --build`.

---

## 🔄 Panduan Update Aplikasi di Proxmox / VPS

Ketika terdapat pembaruan kode di repository GitHub, ikuti langkah berikut untuk mengupdate aplikasi di Proxmox LXC / VPS tanpa kehilangan data database (`dev.db`) maupun berkas upload:

### ⚡ Update Otomatis (Docker Deployment)

```bash
# 1. Masuk ke folder project di Proxmox LXC / VPS
cd /opt/kopi-selon-ems

# 2. Ambil pembaruan kode terbaru dari GitHub
git pull origin main

# 3. Rebuild dan restart container Docker
docker compose down
docker compose up -d --build

# 4. Cek log untuk memastikan migrasi database & server berjalan lancar
docker compose logs -f app
```

---

## 🖥️ Panduan Deployment VPS Linux Native (PM2 + Nginx + SSL)

Jika Anda tidak menggunakan Docker dan ingin menjalankan aplikasi secara native menggunakan **PM2** dan **Nginx Reverse Proxy**:

### 1. Install Node.js 20 LTS & PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx certbot python3-certbot-nginx git
sudo npm install -g pm2
```

### 2. Setup Project & Build
```bash
cd /var/www
git clone https://github.com/zaivnet/Kopi-Selon-EMS.git kopi-selon-ems
cd kopi-selon-ems
cp .env.example .env
nano .env

# Install dependensi & build
npm install
npm run build
```

### 3. Start via PM2
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 4. Konfigurasi Nginx Reverse Proxy
Buat file `/etc/nginx/sites-available/kopi-selon`:

```nginx
server {
    listen 80;
    server_name ems.kopiselon.com; # Ganti dengan domain Anda

    client_max_body_size 25M;

    location / {
        proxy_pass http://localhost:3333;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        alias /var/www/kopi-selon-ems/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

Aktifkan site dan pasang SSL Certbot:
```bash
sudo ln -s /etc/nginx/sites-available/kopi-selon /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d ems.kopiselon.com
```

---

## 💻 Pengembangan Lokal (Development)

Untuk menjalankan aplikasi di lingkungan pengembangan lokal:

```bash
# 1. Install dependensi root & frontend
npm install

# 2. Inisialisasi DB SQLite lokal & seed (opsional)
npm run db:reset

# 3. Jalankan server dev lokal
npm run dev
```

Aplikasi backend & frontend akan berjalan pada `http://localhost:3333`.

---

## 🛠️ Perawatan, Backup, & Reset Database

### 📦 Backup Data Database & Berkas Upload
Seluruh data database tersimpan pada `database/dev.db` dan foto presensi pada `uploads/`.

- **Backup Manual**:
  ```bash
  mkdir -p backups
  cp database/dev.db backups/dev_backup_$(date +%Y%m%d_%H%M%S).db
  tar -czvf backups/uploads_backup_$(date +%Y%m%d).tar.gz uploads/
  ```

- **Proxmox Backup (Proxmox VE / PBS)**:
  Jika di-deploy di Proxmox LXC/VM, Anda dapat menjadwalkan **VZDump Backup** atau **Proxmox Backup Server** harian secara langsung dari dashboard Proxmox VE.

### 🔄 Reset Database ke Kondisi Fresh
Untuk mengembalikan sistem ke kondisi awal (hanya 1 akun Admin `admin` / `admin123`):

```bash
npm run db:reset
```

---

## ❓ Troubleshooting & Solusi Kendala Umum

### 1. Error Port Bentrok (`address already in use`)
Jika port `3333` sudah digunakan oleh layanan lain:
- Ubah `PORT=8080` (atau port pilihan Anda) pada file `.env`.
- Restart container: `docker compose down && docker compose up -d --build`.

### 2. Opsi Role Kosong Saat Staff Menambah Karyawan Baru
Pastikan pengguna Staff memiliki izin yang sesuai di sistem. Sistem telah dikonfigurasi agar pengguna dengan role **Staff** otomatis mendapatkan opsi role **Staff** dan **Karyawan** saat menambah/mengedit data karyawan.

### 3. Lupa Password Admin Utama
Jalankan perintah `npm run db:seed` atau reset password admin via command line / Prisma Studio (`npx prisma studio`).

---

## 📄 Lisensi

Dikembangkan untuk **Kopi Selon EMS**. Seluruh hak cipta dilindungi.
