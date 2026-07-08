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
    port: 3307               // Docker-compose external port mapping
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to MySQL Database inside Docker!');

    // Auto-insert shops if empty to sync with frontend dropdown
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

// UPGRADED MULTI-TABLE INSERTION API ROUTE
app.post('/api/orders', (req, res) => {
    const { 
        tenant_id, status, name, phone, item, delivery_date, 
        measurements, notes, total_price, advance_paid 
    } = req.body;

    // STEP 1: Insert or Find Customer
    const customerQuery = 'INSERT INTO customers (tenant_id, name, phone) VALUES (?, ?, ?)';
    db.query(customerQuery, [tenant_id, name, phone], (err, custResult) => {
        if (err) {
            console.error("Customer insert error:", err);
            return res.status(500).json({ success: false, error: err.message });
        }
        const customerId = custResult.insertId;

        // STEP 2: Save Detailed Body Measurements
        const measureQuery = `
            INSERT INTO measurements (customer_id, neck, chest, waist, shoulder, sleeves, length, notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const mValues = [
            customerId, measurements.neck, measurements.chest, measurements.waist, 
            measurements.shoulder, measurements.sleeves, measurements.length, notes
        ];

        db.query(measureQuery, mValues, (err, measResult) => {
            if (err) {
                console.error("Measurements database insertion error:", err);
                return res.status(500).json({ success: false, error: err.message });
            }

            // STEP 3: Create Order log
            const orderQuery = `
                INSERT INTO orders (tenant_id, customer_id, cloth_type, total_price, advance_paid, status, delivery_date) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            db.query(orderQuery, [tenant_id, customerId, item, total_price, advance_paid, status, delivery_date], (err, orderResult) => {
                if (err) {
                    console.error("Order workflow initialization error:", err);
                    return res.status(500).json({ success: false, error: err.message });
                }

                // Generates response mapping with absolute data consistency
                const finalOrderId = orderResult.insertId;
                const currentDate = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY

                // Response returning to fill the frontend layout perfectly
                res.json({
                    success: true,
                    orderId: finalOrderId,
                    date: currentDate
                });
            });
        });
    });
});

// Listen interface binding for microservice containers
app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on port 3000');
});