const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// MySQL Connection (Docker Port 3307 ke saath)
// MySQL Connection - Docker Internal Network ke liye compatible
// MySQL Cloud Connection (Aiven Cloud Database)
const db = mysql.createConnection({
    host: 'mysql-1bc61be1-himayatullahkhan6426-1b92.j.aivencloud.com', // Eg: mysql-tailor-xyz.aivencloud.com
    user: 'avnadmin', // Aiven ka username
    password: 'AVNS_wq59fPQf_SLuCNuiuhZ', // Aiven ka password
    database: 'defaultdb', // Aiven ka default database name
    port: 19798, // Aiven ka port (jo bhi wahan likha ho, aam tor par 24000-26000 ke beech hota hai)
    ssl: { rejectUnauthorized: false } // Cloud connections ke liye SSL zaroori hota hai
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