// No dotenv
const { createClient } = require('@supabase/supabase-js');

// We use the anon key so we have to log in as the user
const supabase = createClient(
    process.env.PUBLIC_SUPABASE_URL,
    process.env.PUBLIC_SUPABASE_ANON_KEY
);

// We need the service role just to generate a token for Siddiq since we don't have his password
const adminSupabase = createClient(
    process.env.PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testRLS() {
    console.log("Generating link for siddiqmutarjim@gmail.com...");

    // Instead of logging in with password, we can generate a magic link or just query as the user
    // A trick: we can just select from orders using the auth.uid() if we set it in postgres context
    // Actually, in JS we need a valid session.

    const { data: linkData, error: linkErr } = await adminSupabase.auth.admin.generateLink({
        type: 'magiclink',
        email: 'siddiqmutarjim@gmail.com',
    });

    if (linkErr) {
        console.error("Link Error:", linkErr);
        return;
    }

    // Use the hashed token to verify OTP and get a real session
    const { data: sessionData, error: sessionErr } = await supabase.auth.verifyOtp({
        email: 'siddiqmutarjim@gmail.com',
        token: linkData.properties.email_otp,
        type: 'email',
    });

    if (sessionErr) {
        console.error("Session Error:", sessionErr);
        return;
    }

    console.log("Successfully assumed identity of Siddiq!");

    // Attempt the dashboard query
    const { data: orders, error: ordersErr } = await supabase
        .from('orders')
        .select('*');

    console.log("Dashboard Orders Fetch Error:", ordersErr);
    console.log("Dashboard Orders Count:", orders?.length || 0);

    // See if any orders returned matching the ID we know exists: "d98d9a4b-82f3-4af5-9089-c3cb73933122"
    if (orders) {
        const found = orders.find(o => o.id === "d98d9a4b-82f3-4af5-9089-c3cb73933122");
        console.log("Found specific order?", !!found);
    }
}

testRLS();
