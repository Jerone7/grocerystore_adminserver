const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const bannerRoutes = require('./routes/banners');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Public route — no auth required
app.use('/api/auth', authRoutes);

// Protected routes — require valid JWT
app.use('/api/products', authMiddleware, productRoutes);
app.use('/api/orders', authMiddleware, orderRoutes);
app.use('/api/categories', authMiddleware, require('./routes/categories'));
app.use('/api/banners', authMiddleware, bannerRoutes);

app.get('/', (req, res) => {
    res.send('Grocery Store Admin API is running');
});

app.listen(PORT, () => {
    console.log(`Admin server running on port ${PORT}`);
    if (!process.env.JWT_SECRET) {
        console.warn('WARNING: JWT_SECRET is not set in .env — using insecure default!');
    }
});
