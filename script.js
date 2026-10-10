/* 
  College Lost & Found Management System
  File: script.js
  Purpose: Form validation, LocalStorage management, dynamic card rendering, Lost & Found Match Engine, and Item Status Management.
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
    contactName: 'Arjun Sharma',
    contactEmail: 'student-cs@college.edu',
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
    contactName: 'Priya Patel',
    contactEmail: 'student-mech@college.edu',
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
    contactName: 'Rohit Verma',
    contactEmail: 'student-ece@college.edu',
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
    finderName: 'Kavita Singh',
    finderEmail: 'kavita.cs@college.edu',
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
    finderName: 'Sameer Khan',
    finderEmail: 'sameer.sports@college.edu',
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
    finderName: 'Ananya Roy',
    finderEmail: 'ananya.arts@college.edu',
    status: 'Active',
    isDemo: true
  }
];

// ==========================================
// 2. LocalStorage Keys & Data Helpers
// ==========================================
const STORAGE_KEY_LOST = 'campus_lost_items';
const STORAGE_KEY_FOUND = 'campus_found_items';

// Load stored lost items from localStorage
function getStoredLostItems() {
  const data = localStorage.getItem(STORAGE_KEY_LOST);
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    // Ensure all items have a valid status, defaulting to 'Active'
    return parsed.map(item => ({
      ...item,
      status: item.status || 'Active'
    }));
  } catch (e) {
    console.error('Failed to parse lost items from localStorage', e);
    return [];
  }
}

// Save lost items array to localStorage
function saveStoredLostItems(items) {
  localStorage.setItem(STORAGE_KEY_LOST, JSON.stringify(items));
}

// Get all lost items (merging stored items with demo items without losing status changes)
function getAllLostItems() {
  const stored = getStoredLostItems();
  const storedIds = new Set(stored.map(i => i.id));
  const unoverriddenDemos = INITIAL_LOST_ITEMS
    .filter(d => !storedIds.has(d.id))
    .map(d => ({ ...d, status: d.status || 'Active' }));
  
  return [...stored, ...unoverriddenDemos];
}

// Load stored found items from localStorage
function getStoredFoundItems() {
  const data = localStorage.getItem(STORAGE_KEY_FOUND);
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    return parsed.map(item => ({
      ...item,
      status: item.status || 'Active'
    }));
  } catch (e) {
    console.error('Failed to parse found items from localStorage', e);
    return [];
  }
}

// Save found items array to localStorage
function saveStoredFoundItems(items) {
  localStorage.setItem(STORAGE_KEY_FOUND, JSON.stringify(items));
}

// Get all found items
function getAllFoundItems() {
  const stored = getStoredFoundItems();
  const storedIds = new Set(stored.map(i => i.id));
  const unoverriddenDemos = INITIAL_FOUND_ITEMS
    .filter(d => !storedIds.has(d.id))
    .map(d => ({ ...d, status: d.status || 'Active' }));
  
  return [...stored, ...unoverriddenDemos];
}

// Format date into human-friendly string (e.g., Oct 09, 2026)
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

// Escape HTML to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Helper: validate email address format
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Stop words to ignore during title & keyword parsing
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'room', 'floor',
  'block', 'near', 'desk', 'left', 'found', 'lost', 'some', 'item', 'have',
  'been', 'area', 'building', 'campus', 'college', 'student', 'which', 'what',
  'where', 'when', 'into', 'over', 'back', 'front', 'side', 'about', 'just',
  'navy', 'blue', 'black', 'white', 'silver', 'red', 'green', 'yellow', 'dark',
  'light', 'small', 'large', 'brand', 'color'
]);

// Helper: normalize text
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper: extract substantive keywords from item names
function extractNameKeywords(text) {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  return normalized
    .split(' ')
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
}

// Helper: extract general keywords
function extractGeneralKeywords(text) {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  return normalized
    .split(' ')
    .filter(word => word.length > 2);
}

// ==========================================
// 3. High-Precision Match Calculation Engine
// ==========================================
function calculateMatches() {
  // Only match ACTIVE items (Returned items are excluded from matches)
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

      // RULE 1: Item name match gatekeeper
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

      // Reject if no item name match
      if (nameScore === 0) {
        return;
      }

      // RULE 2: Category Compatibility
      let categoryScore = 0;
      const isSameCategory = (lostCategory && foundCategory && lostCategory === foundCategory);
      const isOneOtherCategory = (lostCategory === 'other' || foundCategory === 'other');

      if (isSameCategory) {
        categoryScore = 25;
      } else if (isOneOtherCategory) {
        categoryScore = 10;
      } else {
        if (!isExactName) {
          return;
        }
      }

      // RULE 3: Secondary Location & Details Boosters
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

// Render the Possible Matches section
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
        <!-- Lost Side -->
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

        <!-- Center Connector Icon -->
        <div class="match-divider-icon" aria-hidden="true">
          <span>⇄</span>
        </div>

        <!-- Found Side -->
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

    // Safe verify button handler
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
// 4. Action: Mark Item as Returned
// ==========================================
function markLostItemAsReturned(itemId, itemName) {
  const confirmReturn = confirm(`Has "${itemName}" been safely verified and returned to its owner?`);
  if (!confirmReturn) return;

  // Retrieve current list, update item status to 'Returned'
  const allLost = getAllLostItems();
  const updatedList = allLost.map(item => {
    if (item.id === itemId) {
      return { ...item, status: 'Returned', returnedAt: new Date().toISOString() };
    }
    return item;
  });

  // Save updated list in localStorage
  saveStoredLostItems(updatedList);

  // Re-render UI immediately
  renderLostCards();
  renderMatches();

  alert(`Item Resolved:\n"${itemName}" has been marked as Returned and moved from active listings.`);
}

// ==========================================
// 5. Card Rendering Functions (Lost & Found)
// ==========================================

// Render all active lost item cards
function renderLostCards() {
  const grid = document.getElementById('lost-items-grid');
  const counter = document.getElementById('lost-items-counter');
  if (!grid) return;

  // Filter only ACTIVE lost items
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
    const safeReporter = escapeHtml(item.contactName);
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
            <span class="detail-label">👤 Reported By:</span>
            <span class="detail-val">${safeReporter}</span>
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

    // Safe contact notice
    const actionBtn = card.querySelector('.lost-action-btn');
    actionBtn.addEventListener('click', () => {
      alert(
        `Contact Notice (Privacy Protected):\n\n` +
        `Direct contact details are shielded for privacy.\n` +
        `Please bring this item to the Campus Security / Helpdesk Office and reference reporter: "${item.contactName}" for item "${item.itemName}".`
      );
    });

    // Mark as Returned Button handler
    const returnBtn = card.querySelector('.btn-mark-returned');
    returnBtn.addEventListener('click', () => {
      markLostItemAsReturned(item.id, item.itemName);
    });

    grid.appendChild(card);
  });
}

// Render all active found item cards
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

    // Safe claim click
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
// 6. Document Initialization & Event Setup
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('Campus Lost & Found System initialized.');

  // 1. Initial Render of all cards and calculated matches
  renderLostCards();
  renderFoundCards();
  renderMatches();

  // ----------------------------------------------------
  // Modal 1: Report Lost Item Logic
  // ----------------------------------------------------
  const lostModalOverlay = document.getElementById('lost-modal-overlay');
  const btnReportLost = document.getElementById('btn-report-lost');
  const modalLostCloseBtn = document.getElementById('modal-lost-close-btn');
  const modalLostCancelBtn = document.getElementById('modal-lost-cancel-btn');
  const lostForm = document.getElementById('lost-item-form');
  const lostSuccessAlert = document.getElementById('lost-form-success');

  const inputLostName = document.getElementById('lost-item-name');
  const selectLostCategory = document.getElementById('lost-category');
  const inputLostDate = document.getElementById('lost-date');
  const inputLostLocation = document.getElementById('lost-location');
  const inputLostDescription = document.getElementById('lost-description');
  const inputLostContactName = document.getElementById('lost-contact-name');
  const inputLostContactEmail = document.getElementById('lost-contact-email');

  if (inputLostDate) {
    inputLostDate.value = new Date().toISOString().split('T')[0];
  }

  function openLostModal() {
    if (lostModalOverlay) {
      lostModalOverlay.classList.add('active');
      lostModalOverlay.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      if (lostSuccessAlert) lostSuccessAlert.style.display = 'none';
      if (inputLostName) inputLostName.focus();
    }
  }

  function closeLostModal() {
    if (lostModalOverlay) {
      lostModalOverlay.classList.remove('active');
      lostModalOverlay.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      clearLostFormErrors();
    }
  }

  function clearLostFormErrors() {
    lostModalOverlay.querySelectorAll('.error-msg').forEach(el => el.classList.remove('visible'));
    lostModalOverlay.querySelectorAll('.form-group input, .form-group select').forEach(el => el.classList.remove('invalid'));
  }

  if (btnReportLost) btnReportLost.addEventListener('click', openLostModal);
  if (modalLostCloseBtn) modalLostCloseBtn.addEventListener('click', closeLostModal);
  if (modalLostCancelBtn) modalLostCancelBtn.addEventListener('click', closeLostModal);

  if (lostModalOverlay) {
    lostModalOverlay.addEventListener('click', (e) => {
      if (e.target === lostModalOverlay) closeLostModal();
    });
  }

  if (lostForm) {
    lostForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearLostFormErrors();

      let hasErrors = false;
      const nameVal = inputLostName.value.trim();
      if (!nameVal) {
        document.getElementById('error-lost-item-name').classList.add('visible');
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
      if (!dateVal) {
        document.getElementById('error-lost-date').classList.add('visible');
        inputLostDate.classList.add('invalid');
        hasErrors = true;
      }

      const locVal = inputLostLocation.value.trim();
      if (!locVal) {
        document.getElementById('error-lost-location').classList.add('visible');
        inputLostLocation.classList.add('invalid');
        hasErrors = true;
      }

      const contactNameVal = inputLostContactName.value.trim();
      if (!contactNameVal) {
        document.getElementById('error-lost-contact-name').classList.add('visible');
        inputLostContactName.classList.add('invalid');
        hasErrors = true;
      }

      const contactEmailVal = inputLostContactEmail.value.trim();
      if (!contactEmailVal || !isValidEmail(contactEmailVal)) {
        document.getElementById('error-lost-contact-email').classList.add('visible');
        inputLostContactEmail.classList.add('invalid');
        hasErrors = true;
      }

      if (hasErrors) return;

      const newLostItem = {
        id: 'lost_' + Date.now(),
        itemName: nameVal,
        category: catVal,
        dateLost: dateVal,
        location: locVal,
        description: inputLostDescription.value.trim(),
        contactName: contactNameVal,
        contactEmail: contactEmailVal,
        status: 'Active',
        createdAt: new Date().toISOString()
      };

      const existingLost = getAllLostItems();
      existingLost.unshift(newLostItem);
      saveStoredLostItems(existingLost);

      // Re-render lost cards and recalculate smart matches immediately!
      renderLostCards();
      renderMatches();

      if (lostSuccessAlert) lostSuccessAlert.style.display = 'flex';
      lostForm.reset();
      inputLostDate.value = new Date().toISOString().split('T')[0];

      setTimeout(() => {
        closeLostModal();
        const lostSection = document.getElementById('lost-section');
        if (lostSection) lostSection.scrollIntoView({ behavior: 'smooth' });
      }, 1400);
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

  const inputFoundName = document.getElementById('found-item-name');
  const selectFoundCategory = document.getElementById('found-category');
  const inputFoundDate = document.getElementById('found-date');
  const inputFoundLocation = document.getElementById('found-location');
  const inputFoundDescription = document.getElementById('found-description');
  const inputFoundMarks = document.getElementById('found-marks');
  const inputFoundFinderName = document.getElementById('found-contact-name');
  const inputFoundFinderEmail = document.getElementById('found-contact-email');

  if (inputFoundDate) {
    inputFoundDate.value = new Date().toISOString().split('T')[0];
  }

  function openFoundModal() {
    if (foundModalOverlay) {
      foundModalOverlay.classList.add('active');
      foundModalOverlay.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      if (foundSuccessAlert) foundSuccessAlert.style.display = 'none';
      if (inputFoundName) inputFoundName.focus();
    }
  }

  function closeFoundModal() {
    if (foundModalOverlay) {
      foundModalOverlay.classList.remove('active');
      foundModalOverlay.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      clearFoundFormErrors();
    }
  }

  function clearFoundFormErrors() {
    foundModalOverlay.querySelectorAll('.error-msg').forEach(el => el.classList.remove('visible'));
    foundModalOverlay.querySelectorAll('.form-group input, .form-group select').forEach(el => el.classList.remove('invalid'));
  }

  if (btnReportFound) btnReportFound.addEventListener('click', openFoundModal);
  if (modalFoundCloseBtn) modalFoundCloseBtn.addEventListener('click', closeFoundModal);
  if (modalFoundCancelBtn) modalFoundCancelBtn.addEventListener('click', closeFoundModal);

  if (foundModalOverlay) {
    foundModalOverlay.addEventListener('click', (e) => {
      if (e.target === foundModalOverlay) closeFoundModal();
    });
  }

  if (foundForm) {
    foundForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearFoundFormErrors();

      let hasErrors = false;

      const nameVal = inputFoundName.value.trim();
      if (!nameVal) {
        document.getElementById('error-found-item-name').classList.add('visible');
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
      if (!dateVal) {
        document.getElementById('error-found-date').classList.add('visible');
        inputFoundDate.classList.add('invalid');
        hasErrors = true;
      }

      const locVal = inputFoundLocation.value.trim();
      if (!locVal) {
        document.getElementById('error-found-location').classList.add('visible');
        inputFoundLocation.classList.add('invalid');
        hasErrors = true;
      }

      const finderNameVal = inputFoundFinderName.value.trim();
      if (!finderNameVal) {
        document.getElementById('error-found-contact-name').classList.add('visible');
        inputFoundFinderName.classList.add('invalid');
        hasErrors = true;
      }

      const finderEmailVal = inputFoundFinderEmail.value.trim();
      if (!finderEmailVal || !isValidEmail(finderEmailVal)) {
        document.getElementById('error-found-contact-email').classList.add('visible');
        inputFoundFinderEmail.classList.add('invalid');
        hasErrors = true;
      }

      if (hasErrors) return;

      const newFoundItem = {
        id: 'found_' + Date.now(),
        itemName: nameVal,
        category: catVal,
        dateFound: dateVal,
        foundLocation: locVal,
        foundDescription: inputFoundDescription.value.trim(),
        identifyingMarks: inputFoundMarks.value.trim(),
        finderName: finderNameVal,
        finderEmail: finderEmailVal,
        status: 'Active',
        createdAt: new Date().toISOString()
      };

      const existingFound = getAllFoundItems();
      existingFound.unshift(newFoundItem);
      saveStoredFoundItems(existingFound);

      // Re-render found cards and recalculate smart matches immediately!
      renderFoundCards();
      renderMatches();

      if (foundSuccessAlert) foundSuccessAlert.style.display = 'flex';
      foundForm.reset();
      inputFoundDate.value = new Date().toISOString().split('T')[0];

      setTimeout(() => {
        closeFoundModal();
        const foundSection = document.getElementById('found-section');
        if (foundSection) foundSection.scrollIntoView({ behavior: 'smooth' });
      }, 1400);
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

  // Global Escape key handler to close whichever modal is active
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (lostModalOverlay && lostModalOverlay.classList.contains('active')) closeLostModal();
      if (foundModalOverlay && foundModalOverlay.classList.contains('active')) closeFoundModal();
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
