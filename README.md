# BigQuery Release Hub

A modern, responsive web application that fetches Google Cloud BigQuery release notes, parses them into structured individual updates, and provides a built-in composer to share specific updates to X (formerly Twitter).

Built using **Python Flask** for the backend, and **vanilla HTML, JavaScript, and CSS** for the frontend.

---

## 🚀 Live Demo / Repository
- **GitHub Repository**: [Tutsumi/MichaelArmogan-event-talks-app](https://github.com/Tutsumi/MichaelArmogan-event-talks-app)

---

## ✨ Features

- **Live XML Feed Parsing & Segmentation**: Automatically fetches release notes from the official Google Cloud Atom feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`). Instead of showing a whole day's updates on one card, the backend segments them by header tags (`<h3>`) to display granular records.
- **Smart In-Memory Cache**: Uses a thread-safe caching layer (expires after 15 minutes) to ensure fast load times and prevent Google rate limits. Includes a force-refresh option that triggers a direct feed fetch.
- **Powerful Filtering & Search**:
  - Full-text search across all release notes.
  - Filter updates by type: *Features*, *Changes*, *Fixes*, *Deprecated*, or *Other*.
  - Sort updates chronologically (Newest First vs. Oldest First).
- **Interactive X/Twitter Composer Drawer**:
  - Highlights the selected update card.
  - Slides in a composer drawer populated with a formatted template draft.
  - Precise character counter showing remaining characters out of 280 (correctly budgeting exactly 23 characters for URLs per Twitter's link rules).
  - SVG progress ring indicating length limit warnings (green to amber to red).
  - Quick hashtag insert buttons (`#BigQuery`, `#GoogleCloud`, `#GCP`, etc.).
  - Copy-to-clipboard button and single-click share button via Twitter Web Intent.
- **Premium Aesthetics**: Styled in a rich dark-theme utilizing Outfit and Plus Jakarta Sans fonts, subtle indigo-blue accents, card hovers, loading skeleton/shimmer state, and custom CSS-only transitions.

---

## 📂 Project Structure

```text
├── static/
│   ├── css/
│   │   └── style.css       # Custom dark theme, transitions & layout styling
│   └── js/
│       └── app.js          # Client-side routing, search/filter algorithms & composer logic
├── templates/
│   └── index.html          # Main HTML structure, layout skeleton & Lucide CDN Icons
├── app.py                  # Flask application, thread-safe cache & BeautifulSoup parsing
├── requirements.txt        # Backend python dependencies (Flask, requests, bs4)
├── .gitignore              # Ignores local environments, pycache, logs, and temp files
└── README.md               # Project documentation
```

---

## 🛠️ Getting Started

### Prerequisites
- **Python 3.8+** installed on your system.
- **pip** (Python package installer).

### Installation & Run Steps

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Tutsumi/MichaelArmogan-event-talks-app.git
   cd MichaelArmogan-event-talks-app
   ```

2. **Set up a Virtual Environment** (Optional but recommended):
   ```bash
   # Windows
   python -m venv .venv
   .venv\Scripts\activate

   # macOS/Linux
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the Server**:
   ```bash
   python app.py
   ```

5. **Open in Browser**:
   Open [http://127.0.0.1:5000/](http://127.0.0.1:5000/) in your web browser.

---

## ⚙️ How it Works

### Backend Caching & Parsing ([app.py](app.py))
The feed is downloaded using Python `requests` and parsed into XML tree nodes. The text within `<content>` is HTML-parsed using `BeautifulSoup`. Every element that follows an `<h3>` tag is grouped together under that category heading (e.g. `Feature`, `Fixed`, `Changed`) until another header is hit.

The API exposes a JSON endpoint:
`GET /api/release-notes`
- Supports `/api/release-notes?refresh=true` to force bypass the cache.

### Dynamic Interaction ([static/js/app.js](static/js/app.js))
The client fetches the release notes asynchronously on mount.
- Input changes trigger instant re-evaluation of search results.
- Clicking **Post to X** opens the drawer and parses the character count:
  $$\text{Length} = \text{Text length} - \text{URL length} + 23$$
  This ensures that URL length is standard for character limit validations.

---

## 🧪 Technologies Used
- **Backend**: Python 3.13, Flask 3.0, Requests 2.32, BeautifulSoup4 4.12
- **Frontend**: Vanilla HTML5, Vanilla CSS3, Vanilla ES6 JavaScript
- **Icons**: Lucide Icons CDN
- **Fonts**: Google Fonts (Outfit, Plus Jakarta Sans)
