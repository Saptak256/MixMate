# 🍹 FULL APP FLOW — "Your Personal Mixologist"

## For AI, use Deepseek API

## 🧑‍💻 1. Authentication Flow
**Screen:** Login / Sign Up
- **Options:**
  - Email
  - Password
  - "Forgot Password?" link
  - "Don't have an account?" → Sign Up
- **On successful login/signup:** Navigate to Age Verification

## 🧓 2. Age Verification
**Screen:** Are you of legal drinking age in your country?
- **Text:** "To give you the best experience, we need to know if we can show you cocktail recipes."
- **Buttons:**
  - ✅ Yes, I am above legal age
  - ❌ No, I am below legal age
- **Store this info:** (e.g., userAgeVerified = true/false)
- **Navigate to:** Home Screen

## �� 3. Main Screen – "What Do You Feel Like Having Today?"
**Screen:** Drink Type Selection
- **Title:** "What do you want to make today?"
- **Buttons:**
  - 🍸 Cocktail (disabled if underage)
  - 🧃 Mocktail
- **Show info:** "Cocktails are only for users above the legal drinking age." if disabled

## 📥 4. Input Form – Build Your Drink
**Screen:** Customize Your Drink
- **Form varies by drink type:**
  - 🥂 If Cocktail:
    - Base Alcohol (dropdown or chips)
    - Flavor Profile (multi-select chips: Fruity, Herbal, Bitter, etc.)
    - Mood (optional: Chill, Party, Romantic)
    - Glass Type (optional)
    - Available Ingredients (multi-select or free text)
    - Difficulty Preference (Easy, Medium, Fancy)
    - Optional toggles:
      - Shaken/Stirred
      - Garnish preference
      - Layered drink? (checkbox)
  - 🧃 If Mocktail:
    - Base Flavor (Fruity, Minty, Creamy, etc.)
    - Mood (optional)
    - Sweetness Level (Low, Medium, High)
    - Available Ingredients
    - Glass Type (optional)
    - Difficulty Preference
    - Optional toggles:
      - Carbonated/Still
      - Ice or No Ice
- **Bottom Buttons:**
  - ✅ Generate My Drink
  - 🎲 Surprise Me! (Skip inputs, generate based on user profile and age)

## 📄 5. Drink Result Screen – Recipe Display
**Screen:** Your Drink Recipe
- 🏷️ Name of the drink (AI-generated)
- 🍶 Prep Time
- 🧠 Difficulty
- 🧾 Step-by-Step Instructions (numbered, clear)
  - Each with a small icon (e.g., mix, pour, shake)
- 📋 Ingredients list
- 🧰 Tools needed
- 🖼️ Minimal icons or illustrations (optional per step)
- ❤️ Save to Favorites
- 🔁 Regenerate / Try Another
- ✨ Bonus Section: Flavor Boosters (Optional)
  - **Title:** "Want to elevate this drink?"
  - **Suggested extras:**
    - 🌿 Mint garnish
    - 🧂 Salt rim
    - 🍯 Add a drizzle of honey
  - **Option:** "Try it with these!" (checkbox to include in updated recipe)

## 📂 6. Favorites Page
**Screen:** Saved Recipes
- List of drinks user has favorited
- Tap to view recipe again
- Option to delete or regenerate

## ⚙️ 7. Settings / Profile (Optional for MVP)
**Screen:** User Settings
- Change password
- Update age verification (in case of mistake)
- Logout

## 🎯 Optional Extras (After MVP)
- ✨ Dark Mode toggle
- 📤 Share drink card as image or link
- 🔍 Search past recipes
