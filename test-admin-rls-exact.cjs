// No dotenv
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.PUBLIC_SUPABASE_URL,
    process.env.PUBLIC_SUPABASE_ANON_KEY
);

const adminSupabase = createClient(
    process.env.PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testRLS() {
    const { data: linkData, error: linkErr } = await adminSupabase.auth.admin.generateLink({
        type: 'magiclink',
        email: 'siddiqmutarjim@gmail.com',
    });

    if (linkErr) return console.error(linkErr);

    const { data: sessionData, error: sessionErr } = await supabase.auth.verifyOtp({
        email: 'siddiqmutarjim@gmail.com',
        token: linkData.properties.email_otp,
        type: 'email',
    });

    if (sessionErr) return console.error(sessionErr);

    // 1. Fetch exactly as Astro does
    console.log("---- Fetching exact query ----");
    const { data: ordersA, error: errA } = await supabase
        .from("orders")
        .select("*, profiles!inner(email), order_files(*)")
        .order("created_at", { ascending: false });

    console.log("Error:", errA);
    console.log("Orders count:", ordersA?.length || 0);

    // 2. Fetch without joins
    console.log("---- Fetching without joins ----");
    const { data: ordersB, error: errB } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

    console.log("Error:", errB);
    console.log("Orders count:", ordersB?.length || 0);
}

testRLS();
