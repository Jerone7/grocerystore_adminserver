const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const bannerRoutes = require('./routes/banners');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
console.log('Registering /api/orders...');
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/categories', require('./routes/categories'));
app.use('/api/banners', bannerRoutes);

app.get('/', (req, res) => {
    res.send('Grocery Store Admin API is running');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
