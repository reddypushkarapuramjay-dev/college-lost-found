/* 
  College Lost & Found Management System
  File: script.js
  Purpose: Form validation, Firebase Auth integration, Cloud Firestore synchronization, privacy-first contact isolation, and High-Precision Match Engine.
*/

// ==========================================
// 1. Initial Demonstration Data
// ==========================================
const INITIAL_LOST_ITEMS = [
  {
    id: 'lost-demo-1',
    itemName: 'Casio Scientific Calculator',
    category: 'Electronics',
    dateLost: '2026-10-09',
    location: 'Science Block - Room 302',
    description: 'Model fx-991EX with black protective cover and silver initials on the back.',
    status: 'Active',
    isDemo: true
  },
  {
    id: 'lost-demo-2',
    itemName: 'Navy Blue Wildcraft Backpack',
    category: 'Bags',
    dateLost: '2026-10-08',
    location: 'Central Library, 2nd Floor',
    description: 'Contains notebooks, a blue water bottle, and engineering drawing instruments.',
    status: 'Active',
    isDemo: true
  },
  {
    id: 'lost-demo-3',
    itemName: 'Campus ID Card & Lanyard',
    category: 'ID Cards',
    dateLost: '2026-10-07',
    location: 'Cafeteria / Lawn Area',
    description: 'Blue college ribbon lanyard with student card for Roll No. 2024-EC-089.',
    status: 'Active',
    isDemo: true
  }
];

const INITIAL_FOUND_ITEMS = [
  {
    id: 'found-demo-1',
    itemName: '65W Type-C Laptop Charger',
    category: 'Electronics',
    dateFound: '2026-10-10',
    foundLocation: 'Computer Lab 3 (Hub #4)',
    foundDescription: 'Black Lenovo fast charger left plugged near charging hub #4.',
    identifyingMarks: 'Deposited at Lab Assistant Desk',
    status: 'Active',
    isDemo: true
  },
  {
    id: 'found-demo-2',
    itemName: 'Silver Metal Keychain (3 Keys)',
    category: 'Other',
    dateFound: '2026-10-09',
    foundLocation: 'Main Sports Ground Bench',
    foundDescription: 'Key ring with 2 bike keys and 1 locker key.',
    identifyingMarks: 'Miniature bike charm attached; Deposited at Security Main Gate',
    status: 'Active',
    isDemo: true
  },
  {
    id: 'found-demo-3',
    itemName: 'Wireless Earbuds in White Case',
    category: 'Electronics',
    dateFound: '2026-10-08',
    foundLocation: 'Auditorium / Seminar Hall',
    foundDescription: 'White charging case found on seat 14-B.',
    identifyingMarks: 'Minor scratch on the top lid; Deposited at Dean Office',
    status: 'Active',
    isDemo: true
  }
];

// In-Memory Cloud State
let cloudLostItems = [];
let cloudFoundItems = [];
let currentUser = null;
let isAuthLoading = true;

// ==========================================
// 2. Data & Text Formatting Helpers
// ==========================================
function getAllLostItems() {
  if (cloudLostItems.length > 0) {
    return cloudLostItems;
  }
  return INITIAL_LOST_ITEMS;
}

function getAllFoundItems() {
  if (cloudFoundItems.length > 0) {
    return cloudFoundItems;
  }
  return INITIAL_FOUND_ITEMS;
}

function formatDate(dateStr) {
  if (!dateStr) return 'Recently';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parts[2];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[monthIndex] || 'Oct'} ${day}, ${year}`;
  }
  return dateStr;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const COLLEGE_DOMAIN = 'srkrec.ac.in';

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Strict domain validation: case-insensitive check ensuring email ends exactly in @srkrec.ac.in
function isCollegeEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  const parts = trimmed.split('@');
  if (parts.length !== 2) return false;
  const username = parts[0];
  const domain = parts[1].toLowerCase();
  return domain === COLLEGE_DOMAIN && username.length > 0 && /^[^\s@]+$/.test(username);
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'room', 'floor',
  'block', 'near', 'desk', 'left', 'found', 'lost', 'some', 'item', 'have',
  'been', 'area', 'building', 'campus', 'college', 'student', 'which', 'what',
  'where', 'when', 'into', 'over', 'back', 'front', 'side', 'about', 'just',
  'navy', 'blue', 'black', 'white', 'silver', 'red', 'green', 'yellow', 'dark',
  'light', 'small', 'large', 'brand', 'color'
]);

function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractNameKeywords(text) {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  return normalized
    .split(' ')
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
}

function extractGeneralKeywords(text) {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  return normalized
    .split(' ')
    .filter(word => word.length > 2);
}

// ==========================================
// 3. High-Precision Match Engine
// ==========================================
function calculateMatches() {
  const lostList = getAllLostItems().filter(item => (item.status || 'Active') === 'Active');
  const foundList = getAllFoundItems().filter(item => (item.status || 'Active') === 'Active');
  const matches = [];

  lostList.forEach(lost => {
    const lostNameNorm = normalizeText(lost.itemName);
    const lostNameKeywords = extractNameKeywords(lost.itemName);
    const lostCategory = (lost.category || '').toLowerCase().trim();

    foundList.forEach(found => {
      const foundNameNorm = normalizeText(found.itemName);
      const foundNameKeywords = extractNameKeywords(found.itemName);
      const foundCategory = (found.category || '').toLowerCase().trim();

      // Rule 1: Item Name Gatekeeper
      let nameScore = 0;
      const matchedNameTerms = [];

      const isExactName = (lostNameNorm.length > 0 && lostNameNorm === foundNameNorm);
      const isSubstringMatch = (
        (lostNameNorm.length > 3 && foundNameNorm.includes(lostNameNorm)) ||
        (foundNameNorm.length > 3 && lostNameNorm.includes(foundNameNorm))
      );

      if (isExactName) {
        nameScore = 70;
        matchedNameTerms.push(`Exact item name match: "${lost.itemName}"`);
      } else if (isSubstringMatch) {
        nameScore = 55;
        matchedNameTerms.push(`Item name similarity: "${lost.itemName}" & "${found.itemName}"`);
      } else {
        const commonNameKeywords = lostNameKeywords.filter(w => foundNameKeywords.includes(w));
        if (commonNameKeywords.length > 0) {
          nameScore = 40 + (commonNameKeywords.length - 1) * 15;
          matchedNameTerms.push(`Matching item keywords: ${commonNameKeywords.join(', ')}`);
        }
      }

      if (nameScore === 0) return;

      // Rule 2: Category Compatibility
      let categoryScore = 0;
      const isSameCategory = (lostCategory && foundCategory && lostCategory === foundCategory);
      const isOneOtherCategory = (lostCategory === 'other' || foundCategory === 'other');

      if (isSameCategory) {
        categoryScore = 25;
      } else if (isOneOtherCategory) {
        categoryScore = 10;
      } else {
        if (!isExactName) return;
      }

      // Rule 3: Secondary Location & Notes Boosters
      let secondaryScore = 0;
      const matchedDetails = [];

      const lostLocKeywords = extractGeneralKeywords(lost.location);
      const foundLocKeywords = extractGeneralKeywords(found.foundLocation);
      const commonLocKeywords = lostLocKeywords.filter(w => foundLocKeywords.includes(w) && !STOP_WORDS.has(w));

      if (commonLocKeywords.length > 0) {
        secondaryScore += Math.min(15, commonLocKeywords.length * 8);
        matchedDetails.push(`Similar location: ${commonLocKeywords.join(', ')}`);
      }

      const lostDescKeywords = extractGeneralKeywords(lost.description);
      const foundDescKeywords = [
        ...extractGeneralKeywords(found.foundDescription),
        ...extractGeneralKeywords(found.identifyingMarks)
      ];
      const commonDescKeywords = lostDescKeywords.filter(w => foundDescKeywords.includes(w) && !STOP_WORDS.has(w));

      if (commonDescKeywords.length > 0) {
        secondaryScore += Math.min(15, commonDescKeywords.length * 5);
        matchedDetails.push(`Matching details: ${commonDescKeywords.slice(0, 2).join(', ')}`);
      }

      const totalScore = nameScore + categoryScore + secondaryScore;

      if (totalScore >= 50) {
        const confidencePercentage = Math.min(99, Math.round((totalScore / 115) * 100));
        const reasons = [
          ...matchedNameTerms,
          isSameCategory ? `Category: ${lost.category}` : null,
          ...matchedDetails
        ].filter(Boolean);

        matches.push({
          id: `match_${lost.id}_${found.id}`,
          score: totalScore,
          confidence: confidencePercentage,
          matchLevel: confidencePercentage >= 75 ? 'High Match' : 'Possible Match',
          lostItem: lost,
          foundItem: found,
          reasons: reasons
        });
      }
    });
  });

  matches.sort((a, b) => b.score - a.score);
  return matches;
}

// Render Possible Matches
function renderMatches() {
  const container = document.getElementById('matches-grid');
  const counter = document.getElementById('matches-counter');
  if (!container) return;

  const matches = calculateMatches();

  if (counter) {
    counter.textContent = matches.length > 0 ? `${matches.length} Possible Match${matches.length === 1 ? '' : 'es'}` : '0 Matches';
  }

  container.innerHTML = '';

  if (matches.length === 0) {
    container.innerHTML = `
      <div class="empty-matches-card">
        <span class="empty-matches-icon">🔎</span>
        <h3>No Possible Matches Found Right Now</h3>
        <p>
          Our automated matching engine actively compares all active reports by item name and category. As more lost and found reports are submitted, genuine matches will automatically appear here.
        </p>
      </div>
    `;
    return;
  }

  matches.forEach(match => {
    const card = document.createElement('div');
    card.className = 'match-card';
    card.setAttribute('data-id', match.id);

    const lost = match.lostItem;
    const found = match.foundItem;

    const safeLostName = escapeHtml(lost.itemName);
    const safeFoundName = escapeHtml(found.itemName);
    const safeCategory = escapeHtml(lost.category || found.category);
    const safeLostLoc = escapeHtml(lost.location);
    const safeFoundLoc = escapeHtml(found.foundLocation);
    const safeLostDesc = escapeHtml(lost.description || 'No additional details.');
    const safeFoundNotes = escapeHtml(found.identifyingMarks || found.foundDescription || 'Deposited with campus staff.');
    const safeReasons = escapeHtml(match.reasons.join(' • '));

    card.innerHTML = `
      <div class="match-card-header">
        <div class="match-badge-wrap">
          <span class="match-tag">${match.matchLevel}</span>
          <span class="match-confidence">${match.confidence}% Similarity Score</span>
        </div>
        <span class="match-category-tag">📁 ${safeCategory}</span>
      </div>

      <div class="match-card-body">
        <div class="match-pane match-pane-lost">
          <span class="pane-label pane-label-lost">Lost Item Report</span>
          <h4 class="pane-title">${safeLostName}</h4>
          <p class="pane-desc">${safeLostDesc}</p>
          <div class="pane-meta">
            <div class="pane-meta-row">
              <span class="pane-meta-label">📍 Lost At:</span>
              <span class="pane-meta-val">${safeLostLoc}</span>
            </div>
            <div class="pane-meta-row">
              <span class="pane-meta-label">📅 Date:</span>
              <span class="pane-meta-val">${formatDate(lost.dateLost)}</span>
            </div>
          </div>
        </div>

        <div class="match-divider-icon" aria-hidden="true">
          <span>⇄</span>
        </div>

        <div class="match-pane match-pane-found">
          <span class="pane-label pane-label-found">Found Item Report</span>
          <h4 class="pane-title">${safeFoundName}</h4>
          <p class="pane-desc">${safeFoundNotes}</p>
          <div class="pane-meta">
            <div class="pane-meta-row">
              <span class="pane-meta-label">📍 Found At:</span>
              <span class="pane-meta-val">${safeFoundLoc}</span>
            </div>
            <div class="pane-meta-row">
              <span class="pane-meta-label">📅 Date:</span>
              <span class="pane-meta-val">${formatDate(found.dateFound)}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="match-card-footer">
        <div class="match-reason-text">
          <strong>Match Factors:</strong> ${safeReasons}
        </div>
        <div class="match-footer-actions">
          <button class="btn-verify-match" type="button">
            Verify Potential Match
          </button>
        </div>
      </div>
    `;

    const verifyBtn = card.querySelector('.btn-verify-match');
    verifyBtn.addEventListener('click', () => {
      alert(
        `Verify Potential Match:\n\n` +
        `Lost Report: "${lost.itemName}"\n` +
        `Found Report: "${found.itemName}"\n\n` +
        `Instructions:\n` +
        `1. Please visit the campus security office or deposit station at "${found.foundLocation}".\n` +
        `2. Bring your official College ID Card.\n` +
        `3. Provide proof or unique identifying details (e.g., serial number, specific marks, unlock pattern) to confirm ownership.`
      );
    });

    container.appendChild(card);
  });
}

// ==========================================
// 4. Card Rendering (Lost & Found)
// ==========================================
function renderLostCards() {
  const grid = document.getElementById('lost-items-grid');
  const counter = document.getElementById('lost-items-counter');
  if (!grid) return;

  const allLost = getAllLostItems();
  const activeItems = allLost.filter(item => (item.status || 'Active') === 'Active');

  if (counter) {
    counter.textContent = `${activeItems.length} Active Items`;
  }

  grid.innerHTML = '';

  if (activeItems.length === 0) {
    grid.innerHTML = `
      <div class="empty-matches-card" style="grid-column: 1 / -1;">
        <span class="empty-matches-icon">✨</span>
        <h3>No Active Lost Items</h3>
        <p>All reported lost items have been successfully resolved or recovered!</p>
      </div>
    `;
    return;
  }

  activeItems.forEach(item => {
    const card = document.createElement('article');
    card.className = 'item-card lost-card';
    card.setAttribute('data-id', item.id);

    const safeName = escapeHtml(item.itemName);
    const safeCategory = escapeHtml(item.category);
    const safeLocation = escapeHtml(item.location);
    const safeDescription = escapeHtml(item.description || 'No additional details provided.');
    const formattedDate = formatDate(item.dateLost);

    card.innerHTML = `
      <div class="card-status-strip lost-strip"></div>
      <div class="card-body">
        <div class="card-meta">
          <div class="meta-tags-wrap">
            <span class="tag tag-lost">Lost</span>
            <span class="tag tag-status-active">Active</span>
            ${safeCategory ? `<span class="item-category-tag">${safeCategory}</span>` : ''}
          </div>
          <span class="item-date">${formattedDate}</span>
        </div>
        <h3 class="item-name">${safeName}</h3>
        <p class="item-desc">${safeDescription}</p>
        <div class="item-details">
          <div class="detail-row">
            <span class="detail-label">📍 Location:</span>
            <span class="detail-val">${safeLocation}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">🔒 Status:</span>
            <span class="detail-val">Active (Private Contact Shielded)</span>
          </div>
        </div>
      </div>
      <div class="card-footer">
        <div class="card-footer-actions">
          <button class="card-action-btn lost-action-btn" type="button">
            I Found This
          </button>
          <button class="card-action-btn btn-mark-returned" type="button" title="Mark this item as recovered/returned">
            ✓ Mark as Returned
          </button>
        </div>
      </div>
    `;

    const actionBtn = card.querySelector('.lost-action-btn');
    actionBtn.addEventListener('click', () => {
      alert(
        `Contact Notice (Privacy Protected):\n\n` +
        `Student contact details are strictly protected.\n` +
        `Please report this matched item to the Campus Security / Helpdesk Office, referencing item: "${item.itemName}" lost at "${item.location}".`
      );
    });

    const returnBtn = card.querySelector('.btn-mark-returned');
    returnBtn.addEventListener('click', () => {
      handleMarkLostItemAsReturned(item.id, item.itemName, item.isDemo, item.createdBy, returnBtn);
    });

    grid.appendChild(card);
  });
}

function renderFoundCards() {
  const grid = document.getElementById('found-items-grid');
  const counter = document.getElementById('found-items-counter');
  if (!grid) return;

  const allFound = getAllFoundItems();
  const activeFound = allFound.filter(item => (item.status || 'Active') === 'Active');

  if (counter) {
    counter.textContent = `${activeFound.length} Items Safe`;
  }

  grid.innerHTML = '';

  activeFound.forEach(item => {
    const card = document.createElement('article');
    card.className = 'item-card found-card';
    card.setAttribute('data-id', item.id);

    const safeName = escapeHtml(item.itemName);
    const safeCategory = escapeHtml(item.category);
    const safeLocation = escapeHtml(item.foundLocation);
    const safeDescription = escapeHtml(item.foundDescription || 'No description provided.');
    const safeMarks = escapeHtml(item.identifyingMarks || 'Handed in by student.');
    const formattedDate = formatDate(item.dateFound);

    card.innerHTML = `
      <div class="card-status-strip found-strip"></div>
      <div class="card-body">
        <div class="card-meta">
          <div class="meta-tags-wrap">
            <span class="tag tag-found">Found</span>
            <span class="tag tag-status-active">Active</span>
            ${safeCategory ? `<span class="item-category-tag found-cat">${safeCategory}</span>` : ''}
          </div>
          <span class="item-date">${formattedDate}</span>
        </div>
        <h3 class="item-name">${safeName}</h3>
        <p class="item-desc">${safeDescription}</p>
        <div class="item-details">
          <div class="detail-row">
            <span class="detail-label">📍 Found At:</span>
            <span class="detail-val">${safeLocation}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">🏢 Notes/Deposit:</span>
            <span class="detail-val">${safeMarks}</span>
          </div>
        </div>
      </div>
      <div class="card-footer">
        <button class="card-action-btn found-action-btn" type="button">
          Claim Item
        </button>
      </div>
    `;

    const actionBtn = card.querySelector('.found-action-btn');
    actionBtn.addEventListener('click', () => {
      alert(
        `Claim Item Notice:\n\n` +
        `To claim "${item.itemName}", please visit the campus security or deposit location: "${item.foundLocation}".\n` +
        `You will need to present your valid Student ID and verify ownership details.`
      );
    });

    grid.appendChild(card);
  });
}

// ==========================================
// 5. Cloud Database Operations & Auth Checks
// ==========================================

// Mark as returned with authentication, ownership enforcement, and cloud save
async function handleMarkLostItemAsReturned(itemId, itemName, isDemo, createdBy, triggerBtn) {
  // Requirement 3: Do not allow unauthenticated users to change item statuses
  if (!currentUser) {
    alert("Authentication Required:\nYou must be signed in to update an item's status in the shared campus database.");
    openAuthModal();
    return;
  }

  // College verification check: only verified @srkrec.ac.in users can mark items as Returned
  if (!isCollegeEmail(currentUser.email)) {
    alert(`Access Restricted:\nOnly verified college accounts ending in @srkrec.ac.in can mark items as Returned (${currentUser.email} is not authorized).`);
    return;
  }

  if (!currentUser.emailVerified) {
    alert(`Email Verification Required:\nYour college email (${currentUser.email}) must be verified before marking items as Returned.`);
    return;
  }

  // Security check: Only the user who created the report (or demo item) can resolve it
  if (!isDemo && createdBy && currentUser.uid !== createdBy) {
    alert(
      `Permission Notice (Ownership Protected):\n\n` +
      `Only the student who submitted the lost report for "${itemName}" can mark it as Returned.\n` +
      `Your current student account does not match the report creator.`
    );
    return;
  }

  const confirmReturn = confirm(`Has "${itemName}" been safely verified and returned to its owner?`);
  if (!confirmReturn) return;

  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.textContent = 'Updating Status...';
  }

  if (isDemo || !db || !isFirebaseConfigured) {
    // For demo items or when cloud config is pending, update in-memory state
    cloudLostItems = cloudLostItems.map(item => item.id === itemId ? { ...item, status: 'Returned' } : item);
    renderLostCards();
    renderMatches();
    alert(`Item Resolved:\n"${itemName}" has been marked as Returned.`);
    return;
  }

  try {
    // Update Cloud Firestore document status
    await db.collection('lost_items').doc(itemId).update({
      status: 'Returned',
      returnedAt: new Date().toISOString(),
      returnedBy: currentUser.uid
    });

    alert(`Cloud Status Updated:\n"${itemName}" has been marked as Returned in the shared campus database.`);
  } catch (error) {
    // Requirement 4: Clearly tell user when cloud save fails
    console.error("Failed to update status in Firestore:", error);
    if (triggerBtn) {
      triggerBtn.disabled = false;
      triggerBtn.textContent = '✓ Mark as Returned';
    }
    alert(`Cloud Update Failed:\nCould not update status in the shared database: ${error.message}\n(Ensure Firestore Security Rules allow authenticated updates).`);
  }
}

// Real-Time Listeners for Cloud Firestore
function setupFirestoreListeners() {
  if (!db || !isFirebaseConfigured) {
    console.log("Firestore listeners skipped (Firebase apiKey placeholder detected).");
    updateCloudStatusUI(false, "Cloud Database: Ready for Firebase Web API Key in firebase-config.js. Showing demo reports.");
    return;
  }

  updateCloudStatusUI(true, "Cloud Sync Active: Connected to Firebase Project college-lost-found-f661a");

  // 1. Listen for Public Lost Items
  db.collection('lost_items')
    .where('status', '==', 'Active')
    .onSnapshot((snapshot) => {
      cloudLostItems = [];
      snapshot.forEach(doc => {
        cloudLostItems.push({ id: doc.id, ...doc.data() });
      });
      renderLostCards();
      renderMatches();
    }, (error) => {
      console.error("Firestore lost_items read error:", error);
      updateCloudStatusUI(false, `Cloud Read Error: ${error.message}. Please configure Firestore Security Rules.`);
    });

  // 2. Listen for Public Found Items
  db.collection('found_items')
    .where('status', '==', 'Active')
    .onSnapshot((snapshot) => {
      cloudFoundItems = [];
      snapshot.forEach(doc => {
        cloudFoundItems.push({ id: doc.id, ...doc.data() });
      });
      renderFoundCards();
      renderMatches();
    }, (error) => {
      console.error("Firestore found_items read error:", error);
    });
}

function updateCloudStatusUI(isConnected, message) {
  const banner = document.getElementById('cloud-status-banner');
  const text = document.getElementById('cloud-status-text');
  if (banner && text) {
    text.textContent = message;
    banner.style.display = 'block';
  }
}

// ==========================================
// 6. Document Initialization & Modal Setup
// ==========================================
let openAuthModal = () => {};

document.addEventListener('DOMContentLoaded', () => {
  console.log('Campus Lost & Found System initialized.');

  // Initial UI Render
  renderLostCards();
  renderFoundCards();
  renderMatches();

  // Setup Firebase Real-Time Synchronization
  setupFirestoreListeners();

  // Helper to extract clean display name and email from an authenticated Firebase user
  function getAuthUserDetails(user) {
    if (!user) return { name: '', email: '' };

    let name = user.displayName || '';
    if (!name && Array.isArray(user.providerData)) {
      for (const p of user.providerData) {
        if (p && p.displayName) {
          name = p.displayName;
          break;
        }
      }
    }

    let email = user.email || '';
    if (!email && Array.isArray(user.providerData)) {
      for (const p of user.providerData) {
        if (p && p.email) {
          email = p.email;
          break;
        }
      }
    }

    if (!name && email) {
      name = email.split('@')[0];
    }

    return { name: name.trim(), email: email.trim() };
  }

  // Dynamic UI updater for report forms based on real authenticated Firebase user state
  function updateFormAuthUI() {
    const lostContainer = document.getElementById('lost-auth-status-container');
    const foundContainer = document.getElementById('found-auth-status-container');
    const lostSubmitBtn = document.getElementById('modal-lost-submit-btn');
    const foundSubmitBtn = document.getElementById('modal-found-submit-btn');
    const lostEmailInput = document.getElementById('lost-contact-email');
    const foundEmailInput = document.getElementById('found-contact-email');
    const lostNameInput = document.getElementById('lost-contact-name');
    const foundNameInput = document.getElementById('found-contact-name');

    [lostContainer, foundContainer].forEach(container => {
      if (!container) return;
      const isLost = container === lostContainer;
      const submitBtn = isLost ? lostSubmitBtn : foundSubmitBtn;
      const emailInput = isLost ? lostEmailInput : foundEmailInput;
      const nameInput = isLost ? lostNameInput : foundNameInput;
      const actionLabel = isLost ? 'Submit Lost Report' : 'Submit Found Report';

      if (isAuthLoading) {
        container.innerHTML = `
          <div class="form-auth-notice form-auth-loading">
            <span class="auth-notice-icon">⏳</span>
            <div class="auth-notice-body">
              <strong>Checking campus sign-in status...</strong>
              <p>Verifying active student credentials with Firebase Auth.</p>
            </div>
          </div>
        `;
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Verifying Account...';
        }
        return;
      }

      if (!currentUser) {
        container.innerHTML = `
          <div class="form-auth-notice form-auth-required">
            <span class="auth-notice-icon">🔒</span>
            <div class="auth-notice-body">
              <strong>College Sign-In Required</strong>
              <p>You must be signed in with a verified @srkrec.ac.in account to submit a report.</p>
            </div>
            <button type="button" class="btn btn-primary-solid btn-sm btn-prompt-signin">Sign In</button>
          </div>
        `;
        const signinBtn = container.querySelector('.btn-prompt-signin');
        if (signinBtn) {
          signinBtn.addEventListener('click', () => openAuthModal());
        }
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Sign In to Submit Report';
        }
        if (emailInput) {
          emailInput.value = '';
          emailInput.placeholder = 'Sign in with your @srkrec.ac.in account';
        }
        if (nameInput) {
          nameInput.value = '';
          nameInput.placeholder = 'Sign in to auto-fill your name';
        }
        return;
      }

      const { name, email } = getAuthUserDetails(currentUser);

      if (emailInput) {
        emailInput.value = email;
        emailInput.readOnly = true;
      }
      if (nameInput && (!nameInput.value || nameInput.value === 'Demo Student')) {
        nameInput.value = name || email.split('@')[0];
      }

      if (!currentUser.emailVerified) {
        container.innerHTML = `
          <div class="form-auth-notice form-auth-unverified">
            <span class="auth-notice-icon">⚠️</span>
            <div class="auth-notice-body">
              <strong>Email Verification Required</strong>
              <p>Your college account (<code>${escapeHtml(email)}</code>) is pending email verification.</p>
            </div>
            <div class="auth-notice-actions">
              <button type="button" class="btn btn-outline btn-sm btn-resend-inline">Resend Link</button>
              <button type="button" class="btn btn-primary-solid btn-sm btn-refresh-inline">I've Verified (Refresh)</button>
            </div>
          </div>
        `;
        const resendBtn = container.querySelector('.btn-resend-inline');
        if (resendBtn) {
          resendBtn.addEventListener('click', async () => {
            try {
              resendBtn.disabled = true;
              resendBtn.textContent = 'Sending...';
              await currentUser.sendEmailVerification();
              alert(`Verification email resent to ${currentUser.email}. Please check your inbox and spam folder.`);
            } catch (err) {
              alert(`Failed to resend verification email: ${err.message}`);
            } finally {
              resendBtn.disabled = false;
              resendBtn.textContent = 'Resend Link';
            }
          });
        }
        const refreshBtn = container.querySelector('.btn-refresh-inline');
        if (refreshBtn) {
          refreshBtn.addEventListener('click', async () => {
            try {
              refreshBtn.disabled = true;
              refreshBtn.textContent = 'Checking...';
              await currentUser.reload();
              currentUser = auth.currentUser;
              if (currentUser && currentUser.emailVerified) {
                alert("Email verified successfully! You can now submit your report.");
              } else {
                alert(`Email ${currentUser ? currentUser.email : ''} is still unverified. Please open the link in your inbox first.`);
              }
              updateFormAuthUI();
            } catch (err) {
              alert(`Could not refresh verification status: ${err.message}`);
            } finally {
              refreshBtn.disabled = false;
              refreshBtn.textContent = "I've Verified (Refresh)";
            }
          });
        }
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Verify Email to Submit';
        }
        return;
      }

      // Fully verified college user!
      container.innerHTML = `
        <div class="form-auth-notice form-auth-verified">
          <span class="auth-notice-icon">✅</span>
          <div class="auth-notice-body">
            <strong>Authenticated Student: ${escapeHtml(name || email)}</strong>
            <p class="auth-verified-pill">Verified @srkrec.ac.in Account (${escapeHtml(email)})</p>
          </div>
        </div>
      `;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = actionLabel;
      }
    });
  }

  // Pre-fill or synchronize authenticated user contact details into reporting forms
  function syncAuthFields(user) {
    const lostNameEl = document.getElementById('lost-contact-name');
    const lostEmailEl = document.getElementById('lost-contact-email');
    const foundNameEl = document.getElementById('found-contact-name');
    const foundEmailEl = document.getElementById('found-contact-email');

    if (user) {
      const { name, email } = getAuthUserDetails(user);
      if (lostNameEl && name) lostNameEl.value = name;
      if (lostEmailEl && email) {
        lostEmailEl.value = email;
        lostEmailEl.readOnly = true;
      }
      if (foundNameEl && name) foundNameEl.value = name;
      if (foundEmailEl && email) {
        foundEmailEl.value = email;
        foundEmailEl.readOnly = true;
      }
    } else {
      // User signed out: clear fields completely to protect privacy and avoid stale/demo confusion
      if (lostNameEl) lostNameEl.value = '';
      if (lostEmailEl) {
        lostEmailEl.value = '';
        lostEmailEl.placeholder = 'Sign in with your @srkrec.ac.in account';
      }
      if (foundNameEl) foundNameEl.value = '';
      if (foundEmailEl) {
        foundEmailEl.value = '';
        foundEmailEl.placeholder = 'Sign in with your @srkrec.ac.in account';
      }
    }
    updateFormAuthUI();
  }

  // Setup Auth State Listener
  if (auth && isFirebaseConfigured) {
    auth.onAuthStateChanged(user => {
      isAuthLoading = false;

      if (user && !isCollegeEmail(user.email)) {
        console.warn("Unauthorized domain detected, signing out user:", user.email);
        const unauthorizedEmail = user.email;
        auth.signOut();
        currentUser = null;
        syncAuthFields(null);
        const navAuthBtn = document.getElementById('nav-auth-btn');
        const authBtnText = document.getElementById('auth-btn-text');
        if (navAuthBtn) navAuthBtn.classList.remove('signed-in');
        if (authBtnText) authBtnText.textContent = 'Student Sign In';
        alert(`Access Restricted: Only verified college accounts ending in @srkrec.ac.in are permitted.\n\nSigned-in account (${unauthorizedEmail}) is not an authorized SRKR Engineering College account.`);
        return;
      }

      currentUser = user;
      const navAuthBtn = document.getElementById('nav-auth-btn');
      const authBtnText = document.getElementById('auth-btn-text');

      if (user) {
        if (navAuthBtn) navAuthBtn.classList.add('signed-in');
        if (authBtnText) {
          const { name, email } = getAuthUserDetails(user);
          authBtnText.textContent = name ? name.split(' ')[0] : (email ? email.split('@')[0] : 'Signed In');
        }
        syncAuthFields(user);
      } else {
        if (navAuthBtn) navAuthBtn.classList.remove('signed-in');
        if (authBtnText) authBtnText.textContent = 'Student Sign In';
        syncAuthFields(null);
      }
    });
  } else {
    isAuthLoading = false;
    updateFormAuthUI();
  }

  // ----------------------------------------------------
  // Modal 3: Authentication Modal Logic
  // ----------------------------------------------------
  const authModalOverlay = document.getElementById('auth-modal-overlay');
  const navAuthBtn = document.getElementById('nav-auth-btn');
  const modalAuthCloseBtn = document.getElementById('modal-auth-close-btn');
  const authForm = document.getElementById('auth-form');
  const authErrorDiv = document.getElementById('auth-form-error');
  const authErrorText = document.getElementById('auth-error-text');
  const authGoogleBtn = document.getElementById('auth-google-btn');
  const authTabSignIn = document.getElementById('auth-tab-signin');
  const authTabSignUp = document.getElementById('auth-tab-signup');
  const authSubmitBtn = document.getElementById('auth-submit-btn');
  const authSubtext = document.getElementById('auth-subtext');
  const authModalTitle = document.getElementById('auth-modal-title');
  let authMode = 'signin'; // 'signin' or 'signup'

  function setAuthMode(mode) {
    authMode = mode;
    if (authErrorDiv) authErrorDiv.style.display = 'none';
    const emailErr = document.getElementById('error-auth-email');
    const passErr = document.getElementById('error-auth-password');
    if (emailErr) emailErr.classList.remove('visible');
    if (passErr) passErr.classList.remove('visible');

    if (mode === 'signin') {
      if (authTabSignIn) {
        authTabSignIn.classList.add('active');
        authTabSignIn.setAttribute('aria-selected', 'true');
      }
      if (authTabSignUp) {
        authTabSignUp.classList.remove('active');
        authTabSignUp.setAttribute('aria-selected', 'false');
      }
      if (authSubmitBtn) authSubmitBtn.textContent = 'Sign In with Email';
      if (authModalTitle) authModalTitle.textContent = 'Sign In to Campus Portal';
      if (authSubtext) authSubtext.textContent = 'Sign in using your email address to submit reports, verify belongings, and update item statuses.';
    } else {
      if (authTabSignUp) {
        authTabSignUp.classList.add('active');
        authTabSignUp.setAttribute('aria-selected', 'true');
      }
      if (authTabSignIn) {
        authTabSignIn.classList.remove('active');
        authTabSignIn.setAttribute('aria-selected', 'false');
      }
      if (authSubmitBtn) authSubmitBtn.textContent = 'Create Account';
      if (authModalTitle) authModalTitle.textContent = 'Create an Account';
      if (authSubtext) authSubtext.textContent = 'Create a secure account with your email to submit reports and manage active lost items.';
    }
  }

  if (authTabSignIn) authTabSignIn.addEventListener('click', () => setAuthMode('signin'));
  if (authTabSignUp) authTabSignUp.addEventListener('click', () => setAuthMode('signup'));

  openAuthModal = function() {
    if (authModalOverlay) {
      authModalOverlay.classList.add('active');
      authModalOverlay.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      if (authErrorDiv) authErrorDiv.style.display = 'none';
      setAuthMode('signin');
      const emailInput = document.getElementById('auth-email');
      if (emailInput) emailInput.focus();
    }
  };

  function closeAuthModal() {
    if (authModalOverlay) {
      authModalOverlay.classList.remove('active');
      authModalOverlay.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      if (authSubmitBtn) {
        authSubmitBtn.disabled = false;
        authSubmitBtn.textContent = authMode === 'signin' ? 'Sign In with Email' : 'Create Account';
      }
    }
  }

  if (navAuthBtn) navAuthBtn.addEventListener('click', () => {
    if (currentUser) {
      const { name, email } = getAuthUserDetails(currentUser);
      const userIdentifier = name || email || 'User';
      if (confirm(`Currently signed in as: ${userIdentifier}.\nWould you like to sign out?`)) {
        if (auth && isFirebaseConfigured) {
          auth.signOut();
        } else {
          currentUser = null;
          navAuthBtn.classList.remove('signed-in');
          const authBtnText = document.getElementById('auth-btn-text');
          if (authBtnText) authBtnText.textContent = 'Student Sign In';
          syncAuthFields(null);
        }
      }
    } else {
      openAuthModal();
    }
  });

  if (modalAuthCloseBtn) modalAuthCloseBtn.addEventListener('click', closeAuthModal);

  // Google Sign-In with Firebase Auth SDK (Compat)
  if (authGoogleBtn) {
    authGoogleBtn.addEventListener('click', async () => {
      if (authErrorDiv) authErrorDiv.style.display = 'none';

      if (!auth || !isFirebaseConfigured || typeof firebase === 'undefined' || !firebase.auth) {
        if (authErrorText) authErrorText.textContent = 'Firebase Authentication is not available or configured.';
        if (authErrorDiv) authErrorDiv.style.display = 'flex';
        return;
      }

      const originalBtnHtml = authGoogleBtn.innerHTML;

      try {
        authGoogleBtn.disabled = true;
        authGoogleBtn.innerHTML = `
          <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          Connecting to Google...`;

        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account', hd: 'srkrec.ac.in' });

        const result = await auth.signInWithPopup(provider);
        if (result && result.user) {
          if (!isCollegeEmail(result.user.email)) {
            const unauthorizedEmail = result.user.email;
            await auth.signOut();
            currentUser = null;
            syncAuthFields(null);
            if (authErrorText) {
              authErrorText.textContent = `Access Restricted: Only verified @srkrec.ac.in college accounts can access this portal (${unauthorizedEmail} is not allowed).`;
            }
            if (authErrorDiv) authErrorDiv.style.display = 'flex';
            return;
          }
          currentUser = result.user;
          syncAuthFields(result.user);
        }
        closeAuthModal();
      } catch (err) {
        console.error("Google authentication error:", err);
        if (err.code === 'auth/popup-closed-by-user') {
          // Handled cancellation gracefully
          if (authErrorText) authErrorText.textContent = 'Sign-in cancelled: The Google popup was closed before completing.';
        } else if (err.code === 'auth/cancelled-popup-request') {
          if (authErrorText) authErrorText.textContent = 'Only one sign-in popup can be active at a time.';
        } else if (err.code === 'auth/popup-blocked') {
          if (authErrorText) authErrorText.textContent = 'Popup blocked by your browser. Please allow popups for this site and try again.';
        } else if (err.code === 'auth/account-exists-with-different-credential') {
          if (authErrorText) authErrorText.textContent = 'An account already exists with this email using a different sign-in method.';
        } else if (err.code === 'auth/network-request-failed') {
          if (authErrorText) authErrorText.textContent = 'Network error. Please check your internet connection.';
        } else if (err.code === 'auth/unauthorized-domain') {
          if (authErrorText) authErrorText.textContent = 'This domain is not authorized in Firebase Console (Authentication > Settings > Authorized domains).';
        } else if (err.code === 'auth/operation-not-allowed') {
          if (authErrorText) authErrorText.textContent = 'Google Sign-In is not enabled in Firebase Console (Authentication > Sign-in method).';
        } else {
          if (authErrorText) authErrorText.textContent = err.message || 'Failed to sign in with Google. Please try again.';
        }
        if (authErrorDiv) authErrorDiv.style.display = 'flex';
      } finally {
        authGoogleBtn.disabled = false;
        authGoogleBtn.innerHTML = originalBtnHtml;
      }
    });
  }

  // Email & Password Authentication (Restricted to verified @srkrec.ac.in accounts)
  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value;

      if (!isValidEmail(email) || !isCollegeEmail(email)) {
        const err = document.getElementById('error-auth-email');
        if (err) {
          err.textContent = "Only college email addresses ending in @srkrec.ac.in are allowed.";
          err.classList.add('visible');
        }
        return;
      }
      if (!password || password.length < 6) {
        document.getElementById('error-auth-password').classList.add('visible');
        return;
      }

      if (authSubmitBtn) {
        authSubmitBtn.disabled = true;
        authSubmitBtn.textContent = authMode === 'signin' ? 'Signing in...' : 'Creating Account...';
      }

      if (!auth || !isFirebaseConfigured) {
        // Simulated local auth when Firebase is pending
        currentUser = { uid: 'demo_user_' + Date.now(), email: email, displayName: email.split('@')[0], emailVerified: true, isAnonymous: false };
        const authBtnText = document.getElementById('auth-btn-text');
        if (authBtnText) authBtnText.textContent = email.split('@')[0];
        const navBtn = document.getElementById('nav-auth-btn');
        if (navBtn) navBtn.classList.add('signed-in');
        syncAuthFields(currentUser);
        alert(`Signed in locally as: ${email}\n(Configure your Firebase Authentication in firebase-config.js to enable cloud authentication).`);
        closeAuthModal();
        return;
      }

      try {
        if (authMode === 'signin') {
          // Explicit Sign In
          const cred = await auth.signInWithEmailAndPassword(email, password);
          if (cred && cred.user) {
            currentUser = cred.user;
            syncAuthFields(cred.user);
            if (!cred.user.emailVerified) {
              alert(`Account Notice (${email}):\n\nYour college email address has not been verified yet.\n\nPlease check your inbox and click the verification link before submitting Lost or Found reports.`);
            }
          }
          closeAuthModal();
        } else {
          // Explicit Sign Up
          const cred = await auth.createUserWithEmailAndPassword(email, password);
          if (cred && cred.user) {
            currentUser = cred.user;
            await cred.user.sendEmailVerification();
            syncAuthFields(cred.user);
            alert(`Account Created Successfully!\n\nA verification email has been sent to ${email}.\n\nPlease open your inbox (and spam folder) and verify your email address before submitting Lost or Found reports.`);
          }
          closeAuthModal();
        }
      } catch (err) {
        console.error("Firebase auth error:", err);
        if (authMode === 'signin') {
          if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
            authErrorText.textContent = "Invalid email or password. Please verify credentials or click 'Create Account' to register.";
          } else if (err.code === 'auth/too-many-requests') {
            authErrorText.textContent = "Too many failed attempts. Please wait a few moments and try again.";
          } else {
            authErrorText.textContent = err.message;
          }
        } else {
          if (err.code === 'auth/email-already-in-use') {
            authErrorText.textContent = "An account with this email already exists. Please switch to 'Sign In'.";
          } else if (err.code === 'auth/weak-password') {
            authErrorText.textContent = "Password is too weak. Please use at least 6 characters.";
          } else {
            authErrorText.textContent = err.message;
          }
        }
        authErrorDiv.style.display = 'flex';
      } finally {
        if (authSubmitBtn) {
          authSubmitBtn.disabled = false;
          authSubmitBtn.textContent = authMode === 'signin' ? 'Sign In with Email' : 'Create Account';
        }
      }
    });
  }

  // ----------------------------------------------------
  // Modal 1: Report Lost Item Logic
  // ----------------------------------------------------
  const lostModalOverlay = document.getElementById('lost-modal-overlay');
  const btnReportLost = document.getElementById('btn-report-lost');
  const modalLostCloseBtn = document.getElementById('modal-lost-close-btn');
  const modalLostCancelBtn = document.getElementById('modal-lost-cancel-btn');
  const lostForm = document.getElementById('lost-item-form');
  const lostSuccessAlert = document.getElementById('lost-form-success');
  const lostErrorAlert = document.getElementById('lost-form-error');
  const lostErrorMsg = document.getElementById('lost-error-message');

  const inputLostName = document.getElementById('lost-item-name');
  const selectLostCategory = document.getElementById('lost-category');
  const inputLostDate = document.getElementById('lost-date');
  const inputLostLocation = document.getElementById('lost-location');
  const inputLostDescription = document.getElementById('lost-description');
  const inputLostContactName = document.getElementById('lost-contact-name');
  const inputLostContactEmail = document.getElementById('lost-contact-email');

  const todayStr = new Date().toISOString().split('T')[0];
  if (inputLostDate) {
    inputLostDate.value = todayStr;
    inputLostDate.max = todayStr;
  }

  function openLostModal() {
    if (lostModalOverlay) {
      lostModalOverlay.classList.add('active');
      lostModalOverlay.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      if (lostSuccessAlert) lostSuccessAlert.style.display = 'none';
      if (lostErrorAlert) lostErrorAlert.style.display = 'none';
      updateFormAuthUI();
      if (inputLostName) inputLostName.focus();
    }
  }

  function closeLostModal() {
    if (lostModalOverlay) {
      lostModalOverlay.classList.remove('active');
      lostModalOverlay.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      clearLostFormErrors();
      const submitBtn = document.getElementById('modal-lost-submit-btn');
      if (submitBtn) {
        submitBtn.disabled = !currentUser || !currentUser.emailVerified;
        submitBtn.textContent = 'Submit Lost Report';
      }
    }
  }

  function clearLostFormErrors() {
    lostModalOverlay.querySelectorAll('.error-msg').forEach(el => el.classList.remove('visible'));
    lostModalOverlay.querySelectorAll('.form-group input, .form-group select').forEach(el => el.classList.remove('invalid'));
  }

  if (btnReportLost) btnReportLost.addEventListener('click', openLostModal);
  if (modalLostCloseBtn) modalLostCloseBtn.addEventListener('click', closeLostModal);
  if (modalLostCancelBtn) modalLostCancelBtn.addEventListener('click', closeLostModal);

  if (lostForm) {
    lostForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearLostFormErrors();
      if (lostErrorAlert) lostErrorAlert.style.display = 'none';

      // 1. Enforce authenticated user as single source of truth
      if (!currentUser) {
        if (lostErrorAlert && lostErrorMsg) {
          lostErrorMsg.textContent = "Authentication Required: You must be signed in with your verified @srkrec.ac.in college account to submit a report.";
          lostErrorAlert.style.display = 'flex';
        }
        openAuthModal();
        return;
      }

      if (!isCollegeEmail(currentUser.email)) {
        if (lostErrorAlert && lostErrorMsg) {
          lostErrorMsg.textContent = `Access Restricted: Reports can only be submitted by verified college accounts ending in @srkrec.ac.in (${currentUser.email} is not authorized).`;
          lostErrorAlert.style.display = 'flex';
        }
        return;
      }

      // 2. Reload auth user state to catch newly verified emails
      if (auth && currentUser.reload) {
        try {
          await currentUser.reload();
          currentUser = auth.currentUser;
        } catch (reloadErr) {
          console.warn("Could not reload auth state:", reloadErr);
        }
      }

      if (!currentUser.emailVerified) {
        updateFormAuthUI();
        if (lostErrorAlert && lostErrorMsg) {
          lostErrorMsg.textContent = `Email Verification Required: Your college email (${currentUser.email}) must be verified before submitting reports.`;
          lostErrorAlert.style.display = 'flex';
        }
        return;
      }

      // 3. Validate form inputs
      let hasErrors = false;
      const nameVal = inputLostName.value.trim();
      if (!nameVal || nameVal.length < 2 || nameVal.length > 100) {
        const err = document.getElementById('error-lost-item-name');
        if (err) {
          err.textContent = !nameVal ? "Please enter the item name." : "Item name must be between 2 and 100 characters.";
          err.classList.add('visible');
        }
        inputLostName.classList.add('invalid');
        hasErrors = true;
      }

      const catVal = selectLostCategory.value;
      if (!catVal) {
        document.getElementById('error-lost-category').classList.add('visible');
        selectLostCategory.classList.add('invalid');
        hasErrors = true;
      }

      const dateVal = inputLostDate.value;
      if (!dateVal || dateVal > todayStr) {
        const err = document.getElementById('error-lost-date');
        if (err) {
          err.textContent = !dateVal ? "Please pick the date when it was lost." : "Date lost cannot be in the future.";
          err.classList.add('visible');
        }
        inputLostDate.classList.add('invalid');
        hasErrors = true;
      }

      const locVal = inputLostLocation.value.trim();
      if (!locVal) {
        document.getElementById('error-lost-location').classList.add('visible');
        inputLostLocation.classList.add('invalid');
        hasErrors = true;
      }

      const contactNameVal = (inputLostContactName.value.trim() || getAuthUserDetails(currentUser).name || currentUser.email.split('@')[0]);
      if (!contactNameVal || contactNameVal.length < 2) {
        const err = document.getElementById('error-lost-contact-name');
        if (err) err.classList.add('visible');
        inputLostContactName.classList.add('invalid');
        hasErrors = true;
      }

      if (hasErrors) return;

      const submitBtn = document.getElementById('modal-lost-submit-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting Report...';
      }

      // 4. Construct Public Report (contains NO contact name or email)
      const publicReport = {
        itemName: nameVal,
        category: catVal,
        dateLost: dateVal,
        location: locVal,
        description: inputLostDescription.value.trim(),
        status: 'Active',
        createdAt: new Date().toISOString(),
        createdBy: currentUser.uid
      };

      // 5. Construct Private Contact Details (derived securely from authenticated Firebase user)
      const privateContactInfo = {
        contactName: contactNameVal,
        contactEmail: currentUser.email.toLowerCase().trim(),
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString()
      };

      if (!db || !isFirebaseConfigured) {
        // Fallback for local preview without cloud config
        const localItem = { id: 'lost_' + Date.now(), ...publicReport };
        cloudLostItems.unshift(localItem);
        renderLostCards();
        renderMatches();

        if (lostSuccessAlert) lostSuccessAlert.style.display = 'flex';
        lostForm.reset();
        inputLostDate.value = todayStr;
        updateFormAuthUI();

        setTimeout(() => {
          closeLostModal();
          const lostSection = document.getElementById('lost-section');
          if (lostSection) lostSection.scrollIntoView({ behavior: 'smooth' });
        }, 1400);
        return;
      }

      try {
        // Atomic batched write: creates public report and private contact simultaneously
        const batch = db.batch();
        const lostDocRef = db.collection('lost_items').doc();
        const contactDocRef = lostDocRef.collection('private_contact').doc('details');

        batch.set(lostDocRef, publicReport);
        batch.set(contactDocRef, privateContactInfo);

        await batch.commit();

        if (lostSuccessAlert) lostSuccessAlert.style.display = 'flex';
        lostForm.reset();
        inputLostDate.value = todayStr;
        updateFormAuthUI();

        setTimeout(() => {
          closeLostModal();
          const lostSection = document.getElementById('lost-section');
          if (lostSection) lostSection.scrollIntoView({ behavior: 'smooth' });
        }, 1400);
      } catch (err) {
        console.error("Firestore atomic lost item submission failed:", err);
        if (lostErrorAlert && lostErrorMsg) {
          lostErrorMsg.textContent = `Cloud Save Failed: ${err.message}. Please check your connection or permissions.`;
          lostErrorAlert.style.display = 'flex';
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Lost Report';
        }
      }
    });

    [inputLostName, selectLostCategory, inputLostDate, inputLostLocation, inputLostContactName, inputLostContactEmail].forEach(field => {
      if (field) {
        field.addEventListener('input', () => {
          field.classList.remove('invalid');
          const err = field.parentElement.querySelector('.error-msg');
          if (err) err.classList.remove('visible');
        });
      }
    });
  }

  // ----------------------------------------------------
  // Modal 2: Report Found Item Logic
  // ----------------------------------------------------
  const foundModalOverlay = document.getElementById('found-modal-overlay');
  const btnReportFound = document.getElementById('btn-report-found');
  const modalFoundCloseBtn = document.getElementById('modal-found-close-btn');
  const modalFoundCancelBtn = document.getElementById('modal-found-cancel-btn');
  const foundForm = document.getElementById('found-item-form');
  const foundSuccessAlert = document.getElementById('found-form-success');
  const foundErrorAlert = document.getElementById('found-form-error');
  const foundErrorMsg = document.getElementById('found-error-message');

  const inputFoundName = document.getElementById('found-item-name');
  const selectFoundCategory = document.getElementById('found-category');
  const inputFoundDate = document.getElementById('found-date');
  const inputFoundLocation = document.getElementById('found-location');
  const inputFoundDescription = document.getElementById('found-description');
  const inputFoundMarks = document.getElementById('found-marks');
  const inputFoundFinderName = document.getElementById('found-contact-name');
  const inputFoundFinderEmail = document.getElementById('found-contact-email');

  if (inputFoundDate) {
    inputFoundDate.value = todayStr;
    inputFoundDate.max = todayStr;
  }

  function openFoundModal() {
    if (foundModalOverlay) {
      foundModalOverlay.classList.add('active');
      foundModalOverlay.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      if (foundSuccessAlert) foundSuccessAlert.style.display = 'none';
      if (foundErrorAlert) foundErrorAlert.style.display = 'none';
      updateFormAuthUI();
      if (inputFoundName) inputFoundName.focus();
    }
  }

  function closeFoundModal() {
    if (foundModalOverlay) {
      foundModalOverlay.classList.remove('active');
      foundModalOverlay.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      clearFoundFormErrors();
      const submitBtn = document.getElementById('modal-found-submit-btn');
      if (submitBtn) {
        submitBtn.disabled = !currentUser || !currentUser.emailVerified;
        submitBtn.textContent = 'Submit Found Report';
      }
    }
  }

  function clearFoundFormErrors() {
    foundModalOverlay.querySelectorAll('.error-msg').forEach(el => el.classList.remove('visible'));
    foundModalOverlay.querySelectorAll('.form-group input, .form-group select').forEach(el => el.classList.remove('invalid'));
  }

  if (btnReportFound) btnReportFound.addEventListener('click', openFoundModal);
  if (modalFoundCloseBtn) modalFoundCloseBtn.addEventListener('click', closeFoundModal);
  if (modalFoundCancelBtn) modalFoundCancelBtn.addEventListener('click', closeFoundModal);

  if (foundForm) {
    foundForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFoundFormErrors();
      if (foundErrorAlert) foundErrorAlert.style.display = 'none';

      // 1. Enforce authenticated user as single source of truth
      if (!currentUser) {
        if (foundErrorAlert && foundErrorMsg) {
          foundErrorMsg.textContent = "Authentication Required: You must be signed in with your verified @srkrec.ac.in college account to submit a report.";
          foundErrorAlert.style.display = 'flex';
        }
        openAuthModal();
        return;
      }

      if (!isCollegeEmail(currentUser.email)) {
        if (foundErrorAlert && foundErrorMsg) {
          foundErrorMsg.textContent = `Access Restricted: Reports can only be submitted by verified college accounts ending in @srkrec.ac.in (${currentUser.email} is not authorized).`;
          foundErrorAlert.style.display = 'flex';
        }
        return;
      }

      // 2. Reload auth user state to catch newly verified emails
      if (auth && currentUser.reload) {
        try {
          await currentUser.reload();
          currentUser = auth.currentUser;
        } catch (reloadErr) {
          console.warn("Could not reload auth state:", reloadErr);
        }
      }

      if (!currentUser.emailVerified) {
        updateFormAuthUI();
        if (foundErrorAlert && foundErrorMsg) {
          foundErrorMsg.textContent = `Email Verification Required: Your college email (${currentUser.email}) must be verified before submitting reports.`;
          foundErrorAlert.style.display = 'flex';
        }
        return;
      }

      // 3. Validate form inputs
      let hasErrors = false;
      const nameVal = inputFoundName.value.trim();
      if (!nameVal || nameVal.length < 2 || nameVal.length > 100) {
        const err = document.getElementById('error-found-item-name');
        if (err) {
          err.textContent = !nameVal ? "Please enter the item name." : "Item name must be between 2 and 100 characters.";
          err.classList.add('visible');
        }
        inputFoundName.classList.add('invalid');
        hasErrors = true;
      }

      const catVal = selectFoundCategory.value;
      if (!catVal) {
        document.getElementById('error-found-category').classList.add('visible');
        selectFoundCategory.classList.add('invalid');
        hasErrors = true;
      }

      const dateVal = inputFoundDate.value;
      if (!dateVal || dateVal > todayStr) {
        const err = document.getElementById('error-found-date');
        if (err) {
          err.textContent = !dateVal ? "Please pick the date when it was found." : "Date found cannot be in the future.";
          err.classList.add('visible');
        }
        inputFoundDate.classList.add('invalid');
        hasErrors = true;
      }

      const locVal = inputFoundLocation.value.trim();
      if (!locVal) {
        document.getElementById('error-found-location').classList.add('visible');
        inputFoundLocation.classList.add('invalid');
        hasErrors = true;
      }

      const finderNameVal = (inputFoundFinderName.value.trim() || getAuthUserDetails(currentUser).name || currentUser.email.split('@')[0]);
      if (!finderNameVal || finderNameVal.length < 2) {
        const err = document.getElementById('error-found-contact-name');
        if (err) err.classList.add('visible');
        inputFoundFinderName.classList.add('invalid');
        hasErrors = true;
      }

      if (hasErrors) return;

      const submitBtn = document.getElementById('modal-found-submit-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting Report...';
      }

      // 4. Construct Public Report (contains NO contact name or email)
      const publicFoundReport = {
        itemName: nameVal,
        category: catVal,
        dateFound: dateVal,
        foundLocation: locVal,
        foundDescription: inputFoundDescription.value.trim(),
        identifyingMarks: inputFoundMarks.value.trim(),
        status: 'Active',
        createdAt: new Date().toISOString(),
        createdBy: currentUser.uid
      };

      // 5. Construct Private Finder Details (derived securely from authenticated Firebase user)
      const privateFinderInfo = {
        finderName: finderNameVal,
        finderEmail: currentUser.email.toLowerCase().trim(),
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString()
      };

      if (!db || !isFirebaseConfigured) {
        const localFound = { id: 'found_' + Date.now(), ...publicFoundReport };
        cloudFoundItems.unshift(localFound);
        renderFoundCards();
        renderMatches();

        if (foundSuccessAlert) foundSuccessAlert.style.display = 'flex';
        foundForm.reset();
        inputFoundDate.value = todayStr;
        updateFormAuthUI();

        setTimeout(() => {
          closeFoundModal();
          const foundSection = document.getElementById('found-section');
          if (foundSection) foundSection.scrollIntoView({ behavior: 'smooth' });
        }, 1400);
        return;
      }

      try {
        // Atomic batched write: creates public found report and private finder info simultaneously
        const batch = db.batch();
        const foundDocRef = db.collection('found_items').doc();
        const finderDocRef = foundDocRef.collection('private_contact').doc('details');

        batch.set(foundDocRef, publicFoundReport);
        batch.set(finderDocRef, privateFinderInfo);

        await batch.commit();

        if (foundSuccessAlert) foundSuccessAlert.style.display = 'flex';
        foundForm.reset();
        inputFoundDate.value = todayStr;
        updateFormAuthUI();

        setTimeout(() => {
          closeFoundModal();
          const foundSection = document.getElementById('found-section');
          if (foundSection) foundSection.scrollIntoView({ behavior: 'smooth' });
        }, 1400);
      } catch (err) {
        console.error("Firestore atomic found item submission failed:", err);
        if (foundErrorAlert && foundErrorMsg) {
          foundErrorMsg.textContent = `Cloud Save Failed: ${err.message}. Please check your connection or permissions.`;
          foundErrorAlert.style.display = 'flex';
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Found Report';
        }
      }
    });

    [inputFoundName, selectFoundCategory, inputFoundDate, inputFoundLocation, inputFoundFinderName, inputFoundFinderEmail].forEach(field => {
      if (field) {
        field.addEventListener('input', () => {
          field.classList.remove('invalid');
          const err = field.parentElement.querySelector('.error-msg');
          if (err) err.classList.remove('visible');
        });
      }
    });
  }

  // Global Escape key handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (lostModalOverlay && lostModalOverlay.classList.contains('active')) closeLostModal();
      if (foundModalOverlay && foundModalOverlay.classList.contains('active')) closeFoundModal();
      if (authModalOverlay && authModalOverlay.classList.contains('active')) closeAuthModal();
    }
  });

  // ----------------------------------------------------
  // 7. Live Search Bar Filter for All Cards & Matches
  // ----------------------------------------------------
  const searchInput = document.getElementById('item-search-input');
  const searchBtn = document.getElementById('search-btn');

  function filterItems() {
    const query = (searchInput.value || '').toLowerCase().trim();
    const allCards = document.querySelectorAll('.item-card, .match-card');

    allCards.forEach(card => {
      const cardText = card.innerText.toLowerCase();
      if (cardText.includes(query)) {
        card.style.display = card.classList.contains('item-card') ? 'flex' : 'block';
      } else {
        card.style.display = 'none';
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', filterItems);
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      filterItems();
    });
  }
});
