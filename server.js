const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const app = express();

// Middleware untuk menerima request body dalam format JSON
app.use(cors());
app.use(express.json());

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

// Endpoint untuk menerima data peminjaman inventaris
app.post('/submitPeminjaman', (req, res) => {
  const { email, nama, barang, tglMulai, tglSelesai, keperluan } = req.body;

  // Insert data peminjaman ke database, termasuk email dan barang sebagai string
  const insertQuery = `
    INSERT INTO peminjaman_inventaris (email, nama, barang, tgl_mulai, tgl_selesai, keperluan)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  db.query(insertQuery, [email, nama, barang, tglMulai, tglSelesai, keperluan], (err, result) => {
    if (err) {
      console.error('Error inserting peminjaman:', err);
      return res.status(500).send('Server error');
    }

    res.status(200).json({ message: 'Peminjaman berhasil dikirim' });
  });
});

