import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, ref: 'User' },
  sessionId: { type: String, default: null },
  linkedPhone: { type: String, default: null },
  disconnecting: { type: Boolean, default: false },
  provisioningUntil: { type: Date, default: null },
}, { timestamps: true })

schema.index({ linkedPhone: 1 }, { unique: true, partialFilterExpression: { linkedPhone: { $type: 'string' } } })

export const WhatsAppConnection = mongoose.model('WhatsAppConnection', schema)
