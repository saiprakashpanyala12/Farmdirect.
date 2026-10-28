# 🌱 FarmDirect

### Connecting Farmers Directly with Consumers

FarmDirect is an online agricultural marketplace designed to connect farmers directly with households, restaurants, retailers, and wholesalers. It aims to simplify the process of discovering and purchasing fresh agricultural produce while helping farmers reach customers without unnecessary intermediaries.

## 🚀 Overview

Traditional agricultural supply chains can involve multiple intermediaries between farmers and consumers. FarmDirect aims to bridge this gap by providing a digital platform where farmers can showcase their produce and customers can discover products and place orders.

The platform is designed to support different user roles and provide a convenient marketplace experience for both sellers and buyers.

## ✨ Key Features

- **Farmer Marketplace:** Farmers can list and manage their agricultural products.
- **Product Discovery:** Customers can browse available produce and explore product listings.
- **Multiple Customer Types:** Designed for households, restaurants, retailers, and wholesalers.
- **Product Management:** Supports managing product information and availability.
- **Shopping Experience:** Customer-facing features for discovering products and managing shopping activities.
- **Farmer Dashboard:** A dedicated space for farmers to manage their marketplace activities.
- **Supabase Integration:** Backend services for authentication, database operations, and product image storage.
- **Responsive Interface:** Designed to provide a user-friendly experience across different screen sizes.

*Note: Features may vary depending on the current implementation and deployment status.*

## 🎯 Project Goals

- Help farmers connect directly with potential buyers.
- Improve access to agricultural products through an online marketplace.
- Simplify product discovery and ordering.
- Support business-to-consumer and business-to-business agricultural transactions.
- Explore how digital technology can improve the agricultural supply chain.

## 🛠️ Technology

The project uses the following technologies, subject to the current implementation:

- **Frontend:** React.js, JavaScript, HTML, CSS
- **Build Tool:** Vite
- **Backend Services:** Supabase
- **Database:** Supabase PostgreSQL
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage

## ⚙️ Getting Started

### Prerequisites

Install the following before running the project:

- Node.js and npm
- A Supabase project with the required database schema and configuration

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd FarmDirect
```

Replace `<YOUR_GITHUB_REPOSITORY_URL>` with your repository's actual URL.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root and add the Supabase environment variables required by your application.

For example, if your code uses these variable names:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_publishable_or_anon_key
```

Use the exact variable names expected by your code. Never commit real credentials, service-role keys, or other secrets to GitHub.

### 4. Set up the database

Configure your Supabase project and apply the database migrations included in the repository's `supabase/migrations` directory, following their intended order and the project's deployment instructions.

Ensure that Row Level Security (RLS) policies are configured correctly before deploying to production.

### 5. Start the development server

```bash
npm run dev
```

Open the local URL printed in your terminal to view the application.

### 6. Build for production

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## 🔐 Security

- Keep secret keys and credentials out of source control.
- Use appropriate database access policies and Row Level Security.
- Restrict users to the data and actions they are authorized to access.
- Configure authentication and environment variables securely for production.

## 🚀 Deployment

FarmDirect can be deployed using a frontend hosting platform such as Vercel or Netlify, provided the required build configuration and Supabase environment variables are configured.

The production database must also have the required schema, migrations, and security policies applied.

## 🗺️ Future Scope

Potential areas for future development include:

- AI-powered assistance for farmers and buyers.
- Sales analytics and business insights for farmers.
- Harvest planning and agricultural expense tracking.
- Bulk ordering and quotation management.
- Customer ratings and reviews.
- Improved product availability and order tracking.

These are possible extensions and are not necessarily implemented in the current version.

## 🤝 Contributing

Contributions, suggestions, and feedback are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Submit a pull request describing your improvements.

## 📄 License

No license has been specified yet. Unless a license is added to this repository, the default copyright rules apply and others do not automatically receive permission to reuse, distribute, or modify the code.

---

**FarmDirect** — Bringing farmers and buyers closer through technology. 🌾
