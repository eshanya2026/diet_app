# AI Diet Chart Generator (MERN)

Full-stack app for **personalized Indian diet charts** using:

- **M**ongoDB Atlas
- **E**xpress (Node.js)
- **R**eact (Vite)
- **N**ode.js  
- **Google Gemini API** (Gemini 2.5 Flash) for diet generation

## Features

- User health form: name, age, gender, height, weight, activity, diet preference, health conditions, goal
- BMI calculation and category (Underweight / Normal / Overweight / Obese)
- AI-generated Indian diet plan (breakfast → dinner, calories, suggestions)
- Diet plans stored in MongoDB; history view per user

## Project structure

```
diet_app_ai/
├── client/                 React frontend (Vite)
│   ├── src/
│   │   ├── api/            API client (dietApi.js)
│   │   ├── components/     Layout, navbar
│   │   ├── context/       Theme (dark/light)
│   │   ├── pages/         Dashboard, Generate, Result, History, Water, Weight, Settings
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   └── package.json
├── server/                 Express API
│   ├── config/             db.js (MongoDB)
│   ├── repositories/       user, diet plan
│   ├── routes/             generate-diet, history
│   ├── utils/              bmi, validation, gemini
│   ├── index.js
│   └── package.json
├── .env                    Your secrets (create from .env.example)
├── .env.example
├── .gitignore
├── package.json            Root scripts (optional)
└── README.md
```

## Setup

### 1. Environment

Copy `.env.example` to `.env` in the **project root** and set:

- `MONGODB_URI` – MongoDB Atlas connection string  
- `MONGODB_DB_NAME` – e.g. `diet_app_ai`  
- `GEMINI_API_KEY` – from [Google AI Studio](https://aistudio.google.com/apikey)  
- `GEMINI_MODEL_NAME` – optional, default `gemini-2.5-flash`

### 2. Backend

```bash
cd server
npm install
npm start
```

API runs at **http://localhost:5000** (or `PORT` from `.env`).

### 3. Frontend

In a second terminal:

```bash
cd client
npm install
npm run dev
```

App runs at **http://localhost:3000**. Vite proxies `/api` to the backend.

## API

- **POST /api/generate-diet** – body: user health JSON → returns generated diet + user + diet_plan
- **GET /api/history?user_id=\<mongoId\>** – returns past diet plans for that user
- **GET /api/health** – health check

## Run both (from project root)

Use **two terminals**:

```bash
# Terminal 1 – API
cd server
npm install
npm start

# Terminal 2 – React
cd client
npm install
npm run dev
```

Then open **http://localhost:3000** in your browser.

## Troubleshooting

- **PowerShell: "running scripts is disabled"**  
  Either run once: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`  
  Or use **Command Prompt (cmd)** instead of PowerShell for `npm install` / `npm start` / `npm run dev`.

- **"Unable to save user" / database errors**  
  - Ensure **MongoDB Atlas → Network Access** allows your IP (or add `0.0.0.0/0` for local dev).  
  - Check **http://localhost:5000/api/health** – if it returns `db: "connected"`, the app can reach MongoDB.

- **.env not loading**  
  - Keep `.env` in the **project root** (same folder as `server/` and `client/`).  
  - Use `#` for comments in `.env`, not `;`.
"# diet_app" 
