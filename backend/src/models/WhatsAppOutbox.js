import mongoose from 'mongoose'

const outboxSchema = new mongoose.Schema(
  {
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, index: true },
    recipientRole: { type: String, enum: ['barber', 'client'], required: true },
    recipientPhone: { type: String, required: true, maxlength: 20 },
    templateName: { type: String, required: true, maxlength: 100 },
    openwaSessionId: { type: String },
    openwaPhone: { type: String },
    language: { type: String, required: true, maxlength: 20 },
    parameters: [{ type: String, maxlength: 1024 }],
    dedupeKey: { type: String, required: true, unique: true, maxlength: 200 },
    scheduledAt: { type: Date, required: true, index: true },
    status: { type: String, enum: ['pending', 'sending', 'sent', 'failed', 'cancelled'], default: 'pending', index: true },
    attempts: { type: Number, default: 0, min: 0 },
    firstDeliveryAttemptAt: { type: Date, default: null },
    claimedAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    lastErrorCode: { type: String, maxlength: 40, default: '' },
  },
  { timestamps: true }
)

outboxSchema.index({ status: 1, scheduledAt: 1 })

export const WhatsAppOutbox = mongoose.model('WhatsAppOutbox', outboxSchema)
