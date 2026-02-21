// No dotenv
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const { data, error } = await supabase
        .from('orders')
        .select(`
            id, 
            user_id,
            profiles (
                email,
                full_name
            )
        `)
        .limit(1)
        .single();

    console.log("Error:", error);
    console.log("Data shape:", JSON.stringify(data, null, 2));
}

check();
