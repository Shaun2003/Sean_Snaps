💫 Pictura — Modern Instagram Clone

A polished full-stack social media platform built with Next.js 15 and Supabase, featuring real-time chat, stories, notifications, beautiful UI components, and a fully responsive design.

🚀 Features

🔐 Authentication — Email & password auth with automatic profile creation

👤 User Profiles — Avatar, username, name, and bio customization

🖼️ Posts — Image uploads, captions, likes, comments

🎭 Stories — 24-hour expiring stories (image or text)

💬 Real-time Messaging — Direct messages powered by Supabase Realtime

🔔 Notifications — Likes, comments, follows, real-time updates

🔎 Explore Page — Discover new users & trending posts

🌙 Dark Mode — Light, dark, or system themes

🔒 Private Accounts — Follow requests + protected content

🛠️ Tech Stack
Frontend

Next.js 15

React 19

Tailwind CSS 4

shadcn/ui

SWR (caching & data fetching)

Backend

Supabase (PostgreSQL, Auth, Storage, Realtime)

📦 Prerequisites

Node.js 18+

Supabase project

npm / yarn / pnpm

⚙️ Getting Started
1️⃣ Clone the project
git clone https://github.com/yourusername/pictura.git
cd pictura

2️⃣ Install dependencies
npm install
# or yarn install
# or pnpm install

3️⃣ Configure environment variables

Create .env.local:

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Local auth redirects
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000

4️⃣ Set up the Database

Run the SQL files inside /scripts in order:

001_create_tables.sql – core tables

002_create_profile_trigger.sql – auto-profile creation

003_enable_realtime.sql – realtime events

004_create_storage_bucket.sql – uploads bucket

005_storage_policies.sql – secure file uploads

006_add_private_account.sql – private account support

007_create_notifications.sql – realtime notifications

Run via:

Supabase Dashboard → SQL Editor

Or Supabase CLI:

supabase db push

5️⃣ Run the dev server
npm run dev


Visit 👉 http://localhost:3000

📁 Project Structure
├── app/
│   ├── (main)/              # Auth-protected routes
│   │   ├── feed/            # Home feed
│   │   ├── explore/         # Explore page
│   │   ├── create/          # New post
│   │   ├── messages/        # Direct messaging
│   │   ├── notifications/   # Alerts
│   │   ├── profile/         # User profile
│   │   ├── post/            # Single post view
│   │   ├── settings/        # Account settings
│   │   └── stories/         # Story creation
│   ├── auth/                # Auth pages
│   └── layout.tsx           # Root layout
├── components/
│   ├── explore/
│   ├── feed/
│   ├── layout/
│   ├── messages/
│   ├── notifications/
│   ├── post/
│   ├── profile/
│   ├── providers/
│   ├── settings/
│   ├── stories/
│   └── ui/                  # shadcn components
├── hooks/
├── lib/
│   ├── supabase/
│   ├── notifications.ts
│   └── types.ts
└── scripts/                 # SQL migrations

🗄️ Database Schema
Core Tables
Table	Purpose
profiles	User info (avatar, bio, username, etc.)
posts	Image posts
likes	Post likes
comments	Post comments
stories	24-hour story content
follows	Following relationships
conversations	Messaging conversations
messages	Real-time messages
notifications	Alerts with realtime support
🔍 Feature Breakdown
🔐 Authentication

Supabase Auth

Auto-profile creation

Middleware-protected routes

🖼️ Posts

Upload media

Like & comment

Edit & delete

View individual posts

🎭 Stories

Image & text stories

Auto-expire after 24h

Full-screen viewer

Story navigation

💬 Messaging

Real-time messaging

Conversation previews

Start chats from profiles

🔔 Notifications

Likes

Comments

Follows

Unread badge

🔒 Privacy

Private accounts

Follow requests

Locked content for non-followers

🚀 Deployment
Deploy to Vercel

Steps:

Push repo to GitHub

Import on Vercel

Add environment variables

Deploy 🎉

🤝 Contributing

Contributions are welcome!

git checkout -b feature/amazing-feature
git commit -m "Add amazing feature"
git push origin feature/amazing-feature


Then open a pull request ✔️

📄 License

This project is under the MIT License. See the LICENSE file.

💛 Acknowledgments

Next.js

Supabase

shadcn/ui

Tailwind CSS

Lucide Icons
