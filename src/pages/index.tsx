import Head from 'next/head'
import { useState } from 'react'

export default function Home() {
  const [isGenerating, setIsGenerating] = useState(false)

  const generateMealPlan = async () => {
    setIsGenerating(true)
    // TODO: Call API to generate meal plan
    setTimeout(() => setIsGenerating(false), 2000) // Mock loading
  }

  return (
    <>
      <Head>
        <title>LazyMenu - AI-Powered Meal Planning</title>
        <meta name="description" content="Generate weekly dinner meal plans and grocery lists automatically" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <header className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-800 mb-4">
              🍽️ LazyMenu
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Never wonder "what's for dinner?" again. Get AI-powered weekly meal plans 
              and organized grocery lists in seconds.
            </p>
          </header>

          {/* Main CTA */}
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
              Generate Your Meal Plan
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dietary Preferences (Optional)
                </label>
                <select className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>No restrictions</option>
                  <option>Vegetarian</option>
                  <option>Vegan</option>
                  <option>Gluten-free</option>
                  <option>Keto</option>
                  <option>Mediterranean</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Budget Level
                </label>
                <select className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>Budget-friendly</option>
                  <option>Moderate</option>
                  <option>Premium</option>
                </select>
              </div>

              <button
                onClick={generateMealPlan}
                disabled={isGenerating}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-md transition duration-200"
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating your meal plan...
                  </span>
                ) : (
                  '✨ Generate 7-Day Meal Plan'
                )}
              </button>
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center p-6 bg-white rounded-lg shadow-md">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">AI-Powered</h3>
              <p className="text-gray-600">
                Advanced AI creates personalized meal plans based on your preferences and dietary needs.
              </p>
            </div>

            <div className="text-center p-6 bg-white rounded-lg shadow-md">
              <div className="text-4xl mb-4">🛒</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Smart Grocery Lists</h3>
              <p className="text-gray-600">
                Automatically generates organized shopping lists with real supermarket products.
              </p>
            </div>

            <div className="text-center p-6 bg-white rounded-lg shadow-md">
              <div className="text-4xl mb-4">⏰</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Save Time</h3>
              <p className="text-gray-600">
                Eliminate dinner decision fatigue and streamline your weekly meal planning.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  )
} 