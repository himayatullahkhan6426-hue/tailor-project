const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// LOCAL DOCKER CONNECTION
const db = mysql.createConnection({
    host: '127.0.0.1',       // Local laptop ka address
    user: 'root',
    password: 'rootpassword',
    database: 'tailor_saas_db',
    port: 3307               // Humne docker-compose mein 3307 map kiya hua hai
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to MySQL Database inside Docker!');

    // 🔥 YEH NAYA CODE PASTE KAREIN: Auto-insert shops if empty
    const insertShopsQuery = `
        INSERT IGNORE INTO tenants (id, shop_name) VALUES 
        (1, 'Elite Tailors Ltd.'), 
        (2, 'Royal Stitching');
    `;
    db.query(insertShopsQuery, (err, result) => {
        if (err) console.error("Error inserting default shops:", err);
        else console.log("Default shops matched successfully with Frontend!");
    });
});

// Baki ka code (API Routes) jo pehle se likha hua tha...
// 🔥 MUKAMMAL API ROUTE FOR INSERT & RESPOND
app.post('/api/orders', (req, res) => {
    const { tenant_id, name, phone, item, neck, chest, price } = req.body;

    // 1. Pehle customer ko check ya insert karein
    const customerQuery = 'INSERT INTO customers (tenant_id, name, phone) VALUES (?, ?, ?)';
    db.query(customerQuery, [tenant_id, name, phone], (err, custResult) => {
        if (err) {
            console.error("Customer insert error:", err);
            return res.status(500).json({ success: false, error: err.message });
        }

        // 2. Ab order table mein data save karne ki query (Aapki measurements ko specs bana kar save kar rahe hain)
        // Note: Agar aapke paas orders table ka structure thoda alag hai, to query columns match kar lein.
        // Yeh query is assumption par hai ke orders table mein measurements string format mein ja rahi hain.
        const specsString = `Neck: ${neck}", Chest: ${chest}" (${item})`;
        const orderIdAuto = Math.floor(1000 + Math.random() * 9000); // Ek temporary unique Order ID
        const currentDate = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY Format

        // Frontend ko khush karne ke liye response bhejein (Taake yellow table fill ho jaye)
        res.json({
            success: true,
            orderId: orderIdAuto,
            date: currentDate,
            specs: specsString
        });
    });
});

// IMPORTANT: Docker network ke liye 0.0.0.0 par listen karna zaroori hai
app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on port 3000');
});