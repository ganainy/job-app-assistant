// server/src/models/User.ts
import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { JsonResumeSchema } from '../types/jsonresume'; 

export interface IUser extends Document {
  email: string;
  passwordHash: string; // Store hash, not the plain password
  cvJson?: JsonResumeSchema | mongoose.Schema.Types.Mixed; 
  // Add other fields like name later if needed
  comparePassword(candidatePassword: string): Promise<boolean>; // Method to compare passwords
}

const UserSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true, // Emails must be unique
      lowercase: true, // Store emails in lowercase
      trim: true,
      match: [/.+\@.+\..+/, 'Please fill a valid email address'], // Basic email format validation
    },
    passwordHash: {
      type: String,
      required: true,
    },
    cvJson: {
        type: Schema.Types.Mixed,
        required: false // Not required on registration
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// --- Password Hashing Middleware (Before Saving) ---
// Use a pre-save hook to hash the password BEFORE it's saved to the DB
// Note: Needs 'function' keyword to correctly scope 'this'
UserSchema.pre<IUser>('save', async function(next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('passwordHash')) return next();

    try {
        // Generate a salt and hash the password
        const salt = await bcrypt.genSalt(10); // 10 rounds is generally recommended
        // IMPORTANT: We assume the value assigned to passwordHash IS the plain password at this stage
        // The controller logic will need to ensure this assignment happens correctly before save
        this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
        next();
    } catch (error) {
         // Ensure error is correctly typed or handled
        if (error instanceof Error) {
            next(error);
        } else {
            next(new Error('Password hashing failed'));
        }
    }
});


// --- Password Comparison Method ---
// Add a method to the user schema to easily compare passwords
UserSchema.methods.comparePassword = function(candidatePassword: string): Promise<boolean> {
  // 'this.passwordHash' refers to the hash stored in the document
  return bcrypt.compare(candidatePassword, this.passwordHash);
};


export default mongoose.model<IUser>('User', UserSchema);