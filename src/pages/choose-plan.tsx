import { useRouter } from 'next/router';

export default function ChoosePlan() {
  const router = useRouter();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f8fafc 0%, #e8f5e9 100%)' }}>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.10)', padding: '2.5rem 2rem', maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#2C3E50', marginBottom: 12 }}>Welcome to LazyLunch!</h2>
        <p style={{ color: '#607274', fontSize: '1.1rem', marginBottom: 32 }}>
          Would you like to <strong>upgrade now</strong> and unlock all features, or continue with a free account?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <button
            style={{
              background: '#A8D5BA', color: '#2C3E50', fontWeight: 600, fontSize: '1.1rem', border: 'none', borderRadius: 8, padding: '1rem', cursor: 'pointer', marginBottom: 8
            }}
            onClick={() => router.push('/upgrade-membership')}
            aria-label="Upgrade to a paid plan"
          >
            Upgrade Now
          </button>
          <button
            style={{
              background: 'transparent', color: '#7F8C8D', fontWeight: 500, fontSize: '1.1rem', border: '1px solid #BDC3C7', borderRadius: 8, padding: '1rem', cursor: 'pointer'
            }}
            onClick={() => router.push('/dashboard')}
            aria-label="Continue with free plan"
          >
            Skip for Now
          </button>
        </div>
      </div>
    </div>
  );
} 