#!/usr/bin/env node
// One-off setup probe for the Instagram Graph business_discovery route.
// Not part of the pipeline -- run it by hand while wiring up credentials:
//
//   IG_USER_ID=... IG_TOKEN=... node scripts/probe-ig-graph.mjs
//
// Answers the two questions that decide whether the route is viable at all:
// is the target account discoverable, and is this token the non-expiring kind.

const VERSION = 'v26.0'
const GRAPH = `https://graph.facebook.com/${VERSION}`

let IG_USER_ID = process.env.IG_USER_ID
const IG_TOKEN = process.env.IG_TOKEN
const HANDLE = process.env.IG_HANDLE || 'daanwillemsautomotive'

if (!IG_TOKEN) {
  console.error('usage: IG_TOKEN=<token> [IG_USER_ID=<id>] node scripts/probe-ig-graph.mjs')
  console.error('(IG_USER_ID is discovered from the token when omitted)')
  process.exit(2)
}

const MEDIA_FIELDS = [
  'id', 'caption', 'like_count', 'comments_count', 'view_count',
  'media_url', 'thumbnail_url', 'permalink', 'timestamp', 'media_type',
].join(',')

async function graph(path, params) {
  const url = new URL(`${GRAPH}${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url)
  const body = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, body }
}

function fail(label, body) {
  const e = body?.error
  console.log(`  ✗ ${label}`)
  if (e) {
    console.log(`    code=${e.code}${e.error_subcode ? ` subcode=${e.error_subcode}` : ''} type=${e.type}`)
    console.log(`    ${e.message}`)
  } else {
    console.log(`    ${JSON.stringify(body)?.slice(0, 300)}`)
  }
}

// Gate 1 -- is the target discoverable, and which fields come back populated?
async function gateDiscovery() {
  console.log(`\n[gate 1] business_discovery on @${HANDLE}`)
  const fields =
    `business_discovery.username(${HANDLE}){followers_count,media_count,media.limit(5){${MEDIA_FIELDS}}}`
  const { ok, body } = await graph(`/${IG_USER_ID}`, { fields, access_token: IG_TOKEN })

  if (!ok) {
    fail('discovery call failed', body)
    const code = body?.error?.code
    if (code === 110 || code === 100) {
      console.log('    → most likely: target is a personal (not professional) account,')
      console.log('      or you passed the Page ID instead of the IG User ID.')
    }
    return null
  }

  const bd = body?.business_discovery
  if (!bd) {
    console.log('  ✗ response had no business_discovery object')
    console.log(`    ${JSON.stringify(body).slice(0, 300)}`)
    return null
  }

  console.log(`  ✓ discoverable — followers=${bd.followers_count?.toLocaleString()} media=${bd.media_count}`)

  const media = bd.media?.data || []
  console.log(`  ✓ media edge returned ${media.length} item(s)`)

  // Which optional fields actually arrive matters more than the docs claim --
  // view_count in particular is the one the whole stats tile depends on.
  const present = {}
  for (const m of media) {
    for (const k of MEDIA_FIELDS.split(',')) {
      if (m[k] !== undefined && m[k] !== null) present[k] = (present[k] || 0) + 1
    }
  }
  console.log('\n  field coverage across returned media:')
  for (const k of MEDIA_FIELDS.split(',')) {
    const n = present[k] || 0
    const mark = n === media.length ? '✓' : n === 0 ? '✗' : '~'
    console.log(`    ${mark} ${k.padEnd(16)} ${n}/${media.length}`)
  }

  const sample = media[0]
  if (sample) {
    console.log('\n  first item:')
    console.log(`    permalink   ${sample.permalink}`)
    console.log(`    type        ${sample.media_type}`)
    console.log(`    timestamp   ${sample.timestamp}`)
    console.log(`    views       ${sample.view_count?.toLocaleString() ?? '(absent)'}`)
    console.log(`    likes       ${sample.like_count?.toLocaleString() ?? '(absent)'}`)
    console.log(`    comments    ${sample.comments_count?.toLocaleString() ?? '(absent)'}`)
    const img = sample.media_url || sample.thumbnail_url || ''
    const oe = img.match(/[?&]oe=([0-9A-Fa-f]+)/)?.[1]
    if (oe) {
      const exp = new Date(parseInt(oe, 16) * 1000)
      const hours = ((exp - Date.now()) / 3600000).toFixed(1)
      console.log(`    image URL expires ${exp.toISOString()} (~${hours}h) — must be downloaded, not hotlinked`)
    }
  }
  return bd
}

// Gate 2 -- a token that expires is a token someone has to renew by hand.
async function gateToken() {
  console.log('\n[gate 2] token longevity')
  const { ok, body } = await graph('/debug_token', {
    input_token: IG_TOKEN,
    access_token: IG_TOKEN,
  })
  if (!ok) {
    fail('could not inspect token', body)
    return
  }
  const d = body?.data || {}
  console.log(`  type=${d.type} app=${d.app_id} valid=${d.is_valid}`)
  if (d.expires_at === 0 || d.expires_at === undefined) {
    console.log('  ✓ never expires — safe for unattended CI')
  } else {
    const when = new Date(d.expires_at * 1000)
    const days = ((when - Date.now()) / 86400000).toFixed(0)
    console.log(`  ✗ expires ${when.toISOString()} (~${days}d)`)
    console.log('    → this is a User token, not a Page token. Re-do the exchange:')
    console.log('      GET /me/accounts and take the Page object\'s access_token.')
  }
  if (d.scopes) console.log(`  scopes: ${d.scopes.join(', ')}`)
}

// Gate 0 -- resolve our own IG user id from the token. Also proves the
// Page<->Instagram link registered the way the Graph API needs it: an absent
// instagram_business_account (not null -- absent) means the link didn't take,
// whatever the Business Suite UI claims.
async function gateOwnAccount() {
  console.log('\n[gate 0] resolving your own IG user id')
  const { ok, body } = await graph('/me/accounts', {
    fields: 'id,name,instagram_business_account{id,username}',
    access_token: IG_TOKEN,
  })
  if (!ok) {
    fail('could not list pages', body)
    return false
  }
  const pages = body?.data || []
  if (!pages.length) {
    console.log('  ✗ token can see no Pages')
    console.log('    → assign the Page to the system user, or check the token scopes')
    return false
  }
  for (const p of pages) {
    const ig = p.instagram_business_account
    console.log(`  page "${p.name}" (${p.id}) → ${ig ? `IG ${ig.username} (${ig.id})` : 'NO linked IG account'}`)
  }
  const linked = pages.find(p => p.instagram_business_account)
  if (!linked) {
    console.log('  ✗ no Page has instagram_business_account')
    console.log('    → the Page<->Instagram link did not register, or the IG')
    console.log('      account is not assigned to the system user as its own asset')
    return false
  }
  if (!IG_USER_ID) {
    IG_USER_ID = linked.instagram_business_account.id
    console.log(`  ✓ using IG user id ${IG_USER_ID}`)
  }
  return true
}

const haveAccount = await gateOwnAccount()
const bd = haveAccount ? await gateDiscovery() : null
await gateToken()
console.log(bd ? '\nboth gates checked — see results above\n' : '\ngate 1 failed; fix that before anything else\n')
