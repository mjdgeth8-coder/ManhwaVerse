const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// اتصال قاعدة البيانات
const db = new sqlite3.Database('./manga_verse.db', (err) => {
    if (err) console.error('خطأ في قاعدة البيانات:', err.message);
    else console.log('تم الاتصال بقاعدة البيانات بنجاح.');
});

// إنشاء الجداول
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        avatar TEXT,
        role TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS stories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        cover TEXT,
        status TEXT,
        writer_id INTEGER,
        FOREIGN KEY(writer_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS chapters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        story_id INTEGER,
        chapter_number INTEGER,
        pages TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        story_id INTEGER,
        username TEXT,
        comment TEXT,
        reports INTEGER DEFAULT 0
    )`);
});

// API التسجيل
app.post('/api/register', async (req, res) => {
    const { username, password, avatar } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(`INSERT INTO users (username, password, avatar, role) VALUES (?, ?, ?, 'writer')`, 
            [username, hashedPassword, avatar || 'https://via.placeholder.com/100'], 
            function(err) {
                if (err) return res.status(400).json({ error: 'اسم المستخدم مستخدم مسبقاً!' });
                res.json({ success: true, userId: this.lastID, username });
            }
        );
    } catch (e) {
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

// API تسجيل دخول الكاتب
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
        if (err || !user) return res.status(400).json({ error: 'المستخدم غير موجود!' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'كلمة المرور غير صحيحة!' });
        res.json({ success: true, userId: user.id, username: user.username, avatar: user.avatar });
    });
});

// التحقق من ملف الأمان المعقد للمشرف
app.post('/api/admin-login', (req, res) => {
    const { username, password } = req.body;
    try {
        const filePath = path.join(__dirname, 'sys_secure_admin_auth_9x8f7a.txt');
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const lines = fileContent.trim().split('\n');
        const correctUser = lines[0] ? lines[0].trim() : '';
        const correctPass = lines[1] ? lines[1].trim() : '';

        if (username === correctUser && password === correctPass) {
            res.json({ success: true });
        } else {
            res.status(400).json({ error: 'بيانات المشرف غير صحيحة في ملف الأمان!' });
        }
    } catch (e) {
        res.status(500).json({ error: 'تعذر قراءة ملف الأمان على السيرفر.' });
    }
});

app.listen(PORT, () => {
    console.log(`السيرفر يعمل الآن على: http://localhost:${PORT}`);
});
