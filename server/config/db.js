/**
 * MongoDB Atlas connection singleton.
 * Uses the official MongoDB Node.js driver (lib/mongodb.js).
 * Custom DNS and IPv4-first to avoid SRV lookup failures on some Windows/networks.
 */

import dns from 'dns';
import { MongoClient } from 'mongodb';
import { logger } from '../utils/logger.js';

const DNS_SERVERS = ['8.8.8.8', '1.1.1.1', '8.8.4.4'];
dns.setServers(DNS_SERVERS);
dns.setDefaultResultOrder('ipv4first');

const dbName = process.env.MONGODB_DB_NAME ?? 'diet_app_ai';

let client = null;
let db = null;

export async function getDb() {
  if (db) return db;

  const uri = process.env.MONGODB_URI?.trim?.() ?? '';
  if (!uri) throw new Error('Missing MONGODB_URI in .env');

  const uriLower = uri.toLowerCase();
  if (uriLower.includes('majorityy') || uriLower.includes('w=majorityy')) {
    throw new Error('MONGODB_URI typo: use "w=majority" not "w=majorityy". Fix in server/.env and restart.');
  }

  const connectOptions = {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  };

  try {
    client = new MongoClient(uri, connectOptions);
    await client.connect();
    await client.db('admin').command({ ping: 1 });
    db = client.db(dbName);
    return db;
  } catch (err) {
    client = null;
    const msg = err.message ?? String(err);
    logger.warn('MongoDB connection failed (see message below)', { raw: msg });
    if (msg.includes('ENOTFOUND') || msg.includes('timed out')) {
      throw new Error(
        'MongoDB connection failed. Check: 1) Internet 2) Atlas → Network Access → Add IP (or 0.0.0.0/0 for dev) 3) URI in .env'
      );
    }
    if (msg.includes('querySrv') || msg.includes('ECONNREFUSED')) {
      throw new Error(
        'MongoDB SRV/DNS failed. Check internet, firewall, and Atlas connection string (Connect → Drivers).'
      );
    }
    if (msg.includes('auth') || msg.includes('Authentication')) {
      throw new Error(
        'MongoDB auth failed. Check username/password in MONGODB_URI. Escape special chars (e.g. @ #) in password.'
      );
    }
    throw new Error(`Database error: ${msg}`);
  }
}
