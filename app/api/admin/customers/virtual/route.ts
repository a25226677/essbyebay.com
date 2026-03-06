import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextRequest, NextResponse } from "next/server";

// US cities for virtual customer addresses
const US_LOCATIONS = [
  { city: "New York",     state: "NY", postal: "10001", country: "US" },
  { city: "Los Angeles",  state: "CA", postal: "90001", country: "US" },
  { city: "Chicago",      state: "IL", postal: "60601", country: "US" },
  { city: "Houston",      state: "TX", postal: "77001", country: "US" },
  { city: "Phoenix",      state: "AZ", postal: "85001", country: "US" },
  { city: "Philadelphia", state: "PA", postal: "19101", country: "US" },
  { city: "San Antonio",  state: "TX", postal: "78201", country: "US" },
  { city: "San Diego",    state: "CA", postal: "92101", country: "US" },
  { city: "Dallas",       state: "TX", postal: "75201", country: "US" },
  { city: "San Jose",     state: "CA", postal: "95101", country: "US" },
  { city: "Austin",       state: "TX", postal: "78701", country: "US" },
  { city: "Jacksonville", state: "FL", postal: "32099", country: "US" },
  { city: "Fort Worth",   state: "TX", postal: "76101", country: "US" },
  { city: "Columbus",     state: "OH", postal: "43085", country: "US" },
  { city: "Charlotte",    state: "NC", postal: "28201", country: "US" },
  { city: "Denver",       state: "CO", postal: "80201", country: "US" },
  { city: "Seattle",      state: "WA", postal: "98101", country: "US" },
  { city: "Nashville",    state: "TN", postal: "37201", country: "US" },
  { city: "Baltimore",    state: "MD", postal: "21201", country: "US" },
  { city: "Boston",       state: "MA", postal: "02101", country: "US" },
];

const FIRST_NAMES = [
  "James","John","Michael","William","David","Richard","Joseph","Thomas","Charles","Daniel",
  "Mary","Patricia","Jennifer","Linda","Barbara","Elizabeth","Susan","Jessica","Sarah","Karen",
  "Robert","Brian","Kevin","George","Edward","Mark","Paul","Donald","Steven","Kenneth",
  "Nancy","Lisa","Betty","Margaret","Sandra","Ashley","Dorothy","Kimberly","Emily","Donna",
];

const LAST_NAMES = [
  "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez",
  "Wilson","Anderson","Taylor","Thomas","Hernandez","Moore","Martin","Jackson","Thompson","White",
  "Lopez","Lee","Gonzalez","Harris","Clark","Lewis","Robinson","Walker","Perez","Hall",
  "Young","Allen","Sanchez","Wright","King","Scott","Green","Baker","Adams","Nelson",
];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }

export async function POST(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db, userId } = context;

  try {
    const body = await request.json();
    const quantity     = Math.min(100, Math.max(1, parseInt(body.quantity || "10", 10)));
    const initBalance  = Math.max(0, parseFloat(body.initial_balance || "0"));
    const disableLogin = Boolean(body.disable_login);

    const created: Array<{ id: string; full_name: string; email: string }> = [];
    const errors: string[]  = [];

    for (let i = 0; i < quantity; i++) {
      const first    = rand(FIRST_NAMES);
      const last     = rand(LAST_NAMES);
      const fullName = `${first} ${last}`;
      const uid      = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
      const email    = `virtual_${uid}@virtual.eseller.com`;
      const password = `Virt@${uid}Secure`;
      const location = rand(US_LOCATIONS);
      const phone    = `+1${randInt(2000000000, 9999999999)}`;

      try {
        // Create auth user
        const { data: authData, error: authErr } = await db.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });

        if (authErr || !authData.user) {
          errors.push(`Row ${i + 1}: ${authErr?.message ?? "auth error"}`);
          continue;
        }

        const profileId = authData.user.id;

        // Always persist required profile fields first.
        // Optional virtual-specific fields are updated separately for compatibility.
        const { error: coreProfileErr } = await db
          .from("profiles")
          .update({
            full_name: fullName,
            phone,
            role: "customer",
            is_active: !disableLogin,
          })
          .eq("id", profileId);

        if (coreProfileErr) {
          await db.auth.admin.deleteUser(profileId).catch(() => {});
          errors.push(`Row ${i + 1}: ${coreProfileErr.message}`);
          continue;
        }

        // Optional columns may not exist in outdated DBs; keep non-blocking.
        await db
          .from("profiles")
          .update({
            is_virtual: true,
            disable_login: disableLogin,
            wallet_balance: initBalance,
            credit_score: 100,
          })
          .eq("id", profileId)
          .then(() => {}, () => {});

        // Create US address
        const { error: addressErr } = await db.from("addresses").insert({
          user_id:     profileId,
          label:       "Home",
          full_name:   fullName,
          phone,
          line_1:      `${randInt(100, 9999)} ${rand(["Main","Oak","Elm","Maple","Cedar","Pine","Washington","Park","Lake","Hill"])} ${rand(["St","Ave","Blvd","Dr","Ln","Way","Rd","Ct"])}`,
          city:        location.city,
          state:       location.state,
          postal_code: location.postal,
          country:     location.country,
          is_default:  true,
        });

        if (addressErr) {
          await db.auth.admin.deleteUser(profileId).catch(() => {});
          errors.push(`Row ${i + 1}: ${addressErr.message}`);
          continue;
        }

        // Seed wallet transaction if initial balance > 0
        if (initBalance > 0) {
          await db.from("wallet_transactions").insert({
            user_id:  profileId,
            amount:   initBalance,
            type:     "recharge",
            note:     "Virtual customer initial balance",
            admin_id: userId,
          });
        }

        created.push({ id: profileId, full_name: fullName, email });
      } catch (e) {
        errors.push(`Row ${i + 1}: ${e instanceof Error ? e.message : "unknown"}`);
      }
    }

    return NextResponse.json({
      success: true,
      created: created.length,
      customers: created,
      errors:  errors.length > 0 ? errors.slice(0, 5) : undefined,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
