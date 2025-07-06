import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Get current user session
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
      } else {
        // No user found, redirect to signin
        router.push('/signin')
      }
      setLoading(false)
    }

    getCurrentUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        router.push('/signin')
      } else if (session?.user) {
        setUser(session.user)
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="text-center">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to signin
  }

  return (
    <>
      <Head>
        <title>Dashboard - LazyLunch</title>
        <meta name="description" content="Your LazyLunch dashboard" />
      </Head>
      
      <div className="dashboard-container">
        {/* Header */}
        <header className="dashboard-header">
          <div className="dashboard-header-content">
            <div className="dashboard-logo">LazyLunch</div>
            <div className="dashboard-nav">
              <span className="dashboard-user">Welcome, {user.email}</span>
              <button
                onClick={handleSignOut}
                className="dashboard-signout"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="dashboard-main">
          <div className="dashboard-content">
            <h2 className="dashboard-title">
              Welcome to your LazyLunch Dashboard!
            </h2>
            <p className="dashboard-subtitle">
              Your AI-powered meal planning journey starts here.
            </p>
            
            {/* Placeholder for meal planning features */}
            <div className="dashboard-grid">
              <div className="dashboard-card">
                <h3>Generate Meal Plan</h3>
                <p>Create a personalized weekly meal plan based on your preferences.</p>
                <Link href="/generate-meal-plan" className="dashboard-card-button" style={{ textDecoration: 'none', display: 'inline-block' }}>
                  Get Started
                </Link>
              </div>
              
              <div className="dashboard-card">
                <h3>View Recipes</h3>
                <p>Browse our collection of family-friendly recipes.</p>
                <button className="dashboard-card-button">
                  Browse Recipes
                </button>
              </div>
              
              <div className="dashboard-card">
                <h3>Shopping Lists</h3>
                <p>Generate and manage your grocery shopping lists.</p>
                <button className="dashboard-card-button">
                  Create List
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
} 