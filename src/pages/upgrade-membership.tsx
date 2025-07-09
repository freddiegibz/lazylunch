import Head from 'next/head'
import { useState } from 'react'
import { useRouter } from 'next/router'

const plans = [
  {
    name: 'Basic',
    price: 5,
    priceId: 'price_1RifEpB4uyQdSSUI7iRCrIcE', // Updated Stripe price ID for Basic
    features: [
      'Weekly meal plan',
      'Grocery list',
      '2 revisions',
    ],
  },
  {
    name: 'Standard',
    price: 10,
    priceId: 'price_1RifFfB4uyQdSSUINbh45IDW', // Updated Stripe price ID
    features: [
      'Everything in Basic',
      'Dietary filters',
      'Guest plans',
      '5 revisions',
    ],
  },
  {
    name: 'Premium',
    price: 20,
    priceId: 'price_1RifFyB4uyQdSSUIKmYfTfRw', // Updated Stripe price ID for Premium
    features: [
      'Everything in Standard',
      'Unlimited guest plans',
      '10 revisions',
      'Priority support',
    ],
  },
]

export default function UpgradeMembership() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const router = useRouter()

  const handleUpgrade = async (priceId: string) => {
    setLoadingPlan(priceId)
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Error creating checkout session: ' + (data.error || 'Unknown error'))
      }
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <>
      <Head>
        <title>Upgrade Membership - LazyLunch</title>
        <meta name="description" content="Upgrade your LazyLunch membership" />
      </Head>
      <div className="pricing-section" style={{ minHeight: '100vh' }}>
        <div className="container">
          <h2 className="section-title">Choose Your Membership</h2>
          <div className="pricing-grid">
            {plans.map((plan) => (
              <div key={plan.name} className={`pricing-card${plan.name === 'Standard' ? ' featured' : ''}`}>
                <h3>{plan.name}</h3>
                <div className="price">${plan.price}<span>/mo</span></div>
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <button
                  className={`pricing-cta${plan.name === 'Standard' ? ' featured' : ''}`}
                  onClick={() => handleUpgrade(plan.priceId)}
                  disabled={loadingPlan === plan.priceId}
                >
                  {loadingPlan === plan.priceId ? 'Redirecting...' : 'Upgrade'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
} 