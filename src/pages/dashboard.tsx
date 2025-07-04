import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { getCurrentUser, signOut } from '../lib/supabase'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push('/signin')
        return
      }
      setUser(currentUser)
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/signin')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
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
              <span className="dashboard-user">Welcome, {user?.email}</span>
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
                <button className="dashboard-card-button">
                  Get Started
                </button>
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