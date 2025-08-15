import Head from 'next/head'

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy - LazyLunch</title>
        <meta name="robots" content="index,follow" />
      </Head>
      <div className="pricing-section" style={{ minHeight: '100vh' }}>
        <div className="container" style={{ maxWidth: 840 }}>
          <h1 className="section-title">Privacy Policy</h1>
          <div style={{ background: 'var(--white)', border: '1px solid var(--border-grey)', borderRadius: 12, padding: 24 }}>
            <p style={{ color: 'var(--dark-grey)', marginBottom: 16 }}>Effective date: {new Date().toLocaleDateString()}</p>

            <h3 className="section-heading">Who we are</h3>
            <p style={{ marginBottom: 16 }}>LazyLunch ("we", "us") provides AI‑assisted meal planning. This policy explains what we collect, how we use it, and your choices.</p>

            <h3 className="section-heading">Information we collect</h3>
            <ul style={{ marginLeft: 18, marginBottom: 16 }}>
              <li>Account data: email, profile details stored in Supabase.</li>
              <li>Usage data: generated meal plans, recipe feedback (likes/dislikes), saved presets.</li>
              <li>Billing data: handled by Stripe (we do not store card details).</li>
              <li>Technical data: device/browser info, cookies for authentication/session.</li>
              <li>App feedback: thumbs up/down and optional message.</li>
            </ul>

            <h3 className="section-heading">How we use information</h3>
            <ul style={{ marginLeft: 18, marginBottom: 16 }}>
              <li>Provide and improve meal plan generation and the app experience.</li>
              <li>Process subscriptions and payments via Stripe.</li>
              <li>Authenticate users and secure access via Supabase.</li>
              <li>Generate meal plans with OpenAI using your provided preferences.</li>
              <li>Communicate important updates related to your account.</li>
            </ul>

            <h3 className="section-heading">Sharing</h3>
            <p style={{ marginBottom: 16 }}>We share data with processors strictly to provide the service:</p>
            <ul style={{ marginLeft: 18, marginBottom: 16 }}>
              <li>Supabase (authentication, database, storage)</li>
              <li>Stripe (payments, subscriptions)</li>
              <li>OpenAI (meal plan generation from your preferences; no payment data)</li>
            </ul>

            <h3 className="section-heading">Cookies</h3>
            <p style={{ marginBottom: 16 }}>We use cookies and local storage for authentication and to maintain session state.</p>

            <h3 className="section-heading">Data retention</h3>
            <p style={{ marginBottom: 16 }}>We retain data while your account is active or as needed to provide the service. You can request deletion of your account and associated personal data.</p>

            <h3 className="section-heading">Security</h3>
            <p style={{ marginBottom: 16 }}>We apply reasonable technical and organizational measures. No method is 100% secure; please use a strong password and protect your account.</p>

            <h3 className="section-heading">Your rights</h3>
            <ul style={{ marginLeft: 18, marginBottom: 16 }}>
              <li>Access, correct, or delete your personal information</li>
              <li>Export your data where applicable</li>
              <li>Withdraw consent where processing is consent‑based</li>
            </ul>

            <h3 className="section-heading">Children</h3>
            <p style={{ marginBottom: 16 }}>The service is not directed to children under 13. If you believe a child provided personal data, contact us to remove it.</p>

            <h3 className="section-heading">Changes</h3>
            <p style={{ marginBottom: 16 }}>We may update this policy. We will post the updated version with a new effective date.</p>

            <h3 className="section-heading">Contact</h3>
            <p style={{ marginBottom: 8 }}>If you have questions or requests regarding privacy, contact:</p>
            <p style={{ fontWeight: 600, color: 'var(--navy-blue)' }}>support@lazylunch.app</p>
          </div>
        </div>
      </div>
    </>
  )
} 