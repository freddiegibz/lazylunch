import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { MealPlanService, MealPlan } from '../../lib/meal-plan-service'

export default function MealPlanDetail() {
  const [mealPlan, setMealPlan] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showShoppingList, setShowShoppingList] = useState(false)
  const router = useRouter()
  const { id } = router.query

  useEffect(() => {
    if (id) {
      loadMealPlan(id as string)
    }
  }, [id])

  const loadMealPlan = async (planId: string) => {
    try {
      setLoading(true)
      const plans = await MealPlanService.getAllMealPlans()
      const plan = plans.find(p => p.id === planId)
      
      if (plan) {
        setMealPlan({
          week: plan.week_data,
          shoppingList: plan.shopping_list,
          id: plan.id,
          created_at: plan.created_at
        })
      } else {
        setError('Meal plan not found')
      }
    } catch (error) {
      console.error('Error loading meal plan:', error)
      setError('Failed to load meal plan')
    } finally {
      setLoading(false)
    }
  }

  const downloadMealPlan = () => {
    if (!mealPlan) return

    let content = 'LazyLunch Weekly Meal Plan\n\n'
    
    mealPlan.week.forEach((day: any) => {
      content += `${day.day}:\n`
      content += `  Breakfast: ${day.meals.breakfast}\n`
      content += `  Lunch: ${day.meals.lunch}\n`
      content += `  Dinner: ${day.meals.dinner}\n\n`
    })
    
    content += 'Shopping List:\n'
    mealPlan.shoppingList.forEach((item: string) => {
      content += `- ${item}\n`
    })
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'meal-plan.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const deleteMealPlan = async () => {
    if (!mealPlan?.id || !confirm('Are you sure you want to delete this meal plan?')) {
      return
    }

    try {
      await MealPlanService.deleteMealPlan(mealPlan.id)
      router.push('/my-meal-plans')
    } catch (error) {
      console.error('Error deleting meal plan:', error)
      setError('Failed to delete meal plan')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading meal plan...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="dashboard-header-content">
            <div className="dashboard-logo">LazyLunch</div>
            <div className="dashboard-nav">
              <Link href="/my-meal-plans" className="dashboard-link">
                ← Back to My Meal Plans
              </Link>
            </div>
          </div>
        </header>
        
        <main className="dashboard-main">
          <div className="dashboard-content">
            <div className="error-message">
              {error}
            </div>
            <Link href="/my-meal-plans" className="auth-button" style={{ textDecoration: 'none', display: 'inline-block' }}>
              Back to My Meal Plans
            </Link>
          </div>
        </main>
      </div>
    )
  }

  if (!mealPlan) {
    return null
  }

  return (
    <>
      <Head>
        <title>Meal Plan - LazyLunch</title>
        <meta name="description" content="View your saved meal plan" />
      </Head>
      
      <div className="dashboard-container">
        {/* Header */}
        <header className="dashboard-header">
          <div className="dashboard-header-content">
            <div className="dashboard-logo">LazyLunch</div>
            <div className="dashboard-nav">
              <Link href="/my-meal-plans" className="dashboard-link">
                ← Back to My Meal Plans
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="dashboard-main">
          <div className="dashboard-content">
            <div className="meal-plan-header">
              <div>
                <h2 className="dashboard-title">
                  Your Meal Plan
                </h2>
                <p className="dashboard-subtitle">
                  Created on {formatDate(mealPlan.created_at)}
                </p>
              </div>
              <div className="meal-plan-actions">
                <button
                  onClick={() => setShowShoppingList(!showShoppingList)}
                  className="dashboard-card-button"
                >
                  {showShoppingList ? 'Hide' : 'Show'} Shopping List
                </button>
                <button
                  onClick={downloadMealPlan}
                  className="dashboard-card-button"
                >
                  Download Plan
                </button>
                <button
                  onClick={deleteMealPlan}
                  className="dashboard-card-button"
                  style={{ backgroundColor: '#DC2626', color: 'white' }}
                >
                  Delete Plan
                </button>
              </div>
            </div>

            <div className="meal-plan-grid">
              {mealPlan.week.map((day: any, index: number) => (
                <div key={index} className="meal-day-card">
                  <h4 className="day-title">{day.day}</h4>
                  <div className="meals">
                    <div className="meal">
                      <span className="meal-type">Breakfast:</span>
                      <span className="meal-name">{day.meals.breakfast}</span>
                    </div>
                    <div className="meal">
                      <span className="meal-type">Lunch:</span>
                      <span className="meal-name">{day.meals.lunch}</span>
                    </div>
                    <div className="meal">
                      <span className="meal-type">Dinner:</span>
                      <span className="meal-name">{day.meals.dinner}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {showShoppingList && (
              <div className="shopping-list-section">
                <h3>Shopping List</h3>
                <div className="shopping-list">
                  {mealPlan.shoppingList.map((item: string, index: number) => (
                    <div key={index} className="shopping-item">
                      <input type="checkbox" id={`item-${index}`} />
                      <label htmlFor={`item-${index}`}>{item}</label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  )
} 