import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { MealPlanService } from '../lib/meal-plan-service'

// Static meal plan data for testing
const sampleMealPlan = {
  week: [
    {
      day: 'Monday',
      meals: {
        breakfast: 'Oatmeal with berries and honey',
        lunch: 'Grilled chicken salad with mixed greens',
        dinner: 'Baked salmon with roasted vegetables'
      }
    },
    {
      day: 'Tuesday',
      meals: {
        breakfast: 'Greek yogurt with granola and banana',
        lunch: 'Turkey and avocado sandwich',
        dinner: 'Spaghetti with meatballs and marinara'
      }
    },
    {
      day: 'Wednesday',
      meals: {
        breakfast: 'Scrambled eggs with whole grain toast',
        lunch: 'Quinoa bowl with roasted chickpeas',
        dinner: 'Beef stir-fry with brown rice'
      }
    },
    {
      day: 'Thursday',
      meals: {
        breakfast: 'Smoothie bowl with tropical fruits',
        lunch: 'Tuna salad with crackers',
        dinner: 'Chicken fajitas with tortillas'
      }
    },
    {
      day: 'Friday',
      meals: {
        breakfast: 'Pancakes with maple syrup',
        lunch: 'Caesar salad with grilled shrimp',
        dinner: 'Pizza with homemade dough'
      }
    },
    {
      day: 'Saturday',
      meals: {
        breakfast: 'French toast with berries',
        lunch: 'BLT sandwich with chips',
        dinner: 'Grilled steak with mashed potatoes'
      }
    },
    {
      day: 'Sunday',
      meals: {
        breakfast: 'Eggs benedict with hollandaise',
        lunch: 'Soup and grilled cheese',
        dinner: 'Roast chicken with vegetables'
      }
    }
  ],
  shoppingList: [
    'Chicken breast',
    'Salmon fillets',
    'Ground beef',
    'Eggs',
    'Milk',
    'Greek yogurt',
    'Oatmeal',
    'Bread',
    'Tortillas',
    'Rice',
    'Pasta',
    'Mixed greens',
    'Tomatoes',
    'Onions',
    'Bell peppers',
    'Carrots',
    'Broccoli',
    'Bananas',
    'Berries',
    'Cheese',
    'Butter',
    'Olive oil',
    'Salt and pepper'
  ]
}

export default function GenerateMealPlan() {
  const [loading, setLoading] = useState(false)
  const [mealPlan, setMealPlan] = useState<any>(null)
  const [showShoppingList, setShowShoppingList] = useState(false)
  const router = useRouter()

  const generateMealPlan = async () => {
    setLoading(true)
    
    try {
      // Simulate API call delay
      setTimeout(async () => {
        try {
          // Save the meal plan to Supabase
          const savedMealPlan = await MealPlanService.saveMealPlan(
            sampleMealPlan.week,
            sampleMealPlan.shoppingList
          )
          
          if (savedMealPlan) {
            setMealPlan({
              ...sampleMealPlan,
              id: savedMealPlan.id,
              created_at: savedMealPlan.created_at
            })
          }
        } catch (error) {
          console.error('Error saving meal plan:', error)
          // Still show the meal plan even if saving fails
          setMealPlan(sampleMealPlan)
        }
        setLoading(false)
      }, 2000)
    } catch (error) {
      console.error('Error generating meal plan:', error)
      setLoading(false)
    }
  }

  const downloadMealPlan = () => {
    // Create a simple text version for download
    let content = 'LazyLunch Weekly Meal Plan\n\n'
    
    sampleMealPlan.week.forEach(day => {
      content += `${day.day}:\n`
      content += `  Breakfast: ${day.meals.breakfast}\n`
      content += `  Lunch: ${day.meals.lunch}\n`
      content += `  Dinner: ${day.meals.dinner}\n\n`
    })
    
    content += 'Shopping List:\n'
    sampleMealPlan.shoppingList.forEach(item => {
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

  return (
    <>
      <Head>
        <title>Generate Meal Plan - LazyLunch</title>
        <meta name="description" content="Generate your personalized weekly meal plan" />
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
              Generate Your Weekly Meal Plan
            </h2>
            <p className="dashboard-subtitle">
              Get a personalized meal plan tailored to your preferences and dietary needs.
            </p>

            {!mealPlan && (
              <div className="meal-plan-generator">
                <div className="generator-card">
                  <h3>Ready to get started?</h3>
                  <p>Click the button below to generate your weekly meal plan with delicious, family-friendly recipes.</p>
                  
                  <button
                    onClick={generateMealPlan}
                    disabled={loading}
                    className="auth-button"
                    style={{ marginTop: '20px' }}
                  >
                    {loading ? 'Generating Meal Plan...' : 'Generate Meal Plan'}
                  </button>
                </div>
              </div>
            )}

            {loading && (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p className="loading-text">Creating your personalized meal plan...</p>
              </div>
            )}

            {mealPlan && (
              <div className="meal-plan-results">
                <div className="meal-plan-header">
                  <h3>Your Weekly Meal Plan</h3>
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
            )}
          </div>
        </main>
      </div>
    </>
  )
} 