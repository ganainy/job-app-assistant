// server/src/scripts/migrateGeminiKeys.ts
/**
 * Migration script to move existing Gemini API keys from integrations.gemini
 * to aiProviderSettings.providers.gemini
 * 
 * Run with: npx ts-node server/src/scripts/migrateGeminiKeys.ts
 */

import mongoose from 'mongoose';
import Profile from '../models/Profile';
import { encrypt } from '../utils/encryption';
import { isEncrypted } from '../utils/encryption';

async function migrateGeminiKeys() {
  try {
    console.log('Starting Gemini API key migration...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vibehired';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find all profiles with Gemini keys in old location
    const profiles = await Profile.find({
      'integrations.gemini.accessToken': { $exists: true, $ne: null }
    });

    console.log(`Found ${profiles.length} profiles with Gemini keys to migrate`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const profile of profiles) {
      try {
        const oldKey = profile.integrations?.gemini?.accessToken;
        
        if (!oldKey) {
          skipped++;
          continue;
        }

        // Check if already migrated
        if (profile.aiProviderSettings?.providers?.gemini?.accessToken) {
          console.log(`Profile ${profile.userId} already has key in new location, skipping...`);
          skipped++;
          continue;
        }

        // Initialize aiProviderSettings if it doesn't exist
        if (!profile.aiProviderSettings) {
          profile.aiProviderSettings = {
            providers: {},
          };
        }
        if (!profile.aiProviderSettings.providers) {
          profile.aiProviderSettings.providers = {};
        }

        // Migrate the key
        // If it's already encrypted, keep it encrypted; otherwise encrypt it
        const keyToStore = isEncrypted(oldKey) ? oldKey : encrypt(oldKey) || oldKey;

        profile.aiProviderSettings.providers.gemini = {
          accessToken: keyToStore,
          enabled: profile.integrations?.gemini?.enabled || true,
        };

        // Set default provider to Gemini if not set
        if (!profile.aiProviderSettings.defaultProvider) {
          profile.aiProviderSettings.defaultProvider = 'gemini';
        }

        await profile.save();
        migrated++;
        console.log(`✓ Migrated key for profile ${profile.userId}`);
      } catch (error: any) {
        console.error(`✗ Error migrating profile ${profile.userId}:`, error.message);
        errors++;
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total profiles found: ${profiles.length}`);
    console.log(`Successfully migrated: ${migrated}`);
    console.log(`Skipped (already migrated or no key): ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log('========================\n');

    await mongoose.disconnect();
    console.log('Migration completed. Disconnected from MongoDB.');
  } catch (error: any) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateGeminiKeys()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration error:', error);
      process.exit(1);
    });
}

export default migrateGeminiKeys;

