const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Key is missing!');
    console.log('URL:', supabaseUrl);
    console.log('Key:', supabaseKey ? 'Set' : 'Not Set');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
