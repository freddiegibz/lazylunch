import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { MealPlanService, MealPlan } from '../lib/meal-plan-service'
import { MealType } from '../lib/recipe-categories'
import breakfastRecipes from '../lib/breakfast.json'
import lunchRecipes from '../lib/lunch.json'
import dinnerRecipes from '../lib/dinner.json'

export default function MyMealPlans() {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  // Function to populate recipe objects from IDs
  const populateRecipeObjects = (weekData: any[]) => {
    const getRecipeById = (id: string, mealType: MealType) => {
      if (mealType === 'breakfast') return breakfastRecipes.find(r => r.id === id);
      if (mealType === 'lunch') return lunchRecipes.find(r => r.id === id);
      if (mealType === 'dinner') return dinnerRecipes.find(r => r.id === id);
      return null;
    };

    return weekData.map((day: any) => ({
      ...day,
      meals: {
        breakfast: typeof day.meals.breakfast === 'string' 
          ? getRecipeById(day.meals.breakfast, 'breakfast') 
          : day.meals.breakfast,
        lunch: typeof day.meals.lunch === 'string' 
          ? getRecipeById(day.meals.lunch, 'lunch') 
          : day.meals.lunch,
        dinner: typeof day.meals.dinner === 'string' 
          ? getRecipeById(day.meals.dinner, 'dinner') 
          : day.meals.dinner,
      }
    }));
  };

  // Function to generate shopping list from recipe objects
  const generateShoppingList = (weekData: any[]) => {
    const allIngredients = new Set<string>();
    
    weekData.forEach((day: any) => {
      Object.values(day.meals).forEach((meal: any) => {
        if (meal && typeof meal === 'object' && meal.ingredients) {
          meal.ingredients.forEach((ingredient: any) => {
            allIngredients.add(ingredient.item);
          });
        }
      });
    });
    
    return Array.from(allIngredients).sort();
  };

  useEffect(() => {
    loadMealPlans()
  }, [])

  const loadMealPlans = async () => {
    try {
      setLoading(true)
      const plans = await MealPlanService.getAllMealPlans()
      // Populate recipe objects for each plan and generate shopping lists
      const populatedPlans = plans.map(plan => {
        const populatedWeekData = populateRecipeObjects(plan.week_data);
        const generatedShoppingList = generateShoppingList(populatedWeekData);
        return {
          ...plan,
          week_data: populatedWeekData,
          shopping_list: generatedShoppingList
        };
      });
      setMealPlans(populatedPlans)
    } catch (error) {
      console.error('Error loading meal plans:', error)
      setError('Failed to load meal plans')
    } finally {
      setLoading(false)
    }
  }

  const deleteMealPlan = async (mealPlanId: string) => {
    if (!confirm('Are you sure you want to delete this meal plan?')) {
      return
    }

    try {
      await MealPlanService.deleteMealPlan(mealPlanId)
      // Reload the list
      await loadMealPlans()
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
        <p className="loading-text">Loading your meal plans...</p>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>My Meal Plans - LazyLunch</title>
        <meta name="description" content="View and manage your saved meal plans" />
      </Head>
      
      <div className="dashboard-container">
        {/* Header */}
        <header className="dashboard-header">
          <div className="dashboard-header-content">
            <div className="dashboard-logo">LazyLunch</div>
            <div className="dashboard-nav">
              <Link href="/dashboard" className="dashboard-link">
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </header>

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
                      <h3>Meal Plan</h3>
                      <span className="meal-plan-date">
                        {plan.created_at ? formatDate(plan.created_at) : 'Unknown date'}
                      </span>
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