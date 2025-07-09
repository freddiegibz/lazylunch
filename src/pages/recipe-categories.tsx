import { useState, useEffect } from 'react'
import { getCategorizedRecipesWithOverrides, MealType, getAvailableRecipeNames } from '../lib/recipe-categories'

export default function RecipeCategories() {
  const [categorizedRecipes, setCategorizedRecipes] = useState<Record<MealType, any[]>>({
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: []
  })

  useEffect(() => {
    const categorized = getCategorizedRecipesWithOverrides()
    setCategorizedRecipes(categorized)
  }, [])

  const mealTypeLabels = {
    breakfast: 'Breakfast',
    lunch: 'Lunch', 
    dinner: 'Dinner',
    snack: 'Snack'
  }

  return (
    <main>
      <section className="features-section">
        <div className="container">
          <h1 className="section-title" style={{textAlign: 'center', marginBottom: '2rem'}}>
            Recipe Categories
          </h1>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: '32px', justifyContent: 'center'}}>
            {Object.entries(categorizedRecipes).map(([mealType, recipes]) => (
              <div key={mealType} className="feature-card" style={{minWidth: 280, flex: '1 1 300px', maxWidth: 350}}>
                <h2 style={{fontSize: '1.25rem', color: 'var(--navy-blue)', fontWeight: 600, marginBottom: 16}}>
                  {mealTypeLabels[mealType as MealType]} 
                  <span style={{fontSize: '0.9rem', color: 'var(--dark-grey)', marginLeft: 8}}>({recipes.length})</span>
                </h2>
                <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
                  {recipes.map((recipe) => (
                    <div key={recipe.id} style={{display: 'flex', alignItems: 'center', gap: 12, background: 'var(--light-grey)', borderRadius: 8, padding: 8}}>
                      <img 
                        src={recipe.image} 
                        alt={recipe.name}
                        style={{width: 48, height: 48, objectFit: 'cover', borderRadius: 6}}
                        onError={(e) => {
                          e.currentTarget.src = '/images/placeholder.png'
                        }}
                      />
                      <div style={{flex: 1, minWidth: 0}}>
                        <h3 style={{fontSize: '1rem', fontWeight: 500, color: 'var(--navy-blue)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                          {recipe.name}
                        </h3>
                        <p style={{fontSize: '0.9rem', color: 'var(--dark-grey)', margin: 0}}>
                          £{recipe.estTotalCost.toFixed(2)} • {recipe.baseServings} serving{recipe.baseServings > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {recipes.length === 0 && (
                  <p style={{color: 'var(--dark-grey)', fontSize: '0.95rem', fontStyle: 'italic', marginTop: 12}}>
                    No recipes available for this meal type
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="features-section">
        <div className="container">
          <h2 className="section-title" style={{marginBottom: '1.5rem'}}>
            Available Recipe Names by Meal Type
          </h2>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: '32px', justifyContent: 'center'}}>
            {Object.entries(mealTypeLabels).map(([mealType, label]) => (
              <div key={mealType} className="feature-card" style={{minWidth: 220, flex: '1 1 220px', maxWidth: 300}}>
                <h3 style={{fontWeight: 600, color: 'var(--navy-blue)', marginBottom: 8}}>{label}</h3>
                <ul style={{fontSize: '0.98rem', color: 'var(--dark-grey)', listStyle: 'disc inside', paddingLeft: 0, margin: 0}}>
                  {getAvailableRecipeNames(mealType as MealType).map((name) => (
                    <li key={name} style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{name}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
} 