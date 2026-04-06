import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAdminServiceClient } from '@/lib/supabase/admin-client'

const IMPERSONATE_SITE_ORIGIN = 'https://esellersstorebay.com'

function toAdminUsersErrorUrl(message: string) {
  return new URL(
    `/admin/users?error=${encodeURIComponent(message)}`,
    IMPERSONATE_SITE_ORIGIN,
  )
}

function toSafeNextPath(rawValue: string | null) {
  if (!rawValue || !rawValue.startsWith('/')) {
    return '/seller/dashboard'
  }
  return rawValue
}

/**
 * Server-side admin impersonation route.
 * Usage: GET /api/admin/impersonate?email=target@example.com&redirect=/dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl
    const searchParams = url.searchParams
    const targetEmail = searchParams.get('email')
    const safeNextPath = toSafeNextPath(searchParams.get('redirect'))

    if (!targetEmail) {
      return NextResponse.redirect(toAdminUsersErrorUrl('Email parameter is required'))
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
      return NextResponse.redirect(new URL('/auth/login', IMPERSONATE_SITE_ORIGIN))
    }

    // Use service-role admin client for privileged operations
    const adminClient = createAdminServiceClient()
    const normalizedTargetEmail = targetEmail.trim().toLowerCase()

    const { data: currentDbUser, error: currentDbUserError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .maybeSingle()

    if (currentDbUserError) {
      return NextResponse.redirect(toAdminUsersErrorUrl(currentDbUserError.message))
    }

    if (!currentDbUser || (currentDbUser.role !== 'admin' && currentDbUser.role !== 'superadmin')) {
      return NextResponse.redirect(toAdminUsersErrorUrl('Admin access required'))
    }

    let targetProfile: {
      id: string
      role: string | null
      is_active: boolean | null
      disable_login: boolean | null
      email: string | null
    } | null = null

    const { data: profileByEmail, error: profileByEmailError } = await adminClient
      .from('profiles')
      .select('id, role, is_active, disable_login, email')
      .ilike('email', normalizedTargetEmail)
      .maybeSingle()

    if (profileByEmailError) {
      return NextResponse.redirect(toAdminUsersErrorUrl(profileByEmailError.message))
    }

    targetProfile = profileByEmail

    let matchedAuthUser: { id: string; email?: string | null } | null = null

    // Backward-compatible fallback for records where profile email is missing/out of sync.
    if (!targetProfile) {
      const perPage = 200
      for (let page = 1; page <= 100; page += 1) {
        const { data: usersPage, error: usersPageError } = await adminClient.auth.admin.listUsers({
          page,
          perPage,
        })

        if (usersPageError) {
          return NextResponse.redirect(toAdminUsersErrorUrl(usersPageError.message))
        }

        const users = usersPage?.users || []
        matchedAuthUser =
          users.find((u) => u.email?.toLowerCase() === normalizedTargetEmail) || null

        if (matchedAuthUser) break
        if (users.length < perPage) break
      }

      if (matchedAuthUser) {
        const { data: profileById, error: profileByIdError } = await adminClient
          .from('profiles')
          .select('id, role, is_active, disable_login, email')
          .eq('id', matchedAuthUser.id)
          .maybeSingle()

        if (profileByIdError) {
          return NextResponse.redirect(toAdminUsersErrorUrl(profileByIdError.message))
        }

        targetProfile = profileById
      }
    }

    if (!targetProfile) {
      return NextResponse.redirect(toAdminUsersErrorUrl(`User not found: ${targetEmail}`))
    }

    if (targetProfile.role !== 'seller') {
      return NextResponse.redirect(toAdminUsersErrorUrl('Selected account is not a seller'))
    }

    if (targetProfile.is_active === false || targetProfile.disable_login === true) {
      return NextResponse.redirect(toAdminUsersErrorUrl('This seller account is disabled'))
    }

    let sellerEmail = targetProfile.email || matchedAuthUser?.email || null
    if (!sellerEmail) {
      const { data: authUserData, error: authUserError } = await adminClient.auth.admin.getUserById(
        targetProfile.id,
      )

      if (authUserError) {
        return NextResponse.redirect(toAdminUsersErrorUrl(authUserError.message))
      }

      sellerEmail = authUserData.user?.email || null
    }

    if (!sellerEmail) {
      return NextResponse.redirect(toAdminUsersErrorUrl('Seller email is missing'))
    }

    const redirectTo = `${IMPERSONATE_SITE_ORIGIN}/auth/callback?next=${encodeURIComponent(safeNextPath)}`
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: sellerEmail,
      options: { redirectTo },
    })

    if (linkError) {
      return NextResponse.redirect(toAdminUsersErrorUrl(linkError.message))
    }

    const tokenHash = linkData?.properties?.hashed_token
    const verificationType = linkData?.properties?.verification_type || 'magiclink'

    if (!tokenHash) {
      return NextResponse.redirect(toAdminUsersErrorUrl('Failed to get authentication token'))
    }

    const callbackUrl =
      `${IMPERSONATE_SITE_ORIGIN}/auth/callback` +
      `?token_hash=${encodeURIComponent(tokenHash)}` +
      `&type=${encodeURIComponent(verificationType)}` +
      `&next=${encodeURIComponent(safeNextPath)}`

    return NextResponse.redirect(new URL(callbackUrl))
  } catch (err) {
    console.error('Impersonation error:', err)
    return NextResponse.redirect(toAdminUsersErrorUrl('Internal server error'))
  }
}
