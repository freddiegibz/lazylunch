import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import { MealPlanService, MealPlan } from '../../lib/meal-plan-service'
import recipes from '../../lib/dinner.json'
import { getRecipesByMealTypeWithOverrides, MealType } from '../../lib/recipe-categories'

export default function MealPlanDetail() {
  const [mealPlan, setMealPlan] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showShoppingList, setShowShoppingList] = useState(false)
  const [currentDayIndex, setCurrentDayIndex] = useState(0)
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0) // 0 = ingredients, 1 = instructions
  const router = useRouter()
  const { id } = router.query

  // Function to find recipe by name and meal type
  const findRecipeByName = (mealName: string, mealType: MealType) => {
    const categorizedRecipes = getRecipesByMealTypeWithOverrides(mealType)
    return categorizedRecipes.find(recipe => 
      recipe.name.toLowerCase().includes(mealName.toLowerCase()) ||
      mealName.toLowerCase().includes(recipe.name.toLowerCase())
    )
  }

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

            <div className="weekly-meal-plan">
              <div className="day-navigation">
                {mealPlan.week.map((day: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => setCurrentDayIndex(index)}
                    className={`day-tab ${currentDayIndex === index ? 'active' : ''}`}
                  >
                    <span className="day-name">{day.day}</span>
                    <span className="day-number">{index + 1}</span>
                  </button>
                ))}
              </div>

              <div className="current-day-content">
                <div className="day-header">
                  <h3 className="current-day-title">
                    {mealPlan.week[currentDayIndex].day}
                  </h3>
                  <div className="day-navigation-arrows">
                    <button
                      onClick={() => setCurrentDayIndex(Math.max(0, currentDayIndex - 1))}
                      disabled={currentDayIndex === 0}
                      className="nav-arrow"
                    >
                      ←
                    </button>
                    <span className="day-counter">
                      {currentDayIndex + 1} of {mealPlan.week.length}
                    </span>
                    <button
                      onClick={() => setCurrentDayIndex(Math.min(mealPlan.week.length - 1, currentDayIndex + 1))}
                      disabled={currentDayIndex === mealPlan.week.length - 1}
                      className="nav-arrow"
                    >
                      →
                    </button>
                  </div>
                </div>

                <div className="meals-container">
                  {(() => {
                    const breakfastRecipe = findRecipeByName(mealPlan.week[currentDayIndex].meals.breakfast, 'breakfast')
                    return (
                      <div className="meal-card" onClick={() => {
                        if (selectedMeal === 'breakfast') {
                          setSelectedMeal(null)
                          setCurrentPage(0)
                        } else {
                          setSelectedMeal('breakfast')
                          setCurrentPage(0)
                        }
                      }} data-expanded={selectedMeal === 'breakfast'}>
                        <div className="meal-header">
                          <div className="meal-header-left">
                            <span className="meal-icon">🌅</span>
                            <h4 className="meal-title">Breakfast</h4>
                          </div>
                          <span className="meal-arrow">▼</span>
                        </div>
                        <div className="meal-content">
                          <p className="meal-description">
                            {mealPlan.week[currentDayIndex].meals.breakfast}
                          </p>
                          {breakfastRecipe && (
                            <div className="recipe-image">
                              <Image 
                                src={breakfastRecipe.image} 
                                alt={breakfastRecipe.name}
                                width={200}
                                height={150}
                                style={{ objectFit: 'cover' }}
                              />
                            </div>
                          )}
                        </div>
                        {selectedMeal === 'breakfast' && breakfastRecipe && (
                          <div className="meal-book">
                            <div className="book-header">
                              <h5 className="book-title">{breakfastRecipe.name}</h5>
                              <div className="page-indicator">
                                <span className={`page-dot ${currentPage === 0 ? 'active' : ''}`}></span>
                                <span className={`page-dot ${currentPage === 1 ? 'active' : ''}`}></span>
                              </div>
                            </div>
                            <div className="book-content">
                              <div className={`book-page ${currentPage === 0 ? 'active' : ''}`}>
                                <h6>Ingredients</h6>
                                <ul>
                                  {breakfastRecipe.ingredients.map((ingredient, index) => (
                                    <li key={index}>
                                      <strong>{ingredient.qty}</strong> {ingredient.item}
                                      {ingredient.allergens.length > 0 && (
                                        <span className="allergen-tag">
                                          ({ingredient.allergens.join(', ')})
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                                <div className="recipe-info">
                                  <p><strong>Servings:</strong> {breakfastRecipe.baseServings}</p>
                                  <p><strong>Total Cost:</strong> £{breakfastRecipe.estTotalCost}</p>
                                  <div className="recipe-tags">
                                    {breakfastRecipe.tags.map((tag, index) => (
                                      <span key={index} className="tag">{tag}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className={`book-page ${currentPage === 1 ? 'active' : ''}`}>
                                <h6>Instructions</h6>
                                <ol>
                                  {breakfastRecipe.steps.map((step, index) => (
                                    <li key={index}>{step}</li>
                                  ))}
                                </ol>
                              </div>
                            </div>
                            <div className="book-navigation">
                              <button 
                                className="page-nav-btn" 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setCurrentPage(Math.max(0, currentPage - 1))
                                }}
                                disabled={currentPage === 0}
                              >
                                ← Previous
                              </button>
                              <button 
                                className="page-nav-btn" 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setCurrentPage(Math.min(1, currentPage + 1))
                                }}
                                disabled={currentPage === 1}
                              >
                                Next →
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {(() => {
                    const lunchRecipe = findRecipeByName(mealPlan.week[currentDayIndex].meals.lunch, 'lunch')
                    return (
                      <div className="meal-card" onClick={() => {
                        if (selectedMeal === 'lunch') {
                          setSelectedMeal(null)
                          setCurrentPage(0)
                        } else {
                          setSelectedMeal('lunch')
                          setCurrentPage(0)
                        }
                      }} data-expanded={selectedMeal === 'lunch'}>
                        <div className="meal-header">
                          <div className="meal-header-left">
                            <span className="meal-icon">☀️</span>
                            <h4 className="meal-title">Lunch</h4>
                          </div>
                          <span className="meal-arrow">▼</span>
                        </div>
                        <div className="meal-content">
                          <p className="meal-description">
                            {mealPlan.week[currentDayIndex].meals.lunch}
                          </p>
                          {lunchRecipe && (
                            <div className="recipe-image">
                              <Image 
                                src={lunchRecipe.image} 
                                alt={lunchRecipe.name}
                                width={200}
                                height={150}
                                style={{ objectFit: 'cover' }}
                              />
                            </div>
                          )}
                        </div>
                        {selectedMeal === 'lunch' && lunchRecipe && (
                          <div className="meal-book">
                            <div className="book-header">
                              <h5 className="book-title">{lunchRecipe.name}</h5>
                              <div className="page-indicator">
                                <span className={`page-dot ${currentPage === 0 ? 'active' : ''}`}></span>
                                <span className={`page-dot ${currentPage === 1 ? 'active' : ''}`}></span>
                              </div>
                            </div>
                            <div className="book-content">
                              <div className={`book-page ${currentPage === 0 ? 'active' : ''}`}>
                                <h6>Ingredients</h6>
                                <ul>
                                  {lunchRecipe.ingredients.map((ingredient, index) => (
                                    <li key={index}>
                                      <strong>{ingredient.qty}</strong> {ingredient.item}
                                      {ingredient.allergens.length > 0 && (
                                        <span className="allergen-tag">
                                          ({ingredient.allergens.join(', ')})
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                                <div className="recipe-info">
                                  <p><strong>Servings:</strong> {lunchRecipe.baseServings}</p>
                                  <p><strong>Total Cost:</strong> £{lunchRecipe.estTotalCost}</p>
                                  <div className="recipe-tags">
                                    {lunchRecipe.tags.map((tag, index) => (
                                      <span key={index} className="tag">{tag}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className={`book-page ${currentPage === 1 ? 'active' : ''}`}>
                                <h6>Instructions</h6>
                                <ol>
                                  {lunchRecipe.steps.map((step, index) => (
                                    <li key={index}>{step}</li>
                                  ))}
                                </ol>
                              </div>
                            </div>
                            <div className="book-navigation">
                              <button 
                                className="page-nav-btn" 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setCurrentPage(Math.max(0, currentPage - 1))
                                }}
                                disabled={currentPage === 0}
                              >
                                ← Previous
                              </button>
                              <button 
                                className="page-nav-btn" 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setCurrentPage(Math.min(1, currentPage + 1))
                                }}
                                disabled={currentPage === 1}
                              >
                                Next →
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {(() => {
                    const dinnerRecipe = findRecipeByName(mealPlan.week[currentDayIndex].meals.dinner, 'dinner')
                    return (
                      <div className="meal-card" onClick={() => {
                        if (selectedMeal === 'dinner') {
                          setSelectedMeal(null)
                          setCurrentPage(0)
                        } else {
                          setSelectedMeal('dinner')
                          setCurrentPage(0)
                        }
                      }} data-expanded={selectedMeal === 'dinner'}>
                        <div className="meal-header">
                          <div className="meal-header-left">
                            <span className="meal-icon">🌙</span>
                            <h4 className="meal-title">Dinner</h4>
                          </div>
                          <span className="meal-arrow">▼</span>
                        </div>
                        <div className="meal-content">
                          <p className="meal-description">
                            {mealPlan.week[currentDayIndex].meals.dinner}
                          </p>
                          {dinnerRecipe && (
                            <div className="recipe-image">
                              <Image 
                                src={dinnerRecipe.image} 
                                alt={dinnerRecipe.name}
                                width={200}
                                height={150}
                                style={{ objectFit: 'cover' }}
                              />
                            </div>
                          )}
                        </div>
                        {selectedMeal === 'dinner' && dinnerRecipe && (
                          <div className="meal-book">
                            <div className="book-header">
                              <h5 className="book-title">{dinnerRecipe.name}</h5>
                              <div className="page-indicator">
                                <span className={`page-dot ${currentPage === 0 ? 'active' : ''}`}></span>
                                <span className={`page-dot ${currentPage === 1 ? 'active' : ''}`}></span>
                              </div>
                            </div>
                            <div className="book-content">
                              <div className={`book-page ${currentPage === 0 ? 'active' : ''}`}>
                                <h6>Ingredients</h6>
                                <ul>
                                  {dinnerRecipe.ingredients.map((ingredient, index) => (
                                    <li key={index}>
                                      <strong>{ingredient.qty}</strong> {ingredient.item}
                                      {ingredient.allergens.length > 0 && (
                                        <span className="allergen-tag">
                                          ({ingredient.allergens.join(', ')})
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                                <div className="recipe-info">
                                  <p><strong>Servings:</strong> {dinnerRecipe.baseServings}</p>
                                  <p><strong>Total Cost:</strong> £{dinnerRecipe.estTotalCost}</p>
                                  <div className="recipe-tags">
                                    {dinnerRecipe.tags.map((tag, index) => (
                                      <span key={index} className="tag">{tag}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className={`book-page ${currentPage === 1 ? 'active' : ''}`}>
                                <h6>Instructions</h6>
                                <ol>
                                  {dinnerRecipe.steps.map((step, index) => (
                                    <li key={index}>{step}</li>
                                  ))}
                                </ol>
                              </div>
                            </div>
                            <div className="book-navigation">
                              <button 
                                className="page-nav-btn" 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setCurrentPage(Math.max(0, currentPage - 1))
                                }}
                                disabled={currentPage === 0}
                              >
                                ← Previous
                              </button>
                              <button 
                                className="page-nav-btn" 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setCurrentPage(Math.min(1, currentPage + 1))
                                }}
                                disabled={currentPage === 1}
                              >
                                Next →
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>
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

      <style jsx>{`
        .dashboard-container {
          min-height: 100vh;
          background: linear-gradient(135deg, var(--light-grey) 0%, var(--white) 100%);
          font-family: 'Inter', sans-serif;
        }

        .dashboard-header {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--border-grey);
          padding: 1rem 0;
        }

        .dashboard-header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .dashboard-logo {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--navy-blue);
        }

        .dashboard-nav {
          display: flex;
          gap: 1rem;
        }

        .dashboard-link {
          color: var(--navy-blue);
          text-decoration: none;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          transition: background-color 0.3s;
        }

        .dashboard-link:hover {
          background: rgba(44, 62, 80, 0.1);
        }

        .dashboard-main {
          padding: 2rem 0;
        }

        .dashboard-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
        }

        .dashboard-title {
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--navy-blue);
          margin-bottom: 0.5rem;
        }

        .dashboard-subtitle {
          font-size: 1.1rem;
          color: var(--dark-grey);
          margin-bottom: 2rem;
        }

        .meal-plan-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .meal-plan-actions {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .dashboard-card-button {
          background-color: var(--pastel-green);
          color: var(--navy-blue);
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.3s;
        }

        .dashboard-card-button:hover {
          background-color: #9BC8AB;
          transform: translateY(-2px);
        }

        .weekly-meal-plan {
          background: var(--white);
          border: 1px solid var(--border-grey);
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 2rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .day-navigation {
          display: flex;
          background: var(--light-grey);
          border-bottom: 1px solid var(--border-grey);
        }

        .day-tab {
          flex: 1;
          background: none;
          border: none;
          color: var(--dark-grey);
          padding: 1rem;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
        }

        .day-tab:hover {
          background: rgba(168, 213, 186, 0.2);
          color: var(--navy-blue);
        }

        .day-tab.active {
          background: var(--pastel-green);
          color: var(--navy-blue);
          border-bottom: 3px solid var(--navy-blue);
        }

        .day-name {
          font-size: 0.9rem;
          font-weight: 500;
        }

        .day-number {
          font-size: 1.2rem;
          font-weight: 700;
        }

        .current-day-content {
          padding: 2rem;
        }

        .day-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .current-day-title {
          font-size: 2rem;
          font-weight: 700;
          color: var(--navy-blue);
          margin: 0;
        }

        .day-navigation-arrows {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .nav-arrow {
          background: var(--pastel-green);
          border: none;
          color: var(--navy-blue);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 1.2rem;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nav-arrow:hover:not(:disabled) {
          background: #9BC8AB;
          transform: scale(1.1);
        }

        .nav-arrow:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .day-counter {
          color: var(--dark-grey);
          font-size: 0.9rem;
          font-weight: 500;
        }

        .meals-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .meal-card {
          background: var(--white);
          border: 1px solid var(--border-grey);
          border-radius: 12px;
          padding: 1.5rem;
          transition: all 0.3s;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .meal-card:hover {
          background: var(--light-grey);
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        .meal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .meal-header-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .meal-icon {
          font-size: 1.5rem;
        }

        .meal-title {
          font-size: 1.3rem;
          font-weight: 600;
          color: var(--navy-blue);
          margin: 0;
        }

        .meal-arrow {
          color: var(--dark-grey);
          font-size: 0.9rem;
          transition: transform 0.3s;
        }

        .meal-card[data-expanded="true"] .meal-arrow {
          transform: rotate(180deg);
        }

        .meal-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .meal-description {
          color: var(--dark-grey);
          line-height: 1.6;
          margin: 0;
        }

        .recipe-image {
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .meal-book {
          margin-top: 1.5rem;
          padding: 1.5rem;
          background: var(--light-grey);
          border-radius: 12px;
          border: 1px solid var(--border-grey);
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .book-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border-grey);
        }

        .book-title {
          color: var(--navy-blue);
          font-size: 1.2rem;
          font-weight: 600;
          margin: 0;
        }

        .page-indicator {
          display: flex;
          gap: 0.5rem;
        }

        .page-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--border-grey);
          transition: all 0.3s;
        }

        .page-dot.active {
          background: var(--navy-blue);
          transform: scale(1.2);
        }

        .book-content {
          position: relative;
          min-height: 200px;
          margin-bottom: 1.5rem;
        }

        .book-page {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          opacity: 0;
          transform: translateX(100%);
          transition: all 0.4s ease-in-out;
          pointer-events: none;
        }

        .book-page.active {
          opacity: 1;
          transform: translateX(0);
          pointer-events: all;
        }

        .book-page h6 {
          color: var(--navy-blue);
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .book-page ul,
        .book-page ol {
          color: var(--dark-grey);
          line-height: 1.6;
          margin: 0;
          padding-left: 1.5rem;
        }

        .book-page li {
          margin-bottom: 0.5rem;
        }

        .allergen-tag {
          color: var(--soft-coral);
          font-size: 0.8rem;
          font-style: italic;
        }

        .recipe-info {
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-grey);
        }

        .recipe-info p {
          margin-bottom: 0.5rem;
          color: var(--dark-grey);
        }

        .recipe-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .tag {
          background: var(--pastel-green);
          color: var(--navy-blue);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .book-navigation {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1rem;
          border-top: 1px solid var(--border-grey);
        }

        .page-nav-btn {
          background: var(--pastel-green);
          color: var(--navy-blue);
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.3s;
        }

        .page-nav-btn:hover:not(:disabled) {
          background: #9BC8AB;
          transform: translateY(-1px);
        }

        .page-nav-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .shopping-list-section {
          background: var(--white);
          border: 1px solid var(--border-grey);
          border-radius: 12px;
          padding: 1.5rem;
          margin-top: 2rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .shopping-list-section h3 {
          color: var(--navy-blue);
          margin-bottom: 1rem;
          font-size: 1.3rem;
        }

        .shopping-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1rem;
        }

        .shopping-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: var(--light-grey);
          border-radius: 8px;
          color: var(--dark-grey);
        }

        .shopping-item input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: var(--navy-blue);
        }

        .shopping-item label {
          cursor: pointer;
          flex: 1;
        }

        .loading-container {
          min-height: 100vh;
          background: linear-gradient(135deg, var(--light-grey) 0%, var(--white) 100%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          color: var(--navy-blue);
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid var(--border-grey);
          border-top: 4px solid var(--navy-blue);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loading-text {
          font-size: 1.1rem;
          color: var(--dark-grey);
        }

        .error-message {
          background: rgba(242, 140, 140, 0.1);
          border: 1px solid var(--soft-coral);
          color: var(--navy-blue);
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        @media (max-width: 768px) {
          .dashboard-header-content {
            padding: 0 1rem;
          }

          .dashboard-content {
            padding: 0 1rem;
          }

          .dashboard-title {
            font-size: 2rem;
          }

          .meal-plan-header {
            flex-direction: column;
            align-items: stretch;
          }

          .meal-plan-actions {
            justify-content: center;
          }

          .day-navigation {
            flex-wrap: wrap;
          }

          .day-tab {
            min-width: 80px;
            padding: 0.75rem 0.5rem;
          }

          .day-name {
            font-size: 0.8rem;
          }

          .day-number {
            font-size: 1rem;
          }

          .current-day-content {
            padding: 1rem;
          }

          .current-day-title {
            font-size: 1.5rem;
          }

          .day-header {
            flex-direction: column;
            align-items: stretch;
            text-align: center;
          }

          .meals-container {
            grid-template-columns: 1fr;
          }

          .shopping-list {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  )
} 