# FarmDirect

## Description

**FarmDirect** is a hyper-local agricultural e-commerce platform designed to connect farmers directly with consumers and retail shopkeepers. The platform eliminates unnecessary middlemen, ensures fair pricing for agricultural producers, provides fresh farm produce with zero artificial markups, and supports end-to-end order fulfillment, delivery tracking, and regional hub management.

---

## 🌟 Key Features

- **User Authentication & Role-Based Access Control**: Secure registration, login, and protected route access with bcrypt password hashing and JWT token authorization.
- **Product Browsing & Details**: Rich catalog display with real-time stock availability, harvest dates, organic badges, and pricing breakdowns.
- **Category Filtering**: High-speed filtering across 10 agricultural categories: *Vegetables, Fruits, Leafy Greens, Grains, Pulses, Spices, Nuts & Dry Fruits, Seeds, Flowers, and Dairy*.
- **Real-Time Product Search**: Instant case-insensitive and partial name search.
- **Interactive Cart & Wishlist**: Dynamic cart quantity updates, stock boundary protection, and customer wishlist toggling.
- **Authoritative Checkout & Orders**: Server-calculated subtotal, GST (5%), delivery fees (free over ₹500), 6-digit Delivery OTP handoffs, and customer order history.
- **Inventory Management**: Real-time stock decrementing upon order creation and automatic restoration upon cancellation.
- **Farmer Produce Management**: Dedicated dashboard for farmers to submit produce listings for quality verification, edit prices, and manage stock.
- **Delivery Partner Portal**: Hub-assigned order routing, order status transitions (`Out for Delivery`), OTP-verified completions, and automated delivery payouts.
- **Admin Management & Analytics**: Comprehensive platform analytics, product approval workflows, user ledger auditing, and live database metric synchronization.
- **MongoDB Integration**: Production-ready Mongoose schemas with compound performance indexes and idempotent database startup initialization.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide React Icons
- **Backend**: Node.js, Express, Mongoose, JSON Web Tokens (JWT), Bcrypt.js, Multer
- **Database**: MongoDB (with Mongoose ODM)
- **Tooling**: TypeScript (`tsc`), ESBuild, Vite Build

---

## 📂 Project Structure

```text
farmdirect/
├── backend/
│   ├── config/          # Database connection (MongoDB & local storage sync)
│   ├── controllers/     # Controller logic (Auth, Product, Order, Admin, Customer, Delivery)
│   ├── middlewares/     # JWT authentication, role guards, and multer file uploads
│   ├── models/          # Mongoose schemas (User, Product, Order, Hub) & TypeScript types
│   ├── routes/          # Express REST API routes
│   ├── services/        # Catalog seed data, storage management, pricing formulas
│   └── utils/           # Bcrypt password hashing & JWT token utilities
├── public/              # Static assets and category graphics
├── scripts/             # End-to-end automated test suites and validation harnesses
├── src/
│   ├── components/      # UI components (Navbar, Footer, ProductCard, QuickView, CartDrawer)
│   ├── context/         # AuthContext, CartContext, ThemeContext, LanguageContext
│   ├── pages/           # Role-based pages (Home, ProductDetails, Cart, Checkout, Dashboards)
│   ├── services/        # Frontend API client service
│   └── utils/           # Currency formatters and product image resolvers
├── server.ts            # Full-stack Express server and Vite integration
├── .env.example         # Template environment variables
├── .gitignore           # Git ignore rules
├── package.json         # Project metadata, dependencies, and build scripts
└── tsconfig.json        # TypeScript configuration
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` in the root directory (and optionally `backend/.env`):

```bash
cp .env.example .env
```

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | Server listening port | `3000` |
| `NODE_ENV` | Application environment | `development` / `production` |
| `MONGODB_URI` | MongoDB connection URI | `mongodb://127.0.0.1:27017/farm` |
| `ALLOW_JSON_FALLBACK` | Fallback flag for memory storage | `false` |
| `JWT_SECRET` | Secret key for signing JWT tokens | `your_strong_jwt_secret_key` |
| `RAZORPAY_KEY_ID` | Payment gateway API key | `your_razorpay_key_id` |
| `RAZORPAY_KEY_SECRET` | Payment gateway API secret | `your_razorpay_key_secret` |
| `PAYMENT_MODE` | Payment processing mode | `production` / `sandbox` |
| `APP_URL` | Base application URL | `http://localhost:3000` |

---

## 🚀 Installation & Running the Project

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/farmdirect.git
cd farmdirect
npm install
```

### 2. Configure Environment
Set up your `.env` file with your local or cloud MongoDB connection string.

### 3. Start Development Server
```bash
npm run dev
```
- Frontend client runs on: `http://localhost:5173`
- Backend API server runs on: `http://localhost:3000`

### 4. Build for Production
```bash
npm run build
npm start
```
- Full-stack production app runs on: `http://localhost:3000`

### 5. Code Quality & Typecheck
```bash
npm run typecheck
npm run lint
```

### 6. Run Automated Test Suite
```bash
npx tsx scripts/run_final_e2e_regression.ts
```

---

## 👥 User Roles & Demo Accounts

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Customer** | `customer@farmdirect.com` | `customerpassword123` | Browse catalog, cart, checkout, view order history, profile |
| **Farmer** | `farmer@farmdirect.com` | `farmerpassword123` | Upload produce, edit listings, manage inventory, view orders |
| **Delivery Partner** | `delivery@farmdirect.com` | `deliverypassword123` | View assigned hub deliveries, update status, OTP verification |
| **System Admin** | `admin@farmdirect.com` | `adminpassword123` | Approve produce, manage users, audit orders, view platform analytics |
| **Shopkeeper (B2B)** | `shopkeeper@farmdirect.com` | `customerpassword123` | B2B wholesale ordering and bulk tier pricing |

---

## 📄 License
This project is licensed under the MIT License.
