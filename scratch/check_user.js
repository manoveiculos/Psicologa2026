const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1];
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1];

const supabase = createClient(url, key);

async function checkUser() {
  const email = 'mayne.margadona@gmail.com';
  console.log(`Checking user: ${email}`);
  
  const { data: { users }, error } = await supabase.auth.admin.listUsers({
    perPage: 1000
  });

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (user) {
    console.log(`User FOUND: ${user.id}`);
  } else {
    console.log("User NOT FOUND in first 1000 users.");
  }
}

checkUser();
