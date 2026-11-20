import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  codeHash: { type: String, required: true },
  passwordFingerprint: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, expires: 0 },
})

export const LoginChallenge = mongoose.model('LoginChallenge', schema)
