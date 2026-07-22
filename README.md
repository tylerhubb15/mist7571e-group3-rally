# Rally — Tennis Partner Finder

MIST 7571E Group Project · Group 3
Melanie Burlew · Matt Holliday · Tyler Hubbard · Guillermo Ledezma · Tearra Perkins · Tabatha Renfroe

**Live app:** https://rally-team3-mist7571e.netlify.app

Rally is a full-stack web application designed to help recreational tennis players discover compatible partners, coordinate matches, and prepare for play with AI-assisted guidance. Built as a collaborative project for a graduate-level software development course, the app combines modern frontend development, cloud-based data services, and lightweight AI integration into a polished user experience.

# Project Description:

It is a React/Vite app that is geared toward tennis players in order to help them find compatible partners in their area, or an area they designate within the app. 
The core goal of this app is to allow users to input their skill level and their goals in order to match them with the appropriate partners, whether that be as a coach, mentor, or just someone with the same level of skill and experience. The product experience centers on connection, planning, and preparation—helping users move from discovery to a real match in a few intuitive steps.

# Key Features:

- Secure authentication and user profile setup
- Match discovery based on player compatibility
- Session proposals and calendar-style match management
- Messaging and conversation threads between players
- Match history tracking and result logging
- AI-generated coaching insights for pre-match preparation

# Component Hierarchy

The application is organized around a main app shell with focused feature modules:

```text
App
├── Auth
├── AuthedApp
│   ├── Discover
│   ├── CourtsMap
│   ├── Messages
│   ├── CalendarView
│   ├── AICoach
│   ├── Profile
│   ├── ProposeModal
│   └── MatchHistoryModal
└── Shared
```

# API Integrations Used

Rally uses several external services to provide a more complete product experience:

- Supabase for authentication, profiles, sessions, message history, and match data
- Google Maps for location-based court discovery
- OpenAI through Netlify Functions for AI-powered coaching support
- Netlify deployment configuration for hosting and serverless functions

# Local Setup Instruction

```bash
npm install
```

### Environment Variables

Create a .env file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

For the AI feature, configure the environment variable for the Netlify function runtime:

```env
OPENAI_API_KEY=your_openai_api_key
```

### Database Setup

The project includes SQL assets for schema and sample data:

- supabase/schema.sql
- supabase/seed-demo-players.sql
- supabase/seed-match-history.sql

Apply these scripts in your Supabase project before running the app.

### Run Locally

Start the frontend:

```bash
npm run dev
```

Then open:

```text
http://localhost:5173
```

To test the AI function locally, you can also run:

```bash
npx netlify dev
```

### Build for Production

```bash
npm run build
```
