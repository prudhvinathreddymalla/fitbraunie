# fitbraunie

A small private fitness and diet PWA based on `Prithvi_Fitness_Tracker_8_Weeks.xlsx`. It tracks the 8-week training calendar, daily meals, protein, water, workout minutes, weekly metrics, and goals in local browser storage.

## Run Locally

From this folder:

```bash
python3 -m http.server 8080
```

Open:

```text
http://localhost:8080/store.html
```

## Install On Your Phone

Host this folder on an HTTPS domain you control, then open `store.html` on your phone.

- Android: open in Chrome and use Install app.
- iPhone: open in Safari and use Share, then Add to Home Screen.

For iPhone, a true private native app store needs Apple developer distribution such as TestFlight, Enterprise, or custom app distribution. This PWA route is the simplest personal app-store style setup.

## GitHub Pages

This app is safe to host as a static site because it does not include a server, analytics, or a cloud database. The published files contain the plan template, not your daily logs. Your personal entries are stored in browser local storage on the device where you use the app.

On GitHub Free, Pages is commonly used with a public repository. If the plan itself is private, use a private Pages-capable GitHub plan or another private hosting provider.

Deployment from the GitHub website:

1. Create a new repository, for example `fitness-diet-app`.
2. Upload these files to the repository root.
3. Go to Settings > Pages.
4. Choose Deploy from a branch.
5. Select `main` and `/root`.
6. Open the Pages URL GitHub gives you, then open `store.html`.

Do not commit private measurements, medical notes, photos, or credentials into this repository.
