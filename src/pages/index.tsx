import Head from 'next/head'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index)
  }



  const faqs = [
    {
      question: "How does LazyLunch create personalized meal plans?",
      answer: "Our AI analyzes your family size, budget, dietary preferences, and cooking time to generate weekly meal plans that fit your lifestyle perfectly."
    },
    {
      question: "Can I customize the meal plans after generation?",
      answer: "Yes! All plans come with revision options. Basic plans include 2 revisions, Standard plans include 5 revisions, and Premium plans include 10 revisions."
    },
    {
      question: "Do you provide grocery lists with the meal plans?",
      answer: "Absolutely! Every meal plan comes with a detailed grocery list organized by category, making your shopping trip efficient and stress-free."
    }
  ]

  const testimonials = [
    {
      name: "Sarah M.",
      role: "Mom of 3",
      text: "LazyLunch saved me $200 on groceries last month! The meal planning is genius.",
      rating: 5
    },
    {
      name: "Emma L.",
      role: "Busy Parent",
      text: "No more dinner stress. My family loves the variety and I love the savings!",
      rating: 5
    },
    {
      name: "Tom W.",
      role: "Dad of 2",
      text: "The grocery lists are perfect. I save money and time shopping every week.",
      rating: 5
    }
  ]

  return (
    <>
      <Head>
        <title>LazyLunch - Never Wonder What's For Dinner Again</title>
        <meta name="description" content="LazyLunch plans your family meals for the week within your budget in seconds. AI-powered meal planning for busy families." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen">
        {/* Navigation Header */}
        <header className="nav-header">
          <div className="nav-container">
            <Link href="/" className="nav-logo">
              LazyLunch
            </Link>
            <nav className="nav-menu">
              <Link href="/signin" className="nav-link">
                Sign In
              </Link>
              <Link href="/signup" className="nav-button">
                Sign Up
              </Link>
            </nav>
          </div>
        </header>



        {/* Hero Section */}
        <section className="hero-section">
          <div className="container">
            <div className="hero-content">
              <div className={`hero-text ${isVisible ? 'fade-in' : ''}`}>
                <h1 className="hero-headline">
                  Never Wonder What's For Dinner Again
                </h1>
                <p className="hero-subheadline">
                  LazyLunch plans your family meals for the week within your budget in seconds.
                </p>
                <div className="hero-stats">
                  <div className="stat-item">
                    <span className="stat-number">300+</span>
                    <span className="stat-label">Happy Families</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">$150</span>
                    <span className="stat-label">Avg. Monthly Savings</span>
                  </div>
                </div>
                <div className="hero-cta">
                  <button className="primary-cta animate-hover">
                    Generate My Meal Plan
                  </button>
                  <a href="#example" className="secondary-cta">
                    See Example Plan
                  </a>
                </div>
              </div>
              <div className={`hero-illustration ${isVisible ? 'slide-in' : ''}`}>
                <Image
                  src="/herosectionmomwchildren.png"
                  alt="Friendly mum at kitchen table with phone planning meals"
                  width={500}
                  height={400}
                  className="hero-image"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="features-section">
          <div className="container">
            <div className="features-grid">
              <div className="feature-card animate-card">
                <div className="feature-icon">
                  <Image
                    src="/familyicon.png"
                    alt="Family icon"
                    width={80}
                    height={80}
                    className="feature-image"
                  />
                </div>
                <h3>Plans meals for your whole family</h3>
              </div>
              <div className="feature-card animate-card">
                <div className="feature-icon">
                  <Image
                    src="/walleticon.png"
                    alt="Budget icon"
                    width={80}
                    height={80}
                    className="feature-image"
                  />
                </div>
                <h3>Fits your weekly grocery budget</h3>
                <p className="feature-highlight">Save up to $150/month on groceries</p>
              </div>
              <div className="feature-card animate-card">
                <div className="feature-icon">
                  <Image
                    src="/stress.png"
                    alt="Stress-free icon"
                    width={80}
                    height={80}
                    className="feature-image"
                  />
                </div>
                <h3>Reduces dinner stress instantly</h3>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="how-it-works-section">
          <div className="container">
            <h2 className="section-title">How It Works</h2>
            <div className="steps-grid">
              <div className="step-card animate-step">
                <div className="step-number">1</div>
                <h3>Enter family size and budget</h3>
                <p>Tell us how many people you're cooking for and your weekly grocery budget.</p>
              </div>
              <div className="step-card animate-step">
                <div className="step-number">2</div>
                <h3>Get AI-generated weekly meal plan</h3>
                <p>Our AI creates a personalized 7-day meal plan tailored to your preferences.</p>
              </div>
              <div className="step-card animate-step">
                <div className="step-number">3</div>
                <h3>Shop confidently with your grocery list</h3>
                <p>Get an organized grocery list with everything you need for the week.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="testimonials-section">
          <div className="container">
            <h2 className="section-title">What Our Families Say</h2>
            <div className="testimonials-grid">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="testimonial-card animate-card">
                  <div className="testimonial-rating">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <span key={i} className="star">⭐</span>
                    ))}
                  </div>
                  <p className="testimonial-text">"{testimonial.text}"</p>
                  <div className="testimonial-author">
                    <strong>{testimonial.name}</strong>
                    <span>{testimonial.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="pricing-section">
          <div className="container">
            <h2 className="section-title">Simple Pricing</h2>
            <div className="pricing-grid">
              <div className="pricing-card animate-card">
                <h3>Basic</h3>
                <div className="price">$5<span>/mo</span></div>
                <ul>
                  <li>Weekly meal plan</li>
                  <li>Grocery list</li>
                  <li>2 revisions</li>
                </ul>
                <button className="pricing-cta animate-hover">Start Free Trial</button>
              </div>
              <div className="pricing-card featured animate-card">
                <h3>Standard</h3>
                <div className="price">$10<span>/mo</span></div>
                <ul>
                  <li>Everything in Basic</li>
                  <li>Dietary filters</li>
                  <li>Guest plans</li>
                  <li>5 revisions</li>
                </ul>
                <button className="pricing-cta featured animate-hover">Start Free Trial</button>
              </div>
              <div className="pricing-card animate-card">
                <h3>Premium</h3>
                <div className="price">$20<span>/mo</span></div>
                <ul>
                  <li>Everything in Standard</li>
                  <li>Unlimited guest plans</li>
                  <li>10 revisions</li>
                  <li>Priority support</li>
                </ul>
                <button className="pricing-cta animate-hover">Start Free Trial</button>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="faq-section">
          <div className="container">
            <h2 className="section-title">Frequently Asked Questions</h2>
            <div className="faq-list">
              {faqs.map((faq, index) => (
                <div key={index} className="faq-item animate-card">
                  <button 
                    className="faq-question"
                    onClick={() => toggleFAQ(index)}
                  >
                    {faq.question}
                    <span className={`faq-toggle ${expandedFAQ === index ? 'expanded' : ''}`}>
                      {expandedFAQ === index ? '−' : '+'}
                    </span>
                  </button>
                  {expandedFAQ === index && (
                    <div className="faq-answer">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer">
          <div className="container">
            <div className="footer-content">
              <div className="footer-brand">
                <h3>LazyLunch</h3>
                <p>Dinner decisions solved in seconds.</p>
              </div>
              <div className="footer-links">
                <a href="/terms">Terms</a>
                <a href="/privacy">Privacy</a>
                <a href="/contact">Contact</a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </>
  )
} 