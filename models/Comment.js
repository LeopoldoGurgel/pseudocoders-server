const { Schema, model } = require('mongoose');
const dateFormat = require('../utils/dateFormat')

const commentSchema = new Schema({
  
  content: {
    type: String,
    required: true,
    trim: true, 
    minlength: 1
  },
  comments: [
    {
        type: Schema.Types.ObjectId,
        ref: "Comment"
    },
  ],
  author:
    {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
  createdAt: {
    type: Date,
    default: Date.now,
    get: (timestamp) => dateFormat(timestamp),
  },
});

const Comment = model('Comment', commentSchema);

module.exports = Comment;