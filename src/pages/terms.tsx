import Head from 'next/head'

export default function Terms() {
  return (
    <>
      <Head>
        <title>Terms and Conditions - LazyLunch</title>
        <meta name="robots" content="index,follow" />
      </Head>
      <div className="pricing-section" style={{ minHeight: '100vh' }}>
        <div className="container" style={{ maxWidth: 840 }}>
          <h1 className="section-title">Terms and Conditions</h1>
          <div style={{ background: 'var(--white)', border: '1px solid var(--border-grey)', borderRadius: 12, padding: 24 }}>
            <p style={{ color: 'var(--dark-grey)', marginBottom: 16 }}>Effective date: {new Date().toLocaleDateString()}</p>

            <h3 className="section-heading">Acceptance of terms</h3>
            <p style={{ marginBottom: 16 }}>By accessing or using LazyLunch, you agree to these Terms. If you do not agree, do not use the service.</p>

            <h3 className="section-heading">Service description</h3>
            <p style={{ marginBottom: 16 }}>LazyLunch provides AI‑assisted meal planning, personalized recipe suggestions, and subscription billing for premium features.</p>

            <h3 className="section-heading">Accounts</h3>
            <ul style={{ marginLeft: 18, marginBottom: 16 }}>
              <li>You are responsible for maintaining the confidentiality of your account.</li>
              <li>You must provide accurate information and not misuse the service.</li>
            </ul>

            <h3 className="section-heading">Subscriptions & billing</h3>
            <ul style={{ marginLeft: 18, marginBottom: 16 }}>
              <li>Subscriptions are billed by Stripe on a recurring basis until canceled.</li>
              <li>You can cancel at any time; access remains until the period end.</li>
              <li>Fees are non‑refundable except as required by law.</li>
            </ul>

            <h3 className="section-heading">Acceptable use</h3>
            <ul style={{ marginLeft: 18, marginBottom: 16 }}>
              <li>Do not attempt to reverse engineer or disrupt the service.</li>
              <li>Do not submit unlawful or harmful content.</li>
            </ul>

            <h3 className="section-heading">AI‑generated content</h3>
            <p style={{ marginBottom: 16 }}>Meal plans are generated using AI and provided for informational purposes. Verify ingredients and allergens. We are not responsible for outcomes based on AI suggestions.</p>

            <h3 className="section-heading">Third‑party services</h3>
            <p style={{ marginBottom: 16 }}>We integrate with Supabase (auth/database), Stripe (payments), and OpenAI (generation). Their terms apply in addition to ours.</p>

            <h3 className="section-heading">Intellectual property</h3>
            <p style={{ marginBottom: 16 }}>The service, branding, and content are owned by LazyLunch or our licensors. You are granted a limited, non‑exclusive license to use the service.</p>

            <h3 className="section-heading">Disclaimer; limitation of liability</h3>
            <p style={{ marginBottom: 16 }}>The service is provided “as is” without warranties. To the maximum extent permitted by law, LazyLunch is not liable for indirect, incidental, or consequential damages.</p>

            <h3 className="section-heading">Termination</h3>
            <p style={{ marginBottom: 16 }}>We may suspend or terminate access for violations. You may stop using the service at any time.</p>

            <h3 className="section-heading">Changes to Terms</h3>
            <p style={{ marginBottom: 16 }}>We may update these Terms. Continued use after changes constitutes acceptance of the updated Terms.</p>

            <h3 className="section-heading">Contact</h3>
            <p style={{ marginBottom: 8 }}>Questions about these Terms:</p>
            <p style={{ fontWeight: 600, color: 'var(--navy-blue)' }}>support@lazylunch.app</p>
          </div>
        </div>
      </div>
    </>
  )
} 