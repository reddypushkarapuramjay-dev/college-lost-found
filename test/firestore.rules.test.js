const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails
} = require('@firebase/rules-unit-testing');
const {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  setLogLevel
} = require('firebase/firestore');

// Silence default gRPC permission denied error console logs during tests
setLogLevel('error');

const PROJECT_ID = 'college-lost-found-f661a';
const RULES_PATH = path.resolve(__dirname, '../firestore.rules');

describe('Cloud Firestore Security Rules', () => {
  let testEnv;

  before(async () => {
    // Read emulator host from environment or default to local 127.0.0.1:8080
    const hostPort = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
    process.env.FIRESTORE_EMULATOR_HOST = hostPort;
    const [host, portStr] = hostPort.split(':');
    const port = parseInt(portStr, 10) || 8080;

    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host,
        port,
        rules: fs.readFileSync(RULES_PATH, 'utf8')
      }
    });
  });

  after(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();
    }
  });

  // Helper factory for valid lost item documents
  function createValidLostItem(userId) {
    return {
      itemName: 'Scientific Calculator',
      category: 'Electronics',
      dateLost: '2026-10-10',
      location: 'Mechanical Block 204',
      description: 'Casio fx-991EX grey cover with initials',
      status: 'Active',
      createdAt: new Date().toISOString(),
      createdBy: userId
    };
  }

  // Helper factory for valid private contact documents
  function createValidContactDetails(userId, userEmail) {
    return {
      contactName: 'Alice Student',
      contactEmail: userEmail,
      createdBy: userId,
      createdAt: new Date().toISOString()
    };
  }

  // Helper factory for valid found item documents
  function createValidFoundItem(userId) {
    return {
      itemName: 'Campus ID Card',
      category: 'ID Cards',
      dateFound: '2026-10-10',
      foundLocation: 'Central Library',
      foundDescription: 'Blue lanyard with ID card',
      identifyingMarks: 'Roll No ending in 042',
      status: 'Active',
      createdAt: new Date().toISOString(),
      createdBy: userId
    };
  }

  // --------------------------------------------------------------------------
  // Test Case 1: Verified @srkrec.ac.in user can submit a lost report + contact details
  // --------------------------------------------------------------------------
  it('1. A verified user with an @srkrec.ac.in email can submit a valid lost-item report with its private contact details', async () => {
    const userId = 'verified_student_1';
    const userEmail = 'student1@srkrec.ac.in';

    const verifiedUserContext = testEnv.authenticatedContext(userId, {
      email: userEmail,
      email_verified: true
    });
    const db = verifiedUserContext.firestore();

    const itemId = 'lost_item_101';
    const batch = writeBatch(db);

    const lostItemRef = doc(db, 'lost_items', itemId);
    const contactRef = doc(db, 'lost_items', itemId, 'private_contact', 'details');

    batch.set(lostItemRef, createValidLostItem(userId));
    batch.set(contactRef, createValidContactDetails(userId, userEmail));

    await assertSucceeds(batch.commit());
  });

  // --------------------------------------------------------------------------
  // Test Case 2: Unverified college user cannot submit a report
  // --------------------------------------------------------------------------
  it('2. An unverified college user cannot submit a report', async () => {
    const userId = 'unverified_student_2';
    const userEmail = 'student2@srkrec.ac.in';

    const unverifiedUserContext = testEnv.authenticatedContext(userId, {
      email: userEmail,
      email_verified: false // Email not verified
    });
    const db = unverifiedUserContext.firestore();

    const lostItemRef = doc(db, 'lost_items', 'lost_item_102');
    await assertFails(setDoc(lostItemRef, createValidLostItem(userId)));
  });

  // --------------------------------------------------------------------------
  // Test Case 3: User with a non-college email cannot submit a report
  // --------------------------------------------------------------------------
  it('3. A user with a non-college email cannot submit a report', async () => {
    const userId = 'external_user_3';
    const userEmail = 'someone@gmail.com'; // Non-college domain

    const nonCollegeUserContext = testEnv.authenticatedContext(userId, {
      email: userEmail,
      email_verified: true
    });
    const db = nonCollegeUserContext.firestore();

    const lostItemRef = doc(db, 'lost_items', 'lost_item_103');
    await assertFails(setDoc(lostItemRef, createValidLostItem(userId)));
  });

  // --------------------------------------------------------------------------
  // Test Case 4: Public users can read lost and found reports
  // --------------------------------------------------------------------------
  it('4. Public users can read lost and found reports', async () => {
    // Seed reports using administrative bypass (rules disabled)
    await testEnv.withSecurityRulesDisabled(async (adminContext) => {
      const adminDb = adminContext.firestore();

      await setDoc(doc(adminDb, 'lost_items', 'seed_lost_item'), createValidLostItem('author_student'));
      await setDoc(doc(adminDb, 'found_items', 'seed_found_item'), createValidFoundItem('author_student'));
    });

    const publicContext = testEnv.unauthenticatedContext();
    const publicDb = publicContext.firestore();

    // Verify unauthenticated public read on lost_items
    const lostSnap = await assertSucceeds(getDoc(doc(publicDb, 'lost_items', 'seed_lost_item')));
    assert.strictEqual(lostSnap.exists(), true);

    // Verify unauthenticated public read on found_items
    const foundSnap = await assertSucceeds(getDoc(doc(publicDb, 'found_items', 'seed_found_item')));
    assert.strictEqual(foundSnap.exists(), true);
  });

  // --------------------------------------------------------------------------
  // Test Case 5: Nobody can read private contact details from the client
  // --------------------------------------------------------------------------
  it('5. Nobody can read private contact details from the client', async () => {
    const ownerId = 'author_owner_5';
    const ownerEmail = 'owner@srkrec.ac.in';
    const lostItemId = 'lost_private_item_5';
    const foundItemId = 'found_private_item_5';

    // Seed reports and their private contact subcollection documents
    await testEnv.withSecurityRulesDisabled(async (adminContext) => {
      const adminDb = adminContext.firestore();

      // Seed lost item + contact details
      await setDoc(doc(adminDb, 'lost_items', lostItemId), createValidLostItem(ownerId));
      await setDoc(doc(adminDb, 'lost_items', lostItemId, 'private_contact', 'details'), {
        contactName: 'Confidential Owner',
        contactEmail: ownerEmail,
        createdBy: ownerId,
        createdAt: new Date().toISOString()
      });

      // Seed found item + finder details
      await setDoc(doc(adminDb, 'found_items', foundItemId), createValidFoundItem(ownerId));
      await setDoc(doc(adminDb, 'found_items', foundItemId, 'private_contact', 'details'), {
        finderName: 'Confidential Finder',
        finderEmail: ownerEmail,
        createdBy: ownerId,
        createdAt: new Date().toISOString()
      });
    });

    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const ownerDb = testEnv.authenticatedContext(ownerId, {
      email: ownerEmail,
      email_verified: true
    }).firestore();
    const otherStudentDb = testEnv.authenticatedContext('other_student_5', {
      email: 'other@srkrec.ac.in',
      email_verified: true
    }).firestore();

    const lostContactRef = (db) => doc(db, 'lost_items', lostItemId, 'private_contact', 'details');
    const foundContactRef = (db) => doc(db, 'found_items', foundItemId, 'private_contact', 'details');

    // 1. Unauthenticated users cannot read
    await assertFails(getDoc(lostContactRef(unauthDb)));
    await assertFails(getDoc(foundContactRef(unauthDb)));

    // 2. The author/owner themselves cannot read private contact subcollection from the client
    await assertFails(getDoc(lostContactRef(ownerDb)));
    await assertFails(getDoc(foundContactRef(ownerDb)));

    // 3. Other authenticated college students cannot read
    await assertFails(getDoc(lostContactRef(otherStudentDb)));
    await assertFails(getDoc(foundContactRef(otherStudentDb)));
  });

  // --------------------------------------------------------------------------
  // Test Case 6: A user cannot create a report using another user's ID
  // --------------------------------------------------------------------------
  it('6. A user cannot create a report using another user\'s ID', async () => {
    const attackerId = 'attacker_student_6';
    const attackerEmail = 'attacker@srkrec.ac.in';
    const victimId = 'victim_student_99';

    const attackerContext = testEnv.authenticatedContext(attackerId, {
      email: attackerEmail,
      email_verified: true
    });
    const db = attackerContext.firestore();

    // Attacker attempts to spoof createdBy on lost_items
    const spoofedLostItem = {
      ...createValidLostItem(victimId),
      createdBy: victimId // Mismatch with attackerId
    };
    await assertFails(setDoc(doc(db, 'lost_items', 'lost_spoof_6'), spoofedLostItem));

    // Attacker attempts to spoof createdBy on found_items
    const spoofedFoundItem = {
      ...createValidFoundItem(victimId),
      createdBy: victimId // Mismatch with attackerId
    };
    await assertFails(setDoc(doc(db, 'found_items', 'found_spoof_6'), spoofedFoundItem));
  });

  // --------------------------------------------------------------------------
  // Test Case 7: Verified college student can mark their own active lost item as Returned
  // --------------------------------------------------------------------------
  it('7. A verified college student can mark their own active lost item as Returned', async () => {
    const userId = 'student_owner_7';
    const userEmail = 'student7@srkrec.ac.in';

    await testEnv.withSecurityRulesDisabled(async (adminContext) => {
      const adminDb = adminContext.firestore();
      await setDoc(doc(adminDb, 'lost_items', 'lost_item_7'), createValidLostItem(userId));
    });

    const verifiedOwner = testEnv.authenticatedContext(userId, {
      email: userEmail,
      email_verified: true
    });
    const db = verifiedOwner.firestore();

    const itemRef = doc(db, 'lost_items', 'lost_item_7');
    await assertSucceeds(updateDoc(itemRef, {
      status: 'Returned',
      returnedAt: new Date().toISOString(),
      returnedBy: userId
    }));
  });

  // --------------------------------------------------------------------------
  // Test Case 8: Another user cannot mark someone else's item as Returned
  // --------------------------------------------------------------------------
  it('8. Another user cannot mark someone else\'s item as Returned', async () => {
    const ownerId = 'student_owner_8';
    const otherId = 'other_student_8';
    const otherEmail = 'other8@srkrec.ac.in';

    await testEnv.withSecurityRulesDisabled(async (adminContext) => {
      const adminDb = adminContext.firestore();
      await setDoc(doc(adminDb, 'lost_items', 'lost_item_8'), createValidLostItem(ownerId));
    });

    const otherUser = testEnv.authenticatedContext(otherId, {
      email: otherEmail,
      email_verified: true
    });
    const db = otherUser.firestore();

    const itemRef = doc(db, 'lost_items', 'lost_item_8');

    // Attempting to mark returned with returnedBy as self
    await assertFails(updateDoc(itemRef, {
      status: 'Returned',
      returnedAt: new Date().toISOString(),
      returnedBy: otherId
    }));

    // Attempting to mark returned with returnedBy forged as owner
    await assertFails(updateDoc(itemRef, {
      status: 'Returned',
      returnedAt: new Date().toISOString(),
      returnedBy: ownerId
    }));
  });

  // --------------------------------------------------------------------------
  // Test Case 9: An unverified or non-college user cannot mark an item as Returned
  // --------------------------------------------------------------------------
  it('9. An unverified or non-college user cannot mark an item as Returned', async () => {
    const ownerId = 'student_owner_9';

    await testEnv.withSecurityRulesDisabled(async (adminContext) => {
      const adminDb = adminContext.firestore();
      await setDoc(doc(adminDb, 'lost_items', 'lost_item_9'), createValidLostItem(ownerId));
    });

    // 9a. Unverified college user (@srkrec.ac.in with email_verified: false)
    const unverifiedOwner = testEnv.authenticatedContext(ownerId, {
      email: 'student9@srkrec.ac.in',
      email_verified: false
    });
    await assertFails(updateDoc(doc(unverifiedOwner.firestore(), 'lost_items', 'lost_item_9'), {
      status: 'Returned',
      returnedAt: new Date().toISOString(),
      returnedBy: ownerId
    }));

    // 9b. Non-college user (@gmail.com)
    const nonCollegeOwner = testEnv.authenticatedContext(ownerId, {
      email: 'student9@gmail.com',
      email_verified: true
    });
    await assertFails(updateDoc(doc(nonCollegeOwner.firestore(), 'lost_items', 'lost_item_9'), {
      status: 'Returned',
      returnedAt: new Date().toISOString(),
      returnedBy: ownerId
    }));
  });

  // --------------------------------------------------------------------------
  // Test Case 10: A user cannot change other fields while marking an item as Returned
  // --------------------------------------------------------------------------
  it('10. A user cannot change other fields while marking an item as Returned', async () => {
    const ownerId = 'student_owner_10';
    const ownerEmail = 'student10@srkrec.ac.in';

    await testEnv.withSecurityRulesDisabled(async (adminContext) => {
      const adminDb = adminContext.firestore();
      await setDoc(doc(adminDb, 'lost_items', 'lost_item_10'), createValidLostItem(ownerId));
    });

    const verifiedOwner = testEnv.authenticatedContext(ownerId, {
      email: ownerEmail,
      email_verified: true
    });
    const db = verifiedOwner.firestore();
    const itemRef = doc(db, 'lost_items', 'lost_item_10');

    // Attempting to tamper with itemName while returning
    await assertFails(updateDoc(itemRef, {
      status: 'Returned',
      returnedAt: new Date().toISOString(),
      returnedBy: ownerId,
      itemName: 'Altered Item Name'
    }));

    // Attempting to tamper with location while returning
    await assertFails(updateDoc(itemRef, {
      status: 'Returned',
      returnedAt: new Date().toISOString(),
      returnedBy: ownerId,
      location: 'Changed Location'
    }));
  });

  // --------------------------------------------------------------------------
  // Test Case 11: A user cannot delete lost or found reports
  // --------------------------------------------------------------------------
  it('11. A user cannot delete lost or found reports', async () => {
    const studentId = 'student_owner_11';
    const studentEmail = 'student11@srkrec.ac.in';

    await testEnv.withSecurityRulesDisabled(async (adminContext) => {
      const adminDb = adminContext.firestore();
      await setDoc(doc(adminDb, 'lost_items', 'lost_item_11'), createValidLostItem(studentId));
      await setDoc(doc(adminDb, 'found_items', 'found_item_11'), createValidFoundItem(studentId));
    });

    const studentDb = testEnv.authenticatedContext(studentId, {
      email: studentEmail,
      email_verified: true
    }).firestore();
    const unauthDb = testEnv.unauthenticatedContext().firestore();

    // Owner cannot delete their lost item
    await assertFails(deleteDoc(doc(studentDb, 'lost_items', 'lost_item_11')));

    // Owner cannot delete their found item
    await assertFails(deleteDoc(doc(studentDb, 'found_items', 'found_item_11')));

    // Unauthenticated user cannot delete lost item
    await assertFails(deleteDoc(doc(unauthDb, 'lost_items', 'lost_item_11')));

    // Unauthenticated user cannot delete found item
    await assertFails(deleteDoc(doc(unauthDb, 'found_items', 'found_item_11')));
  });

  // Helper factory for valid private finder documents
  function createValidFinderDetails(userId, userEmail) {
    return {
      finderName: 'Bob Finder',
      finderEmail: userEmail,
      createdBy: userId,
      createdAt: new Date().toISOString()
    };
  }

  // --------------------------------------------------------------------------
  // Test Case 12: Invalid returnedAt values are rejected
  // --------------------------------------------------------------------------
  it('12. Invalid returnedAt values are rejected', async () => {
    const ownerId = 'student_owner_12';
    const ownerEmail = 'student12@srkrec.ac.in';

    await testEnv.withSecurityRulesDisabled(async (adminContext) => {
      const adminDb = adminContext.firestore();
      await setDoc(doc(adminDb, 'lost_items', 'lost_item_12'), createValidLostItem(ownerId));
    });

    const verifiedOwner = testEnv.authenticatedContext(ownerId, {
      email: ownerEmail,
      email_verified: true
    });
    const db = verifiedOwner.firestore();
    const itemRef = doc(db, 'lost_items', 'lost_item_12');

    // 12a. Non-date text string
    await assertFails(updateDoc(itemRef, {
      status: 'Returned',
      returnedAt: 'yesterday-afternoon',
      returnedBy: ownerId
    }));

    // 12b. Numeric timestamp instead of ISO string
    await assertFails(updateDoc(itemRef, {
      status: 'Returned',
      returnedAt: 1728561600000,
      returnedBy: ownerId
    }));

    // 12c. Malformed date format
    await assertFails(updateDoc(itemRef, {
      status: 'Returned',
      returnedAt: '10/10/2026 12:00:00',
      returnedBy: ownerId
    }));
  });

  // --------------------------------------------------------------------------
  // Test Case 13: Signed-out user cannot submit a lost or found report
  // --------------------------------------------------------------------------
  it('13. A signed-out (unauthenticated) user cannot submit a lost or found report', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();

    // Attempt to create lost item unauthenticated
    await assertFails(setDoc(doc(unauthDb, 'lost_items', 'unauth_lost_13'), createValidLostItem('someone')));

    // Attempt to create found item unauthenticated
    await assertFails(setDoc(doc(unauthDb, 'found_items', 'unauth_found_13'), createValidFoundItem('someone')));
  });

  // --------------------------------------------------------------------------
  // Test Case 14: Submissions with unexpected or forged extra fields are rejected
  // --------------------------------------------------------------------------
  it('14. Submissions with unexpected or forged extra fields are rejected', async () => {
    const userId = 'student_extra_14';
    const userEmail = 'student14@srkrec.ac.in';

    const db = testEnv.authenticatedContext(userId, {
      email: userEmail,
      email_verified: true
    }).firestore();

    // Attempt to inject an unexpected field into lost_items
    const invalidLostItem = {
      ...createValidLostItem(userId),
      adminBypassFlag: true
    };
    await assertFails(setDoc(doc(db, 'lost_items', 'lost_extra_14'), invalidLostItem));

    // Attempt to inject an unexpected field into found_items
    const invalidFoundItem = {
      ...createValidFoundItem(userId),
      unauthorizedAdminRole: 'moderator'
    };
    await assertFails(setDoc(doc(db, 'found_items', 'found_extra_14'), invalidFoundItem));
  });

  // --------------------------------------------------------------------------
  // Test Case 15: Verified college student can submit a valid found-item report with private finder details
  // --------------------------------------------------------------------------
  it('15. A verified user with an @srkrec.ac.in email can submit a valid found-item report with private finder details', async () => {
    const userId = 'verified_finder_15';
    const userEmail = 'finder15@srkrec.ac.in';

    const db = testEnv.authenticatedContext(userId, {
      email: userEmail,
      email_verified: true
    }).firestore();

    const itemId = 'found_item_115';
    const batch = writeBatch(db);

    const foundItemRef = doc(db, 'found_items', itemId);
    const finderRef = doc(db, 'found_items', itemId, 'private_contact', 'details');

    batch.set(foundItemRef, createValidFoundItem(userId));
    batch.set(finderRef, createValidFinderDetails(userId, userEmail));

    await assertSucceeds(batch.commit());
  });
});
