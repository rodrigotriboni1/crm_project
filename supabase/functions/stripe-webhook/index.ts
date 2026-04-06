import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import Stripe from 'npm:stripe@14.21.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function getStripe(): Stripe {
  const key = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
  return new Stripe(key, { apiVersion: '2023-10-16' })
}

async function applySubscription(
  admin: ReturnType<typeof createClient>,
  sub: Stripe.Subscription
): Promise<void> {
  const orgId = sub.metadata?.organization_id?.trim() ?? ''
  if (!orgId || !uuidRe.test(orgId)) {
    console.warn(
      'stripe-webhook: subscription without valid organization_id metadata (UUID da unidade; billing aplica-se à entidade legal)',
      sub.id
    )
    return
  }
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? ''
  const item = sub.items.data[0]
  const qty = item?.quantity ?? 1
  const priceMeta = item?.price?.metadata ?? {}
  const planTier = priceMeta.plan_tier === 'pro' ? 'pro' : 'starter'
  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null

  const { error } = await admin.rpc('apply_organization_billing_update', {
    p_organization_id: orgId,
    p_stripe_customer_id: customerId,
    p_stripe_subscription_id: sub.id,
    p_subscription_status: sub.status,
    p_seat_quantity: sub.status === 'canceled' ? null : qty,
    p_plan_tier: planTier,
    p_current_period_end: periodEnd,
  })
  if (error) {
    console.error('stripe-webhook: apply_organization_billing_update', error)
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!webhookSecret || !supabaseUrl || !serviceRole) {
    console.error('stripe-webhook: missing STRIPE_WEBHOOK_SECRET, SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500 })
  }

  const stripe = getStripe()
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature ?? '', webhookSecret)
  } catch (e) {
    console.error('stripe-webhook: signature', e)
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 })
  }

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription
        await applySubscription(admin, sub)
        break
      }
      default:
        break
    }
  } catch (e) {
    console.error('stripe-webhook: handler', e)
    return new Response(JSON.stringify({ error: 'Handler failed' }), { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
