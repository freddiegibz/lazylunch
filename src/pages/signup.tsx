import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Head from 'next/head'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    // Validate password strength
    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    try {
      // Mock signup - just show success
      setSuccess(true)
      // Show success message and redirect after a delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err) {
      setError('Failed to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Sign Up - LazyLunch</title>
        <meta name="description" content="Create your LazyLunch account" />
      </Head>
      
      <div className="auth-container">
        <div className="auth-card">
          {/* Logo and Header */}
          <div className="auth-header">
            <Link href="/" className="auth-logo">
              LazyLunch
            </Link>
            <h2 className="auth-title">Create your account</h2>
            <p className="auth-subtitle">Join thousands of families saving time and money</p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="success-message">
              Account created successfully! Redirecting to dashboard...
            </div>
          )}

          {/* Sign Up Form */}
          <form className="auth-form" onSubmit={handleSignUp}>
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
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="Create a password (min 6 characters)"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-input"
                placeholder="Confirm your password"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {/* Terms and Conditions */}
            <div className="terms-text">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="auth-link">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="auth-link">
                Privacy Policy
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || success}
              className="auth-button"
            >
              {loading ? 'Creating account...' : success ? 'Account Created!' : 'Create Account'}
            </button>
          </form>

          {/* Sign In Link */}
          <div className="auth-links">
            <p>
              Already have an account?{' '}
              <Link href="/signin" className="auth-link primary">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
} 