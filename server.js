const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const multer = require('multer');
const path = require('path'); // Pastikan ini hanya ada sekali

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

// Koneksi ke database
const db = mysql.createConnection({
  host: "localhost",
  user: "root",    // Sesuaikan dengan user MySQL kamu
  password: "",    // Jika ada password, sesuaikan
  database: "masjid_ataqwa" // Nama database kamu
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('Connected to database');
  }
});

// Menjalankan server pada port 8001
app.listen(8001, () => {
  console.log("Server is running on port 8001");
});

// Endpoint untuk register
app.post('/register', (req, res) => {
    const { nama, email, password, role } = req.body;

    // Validasi keunikan email
    const checkEmailQuery = "SELECT * FROM user WHERE email = ?";
    db.query(checkEmailQuery, [email], (err, result) => {
        if (err) {
            console.error('Error checking email:', err);
            return res.status(500).send('Server error');
        }

        if (result.length > 0) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        // Menambahkan pengguna baru ke database
        const insertQuery = "INSERT INTO user (name, email, password, role, is_login) VALUES (?, ?, ?, ?, 'isNotLogin')";
        db.query(insertQuery, [nama, email, password, role], (err, result) => {
            if (err) {
                console.error('Error inserting user:', err);
                return res.status(500).send('Server error');
            }

            res.status(200).json({ message: 'Registration successful' });
        });
    });
});

// Endpoint untuk login
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const sql = "SELECT * FROM user WHERE email = ? AND password = ?";
    db.query(sql, [email, password], (err, result) => {
        if (err) {
            console.error("Error during login:", err);
            return res.status(500).send('Server error');
        }

        if (result.length > 0) {
            // Update status login di database menjadi 'IsLogin'
            const updateQuery = "UPDATE user SET is_login = 'IsLogin' WHERE email = ?";
            db.query(updateQuery, [email], (err, updateResult) => {
                if (err) {
                    console.error("Error updating login status:", err);
                    return res.status(500).send('Server error');
                }

                // Kirim data pengguna setelah berhasil login
                res.status(200).json({
                    message: 'Login successful',
                    user: result[0]  // Mengirim data pengguna
                });
            });
        } else {
            res.status(400).json({ message: 'Invalid email or password' });
        }
    });
});

// Endpoint untuk logout
app.post('/logout', (req, res) => {
    const { email } = req.body;

    const updateQuery = "UPDATE user SET is_login = 'IsNotLogin' WHERE email = ?";
    db.query(updateQuery, [email], (err, result) => {
        if (err) {
            console.error("Error during logout:", err);
            return res.status(500).send('Server error');
        }

        res.status(200).json({ message: 'Logout successful' });
    });
});

// Endpoint untuk mendapatkan data profil pengguna berdasarkan email
app.get('/getUserProfile/:email', (req, res) => {
    const email = req.params.email;

    const sql = "SELECT * FROM user WHERE email = ?";
    db.query(sql, [email], (err, result) => {
        if (err) {
            console.error("Error fetching user profile:", err);
            return res.status(500).send('Server error');
        }

        if (result.length > 0) {
            res.status(200).json(result[0]);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    });
});

// Endpoint untuk memperbarui data profil pengguna
app.post('/updateUserProfile/:email', (req, res) => {
    const email = req.params.email;
    const { name, password } = req.body;

    const sql = "UPDATE user SET name = ?, password = ? WHERE email = ?";
    db.query(sql, [name, password, email], (err, result) => {
        if (err) {
            console.error("Error updating user profile:", err);
            return res.status(500).send('Server error');
        }

        res.status(200).json({ message: 'Profile updated successfully' });
    });
});

// Endpoint untuk mengambil semua user
app.get('/getAllUsers', (req, res) => {
    const sql = "SELECT * FROM user"; // Ambil semua data user
    db.query(sql, (err, result) => {
        if (err) {
            console.error("Error fetching users:", err);
            return res.status(500).send('Server error');
        }
        res.status(200).json(result); // Mengirim data user dalam format JSON
    });
});
app.post('/addUser', (req, res) => {
    const { email, role, name, password } = req.body; // Mengambil email, role, name, dan password dari request body

    // Validasi data email, role, name, dan password
    if (!email || !role || !name || !password) {
        return res.status(400).json({ message: 'Email, role, name, and password are required.' });
    }

    // Query untuk menambahkan user baru ke database
    const insertQuery = "INSERT INTO user (email, role, name, password, is_login) VALUES (?, ?, ?, ?, 'isNotLogin')";
    db.query(insertQuery, [email, role, name, password], (err, result) => {
        if (err) {
            console.error('Error inserting user:', err);
            return res.status(500).send('Server error');
        }
        res.status(200).json({ message: 'User added successfully' });
    });
});

// Endpoint untuk menghapus user
app.delete('/deleteUser/:email', (req, res) => {
    const { email } = req.params;

    const deleteQuery = "DELETE FROM user WHERE email = ?";
    db.query(deleteQuery, [email], (err, result) => {
        if (err) {
            console.error("Error deleting user:", err);
            return res.status(500).send('Server error');
        }
        res.status(200).json({ message: 'User deleted successfully' });
    });
});


// Endpoint untuk menerima data peminjaman inventaris
app.post('/submitPeminjaman', (req, res) => {
  const { email, nama, barang, tglMulai, tglSelesai, keperluan, nomorTelepon } = req.body;

  // Insert data peminjaman ke database, termasuk email, barang, dan nomor telepon
  const insertQuery = `
    INSERT INTO peminjaman_inventaris (email, nama, barang, tgl_mulai, tgl_selesai, keperluan, nomor_telepon, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Menunggu')
  `;

  db.query(insertQuery, [email, nama, barang, tglMulai, tglSelesai, keperluan, nomorTelepon], (err, result) => {
    if (err) {
      console.error('Error inserting peminjaman:', err);
      return res.status(500).send('Server error');
    }
    res.status(200).json({ message: 'Peminjaman berhasil dikirim' });
  });
});


// Endpoint untuk mendapatkan riwayat peminjaman berdasarkan email
app.get('/getRiwayatPeminjaman/:email', (req, res) => {
  const email = req.params.email;
  const sql = "SELECT id, email, nama, barang, tgl_mulai, tgl_selesai, keperluan, nomor_telepon, status FROM peminjaman_inventaris WHERE email = ?";
  db.query(sql, [email], (err, result) => {
    if (err) {
      console.error("Error fetching riwayat peminjaman:", err);
      return res.status(500).send('Server error');
    }
    res.status(200).json(result);
  });
});

// Endpoint untuk mendapatkan semua riwayat peminjaman (admin)
app.get('/getAllRiwayatPeminjaman', (req, res) => {
  const sql = "SELECT * FROM peminjaman_inventaris";
  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching all riwayat peminjaman:", err);
      return res.status(500).send('Server error');
    }
    res.status(200).json(result);
  });
});

// Endpoint untuk memperbarui status peminjaman
app.post('/updateStatusPeminjaman/:id', (req, res) => {
  const { status } = req.body;
  const { id } = req.params;

  const updateQuery = "UPDATE peminjaman_inventaris SET status = ? WHERE id = ?";
  db.query(updateQuery, [status, id], (err, result) => {
    if (err) {
      console.error("Error updating status:", err);
      return res.status(500).send('Server error');
    }
    res.status(200).json({ message: 'Status updated successfully' });
  });
});
// Endpoint untuk menghapus riwayat peminjaman
app.delete('/deleteRiwayatPeminjaman/:id', (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM peminjaman_inventaris WHERE id = ?";
  
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Error deleting peminjaman:", err);
      return res.status(500).send('Server error');
    }
    res.status(200).json({ message: 'Peminjaman deleted successfully' });
  });
});


// Endpoint untuk menambahkan jadwal Imam
app.post('/addJadwalImam', (req, res) => {
    const { tanggal, imam, khatib, muazin, bilal } = req.body;

    const sql = `
        INSERT INTO jadwal_imam (tanggal, imam, khatib, muazin, bilal)
        VALUES (?, ?, ?, ?, ?)
    `;
    
    db.query(sql, [tanggal, imam, khatib, muazin, bilal], (err, result) => {
        if (err) {
            console.error("Error inserting jadwal:", err);
            return res.status(500).send('Server error');
        }
        res.status(200).json({ success: true, message: 'Jadwal berhasil ditambahkan' });
    });
});

// Endpoint untuk mengambil jadwal berdasarkan bulan dan tahun
app.get('/getJadwalImamForMonth', (req, res) => {
    const { bulan, tahun } = req.query; // Ambil bulan dan tahun dari query params

    const sql = `
        SELECT * FROM jadwal_imam 
        WHERE MONTH(tanggal) = ? AND YEAR(tanggal) = ?
    `;
    
    db.query(sql, [bulan, tahun], (err, result) => {
        if (err) {
            console.error("Error fetching jadwal Imam:", err);
            return res.status(500).send('Server error');
        }
        res.status(200).json(result); // Kirim data jadwal yang ditemukan
    });
});
// Endpoint untuk mengupdate jadwal Imam
app.post('/updateJadwalImam/:id', (req, res) => {
    const { tanggal, imam, khatib, muazin, bilal } = req.body;
    const { id } = req.params;

    const sql = `
        UPDATE jadwal_imam SET tanggal = ?, imam = ?, khatib = ?, muazin = ?, bilal = ? 
        WHERE id = ?
    `;
    
    db.query(sql, [tanggal, imam, khatib, muazin, bilal, id], (err, result) => {
        if (err) {
            console.error("Error updating jadwal Imam:", err);
            return res.status(500).send('Server error');
        }
        res.status(200).json({ success: true, message: 'Jadwal updated successfully' });
    });
});

// Endpoint untuk menghapus jadwal Imam
app.delete('/deleteJadwalImam/:id', (req, res) => {
    const { id } = req.params;

    const sql = "DELETE FROM jadwal_imam WHERE id = ?";
    
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error("Error deleting jadwal Imam:", err);
            return res.status(500).send('Server error');
        }
        res.status(200).json({ success: true, message: 'Jadwal deleted successfully' });
    });
});
// Endpoint untuk mendapatkan semua jadwal Imam
app.get('/getAllJadwalImam', (req, res) => {
    const sql = "SELECT * FROM jadwal_imam ORDER BY tanggal ASC";  // Ambil semua data jadwal, urutkan berdasarkan tanggal
    db.query(sql, (err, result) => {
        if (err) {
            console.error("Error fetching jadwal:", err);
            return res.status(500).send('Server error');
        }
        res.status(200).json(result); // Mengirim data jadwal dalam format JSON
    });
});
  
// Endpoint untuk mendapatkan pemasukan dan pengeluaran bulan ini
app.get('/getLaporanKeuangan', (req, res) => {
    const sqlPemasukan = "SELECT * FROM pemasukan WHERE MONTH(tanggal) = MONTH(CURRENT_DATE()) AND YEAR(tanggal) = YEAR(CURRENT_DATE())";
    const sqlPengeluaran = "SELECT * FROM pengeluaran WHERE MONTH(tanggal) = MONTH(CURRENT_DATE()) AND YEAR(tanggal) = YEAR(CURRENT_DATE())";

    // Mengambil pemasukan dan pengeluaran bulan ini
    db.query(sqlPemasukan, (err, pemasukan) => {
        if (err) {
            console.error("Error fetching pemasukan:", err);
            return res.status(500).send('Server error');
        }

        db.query(sqlPengeluaran, (err, pengeluaran) => {
            if (err) {
                console.error("Error fetching pengeluaran:", err);
                return res.status(500).send('Server error');
            }

            res.status(200).json({
                pemasukan: pemasukan,
                pengeluaran: pengeluaran
            });
        });
    });
});

// Endpoint untuk menambah pemasukan
app.post('/addPemasukan', (req, res) => {
    const { keterangan, jumlah, tanggal } = req.body;
    const sql = "INSERT INTO pemasukan (keterangan, jumlah, tanggal) VALUES (?, ?, ?)";

    db.query(sql, [keterangan, jumlah, tanggal], (err, result) => {
        if (err) {
            console.error("Error inserting pemasukan:", err);
            return res.status(500).send('Server error');
        }

        res.status(200).json({ message: 'Pemasukan berhasil ditambahkan' });
    });
});

// Endpoint untuk menambah pengeluaran
app.post('/addPengeluaran', (req, res) => {
    const { keterangan, jumlah, tanggal } = req.body;
    const sql = "INSERT INTO pengeluaran (keterangan, jumlah, tanggal) VALUES (?, ?, ?)";

    db.query(sql, [keterangan, jumlah, tanggal], (err, result) => {
        if (err) {
            console.error("Error inserting pengeluaran:", err);
            return res.status(500).send('Server error');
        }

        res.status(200).json({ message: 'Pengeluaran berhasil ditambahkan' });
    });
}); 

// Endpoint untuk memperbarui pemasukan
app.post('/updatePemasukan/:id', (req, res) => {
    const { id } = req.params;
    const { keterangan, jumlah, tanggal } = req.body;

    const sql = "UPDATE pemasukan SET keterangan = ?, jumlah = ?, tanggal = ? WHERE id = ?";
    db.query(sql, [keterangan, jumlah, tanggal, id], (err, result) => {
        if (err) {
            console.error("Error updating pemasukan:", err);
            return res.status(500).send('Server error');
        }
        res.status(200).json({ message: 'Pemasukan updated successfully' });
    });
});

// Endpoint untuk menghapus pemasukan
app.delete('/deletePemasukan/:id', (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM pemasukan WHERE id = ?";
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error("Error deleting pemasukan:", err);
            return res.status(500).send('Server error');
        }
        res.status(200).json({ message: 'Pemasukan deleted successfully' });
    });
});
// Endpoint untuk memperbarui pengeluaran
app.post('/updatePengeluaran/:id', (req, res) => {
    const { id } = req.params;
    const { keterangan, jumlah, tanggal } = req.body;

    const sql = "UPDATE pengeluaran SET keterangan = ?, jumlah = ?, tanggal = ? WHERE id = ?";
    db.query(sql, [keterangan, jumlah, tanggal, id], (err, result) => {
        if (err) {
            console.error("Error updating pengeluaran:", err);
            return res.status(500).send('Server error');
        }
        res.status(200).json({ message: 'Pengeluaran updated successfully' });
    });
});
// Endpoint untuk menghapus pengeluaran
app.delete('/deletePengeluaran/:id', (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM pengeluaran WHERE id = ?";
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error("Error deleting pengeluaran:", err);
            return res.status(500).send('Server error');
        }
        res.status(200).json({ message: 'Pengeluaran deleted successfully' });
    });
});
// Endpoint untuk menambah kegiatan dengan gambar
app.post('/addKegiatan', upload.single('gambar'), (req, res) => {
  const { judul, tanggal, deskripsi, status } = req.body;
  const gambar = req.file ? req.file.filename : 'bukabersama.png';  // Jika tidak ada gambar, gunakan gambar default

  const insertQuery = "INSERT INTO kegiatan (judul, tanggal, deskripsi, gambar, status) VALUES (?, ?, ?, ?, ?)";
  db.query(insertQuery, [judul, tanggal, deskripsi, gambar, status], (err, result) => {
    if (err) {
      console.error('Error inserting kegiatan:', err);
      return res.status(500).send('Server error');
    }
    res.status(200).json({ message: 'Kegiatan added successfully' });
  });
});

// Endpoint untuk mendapatkan semua kegiatan
app.get('/getAllKegiatan', (req, res) => {
  const sql = "SELECT * FROM kegiatan";  // Ambil semua kegiatan
  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching kegiatan:", err);
      return res.status(500).send('Server error');
    }
    res.status(200).json(result); // Kirim data kegiatan dalam format JSON
  });
});

app.post('/updateStatusKegiatan/:id', (req, res) => {
  const { id } = req.params;
  const status = 'Telah Selesai';  // Status yang baru setelah kegiatan selesai
  
  const updateQuery = "UPDATE kegiatan SET status = ? WHERE id = ?";
  db.query(updateQuery, [status, id], (err, result) => {
    if (err) {
      console.error('Error updating status:', err);
      return res.status(500).send('Server error');
    }
    res.status(200).json({ message: 'Status kegiatan berhasil diubah' });
  });
});
