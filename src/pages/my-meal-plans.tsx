import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { MealPlanService, MealPlan } from '../lib/meal-plan-service'
import { MealType } from '../lib/recipe-categories'
import breakfastRecipes from '../lib/breakfast.json'
import lunchRecipes from '../lib/lunch.json'
import dinnerRecipes from '../lib/dinner.json'
import { GetServerSideProps } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { Session } from '@supabase/auth-helpers-nextjs'
import DashboardNavbar from '../components/DashboardNavbar'
import { supabase } from '../lib/supabase'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  // Debug: Log cookies received by the server
  console.log('DEBUG: Cookies received:', ctx.req.headers.cookie);

  const supabase = createPagesServerClient(ctx)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Debug: Log the session object returned by Supabase
  console.log('DEBUG: Supabase session:', session);

  if (!session) {
    return {
      redirect: {
        destination: '/signin',
        permanent: false,
      },
    }
  }

  // Fetch meal plans for the logged-in user
  const { data: mealPlansRaw, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  // Import recipe data
  const { default: breakfastRecipes } = await import('../lib/breakfast.json')
  const { default: lunchRecipes } = await import('../lib/lunch.json')
  const { default: dinnerRecipes } = await import('../lib/dinner.json')

  const getRecipeById = (id: string, mealType: string) => {
    if (mealType === 'breakfast') return breakfastRecipes.find((r: any) => r.id === id)
    if (mealType === 'lunch') return lunchRecipes.find((r: any) => r.id === id)
    if (mealType === 'dinner') return dinnerRecipes.find((r: any) => r.id === id)
    return null
  }

  const populateRecipeObjects = (weekData: any[]) => {
    return weekData.map((day: any) => ({
      ...day,
      meals: {
        breakfast: typeof day.meals?.breakfast === 'string'
          ? (getRecipeById(day.meals.breakfast, 'breakfast') || null)
          : (day.meals?.breakfast || null),
        lunch: typeof day.meals?.lunch === 'string'
          ? (getRecipeById(day.meals.lunch, 'lunch') || null)
          : (day.meals?.lunch || null),
        dinner: typeof day.meals?.dinner === 'string'
          ? (getRecipeById(day.meals.dinner, 'dinner') || null)
          : (day.meals?.dinner || null),
      }
    }))
  }

  const generateShoppingList = (weekData: any[]) => {
    const allIngredients = new Set<string>()
    weekData.forEach((day: any) => {
      Object.values(day.meals).forEach((meal: any) => {
        if (meal && typeof meal === 'object' && meal.ingredients) {
          meal.ingredients.forEach((ingredient: any) => {
            allIngredients.add(ingredient.item)
          })
        }
      })
    })
    return Array.from(allIngredients).sort()
  }

  let mealPlans: any[] = []
  if (mealPlansRaw && Array.isArray(mealPlansRaw)) {
    mealPlans = mealPlansRaw.map((plan: any) => {
      // Ensure week_data exists and is an array
      const weekData = Array.isArray(plan.week_data) ? plan.week_data : []
      const populatedWeekData = populateRecipeObjects(weekData)
      const generatedShoppingList = generateShoppingList(populatedWeekData)
      return {
        ...plan,
        week_data: populatedWeekData,
        shopping_list: generatedShoppingList
      }
    })
  }

  return {
    props: {
      mealPlans,
      session,
    },
  }
}

function MyMealPlans({ mealPlans = [] }: { mealPlans: any[] }) {
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)
  const [membership, setMembership] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUser(user)
          // Fetch membership from profiles table
          try {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('membership')
              .eq('id', user.id)
              .single()
            
            if (error) {
              setMembership('free')
            } else {
              setMembership(profile?.membership || 'free')
            }
          } catch (error) {
            setMembership('free')
          }
        } else {
          router.push('/signin')
        }
      } catch (error) {
        router.push('/signin')
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [router])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const deleteMealPlan = async (mealPlanId: string) => {
    if (!confirm('Are you sure you want to delete this meal plan?')) {
      return
    }

    try {
      await MealPlanService.deleteMealPlan(mealPlanId)
      // Reload the list
      // await loadMealPlans() // This line is removed as per the new_code, as mealPlans are now passed as props.
    } catch (error) {
      setError('Failed to delete meal plan')
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
        <title>My Meal Plans - LazyLunch</title>
        <meta name="description" content="View and manage your saved meal plans" />
      </Head>
      
      <div className="dashboard-container">
        <DashboardNavbar 
          user={user} 
          membership={membership}
          showBackButton={true}
        />

        {/* Main Content */}
        <main className="dashboard-main">
          <div className="dashboard-content">
            <h2 className="dashboard-title">
              My Meal Plans
            </h2>
            <p className="dashboard-subtitle">
              View and manage your saved meal plans
            </p>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {mealPlans.length === 0 ? (
              <div className="empty-state">
                <h3>No meal plans yet</h3>
                <p>You haven't generated any meal plans yet. Create your first one!</p>
                <Link href="/generate-meal-plan" className="auth-button" style={{ textDecoration: 'none', display: 'inline-block' }}>
                  Generate Meal Plan
                </Link>
              </div>
            ) : (
              <div className="meal-plans-grid">
                {mealPlans.map((plan) => (
                  <div key={plan.id} className="meal-plan-card">
                    <div className="meal-plan-card-header">
                      <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                        {/* Thumbnail image: use breakfast image from first day if available */}
                        {plan.week_data && plan.week_data[0] && plan.week_data[0].meals && plan.week_data[0].meals.breakfast && plan.week_data[0].meals.breakfast.image && (
                          <div className="meal-plan-thumbnail" style={{width: 48, height: 48, borderRadius: 8, overflow: 'hidden', background: 'var(--light-grey)', marginRight: 8, flexShrink: 0}}>
                            <img
                              src={plan.week_data[0].meals.breakfast.image}
                              alt={plan.week_data[0].meals.breakfast.name || 'Meal Plan'}
                              style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8}}
                            />
                          </div>
                        )}
                        <div>
                          <h3>Meal Plan</h3>
                          <span className="meal-plan-date">
                            {plan.created_at ? formatDate(plan.created_at) : 'Unknown date'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="meal-plan-preview">
                      <p><strong>Days:</strong> {plan.week_data?.length || 0} days</p>
                      <p><strong>Shopping Items:</strong> {plan.shopping_list?.length || 0} items</p>
                    </div>
                    <div className="meal-plan-actions">
                      <button
                        onClick={() => router.push(`/meal-plan/${plan.id}`)}
                        className="dashboard-card-button"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => deleteMealPlan(plan.id!)}
                        className="dashboard-card-button"
                        style={{ backgroundColor: '#DC2626', color: 'white' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="create-new-section">
              <Link href="/generate-meal-plan" className="auth-button" style={{ textDecoration: 'none', display: 'inline-block' }}>
                Generate New Meal Plan
              </Link>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}

export default MyMealPlans 