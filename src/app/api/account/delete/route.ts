import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const PORTFOLIO_BUCKET = "portfolio-images";

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Account deletion isn't configured on this deployment yet." },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Verify the token against Supabase's own auth server — this is the ONLY
  // source of the user id used below. Nothing from the request body/query
  // is ever trusted for "who am I deleting."
  const anonClient = createClient(supabaseUrl, anonKey);
  const {
    data: { user },
    error: userError,
  } = await anonClient.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
  }

  const userId = user.id;
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Storage files aren't covered by the DB's foreign-key cascades, so their
  // paths have to be captured and removed before the rows referencing them
  // (and the shop itself) disappear.
  const { data: shopRow } = await adminClient
    .from("shops")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  if (shopRow) {
    const { data: images } = await adminClient
      .from("portfolio_images")
      .select("storage_path")
      .eq("shop_id", shopRow.id);

    const paths = (images ?? []).map((img) => img.storage_path);
    if (paths.length > 0) {
      await adminClient.storage.from(PORTFOLIO_BUCKET).remove(paths);
    }
  }

  // Deleting the auth user cascades through public.users -> shops ->
  // shop_services/portfolio_images/conversations, and public.users ->
  // conversations.car_owner_id -> messages, per the existing schema's
  // "on delete cascade" foreign keys. Nothing else needs to be deleted
  // manually.
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
