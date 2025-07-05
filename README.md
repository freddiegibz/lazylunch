# LazyMenu

A simple SaaS app that generates weekly dinner meal plans and grocery lists, helping users save time and money by removing dinner decision fatigue.

## 🎯 What it does

- **Generates weekly dinner meal plans** automatically using AI
- **Creates grocery lists** matching those meals to real supermarket products
- **Saves time and money** by eliminating dinner decision fatigue
- **Streamlines shopping** with organized ingredient lists

## ✨ Core Features (MVP)

- **User Preferences**: Optional inputs (vegan, budget meals, dietary restrictions)
- **AI Meal Planning**: Uses OpenAI GPT-4o to generate 7-day dinner plans
- **Smart Grocery Mapping**: Maps recipe ingredients to real SKU grocery items
- **Clean Interface**: Displays meal plans and grocery lists in an intuitive web app
- **Subscription Model**: Monthly payments via Stripe for full access
- **Future Mobile App**: Expo React Native wrapper for iOS/Android

## 🛠 Technical Stack

- **Frontend**: Next.js (React framework)
- **Backend**: Next.js API routes
- **Database**: (To be determined)
- **AI**: OpenAI GPT-4o for meal plan generation
- **Payments**: Stripe integration
- **Hosting**: Vercel
- **Mobile**: Expo React Native + WebView (future)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- OpenAI API key
- Stripe account

### Installation

```bash
# Clone the repository
git clone https://github.com/freddiegibz/lazylunch.git
cd lazylunch

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run the development server
npm run dev
```

## 📋 Development Roadmap

### Phase 1: MVP Core Features
- [ ] Backend route for OpenAI meal plan generation
- [ ] Frontend page to display meal plans
- [ ] Hard-coded SKU mapping for grocery items (demo)
- [ ] User authentication (to be implemented)
- [ ] Basic Stripe integration

### Phase 2: Enhanced Features
- [ ] Advanced SKU mapping
- [ ] User preference management
- [ ] Meal plan history
- [ ] Enhanced UI/UX

### Phase 3: Mobile & Scaling
- [ ] Mobile app development
- [ ] Advanced grocery store integrations
- [ ] Social features

## 🔑 Environment Variables

```env
OPENAI_API_KEY=your_openai_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

## 📖 Problem & Solution

**Problem**: People hate deciding "what's for dinner" every night, leading to stress, food waste, and poor dietary choices.

**Solution**: Automated meal planning that saves time, reduces waste, and streamlines the entire dinner planning and shopping process.

## 📱 Future Vision

LazyMenu will become the go-to solution for dinner planning, eventually expanding to:
- Multiple meal types (breakfast, lunch)
- Advanced dietary optimization
- Smart kitchen inventory management
- Direct grocery delivery integration

## 🤝 Contributing

This is currently a private project in development. Contributing guidelines will be added once the MVP is complete.

## 📄 License

All rights reserved. 