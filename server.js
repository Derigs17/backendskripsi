const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Middleware untuk menerima request body dalam format JSON
app.use(cors());
app.use(express.json());

// Setup multer untuk upload gambar
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');  // Menyimpan file ke folder uploads
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));  // Gambar disimpan dengan nama unik
  }
});

const upload = multer({ storage: storage });

// Endpoint untuk melayani file gambar
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Koneksi ke Supabase
const supabaseUrl = 'https://hqazfaqaambxdjhekljs.supabase.co';  // Ganti dengan URL Supabase Anda
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxYXpmYXFhYW1ieGRqaGVrbGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NTE4NTQsImV4cCI6MjA2NjUyNzg1NH0.h7lVpjJheQ3EusFuGCus5W9CxA51qfcKbU0-kdxjdJY';  // Ganti dengan API Key Supabase Anda
const supabase = createClient(supabaseUrl, supabaseKey);

// Menjalankan server pada port 8001
app.listen(8001, () => {
  console.log("Server is running on port 8001");
});

// Endpoint untuk tes koneksi dan ambil data dari Supabase
app.get('/testSupabase', async (req, res) => {
  const { data, error } = await supabase
    .from('user') // Nama tabel di Supabase
    .select('*');  // Ambil semua kolom

  if (error) {
    console.error("Error fetching data from Supabase:", error);
    return res.status(500).send('Error fetching data');
  }

  res.status(200).json(data); // Kirim data yang diambil
});


// Endpoint untuk register
app.post('/register', async (req, res) => {
    const { nama, email, password, role } = req.body;

    // Validasi keunikan email di Supabase
    const { data, error } = await supabase
        .from('user')  // Nama tabel di Supabase
        .select('email')
        .eq('email', email);  // Mengambil data email

    if (error) {
        console.error('Error checking email:', error);
        return res.status(500).send('Server error');
    }

    // Jika tidak ditemukan email (data kosong), lanjutkan registrasi
    if (data && data.length > 0) {
        return res.status(400).json({ message: 'Email already in use' });
    }

    // Menambahkan pengguna baru ke Supabase
    const { data: insertData, error: insertError } = await supabase
        .from('user')
        .insert([
            { name: nama, email: email, password: password, role: role, is_login: 'isNotLogin' }
        ]);

    if (insertError) {
        console.error('Error inserting user:', insertError);
        return res.status(500).send('Server error');
    }

    res.status(200).json({ message: 'Registration successful' });
});

// Endpoint untuk login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Query ke Supabase untuk memeriksa email dan password
    const { data, error } = await supabase
        .from('user')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();  // Mengambil satu pengguna saja

    if (error) {
        console.error("Error during login:", error);
        return res.status(500).send('Server error');
    }

    if (data) {
        // Update status login di Supabase menjadi 'isLogin' (nilai yang valid)
        const { error: updateError } = await supabase
            .from('user')
            .update({ is_login: 'isLogin' })  // Ganti dengan 'isLogin' sesuai enum
            .eq('email', email);

        if (updateError) {
            console.error("Error updating login status:", updateError);
            return res.status(500).send('Server error');
        }

        // Kirim data pengguna setelah berhasil login
        res.status(200).json({
            message: 'Login successful',
            user: data  // Mengirim data pengguna
        });
    } else {
        res.status(400).json({ message: 'Invalid email or password' });
    }
});

// Endpoint untuk logout
app.post('/logout', async (req, res) => {
    const { email } = req.body;

    // Update status login di Supabase menjadi 'isNotLogin'
    const { error } = await supabase
        .from('user')
        .update({ is_login: 'isNotLogin' })  // Ganti dengan 'isNotLogin' sesuai enum
        .eq('email', email);

    if (error) {
        console.error("Error during logout:", error);
        return res.status(500).send('Server error');
    }

    res.status(200).json({ message: 'Logout successful' });
});


// Endpoint untuk mendapatkan data profil pengguna berdasarkan email
app.get('/getUserProfile/:email', async (req, res) => {
    const email = req.params.email;

    // Query ke Supabase untuk mengambil data berdasarkan email
    const { data, error } = await supabase
        .from('user')
        .select('*')
        .eq('email', email)
        .single();  // Mengambil satu data pengguna saja

    if (error) {
        console.error("Error fetching user profile:", error);
        return res.status(500).send('Server error');
    }

    if (data) {
        res.status(200).json(data);  // Mengirim data pengguna
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});


// Endpoint untuk memperbarui data profil pengguna
app.post('/updateUserProfile/:email', async (req, res) => {
    const email = req.params.email;
    const { name, password } = req.body;

    // Query ke Supabase untuk memperbarui data pengguna berdasarkan email
    const { data, error } = await supabase
        .from('user')
        .update({ name: name, password: password })  // Update nama dan password
        .eq('email', email);  // Berdasarkan email

    if (error) {
        console.error("Error updating user profile:", error);
        return res.status(500).send('Server error');
    }

    res.status(200).json({ message: 'Profile updated successfully', user: data });
});


// Endpoint untuk mengambil semua user
app.get('/getAllUsers', async (req, res) => {
    // Query ke Supabase untuk mengambil semua data user
    const { data, error } = await supabase
        .from('user')
        .select('*'); // Mengambil semua data pengguna

    if (error) {
        console.error("Error fetching users:", error);
        return res.status(500).send('Server error');
    }

    res.status(200).json(data); // Mengirim data user dalam format JSON
});

// Endpoint untuk menambah user
app.post('/addUser', async (req, res) => {
    const { email, role, name, password } = req.body; // Mengambil email, role, name, dan password dari request body

    // Validasi data email, role, name, dan password
    if (!email || !role || !name || !password) {
        return res.status(400).json({ message: 'Email, role, name, and password are required.' });
    }

    // Query untuk menambahkan user baru ke Supabase
    const { data, error } = await supabase
        .from('user')
        .insert([
            { email: email, role: role, name: name, password: password, is_login: 'isNotLogin' }
        ]);

    if (error) {
        console.error('Error inserting user:', error);
        return res.status(500).send('Server error');
    }

    res.status(200).json({ message: 'User added successfully', user: data });
});


// Endpoint untuk menghapus user
app.delete('/deleteUser/:email', async (req, res) => {
    const { email } = req.params;

    // Query ke Supabase untuk menghapus user berdasarkan email
    const { data, error } = await supabase
        .from('user')
        .delete()
        .eq('email', email);  // Menghapus berdasarkan email

    if (error) {
        console.error("Error deleting user:", error);
        return res.status(500).send('Server error');
    }

    res.status(200).json({ message: 'User deleted successfully', deletedUser: data });
});



// Endpoint untuk menerima data peminjaman inventaris
app.post('/submitPeminjaman', async (req, res) => {
  const { email, nama, barang, tglMulai, tglSelesai, keperluan, nomorTelepon } = req.body;

  // Insert data peminjaman ke Supabase, termasuk email, barang, dan nomor telepon
  const { data, error } = await supabase
    .from('peminjaman_inventaris')
    .insert([
      {
        email: email,
        nama: nama,
        barang: barang,
        tgl_mulai: tglMulai,
        tgl_selesai: tglSelesai,
        keperluan: keperluan,
        nomor_telepon: nomorTelepon,
        status: 'Menunggu'  // Status awal adalah 'Menunggu'
      }
    ]);

  if (error) {
    console.error('Error inserting peminjaman:', error);
    return res.status(500).send('Server error');
  }

  res.status(200).json({ message: 'Peminjaman berhasil dikirim', data: data });
});



// Endpoint untuk mendapatkan riwayat peminjaman berdasarkan email
app.get('/getRiwayatPeminjaman/:email', async (req, res) => {
  const email = req.params.email;

  // Query ke Supabase untuk mengambil riwayat peminjaman berdasarkan email
  const { data, error } = await supabase
    .from('peminjaman_inventaris')
    .select('id, email, nama, barang, tgl_mulai, tgl_selesai, keperluan, nomor_telepon, status')
    .eq('email', email);  // Filter berdasarkan email

  if (error) {
    console.error("Error fetching riwayat peminjaman:", error);
    return res.status(500).send('Server error');
  }

  res.status(200).json(data);  // Mengirim data riwayat peminjaman
});


// Endpoint untuk mendapatkan semua riwayat peminjaman (admin)
app.get('/getAllRiwayatPeminjaman', async (req, res) => {
  // Query ke Supabase untuk mengambil semua riwayat peminjaman
  const { data, error } = await supabase
    .from('peminjaman_inventaris')
    .select('*');  // Mengambil semua data riwayat peminjaman

  if (error) {
    console.error("Error fetching all riwayat peminjaman:", error);
    return res.status(500).send('Server error');
  }

  res.status(200).json(data);  // Mengirim data riwayat peminjaman
});


// Endpoint untuk memperbarui status peminjaman
app.post('/updateStatusPeminjaman/:id', async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;

  // Query ke Supabase untuk memperbarui status peminjaman berdasarkan id
  const { data, error } = await supabase
    .from('peminjaman_inventaris')
    .update({ status: status })
    .eq('id', id);  // Filter berdasarkan ID

  if (error) {
    console.error("Error updating status:", error);
    return res.status(500).send('Server error');
  }

  res.status(200).json({ message: 'Status updated successfully', data: data });
});
// Endpoint untuk menghapus riwayat peminjaman
app.delete('/deleteRiwayatPeminjaman/:id', async (req, res) => {
  const { id } = req.params;

  // Query ke Supabase untuk menghapus riwayat peminjaman berdasarkan id
  const { data, error } = await supabase
    .from('peminjaman_inventaris')
    .delete()
    .eq('id', id);  // Filter berdasarkan ID

  if (error) {
    console.error("Error deleting peminjaman:", error);
    return res.status(500).send('Server error');
  }

  res.status(200).json({ message: 'Peminjaman deleted successfully', deletedData: data });
});



// Endpoint untuk menambahkan jadwal Imam
app.post('/addJadwalImam', async (req, res) => {
    const { tanggal, imam, khatib, muazin, bilal } = req.body;

    // Query ke Supabase untuk menambahkan jadwal imam
    const { data, error } = await supabase
        .from('jadwal_imam')
        .insert([
            {
                tanggal: tanggal,
                imam: imam,
                khatib: khatib,
                muazin: muazin,
                bilal: bilal
            }
        ]);

    if (error) {
        console.error("Error inserting jadwal:", error);
        return res.status(500).send('Server error');
    }

    res.status(200).json({ success: true, message: 'Jadwal berhasil ditambahkan', data: data });
});


// Endpoint untuk mengambil jadwal berdasarkan bulan dan tahun
app.get('/getJadwalImamForMonth', async (req, res) => {
    const { bulan, tahun } = req.query; // Ambil bulan dan tahun dari query params

    // Query ke Supabase untuk mengambil jadwal imam berdasarkan bulan dan tahun
    const { data, error } = await supabase
        .from('jadwal_imam')
        .select('*')
        .filter('tanggal', 'gte', `${tahun}-${bulan}-01`)  // Mengambil data mulai dari tanggal 1 bulan tersebut
        .filter('tanggal', 'lt', `${tahun}-${parseInt(bulan)+1}-01`); // Mengambil data sampai bulan berikutnya

    if (error) {
        console.error("Error fetching jadwal Imam:", error);
        return res.status(500).send('Server error');
    }

    res.status(200).json(data); // Kirim data jadwal yang ditemukan
});
// Endpoint untuk mengupdate jadwal Imam
app.post('/updateJadwalImam/:id', async (req, res) => {
    const { tanggal, imam, khatib, muazin, bilal } = req.body;
    const { id } = req.params;

    // Query ke Supabase untuk memperbarui jadwal Imam berdasarkan ID
    const { data, error } = await supabase
        .from('jadwal_imam')
        .update({
            tanggal: tanggal,
            imam: imam,
            khatib: khatib,
            muazin: muazin,
            bilal: bilal
        })
        .eq('id', id);  // Filter berdasarkan ID

    if (error) {
        console.error("Error updating jadwal Imam:", error);
        return res.status(500).send('Server error');
    }

    res.status(200).json({ success: true, message: 'Jadwal updated successfully', data: data });
});


// Endpoint untuk menghapus jadwal Imam
app.delete('/deleteJadwalImam/:id', async (req, res) => {
    const { id } = req.params;

    // Query ke Supabase untuk menghapus jadwal Imam berdasarkan ID
    const { data, error } = await supabase
        .from('jadwal_imam')
        .delete()
        .eq('id', id);  // Filter berdasarkan ID

    if (error) {
        console.error("Error deleting jadwal Imam:", error);
        return res.status(500).send('Server error');
    }

    res.status(200).json({ success: true, message: 'Jadwal deleted successfully', deletedData: data });
});

// Endpoint untuk mendapatkan semua jadwal Imam
app.get('/getAllJadwalImam', async (req, res) => {
    // Query ke Supabase untuk mengambil semua data jadwal Imam, diurutkan berdasarkan tanggal
    const { data, error } = await supabase
        .from('jadwal_imam')
        .select('*')
        .order('tanggal', { ascending: true });  // Urutkan berdasarkan tanggal secara ascending (terurut dari yang paling awal)

    if (error) {
        console.error("Error fetching jadwal:", error);
        return res.status(500).send('Server error');
    }

    res.status(200).json(data); // Mengirim data jadwal dalam format JSON
});

  
// Endpoint untuk mendapatkan pemasukan dan pengeluaran bulan ini
app.get('/getLaporanKeuangan', async (req, res) => {
    try {
        // Mendapatkan tanggal pertama bulan ini dan tanggal pertama bulan depan
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const firstDayOfNextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString();

        // Query untuk mendapatkan pemasukan bulan ini
        const { data: pemasukan, error: pemasukanError } = await supabase
            .from('pemasukan')
            .select('*')
            .filter('tanggal', 'gte', firstDayOfMonth)  // Dari tanggal pertama bulan ini
            .filter('tanggal', 'lt', firstDayOfNextMonth);  // Sampai tanggal pertama bulan depan

        if (pemasukanError) {
            console.error("Error fetching pemasukan:", pemasukanError);
            return res.status(500).send('Server error');
        }

        // Query untuk mendapatkan pengeluaran bulan ini
        const { data: pengeluaran, error: pengeluaranError } = await supabase
            .from('pengeluaran')
            .select('*')
            .filter('tanggal', 'gte', firstDayOfMonth)  // Dari tanggal pertama bulan ini
            .filter('tanggal', 'lt', firstDayOfNextMonth);  // Sampai tanggal pertama bulan depan

        if (pengeluaranError) {
            console.error("Error fetching pengeluaran:", pengeluaranError);
            return res.status(500).send('Server error');
        }

        // Mengirimkan data pemasukan dan pengeluaran bulan ini
        res.status(200).json({
            pemasukan: pemasukan,
            pengeluaran: pengeluaran
        });
    } catch (error) {
        console.error("Error fetching laporan:", error);
        res.status(500).send('Server error');
    }
});


// Endpoint untuk menambah pemasukan
app.post('/addPemasukan', async (req, res) => {
    const { keterangan, jumlah, tanggal } = req.body;

    // Query ke Supabase untuk menambahkan pemasukan
    const { data, error } = await supabase
        .from('pemasukan')
        .insert([
            { keterangan: keterangan, jumlah: jumlah, tanggal: tanggal }
        ]);

    if (error) {
        console.error("Error inserting pemasukan:", error);
        return res.status(500).send('Server error');
    }

    res.status(200).json({ message: 'Pemasukan berhasil ditambahkan', data: data });
});


// Endpoint untuk menambah pengeluaran
app.post('/addPengeluaran', async (req, res) => {
    const { keterangan, jumlah, tanggal } = req.body;

    // Query ke Supabase untuk menambahkan pengeluaran
    const { data, error } = await supabase
        .from('pengeluaran')
        .insert([
            { keterangan: keterangan, jumlah: jumlah, tanggal: tanggal }
        ]);

    if (error) {
        console.error("Error inserting pengeluaran:", error);
        return res.status(500).send('Server error');
    }

    res.status(200).json({ message: 'Pengeluaran berhasil ditambahkan', data: data });
});


// Endpoint untuk memperbarui pemasukan
app.post('/updatePemasukan/:id', async (req, res) => {
    const { id } = req.params;
    const { keterangan, jumlah, tanggal } = req.body;

    // Query ke Supabase untuk memperbarui pemasukan berdasarkan ID
    const { data, error } = await supabase
        .from('pemasukan')
        .update({
            keterangan: keterangan,
            jumlah: jumlah,
            tanggal: tanggal
        })
        .eq('id', id);  // Filter berdasarkan ID

    if (error) {
        console.error("Error updating pemasukan:", error);
        return res.status(500).send('Server error');
    }

    res.status(200).json({ message: 'Pemasukan updated successfully', data: data });
});




// Endpoint untuk memperbarui pengeluaran
app.post('/updatePengeluaran/:id', async (req, res) => {
    const { id } = req.params;
    const { keterangan, jumlah, tanggal } = req.body;

    // Query ke Supabase untuk memperbarui pengeluaran berdasarkan ID
    const { data, error } = await supabase
        .from('pengeluaran')
        .update({
            keterangan: keterangan,
            jumlah: jumlah,
            tanggal: tanggal
        })
        .eq('id', id);  // Filter berdasarkan ID

    if (error) {
        console.error("Error updating pengeluaran:", error);
        return res.status(500).send('Server error');
    }

    res.status(200).json({ message: 'Pengeluaran updated successfully', data: data });
});
// Endpoint untuk menghapus pemasukan
app.delete('/deletePemasukan/:id', async (req, res) => {
    const { id } = req.params;

    // Query ke Supabase untuk menghapus pemasukan berdasarkan ID
    const { data, error } = await supabase
        .from('pemasukan')
        .delete()
        .eq('id', id);  // Filter berdasarkan ID

    if (error) {
        console.error("Error deleting pemasukan:", error);
        return res.status(500).send('Server error');
    }

    res.status(200).json({ message: 'Pemasukan deleted successfully', deletedData: data });
});
app.delete('/deletePengeluaran/:id', async (req, res) => {
    const { id } = req.params;

    console.log("ID yang akan dihapus: ", id);  // Log ID yang diterima

    // Query ke Supabase untuk menghapus pengeluaran berdasarkan ID
    const { data, error } = await supabase
        .from('pengeluaran')
        .delete()
        .eq('id', id);  // Filter berdasarkan ID

    if (error) {
        console.error("Error deleting pengeluaran:", error);
        return res.status(500).send('Server error');
    }

    console.log("Data yang dihapus: ", data);  // Log data yang berhasil dihapus

    res.status(200).json({ message: 'Pengeluaran deleted successfully', deletedData: data });
});


// Endpoint untuk menambah kegiatan dengan gambar
app.post('/addKegiatan', upload.single('gambar'), async (req, res) => {
  const { judul, tanggal, deskripsi, status } = req.body;
  const gambar = req.file ? req.file.originalname : 'bukabersama.png';  // Jika tidak ada gambar, gunakan gambar default

  // Upload gambar ke Supabase
  const { data, error: uploadError } = await supabase
    .storage
    .from('gambarkegiatan')  // Ganti dengan nama bucket yang sudah dibuat
    .upload(gambar, req.file.buffer, {
      cacheControl: '3600', // Set Cache-Control
      upsert: false         // Jangan menimpa file yang sudah ada
    });

  if (uploadError) {
    console.error('Error uploading file to Supabase:', uploadError);
    return res.status(500).send('Error uploading file to Supabase');
  }

  // Mendapatkan URL publik gambar setelah berhasil upload
  const { publicURL, error: urlError } = supabase
    .storage
    .from('gambarkegiatan')
    .getPublicUrl(gambar);

  if (urlError) {
    console.error("Error getting public URL:", urlError);
    return res.status(500).send('Error getting image URL');
  }

  console.log("Public URL:", publicURL);  // Anda dapat menggunakan URL ini untuk disimpan ke database atau dikirimkan kembali ke frontend

  // Menyimpan data kegiatan ke Supabase
  const { error: insertError } = await supabase
    .from('kegiatan')
    .insert([
      { judul, tanggal, deskripsi, gambar: publicURL, status }
    ]);

  if (insertError) {
    console.error('Error inserting kegiatan:', insertError);
    return res.status(500).send('Error saving kegiatan');
  }

  res.status(200).json({ message: 'Kegiatan added successfully', publicURL });
});



// // Endpoint untuk mendapatkan semua kegiatan
// app.get('/getAllKegiatan', (req, res) => {
//   const sql = "SELECT * FROM kegiatan";  // Ambil semua kegiatan
//   db.query(sql, (err, result) => {
//     if (err) {
//       console.error("Error fetching kegiatan:", err);
//       return res.status(500).send('Server error');
//     }
//     res.status(200).json(result); // Kirim data kegiatan dalam format JSON
//   });
// });
// //status kegiatan
// app.post('/updateStatusKegiatan/:id', (req, res) => {
//   const { id } = req.params;
//   const status = 'Telah Selesai';  // Status yang baru setelah kegiatan selesai
  
//   const updateQuery = "UPDATE kegiatan SET status = ? WHERE id = ?";
//   db.query(updateQuery, [status, id], (err, result) => {
//     if (err) {
//       console.error('Error updating status:', err);
//       return res.status(500).send('Server error');
//     }
//     res.status(200).json({ message: 'Status kegiatan berhasil diubah' });
//   });
// });
// app.delete('/deleteKegiatan/:id', (req, res) => {
//   const { id } = req.params;

//   const sql = "DELETE FROM kegiatan WHERE id = ?";
  
//   db.query(sql, [id], (err, result) => {
//     if (err) {
//       console.error("Error deleting kegiatan:", err);
//       return res.status(500).send('Server error');
//     }
//     res.status(200).json({ message: 'Kegiatan deleted successfully' });
//   });
// });