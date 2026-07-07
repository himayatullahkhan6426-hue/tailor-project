const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// MySQL Connection (Docker Port 3307 ke saath)
// MySQL Connection - Docker Internal Network ke liye compatible
const db = mysql.createConnection({
    // Agar Render (Docker) par chal raha ho to service name 'db' use hoga, warna localhost
    host: process.env.DATABASE_HOST || 'db', 
    user: 'root',
    password: 'rootpassword',
    database: 'tailor_saas_db',
    port: 3306 // Docker container ke andar ka asli port 3306 hi hota hai
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to MySQL Database inside Docker!');
});

// 1. API: Naya Order aur Customer save karne ke liye
app.post('/api/orders', (req, res) => {
    const { tenant_id, name, phone, item, neck, chest, waist, length, price } = req.body;
    
    // Pehle Customer ko save karte hain
    const customerSql = 'INSERT INTO customers (tenant_id, name, phone) VALUES (?, ?, ?)';
    db.query(customerSql, [tenant_id, name, phone], (err, custResult) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        
        const customer_id = custResult.insertId;
        const specsStr = `Neck: ${neck}", Chest: ${chest}", Waist: ${waist}", Length: ${length}"`;
        
        // Phir Uska Order save karte hain
        const orderSql = 'INSERT INTO orders (tenant_id, customer_id, status, total_amount, delivery_date) VALUES (?, ?, "pending", ?, ?)';
        // 7 din baad ki delivery date auto-set kar rahe hain
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + 7);

        db.query(orderSql, [tenant_id, customer_id, price, deliveryDate], (err, orderResult) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            
            // Sab sahi raha to Frontend ko response bhejte hain
            res.json({ 
                success: true,
                message: 'Order & Measurements Saved Successfully!', 
                orderId: orderResult.insertId,
                date: new Date().toISOString().split('T')[0],
                specs: specsStr
            });
        });
    });
});

app.listen(3000, () => {
    console.log('Tailor Backend Application running on http://localhost:3000');
});