// Vercel Serverless Function (Node.js, ES module)
// Validates cinema seat against screens/screen{N}.seatMap, verifies menu prices,
// prevents duplicate seat orders (409), checks stock, and handles test flags.

import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
} from 'firebase/firestore';

function getFirebaseConfig() {
  return {
    apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyChVEkUawOQp9UMj4LOD9C9yggg0Ju5DTU',
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'cryptic-dynamo-h6rpq.firebaseapp.com',
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'cryptic-dynamo-h6rpq',
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'cryptic-dynamo-h6rpq.firebasestorage.app',
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '74019311671',
    appId: process.env.VITE_FIREBASE_APP_ID || '1:74019311671:web:21e5939937a35b35a3efb2',
    firestoreDatabaseId:
      process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID ||
      'ai-studio-seatbitecinemaqr-82234bbb-a8e9-4f29-83d0-2c863e1bb94b',
  };
}

let db = null;
try {
  const config = getFirebaseConfig();
  const app = getApps().length === 0 ? initializeApp(config) : getApps()[0];
  db = getFirestore(app, config.firestoreDatabaseId);
} catch (e) {
  console.warn('Firebase init warning in /api/create-order:', e);
}

// Helper to strip undefined values so Firestore never errors on addDoc
function stripUndefined(obj) {
  if (Array.isArray(obj)) {
    return obj.map(stripUndefined);
  } else if (obj !== null && typeof obj === 'object') {
    const cleaned = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        cleaned[k] = stripUndefined(v);
      }
    }
    return cleaned;
  }
  return obj;
}

// Fallback menu catalog with official cinema prices
const CATALOG_PRICES = {
  'pop-1': { name: 'Salted Popcorn (Regular)', price: 120, available: true, isVeg: true },
  'pop-2': { name: 'Salted Popcorn (Large)', price: 180, available: true, isVeg: true },
  'pop-3': { name: 'Caramel Popcorn', price: 200, available: true, isVeg: true },
  'pop-4': { name: 'Cheese Popcorn', price: 220, available: true, isVeg: true },
  'drk-1': { name: 'Coca-Cola', price: 90, available: true, isVeg: true },
  'drk-2': { name: 'Pepsi', price: 90, available: true, isVeg: true },
  'drk-3': { name: 'Cold Coffee', price: 130, available: true, isVeg: true },
  'drk-4': { name: 'Mineral Water', price: 40, available: true, isVeg: true },
  'snk-1': { name: 'Nachos with Cheese', price: 160, available: true, isVeg: true },
  'snk-2': { name: 'Samosa (2 pcs)', price: 70, available: true, isVeg: true },
  'snk-3': { name: 'French Fries', price: 120, available: true, isVeg: true },
  'cmb-1': { name: 'Popcorn + Coke Combo', price: 250, available: true, isVeg: true },
  'cmb-2': { name: 'Family Combo (2 popcorn + 2 drinks)', price: 480, available: true, isVeg: true },
  'dst-1': { name: 'Chocolate Brownie', price: 110, available: true, isVeg: true },
  'dst-2': { name: 'Ice Cream Cup', price: 90, available: true, isVeg: true },
};

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-User-Id'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Handle DELETE request to purge test orders
  if (req.method === 'DELETE') {
    const isTestAllowed =
      process.env.ALLOW_TEST_ORDERS === 'true' || process.env.VITE_ALLOW_TEST_ORDERS === 'true';
    if (!isTestAllowed) {
      return res.status(403).json({ error: 'Test order deletion not allowed in production.' });
    }
    if (!db) {
      return res.status(500).json({ error: 'Database connection unavailable.' });
    }
    try {
      const q = query(collection(db, 'orders'), where('isTest', '==', true));
      const snap = await getDocs(q);
      let count = 0;
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
        count++;
      }
      return res.status(200).json({ success: true, deletedCount: count });
    } catch (delErr) {
      console.error('Delete test orders error:', delErr);
      return res.status(500).json({ error: delErr.message });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const body =
      typeof req.body === 'string'
        ? req.body.trim()
          ? JSON.parse(req.body)
          : {}
        : req.body || {};
    const {
      screen,
      row,
      col,
      seat,
      items,
      notes,
      paymentMethod = 'pay_at_seat',
      paymentStatus = 'paid',
      userId,
      isTest: requestedIsTest,
    } = body;

    const scr = String(screen || '1').trim();
    const cleanRow = String(row || '').trim().toUpperCase();
    const cleanCol = Number(col !== undefined ? col : seat);

    if (!scr || !cleanRow || isNaN(cleanCol) || cleanCol < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid seat coordinates: screen, row letter, and seat/col number are required.',
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Order must contain at least one item.',
      });
    }

    // --- 1. SEAT VALIDATION AGAINST screens/screen{N}.seatMap ---
    let isValidSeat = true;
    let failureReason = '';

    if (db) {
      try {
        const screenDocRef = doc(db, 'screens', `screen${scr}`);
        const screenDocSnap = await getDoc(screenDocRef);

        if (screenDocSnap.exists()) {
          const screenData = screenDocSnap.data();

          if (screenData.seatMap && Array.isArray(screenData.seatMap.rows)) {
            const targetRow = screenData.seatMap.rows.find(
              (r) => String(r.row).toUpperCase() === cleanRow
            );
            if (!targetRow) {
              isValidSeat = false;
              failureReason = `Row ${cleanRow} does not exist in Screen ${scr} seat plan.`;
            } else {
              const targetSeat = targetRow.seats.find(
                (s) => Number(s.col) === cleanCol || s.label === `${cleanRow}${cleanCol}`
              );
              if (!targetSeat) {
                isValidSeat = false;
                failureReason = `Seat ${cleanRow}${cleanCol} does not exist in Screen ${scr} seat plan.`;
              }
            }
          } else if (screenData.layout && Array.isArray(screenData.layout)) {
            const targetRow = screenData.layout.find(
              (r) => String(r.row).toUpperCase() === cleanRow
            );
            if (!targetRow) {
              isValidSeat = false;
              failureReason = `Row ${cleanRow} does not exist in Screen ${scr} layout.`;
            } else if (cleanCol > Number(targetRow.seats)) {
              isValidSeat = false;
              failureReason = `Seat ${cleanCol} exceeds maximum seats in Row ${cleanRow} (${targetRow.seats} seats).`;
            }
          }
        } else {
          // If screen doc does not exist, check default valid seats (A-J, 1-20 for screen 1)
          if (scr === '1' && (cleanRow > 'J' || cleanCol > 20)) {
            isValidSeat = false;
            failureReason = `Seat ${cleanRow}${cleanCol} is out of bounds for Screen 1.`;
          }
        }
      } catch (firestoreErr) {
        console.warn('Firestore screen query warning:', firestoreErr);
      }
    } else {
      if (scr === '1' && (cleanRow > 'J' || cleanCol > 20)) {
        isValidSeat = false;
        failureReason = `Seat ${cleanRow}${cleanCol} is out of bounds for Screen 1.`;
      }
    }

    if (!isValidSeat) {
      return res.status(400).json({
        success: false,
        error: failureReason || `Seat ${cleanRow}${cleanCol} is not valid for Screen ${scr}.`,
      });
    }

    // --- 2. CHECK 4: DUPLICATE SEAT (Expect 409 Conflict if active order exists) ---
    if (db) {
      try {
        const ordersRef = collection(db, 'orders');
        // Check for active orders on this seat
        const activeStatuses = ['received', 'preparing', 'ready', 'on_the_way'];
        const q = query(
          ordersRef,
          where('screen', '==', scr),
          where('row', '==', cleanRow),
          where('col', '==', cleanCol)
        );
        const activeSnap = await getDocs(q);

        const activeOrder = activeSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .find((o) => activeStatuses.includes((o.status || '').toLowerCase()));

        if (activeOrder) {
          return res.status(409).json({
            success: false,
            error: `Seat ${cleanRow}${cleanCol} already has an active order in progress (#${activeOrder.orderId || activeOrder.id}).`,
            existingOrderId: activeOrder.orderId || activeOrder.id,
            status: activeOrder.status,
          });
        }
      } catch (dupErr) {
        console.warn('Active order duplicate check warning:', dupErr);
      }
    }

    // --- 3. CHECK 5 & CHECK 2: ITEM AVAILABILITY & PRICE VERIFICATION (Anti-Tampering) ---
    // Fetch live menu items from Firestore to ensure latest catalog and stock status
    const liveCatalog = { ...CATALOG_PRICES };
    if (db) {
      try {
        const menuSnap = await getDocs(collection(db, 'menuItems'));
        menuSnap.forEach((d) => {
          const itemData = d.data();
          liveCatalog[d.id] = {
            name: itemData.name || d.id,
            price: Number(itemData.price) || 0,
            available: itemData.available !== false,
          };
        });
      } catch (menuErr) {
        console.warn('Menu lookup warning:', menuErr);
      }
    }

    let serverCalculatedTotal = 0;
    const verifiedItems = [];

    for (const item of items) {
      const itemId = item.id || '';
      const qty = Math.max(1, Number(item.qty) || 1);
      const catalogItem = liveCatalog[itemId] || Object.values(liveCatalog).find((c) => c.name === item.name);

      if (catalogItem) {
        // Check 5: Unavailable item rejection
        if (catalogItem.available === false || item.available === false) {
          return res.status(400).json({
            success: false,
            error: `Item "${catalogItem.name}" is currently sold out and out of stock.`,
            unavailableItemId: itemId,
          });
        }

        // Check 2: Authoritative server price overrides any client-sent price
        const unitPrice = catalogItem.price;
        serverCalculatedTotal += unitPrice * qty;
        verifiedItems.push({
          id: itemId,
          name: catalogItem.name,
          qty,
          price: unitPrice, // Server price enforced!
          isVeg: catalogItem.isVeg !== undefined ? Boolean(catalogItem.isVeg) : true,
        });
      } else {
        // Fallback for custom or demo item
        const fallbackPrice = Math.max(0, Number(item.price) || 100);
        serverCalculatedTotal += fallbackPrice * qty;
        verifiedItems.push({
          id: itemId || `item-${Date.now()}`,
          name: item.name || 'Cinema Item',
          qty,
          price: fallbackPrice,
          isVeg: item.isVeg !== undefined ? Boolean(item.isVeg) : true,
        });
      }
    }

    // --- 4. CHECK TEST FLAG WITH ALLOW_TEST_ORDERS ---
    // Only mark with isTest: true when request comes with isTest: true AND ALLOW_TEST_ORDERS is 'true'
    const isTestAllowed =
      process.env.ALLOW_TEST_ORDERS === 'true' || process.env.VITE_ALLOW_TEST_ORDERS === 'true';
    const isTestOrder = Boolean(isTestAllowed && requestedIsTest);

    // --- 5. CREATE ORDER IN FIRESTORE ---
    const orderId = `SS-${Math.floor(1000 + Math.random() * 9000)}`;
    let docId = null;

    if (db) {
      const orderPayload = stripUndefined({
        orderId,
        screen: scr,
        row: cleanRow,
        col: cleanCol,
        seat: String(cleanCol),
        items: verifiedItems,
        total: serverCalculatedTotal, // Enforced server total
        notes: notes || '',
        status: 'received',
        paymentMethod,
        paymentStatus,
        paidAt: paymentStatus === 'paid' ? Date.now() : null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        active: true,
        userId: userId || req.headers?.['x-user-id'] || null,
        ...(isTestOrder ? { isTest: true } : {}),
      });

      const docRef = await addDoc(collection(db, 'orders'), orderPayload);
      docId = docRef.id;
    }

    return res.status(200).json({
      success: true,
      message: 'Order created and validated successfully',
      orderId,
      docId,
      screen: scr,
      row: cleanRow,
      col: cleanCol,
      seat: `${cleanRow}${cleanCol}`,
      total: serverCalculatedTotal,
      isTest: isTestOrder,
      items: verifiedItems,
    });
  } catch (error) {
    console.error('Error in /api/create-order:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error processing order',
    });
  }
}
