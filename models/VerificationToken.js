// create models

const { Schema, model } = require('mongoose');
const bcrypt = require('bcrypt');

const verificationTokenSchema = new Schema({
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  pin: {
    type: String, 
    required: true
  },
  createdAt: {
    type: Date,
    expires: 3600,
    default: Date.now()
  }
});

verificationTokenSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('pin')) {
    this.pin = await bcrypt.hash(this.pin, 10);
  }
  next();
});

verificationTokenSchema.methods.comparePin = async function (pin) {
  return bcrypt.compare(pin, this.pin);
};

verificationTokenSchema.post('findOneAndDelete', async function(doc) {
  const verificationToken = doc;

  const user = await model('User').findById(verificationToken.owner)

  if(!user.verified && Date.now() >= verificationToken.createdAt) {
    await model('User').findByIdAndDelete(verificationToken.owner)
  }
})

const VerificationToken = model('VerificationToken', verificationTokenSchema);

module.exports = VerificationToken;
