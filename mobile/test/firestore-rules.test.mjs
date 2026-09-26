import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { readFile } from 'node:fs/promises';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  test('Firestore rules emulator is explicitly required', { skip: true }, () => {});
} else {
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  const rules = await readFile(new URL('../../firestore.rules', import.meta.url), 'utf8');
  const env = await initializeTestEnvironment({
    projectId: 'beruang-rules-test',
    firestore: { host, port: Number(port), rules },
  });
  after(() => env.cleanup());
  const profile = { email: 'u@example.com', displayName: 'U', photoURL: '', createdAt: '2026-01-01T00:00:00.000Z', plan: 'pending', expiresAt: '2026-01-01T00:00:00.000Z' };
  const data = { transactions: [], hutangs: [], assets: [], recurring: [], goals: [], userName: '', categories: {}, target: 0, _updatedAt: '2026-01-01T00:00:00.000Z', _updatedBy: 'device-a' };
  async function seedProfile(uid = 'u', email = 'u@example.com') {
    await env.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), `users/${uid}/meta/profile`), { ...profile, email });
    });
  }

  test('client cannot create a profile or grant entitlement; owner can edit identity only', async () => {
    const db = env.authenticatedContext('u', { email: 'u@example.com' }).firestore();
    await assertFails(setDoc(doc(db, 'users/u/meta/profile'), profile));
    await seedProfile();
    await assertSucceeds(getDoc(doc(db, 'users/u/meta/profile')));
    await assertSucceeds(updateDoc(doc(db, 'users/u/meta/profile'), { displayName: 'Updated' }));
    await assertFails(updateDoc(doc(db, 'users/u/meta/profile'), { plan: 'annual', expiresAt: '2099-01-01T00:00:00.000Z' }));
    const attacker = env.authenticatedContext('attacker', { email: 'u@example.com' }).firestore();
    await assertFails(getDoc(doc(attacker, 'users/u/meta/profile')));
  });

  test('owner data sync accepts the real schema but rejects unknown authority fields', async () => {
    const db = env.authenticatedContext('u', { email: 'u@example.com' }).firestore();
    await assertSucceeds(setDoc(doc(db, 'users/u/data/main'), data));
    await assertFails(setDoc(doc(db, 'users/u/data/main'), { ...data, plan: 'annual' }));
    await assertFails(setDoc(doc(db, 'users/u/verifiedPaymentReceipts/fake'), { paid: true }));
  });

  test('custom-claim admin can update entitlement while email alone cannot', async () => {
    await seedProfile();
    const emailOnly = env.authenticatedContext('staff', { email: 'admin@example.com' }).firestore();
    await assertFails(updateDoc(doc(emailOnly, 'users/u/meta/profile'), { displayName: 'No' }));
    const admin = env.authenticatedContext('staff', { email: 'staff@example.com', admin: true }).firestore();
    await assertSucceeds(updateDoc(doc(admin, 'users/u/meta/profile'), { plan: 'annual', expiresAt: '2099-01-01T00:00:00.000Z' }));
  });

  test('shared BerBisnis document remains owner-accessible', async () => {
    const db = env.authenticatedContext('u', { email: 'u@example.com' }).firestore();
    await assertSucceeds(setDoc(doc(db, 'users/u/meta/berbisnis-profile'), { active: true }));
  });

  test('deletion tombstone blocks stale owner clients', async () => {
    await seedProfile();
    await env.withSecurityRulesDisabled(async context => setDoc(doc(context.firestore(), 'accountDeletions/u'), { status: 'pending' }));
    const db = env.authenticatedContext('u', { email: 'u@example.com' }).firestore();
    await assertFails(getDoc(doc(db, 'users/u/data/main')));
    await assertFails(updateDoc(doc(db, 'users/u/meta/profile'), { displayName: 'Late write' }));
  });
}
