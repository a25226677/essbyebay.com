import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAdminServiceClient } from '@/lib/supabase/admin-client'

/**
 * Server-side admin impersonation route.
 * Usage: GET /api/admin/impersonate?email=target@example.com&redirect=/dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl
    const searchParams = url.searchParams
    const targetEmail = searchParams.get('email')
    const redirectTo = searchParams.get('redirect') || '/'

    if (!targetEmail) {
      return NextResponse.redirect(new URL(`/admin/users?error=${encodeURIComponent('Email parameter is required')}`, request.nextUrl.origin))
    }

    // Read cookies to resolve current session user
    const cookieStore = await cookies()

    const serverSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // noop here; we only need to read the incoming session
          },
        },
      }
    )

    const { data: currentUserData } = await serverSupabase.auth.getUser()
    const currentUser = currentUserData?.user

    if (!currentUser) {
      return NextResponse.redirect(new URL('/auth/login', request.nextUrl.origin))
    }

    // Use service-role admin client for privileged operations
    const adminClient = createAdminServiceClient()

    // Find the auth user by email using the admin auth API
    // `query` is not a valid option on this SDK method; fetch a page and filter locally.
    const listRes = await adminClient.auth.admin.listUsers({ perPage: 100 });
    const matched = (listRes.data?.users || []).find((u: any) => u.email?.toLowerCase() === targetEmail.toLowerCase());

    if (!matched) {
      return NextResponse.redirect(new URL(`/admin/users?error=${encodeURIComponent('User not found: ' + targetEmail)}`, request.nextUrl.origin))
    }

    const targetId = matched.id;

    // Lookup profile for role (profiles table stores role)
    const { data: dbUser, error: dbError } = await adminClient
      .from('profiles')
      .select('id, role')
      .eq('id', targetId)
      .single()

    if (dbError || !dbUser) {
      // If profile is missing, continue (we can still impersonate via auth)
      console.warn('Profile not found for auth user id:', targetId);
    }

    // Prevent regular admins from impersonating superadmins by checking profile role if available
    const { data: currentDbUser } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    const currentRole = currentDbUser?.role
    if (dbUser?.role === 'superadmin' && currentRole !== 'superadmin') {
      return NextResponse.redirect(new URL(`/admin/users?error=${encodeURIComponent('Unauthorized: Admins cannot impersonate Super Admins')}`, request.nextUrl.origin))
    }

    // Generate magic link and extract hashed token
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({ type: 'magiclink', email: targetEmail })
    if (linkError || !linkData?.properties) {
      return NextResponse.redirect(new URL(`/admin/users?error=${encodeURIComponent('Failed to generate login link')}`, request.nextUrl.origin))
    }

    const tokenHash = linkData.properties.hashed_token
    if (!tokenHash) {
      return NextResponse.redirect(new URL(`/admin/users?error=${encodeURIComponent('Failed to get authentication token')}`, request.nextUrl.origin))
    }

    // Determine canonical site base (use NEXT_PUBLIC_SITE_URL when available)
    const siteBase = (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.trim()) || request.nextUrl.origin;
    // Prepare response so we can set cookies on it
    const redirectUrl = new URL(redirectTo, siteBase)
    const response = NextResponse.redirect(redirectUrl)

    // Create server client that can set cookies on the response
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              // NextResponse cookie options are compatible with Supabase cookie options
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // Verify the OTP token (magic link) server-side to establish session cookies
    const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' })

    if (verifyError || !sessionData?.session) {
      return NextResponse.redirect(new URL(`/admin/users?error=${encodeURIComponent('Failed to establish session')}`, request.nextUrl.origin))
    }

    return response
  } catch (err) {
    console.error('Impersonation error:', err)
    return NextResponse.redirect(new URL(`/admin/users?error=${encodeURIComponent('Internal server error')}`, request.nextUrl.origin))
  }
}
