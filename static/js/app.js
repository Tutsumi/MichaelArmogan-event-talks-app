// --- Global State ---
let allUpdates = [];
let filteredUpdates = [];
let selectedUpdate = null;
let currentFilters = {
    search: '',
    type: 'all',
    sort: 'newest'
};

// --- DOM Elements ---
const elements = {
    btnRefresh: document.getElementById('btn-refresh'),
    refreshIcon: document.getElementById('refresh-icon'),
    lastUpdatedText: document.getElementById('last-updated-text'),
    searchInput: document.getElementById('search-input'),
    btnClearSearch: document.getElementById('btn-clear-search'),
    typeFiltersContainer: document.getElementById('type-filters'),
    sortSelect: document.getElementById('sort-select'),
    warningBanner: document.getElementById('warning-banner'),
    warningText: document.getElementById('warning-text'),
    btnCloseWarning: document.getElementById('btn-close-warning'),
    loadingState: document.getElementById('loading-state'),
    emptyState: document.getElementById('empty-state'),
    updatesFeed: document.getElementById('updates-feed'),
    btnResetFilters: document.getElementById('btn-reset-filters'),
    
    // Tweet Drawer Elements
    tweetDrawer: document.getElementById('tweet-drawer'),
    drawerOverlay: document.getElementById('drawer-overlay'),
    btnCloseDrawer: document.getElementById('btn-close-drawer'),
    previewTypeBadge: document.getElementById('preview-type-badge'),
    previewDate: document.getElementById('preview-date'),
    previewTextSnippet: document.getElementById('preview-text-snippet'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    charCounter: document.getElementById('char-counter'),
    charProgressCircle: document.getElementById('char-progress-circle'),
    hashtagTags: document.querySelectorAll('.hashtag-tag'),
    btnCopyTweet: document.getElementById('btn-copy-tweet'),
    btnShareTweet: document.getElementById('btn-share-tweet'),
    
    // Toast
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toast-message')
};

// SVG Progress Ring Specs
const RING_RADIUS = 10;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', () => {
    // Setup SVG progress circle
    if (elements.charProgressCircle) {
        elements.charProgressCircle.style.strokeDasharray = `${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`;
        elements.charProgressCircle.style.strokeDashoffset = RING_CIRCUMFERENCE;
    }
    
    fetchReleaseNotes(false);
    setupEventListeners();
});

// --- Event Listeners Setup ---
function setupEventListeners() {
    // Refresh button
    elements.btnRefresh.addEventListener('click', () => fetchReleaseNotes(true));
    
    // Search input
    elements.searchInput.addEventListener('input', handleSearchInput);
    elements.btnClearSearch.addEventListener('click', clearSearch);
    
    // Type filters
    elements.typeFiltersContainer.addEventListener('click', handleTypeFilterClick);
    
    // Sorting
    elements.sortSelect.addEventListener('change', handleSortChange);
    
    // Reset filters button
    elements.btnResetFilters.addEventListener('click', resetAllFilters);
    
    // Warning banner close
    elements.btnCloseWarning.addEventListener('click', () => {
        elements.warningBanner.style.display = 'none';
    });
    
    // Drawer Close
    elements.btnCloseDrawer.addEventListener('click', closeDrawer);
    elements.drawerOverlay.addEventListener('click', closeDrawer);
    
    // Tweet textarea character counting
    elements.tweetTextarea.addEventListener('input', handleTweetInput);
    
    // Hashtag helpers
    elements.hashtagTags.forEach(tag => {
        tag.addEventListener('click', () => {
            const hashtag = tag.getAttribute('data-tag');
            insertHashtag(hashtag);
        });
    });
    
    // Tweet actions
    elements.btnCopyTweet.addEventListener('click', copyTweetText);
    elements.btnShareTweet.addEventListener('click', postToTwitter);
}

// --- Fetch API Data ---
async function fetchReleaseNotes(forceRefresh = false) {
    setLoadingState(true);
    
    // Animate refresh button
    elements.btnRefresh.classList.add('refreshing');
    elements.btnRefresh.disabled = true;
    
    try {
        const url = `/api/release-notes${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        allUpdates = data.updates || [];
        
        // Show warnings if backend returned them (e.g. RSS fetch failed, but served cache)
        if (data.warning) {
            elements.warningText.textContent = data.warning;
            elements.warningBanner.style.display = 'flex';
        } else {
            elements.warningBanner.style.display = 'none';
        }
        
        // Update Sync Date Info
        if (data.last_updated) {
            const dateObj = new Date(data.last_updated);
            elements.lastUpdatedText.textContent = `Updated: ${formatRelativeTime(dateObj)}`;
        } else {
            elements.lastUpdatedText.textContent = 'Updated: Unknown';
        }
        
        // Apply existing filters to new data
        applyFilters();
        
    } catch (error) {
        console.error('Error fetching release notes:', error);
        elements.warningText.textContent = `Could not load release notes: ${error.message}. Please try again later.`;
        elements.warningBanner.style.display = 'flex';
        
        // If we have no data, show empty state
        if (allUpdates.length === 0) {
            showEmptyState(true);
        }
    } finally {
        setLoadingState(false);
        elements.btnRefresh.classList.remove('refreshing');
        elements.btnRefresh.disabled = false;
    }
}

// --- Filtering and Sorting Logic ---
function handleSearchInput(e) {
    currentFilters.search = e.target.value.trim().toLowerCase();
    
    // Show/hide clear search button
    if (currentFilters.search.length > 0) {
        elements.btnClearSearch.style.display = 'flex';
    } else {
        elements.btnClearSearch.style.display = 'none';
    }
    
    applyFilters();
}

function clearSearch() {
    elements.searchInput.value = '';
    currentFilters.search = '';
    elements.btnClearSearch.style.display = 'none';
    applyFilters();
}

function handleTypeFilterClick(e) {
    if (!e.target.classList.contains('filter-tag')) return;
    
    // Update active UI tag
    const tags = elements.typeFiltersContainer.querySelectorAll('.filter-tag');
    tags.forEach(tag => tag.classList.remove('active'));
    e.target.classList.add('active');
    
    currentFilters.type = e.target.getAttribute('data-type');
    applyFilters();
}

function handleSortChange(e) {
    currentFilters.sort = e.target.value;
    applyFilters();
}

function resetAllFilters() {
    elements.searchInput.value = '';
    currentFilters.search = '';
    elements.btnClearSearch.style.display = 'none';
    
    const tags = elements.typeFiltersContainer.querySelectorAll('.filter-tag');
    tags.forEach(tag => tag.classList.remove('active'));
    tags[0].classList.add('active'); // 'All' button
    currentFilters.type = 'all';
    
    elements.sortSelect.value = 'newest';
    currentFilters.sort = 'newest';
    
    applyFilters();
}

function applyFilters() {
    filteredUpdates = allUpdates.filter(update => {
        // Text Search Filter
        const matchesSearch = !currentFilters.search || 
            update.text.toLowerCase().includes(currentFilters.search) || 
            update.date.toLowerCase().includes(currentFilters.search) ||
            update.type.toLowerCase().includes(currentFilters.search);
            
        // Type Badge Filter
        let matchesType = false;
        if (currentFilters.type === 'all') {
            matchesType = true;
        } else if (currentFilters.type === 'Other') {
            // "Other" collects anything not matching standard badges
            const standardTypes = ['Feature', 'Changed', 'Fixed', 'Deprecated'];
            matchesType = !standardTypes.includes(update.type);
        } else {
            matchesType = update.type.toLowerCase() === currentFilters.type.toLowerCase();
        }
        
        return matchesSearch && matchesType;
    });
    
    // Sort
    sortFilteredUpdates();
    
    // Render
    renderFeed();
}

function sortFilteredUpdates() {
    filteredUpdates.sort((a, b) => {
        // The dates are in formats like "June 15, 2026".
        // Let's parse dates safely by falling back to strings if needed
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        
        if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
            // Alphabetical fallback if date parsing fails
            return currentFilters.sort === 'newest' 
                ? b.date.localeCompare(a.date) 
                : a.date.localeCompare(b.date);
        }
        
        return currentFilters.sort === 'newest' 
            ? dateB - dateA 
            : dateA - dateB;
    });
}

// --- Feed Rendering ---
function renderFeed() {
    elements.updatesFeed.innerHTML = '';
    
    if (filteredUpdates.length === 0) {
        showEmptyState(true);
        return;
    }
    
    showEmptyState(false);
    
    filteredUpdates.forEach(update => {
        const card = document.createElement('article');
        card.className = `update-card ${selectedUpdate && selectedUpdate.id === update.id ? 'selected' : ''}`;
        card.setAttribute('data-id', update.id);
        
        // Map types to badge classes
        let badgeClass = 'type-other';
        const typeLower = update.type.toLowerCase();
        if (typeLower === 'feature') badgeClass = 'type-feature';
        else if (typeLower === 'changed') badgeClass = 'type-changed';
        else if (typeLower === 'fixed') badgeClass = 'type-fixed';
        else if (typeLower === 'deprecated') badgeClass = 'type-deprecated';
        else if (typeLower === 'security') badgeClass = 'type-security';
        
        card.innerHTML = `
            <div class="card-meta">
                <div class="card-meta-left">
                    <span class="type-badge ${badgeClass}">${update.type}</span>
                    <span class="update-date">
                        <i data-lucide="calendar"></i>
                        <span>${update.date}</span>
                    </span>
                </div>
                <div class="card-actions-quick">
                    <button class="btn-icon-only btn-quick-copy" title="Copy detail text">
                        <i data-lucide="copy"></i>
                    </button>
                    <button class="btn-icon-only btn-quick-twitter" title="Share on X">
                        <i data-lucide="twitter"></i>
                    </button>
                </div>
            </div>
            <div class="card-body">
                ${update.html}
            </div>
        `;
        
        // Card click handler (selects it)
        card.addEventListener('click', (e) => {
            // Ignore if clicking action buttons
            if (e.target.closest('.btn-icon-only')) return;
            selectCard(update, card);
        });
        
        // Copy action handler
        card.querySelector('.btn-quick-copy').addEventListener('click', (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(`[BigQuery ${update.type}] (${update.date}) - ${update.text}\n\nRead more: ${update.link}`)
                .then(() => showToast('Update details copied!'))
                .catch(err => console.error('Copy failed', err));
        });
        
        // Twitter action handler
        card.querySelector('.btn-quick-twitter').addEventListener('click', (e) => {
            e.stopPropagation();
            selectCard(update, card);
            openDrawer(update);
        });
        
        elements.updatesFeed.appendChild(card);
    });
    
    // Refresh icons inside the dynamic elements
    lucide.createIcons();
}

function selectCard(update, cardElement) {
    selectedUpdate = update;
    
    // Clear previous selected class
    const cards = elements.updatesFeed.querySelectorAll('.update-card');
    cards.forEach(c => c.classList.remove('selected'));
    
    // Add selected class to current card
    cardElement.classList.add('selected');
}

// --- Drawer & Tweet Composer Logic ---
function openDrawer(update) {
    elements.previewDate.textContent = update.date;
    elements.previewTypeBadge.textContent = update.type;
    
    // Format Badge classes inside preview drawer
    elements.previewTypeBadge.className = 'type-badge'; // reset
    const typeLower = update.type.toLowerCase();
    if (typeLower === 'feature') elements.previewTypeBadge.classList.add('type-feature');
    else if (typeLower === 'changed') elements.previewTypeBadge.classList.add('type-changed');
    else if (typeLower === 'fixed') elements.previewTypeBadge.classList.add('type-fixed');
    else if (typeLower === 'deprecated') elements.previewTypeBadge.classList.add('type-deprecated');
    else if (typeLower === 'security') elements.previewTypeBadge.classList.add('type-security');
    else elements.previewTypeBadge.classList.add('type-other');
    
    elements.previewTextSnippet.textContent = update.text;
    
    // Compose Default Tweet text
    const tweetText = generateDefaultTweet(update);
    elements.tweetTextarea.value = tweetText;
    
    // Trigger input handler to update counts & progress UI
    handleTweetInput();
    
    elements.tweetDrawer.classList.add('open');
}

function closeDrawer() {
    elements.tweetDrawer.classList.remove('open');
}

function generateDefaultTweet(update) {
    // Standard template
    const header = `📢 New in BigQuery (${update.date}):\n`;
    const footer = `\n\nRead more: ${update.link}`;
    const hashtags = ` #BigQuery #GoogleCloud`;
    
    // Total budget: 280 chars
    // Twitter URL budget is always 23 chars for any URL!
    // Length of URL in JS string might be e.g. 80 chars, but Twitter counts it as 23.
    // So we calculate text budget based on 23 instead of actual URL length!
    const staticTextLength = header.length + 2 + 23 + hashtags.length + 2; // +2 for newlines, etc.
    const descriptionBudget = 280 - staticTextLength;
    
    let description = update.text;
    if (description.length > descriptionBudget) {
        description = description.substring(0, descriptionBudget - 3) + '...';
    }
    
    return `${header}${description}${footer}${hashtags}`;
}

function handleTweetInput() {
    const text = elements.tweetTextarea.value;
    
    // Character counting factoring Twitter's 23 character URL parsing logic
    const charCount = getTwitterCharCount(text);
    const charsRemaining = 280 - charCount;
    
    elements.charCounter.textContent = charsRemaining;
    
    // Update SVG progress ring
    let percent = Math.min(charCount / 280, 1);
    if (charCount > 280) percent = 1;
    
    const offset = RING_CIRCUMFERENCE - (percent * RING_CIRCUMFERENCE);
    elements.charProgressCircle.style.strokeDashoffset = offset;
    
    // Update styling based on character count limit
    if (charsRemaining < 0) {
        elements.charCounter.style.color = '#ef4444'; // Red
        elements.charProgressCircle.style.stroke = '#ef4444';
        elements.btnShareTweet.disabled = true;
        elements.btnShareTweet.style.opacity = '0.5';
    } else if (charsRemaining <= 20) {
        elements.charCounter.style.color = '#f59e0b'; // Amber warning
        elements.charProgressCircle.style.stroke = '#f59e0b';
        elements.btnShareTweet.disabled = false;
        elements.btnShareTweet.style.opacity = '1';
    } else {
        elements.charCounter.style.color = 'var(--text-secondary)';
        elements.charProgressCircle.style.stroke = 'var(--twitter-color)';
        elements.btnShareTweet.disabled = false;
        elements.btnShareTweet.style.opacity = '1';
    }
}

// Twitter parses all links as exactly 23 characters.
// This function replicates that logic to give a precise count.
function getTwitterCharCount(text) {
    // Regex to find urls
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    
    let length = text.replace(urlRegex, '').length;
    length += urls.length * 23;
    
    return length;
}

function insertHashtag(hashtag) {
    let text = elements.tweetTextarea.value;
    
    // Check if it already contains the hashtag
    if (text.includes(hashtag)) return;
    
    // Append or insert before link if possible, otherwise at the end
    // Let's just append it nicely
    if (text.endsWith(' ') || text.endsWith('\n')) {
        text += hashtag;
    } else {
        text += ' ' + hashtag;
    }
    
    elements.tweetTextarea.value = text;
    handleTweetInput();
}

function copyTweetText() {
    const text = elements.tweetTextarea.value;
    navigator.clipboard.writeText(text)
        .then(() => showToast('Tweet copied to clipboard!'))
        .catch(err => console.error('Copy failed', err));
}

function postToTwitter() {
    const text = elements.tweetTextarea.value;
    const encodedText = encodeURIComponent(text);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
}

// --- UI Helper Functions ---
function setLoadingState(isLoading) {
    if (isLoading) {
        elements.loadingState.style.display = 'flex';
        elements.updatesFeed.style.display = 'none';
        elements.emptyState.style.display = 'none';
    } else {
        elements.loadingState.style.display = 'none';
        elements.updatesFeed.style.display = 'flex';
    }
}

function showEmptyState(show) {
    if (show) {
        elements.emptyState.style.display = 'flex';
        elements.updatesFeed.style.display = 'none';
    } else {
        elements.emptyState.style.display = 'none';
        elements.updatesFeed.style.display = 'flex';
    }
}

function showToast(message) {
    elements.toastMessage.textContent = message;
    elements.toast.style.display = 'flex';
    // Small delay to trigger animation
    setTimeout(() => {
        elements.toast.classList.add('show');
    }, 10);
    
    // Auto hide
    setTimeout(() => {
        elements.toast.classList.remove('show');
        setTimeout(() => {
            elements.toast.style.display = 'none';
        }, 300); // Wait for transition
    }, 3000);
}

function formatRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    // Otherwise return clean date
    return date.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}
