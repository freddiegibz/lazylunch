import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Head from 'next/head'
import { supabase } from '../lib/supabase'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      if (data.user) {
        // Force a page reload to ensure cookies are set
        window.location.href = '/dashboard'
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      })

      if (error) {
        throw error
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google.')
      setGoogleLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Sign In - LazyLunch</title>
        <meta name="description" content="Sign in to your LazyLunch account" />
      </Head>
      
      <div className="auth-container">
        <div className="auth-card">
          {/* Logo and Header */}
          <div className="auth-header">
            <Link href="/" className="auth-logo">
              LazyLunch
            </Link>
            <h2 className="auth-title">Welcome back</h2>
            <p className="auth-subtitle">Sign in to your account to continue</p>
          </div>

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="google-auth-button"
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              background: '#FFFFFF',
              color: '#374151',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '24px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleLoading ? 'Signing in...' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            margin: '24px 0',
            color: '#6B7280',
            fontSize: '14px'
          }}>
            <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }}></div>
            <span style={{ margin: '0 16px' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }}></div>
          </div>

          {/* Sign In Form */}
          <form className="auth-form" onSubmit={handleSignIn}>
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="Enter your email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="Enter your password"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="auth-button"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            {/* Forgot Password Link */}
            <div className="auth-links">
              <Link href="/forgot-password" className="auth-link">
                Forgot your password?
              </Link>
            </div>
          </form>

          {/* Sign Up Link */}
          <div className="auth-links">
            <p>
              Don't have an account?{' '}
              <Link href="/signup" className="auth-link primary">
                Sign up here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
} 