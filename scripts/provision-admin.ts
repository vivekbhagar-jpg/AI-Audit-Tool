/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Safe Administrator Provisioning CLI Command for NxtWave AI Audit Platform
 * Usage: npx tsx scripts/provision-admin.ts <email> <password>
 */

import bcrypt from 'bcryptjs';
import { db, initDatabase } from '../server/db.js';

async function main() {
  const args = process.argv.slice(2);
  const email = (args[0] || process.env.INITIAL_ADMIN_EMAIL || 'vivekbhagar@gmail.com').toLowerCase().trim();
  const password = args[1] || process.env.INITIAL_ADMIN_PASSWORD;

  if (!email || !email.includes('@')) {
    console.error('❌ Error: A valid administrator email address is required.');
    process.exit(1);
  }

  if (!password || password.length < 8) {
    console.error('❌ Error: Administrator password must be at least 8 characters long.');
    process.exit(1);
  }

  initDatabase();

  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(password, 12);

  const existing: any = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);

  if (existing) {
    db.prepare(`
      UPDATE users 
      SET password_hash = ?, role = 'admin', updated_at = ?
      WHERE id = ?
    `).run(passwordHash, now, existing.id);
    console.log(`✅ Administrator account updated successfully for ${email} (Role: admin)`);
  } else {
    const id = `usr-admin-${Date.now().toString().slice(-4)}`;
    db.prepare(`
      INSERT INTO users (id, email, display_name, role, team, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, 'admin', 'Platform Administration', ?, ?, ?)
    `).run(id, email, 'Super Admin', passwordHash, now, now);
    console.log(`✅ Administrator account provisioned successfully for ${email} (Role: admin)`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Fatal error provisioning admin:', err);
  process.exit(1);
});
