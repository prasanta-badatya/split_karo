# Split Karo

A free, private expense splitter for Indian roommates and friend groups — split rent, ration, vegetables, restaurant bills and trips fairly, then settle up instantly over UPI.

**No login. No phone number. No ads. Works offline.** Your data stays on your device.

🔗 **Live app:** https://prasanta-badatya.github.io/split_karo/

> Tip: open it on your phone's browser and **“Add to Home screen”** to install it as an app (PWA). It then works fully offline and updates itself automatically.

---

## What it does

Split Karo has **three tools** for three real situations:

| Tool | Use it for | Saves? |
|------|-----------|--------|
| ⚡ **Quick Split** | A restaurant/café bill or one-off purchase — instant maths, share on WhatsApp | No (calculator) |
| 👥 **Home Expenses (Groups)** | Monthly roommate cycle: rent + ration + vegetables + electricity/wifi/gas/maid… | Yes |
| ✈️ **Trips** | A trip/outing with many expenses and different people paying | Yes |

Plus: **UPI settle-up**, **dark mode**, **PIN lock**, **backup/restore**, **archive**, and a shareable summary.

---

## How to use

### ⚡ Quick Split (no saving — fastest)
1. Tap the **⚡ Quick** button in the bottom bar.
2. Enter the total amount and pick a mode:
   - **Equal** — split equally among N people.
   - **One paid** — one person paid; everyone else owes their share.
   - **Custom** — type exactly what each person owes.
3. Tap **Share** to send the result on WhatsApp / copy it. Optionally **Save as Trip** to keep tracking it.

### 👥 Home Expenses (monthly roommate cycle)
1. Bottom bar → **Groups** → **+ New Group**.
2. **Step 1 – Info:** name the group and pick the billing period (e.g. 1–31 May).
3. **Step 2 – Expenses:** enter **Rent**, **Ration**, **Vegetable**, and add any **Other** items (Electricity, WiFi, Gas, Water, Maid, Milk, Maintenance…). Choose **Equal** or **Day-wise** split for the ration+veggie pool.
4. **Step 3 – Members:** add each person; set days present (for day-wise), anything they already paid, and an optional **UPI ID**.
5. **Step 4 – Preview:** review the per-person breakdown → **Create**.
6. In the group you can **mark people paid**, **Settle up via UPI**, **edit** anything later (✏️), **share an image** summary, and **archive** it when the month is done.

### ✈️ Trips (multiple expenses, multiple payers)
1. Bottom bar → **Trips** → **+ New Trip**.
2. Add the trip name, then **members** (with optional UPI IDs).
3. Add each **expense**: description, amount, **date**, who **paid**, and who it’s **split among** — equally or by **exact amounts**.
4. Open the trip to see the **settlement plan** (who pays whom). Toggle **Simplify** on/off:
   - **On** = fewest transfers.
   - **Off** = pay exactly who you owe.
5. **+ Add expense** anytime as the trip goes on, **edit/delete** any expense, **Pay via UPI**, **Remind on WhatsApp**, and **Share** the full summary.

### 💸 Settling up over UPI
If a member has a **UPI ID**, their settlement shows a **Pay via UPI** button that opens GPay/PhonePe/Paytm pre-filled with the exact amount — plus a **Remind on WhatsApp** link.

---

## Privacy & your data

- **Everything is stored locally** on your device (browser IndexedDB). Nothing is uploaded; there’s no server or account.
- Because of that, **back up regularly**: **Settings → Export Backup** downloads a file; **Import Backup** restores it (handy when switching phones). The app reminds you if you haven’t backed up in a while.
- Optional **PIN lock** (Settings → Privacy) gates the app on open. The PIN is stored only as a salted hash — but there’s **no PIN recovery**, so keep a backup.

---

## Tech

- **Angular** (standalone components + signals), **Tailwind CSS**, **Dexie** (IndexedDB)
- Installable **PWA** with offline support and automatic updates
- Hosted on **GitHub Pages**

## Development

```bash
npm install        # install dependencies
npm start          # dev server at http://localhost:4200/
npm run build      # production build → dist/split-karo
npm run deploy     # build with /split_karo/ base href + publish to GitHub Pages
```

> Note: the production build uses base href `/split_karo/` (GitHub Pages project subpath). `npm start` serves at `/` for local dev.
