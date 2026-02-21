// No dotenv
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    console.log("Testing exact relation grab");

    // Test simulating the callback DB grab
    const testId = "d98d9a4b-82f3-4af5-9089-c3cb73933122"; // latest order for kjinae09

    const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .select(`
            id, 
            user_id,
            profiles (
                email,
                full_name
            )
        `)
        .eq('id', testId)
        .single();

    console.log("Fetch Error:", updateError);
    // console.log("Data shape:", JSON.stringify(updatedOrder, null, 2));

    if (updatedOrder) {
        const profiles = updatedOrder.profiles;
        // See how it behaves natively with the (profiles as any) casts we have in callback.ts
        const userEmail = (profiles)?.email;
        const userName = (profiles)?.full_name || "User";

        console.log("userEmail:", userEmail);
        console.log("userName:", userName);
    }
}

check();
