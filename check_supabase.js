const supabase = require('./config/supabase');

async function checkBuckets() {
    try {
        const { data, error } = await supabase.storage.listBuckets();
        if (error) throw error;
        console.log('Buckets:', data.map(b => b.name));
        
        const productsBucket = data.find(b => b.name === 'products');
        if (productsBucket) {
            console.log('Products bucket exists.');
        } else {
            console.log('Products bucket DOES NOT exist!');
        }
        process.exit(0);
    } catch (err) {
        console.error('Supabase error:', err);
        process.exit(1);
    }
}

checkBuckets();
