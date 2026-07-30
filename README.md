# ☕ Kopi Selon - Employee Management System (EMS)

Sistem Manajemen Karyawan dan Presensi (EMS) untuk Kopi Selon, dibangun menggunakan Node.js, Express, React (Vite), TypeScript, Prisma ORM, dan SQLite.

---

## 📋 Daftar Isi

1. [Fitur & Persyaratan System](#-fitur--persyaratan-system)
2. [Konfigurasi Environment (`.env`) & User Admin Awal](#-konfigurasi-environment-env--user-admin-awal)
3. [Panduan Instalasi dengan Docker (Rekomendasi)](#-panduan-instalasi-dengan-docker-rekomendasi)
4. [Panduan Instalasi di VPS Linux (PM2 + Nginx + SSL)](#-panduan-instalasi-di-vps-linux-pm2--nginx--ssl)
5. [Pengembangan Lokal (Development)](#-pengembangan-lokal-development)
6. [Perawatan & Pemeliharaan System](#-perawatan--pemeliharaan-system)

---

## ⚙️ Fitur & Persyaratan System

### Persyaratan Minimal Server:
- **CPU**: 1 vCPU
- **RAM**: Minimal 1 GB (Disarankan 2 GB)
- **Disk**: 10 GB Free Storage
- **OS**: Ubuntu 20.04 LTS / 22.04 LTS / Debian 11+ (untuk VPS)
- **Software**: Docker & Docker Compose **atau** Node.js v20+, Nginx, PM2

---

## 🔑 Konfigurasi Environment (`.env`) & User Admin Awal

Aplikasi ini dikonfigurasi untuk **Fresh Installation**. Pada saat aplikasi pertama kali dijalankan (di Docker atau VPS), sistem secara otomatis menginisialisasi database yang bersih tanpa data dummy karyawan maupun shift, hanya menyertakan 1 akun **Administrator**.

### 👤 Kredensial Administrator Awal (Default)
- **Username**: `admin`
- **Password**: `admin123`

> ⚠️ **PENTING**: Setelah login pertama kali, segera ubah password akun `admin` melalui menu **Settings / Pengaturan**.

### File `.env`
Salin file `.env.example` ke `.env`:

```bash
cp .env.example .env
```

Isi dan sesuaikan variabel `.env` berikut:

```env
# Gemini AI API Key (Opsional, untuk fitur AI)
GEMINI_API_KEY="your_gemini_api_key_here"

# Database Connection (SQLite)
DATABASE_URL="file:../database/dev.db"

# Secret key untuk signing JWT Auth Token
JWT_SECRET="ganti_dengan_jwt_secret_yang_aman_dan_acak"

# Port Server
PORT=3000

# Node Environment
NODE_ENV=production

# Custom Kredensial Admin Awal (Opsional, default: admin / admin123)
INITIAL_ADMIN_USERNAME="admin"
INITIAL_ADMIN_PASSWORD="admin123"
```

---

## 🐳 Panduan Instalasi dengan Docker (Rekomendasi)

Deploy menggunakan Docker Compose adalah cara tercepat dan paling aman karena semua dependensi sudah dikemas dalam kontainer.

### 1. Install Docker & Docker Compose di VPS/Server
Jika belum terinstall di server Ubuntu/Debian:

```bash
# Update package list & install docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Verifikasi instalasi
docker --version
docker compose version
```

### 2. Clone Repository & Setup `.env`
```bash
git clone <URL_REPOSITORY_ANDA> kopi-selon-ems
cd kopi-selon-ems
cp .env.example .env
# Edit .env sesuai kebutuhan
nano .env
```

### 3. Jalankan Aplikasi dengan Docker Compose
```bash
docker compose up -d --build
```

Container akan otomatis:
- Melakukan kompilasi Frontend & Backend.
- Menginisialisasi skema database SQLite via Prisma.
- Menjalankan **Automatic Database Seeding** untuk membuat Role & Akun Admin Awal.
- Menjalankan server pada port `3000`.

### 4. Mengecek Status Container & Log
```bash
# Cek status container
docker compose ps

# Cek log aplikasi secara realtime
docker compose logs -f app
```

---

## 🖥️ Panduan Instalasi di VPS Linux (PM2 + Nginx + SSL)

Jika Anda ingin menjalankan aplikasi secara native di VPS tanpa Docker (menggunakan PM2 dan Nginx Reverse Proxy).

### Langkah 1: Update Server & Install Node.js 20 LTS

```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Install git, curl, build tools
sudo apt install -y git curl build-essential

# Install Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verifikasi Node.js dan npm
node -v
npm -v
```

---

### Langkah 2: Install PM2 & Nginx

```bash
# Install PM2 secara global
sudo npm install -g pm2

# Install Nginx & Certbot (untuk SSL)
sudo apt install -y nginx certbot python3-certbot-nginx
```

---

### Langkah 3: Clone Repository & Build Aplikasi

```bash
# Clone project ke direktori /var/www atau home directory
cd /var/www
sudo git clone <URL_REPOSITORY_ANDA> kopi-selon-ems
sudo chown -R $USER:$USER /var/www/kopi-selon-ems
cd kopi-selon-ems

# Buat file .env
cp .env.example .env
nano .env

# Install dependensi
npm install

# Inisialisasi Database Fresh & Seed Admin
npm run db:reset

# Build Frontend & Backend untuk Production
npm run build
```

---

### Langkah 4: Jalankan Aplikasi dengan PM2

Aplikasi ini sudah dilengkapi dengan file `ecosystem.config.cjs`.

```bash
# Start aplikasi via PM2
pm2 start ecosystem.config.cjs

# Simpan status PM2 agar otomatis jalan saat server reboot
pm2 save
pm2 startup
```

---

### Langkah 5: Konfigurasi Nginx Reverse Proxy

Buat file konfigurasi Nginx untuk domain Anda:

```bash
sudo nano /etc/nginx/sites-available/kopi-selon
```

Tempelkan konfigurasi berikut (ganti `domain-anda.com` dengan domain/subdomain VPS Anda):

```nginx
server {
    listen 80;
    server_name domain-anda.com www.domain-anda.com;

    # Limit payload ukuran upload foto presensi/berkas
    client_max_body_size 20M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static uploads caching
    location /uploads/ {
        proxy_pass http://localhost:3000/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

Aktifkan konfigurasi Nginx dan reload:

```bash
# Symlink ke sites-enabled
sudo ln -s /etc/nginx/sites-available/kopi-selon /etc/nginx/sites-enabled/

# Test syntax nginx
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

### Langkah 6: Pasang Sertifikat SSL / HTTPS (Certbot)

```bash
sudo certbot --nginx -d domain-anda.com -d www.domain-anda.com
```

---

## 💻 Pengembangan Lokal (Development)

Untuk menjalankan aplikasi di mesin lokal untuk pengembangan:

```bash
# 1. Install dependensi
npm install

# 2. Reset / inisialisasi fresh database (opsional)
npm run db:reset

# 3. Jalankan server dev
npm run dev
```

Aplikasi akan berjalan di `http://localhost:3000`.

---

## 🛠️ Perawatan & Perintah Database

### 1. Reset Database Ke Kondisi Fresh
Jika ingin mengosongkan seluruh data karyawan & shift dan mengembalikan sistem ke kondisi awal (hanya 1 akun Admin):

```bash
npm run db:reset
```

### 2. Backup Data Database & Uploads
Database SQLite tersimpan di `database/dev.db` dan file upload karyawan tersimpan di folder `uploads/`.

- **Backup Manual**:
  ```bash
  cp database/dev.db database/dev.db.bak_$(date +%Y%m%d)
  tar -czvf uploads_backup_$(date +%Y%m%d).tar.gz uploads/
  ```

---

## 📞 Troubleshooting & Solusi Port Bentrok

### Error: `failed to bind host port 0.0.0.0:3000/tcp: address already in use`
Error ini terjadi karena port `3000` di VPS/Server Anda sudah dipakai oleh aplikasi/service lain.

#### Cara Mengubah Port Docker:

**Metode A: Lewat file `.env` (Paling Mudah)**
1. Buka file `.env` di VPS/Server Anda:
   ```bash
   nano .env
   ```
2. Ubah `PORT` ke port lain yang masih kosong (contoh: `8080`, `3001`, atau `8000`):
   ```env
   PORT=8080
   ```
3. Restart Docker Compose:
   ```bash
   docker compose down
   docker compose up -d --build
   ```
   Aplikasi sekarang akan dapat diakses melalui `http://IP_VPS_ANDA:8080`.

**Metode B: Langsung di file `docker-compose.yml`**
1. Buka file `docker-compose.yml`:
   ```bash
   nano docker-compose.yml
   ```
2. Ubah bagian `ports` (Format: `"PORT_VPS:PORT_CONTAINER"`):
   ```yaml
   ports:
     - "8080:3000"
   ```
3. Jalankan kembali:
   ```bash
   docker compose up -d
   ```

- **Lupa Password Admin?**
  Jalankan `npm run db:seed` untuk memastikan akun admin utama aktif.

