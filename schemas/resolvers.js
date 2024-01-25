const { User, Comment, Post, VerificationToken } = require('../models');
const { signToken, AuthenticationError } = require('../utils/auth');
const sendVerificationEmail  = require('../utils/emailSender');
const { generatePin } = require('../utils/helpers');
const { GraphQLError } = require('graphql');

const resolvers = {
  Query: {
    users: async () => {
      return User.find().populate('posts');
    },
    verificationToken: async (parent, {userId}) => {
     try{
        return VerificationToken.findOne({owner: userId})
      } catch (error){
        throw new GraphQLMessage('No verification process ongoing. Click the button to send a new Pin number to start verification process.')
      }      
    },
    user: async (parent, { userId }) => {
      return User.findOne({ _id: userId }).populate('posts');
    },
    posts: async (parent, { author }) => {
      const params = author ? { author } : {};
      return Post.find(params).sort({ createdAt: -1 });
    },
    post: async (parent, { postId }) => {
      return Post.findOne({ _id: postId }).populate('comments');
    },
    comment: async (parent, {commentId}) => {        
        return Comment.findOne({_id: commentId}).populate('comments');
    },
    me: async (parent, args, context) => {
      if (context.user) {
        return User.findOne({ _id: context.user._id }).populate('posts');
      }
      throw AuthenticationError;
    },
  },

  Mutation: {
    addUser: async (parent, { name, email, password }) => {

      const alreadyUser = await User.findOne({email});
      if (alreadyUser) return new GraphQLError('Email already in use');

      const user = await User.create({ name, email, password });

      const PIN = generatePin();

      try {
        await VerificationToken.create({
        owner: user._id,
        pin: PIN
      })
      } catch (error) {
        console.log('Error creating verification token ', error)
      }

      const token = signToken(user);
      const createdAt = String(Date.now());

      // email data
      const verificationSubject = 'Verification PIN for Your Account';
      const verificationText = `Your verification PIN is: ${PIN}`;
      const verificationTemplate = `<h3>Welcome, ${user.name}.</h3><p>Your verification PIN is: <strong>${PIN}</strong></p>
      <p>Please verify your account within 60 minutes.</p>`;
      const verificationId = 'VerificationEmail';

      try {
        await sendVerificationEmail(user.email, user.name, verificationSubject, verificationText, verificationTemplate, verificationId)
      } catch (error) {
        console.error('Error sending verification email: ', error)
      }      

      if(!user){
        throw AuthenticationError;
      }
      return { token, user, createdAt };
    }, 
    verifyEmail: async(parent, {incomingPin, userId}) => {
      if(userId) {
           
        const userToVerify = await User.findById(userId)

        const verificationToken = await VerificationToken.findOne({owner: userToVerify._id});

        if(!verificationToken) return new GraphQLError("Sorry. User not found!");

        const isMatched = await verificationToken.comparePin(incomingPin);

        try {
          if(!isMatched) {
            return new GraphQLError('Please provide a valid Pin number');
          }

          const user = await User.findOneAndUpdate(
            {_id: userId},
            {verified: true},
            {new: true}
          );

          const token = signToken(user)

          return { isMatched, token }; 
        } catch (error) {
          throw new GraphQLError('You must log in to authenticate your email');
        }
      }
    },
    resendVerificationEmail: async (parent, {userId}) => {
      if(userId) {
  
        const user = await User.findById(userId)

        const PIN = generatePin();

        const verificationToken = await VerificationToken.findOneAndUpdate(
          {owner: userId},
          {pin: PIN},
          {new: true}
        )

        const createdAt = String(Date.now());
        const message = "A new verification number was sent to your email address. If you don't see it, check your spam box.";
  
        if(!verificationToken) {
          try {
            await VerificationToken.create({
            owner: user._id,
            pin: PIN
            })
          } catch (error) {
            console.log('Error creating verification token ', error);
            throw new GraphQLError(error.message);
          }
        }
  
        // email data
        const verificationSubject = 'Verification PIN for Your Account';
        const verificationText = `Your verification PIN is: ${PIN}`;
        const verificationTemplate = `<h3>Welcome, ${user.name}.</h3><p>Your verification PIN is: <strong>${PIN}</strong></p>
        <p>Please verify your account within 60 minutes.</p>`;
        const verificationId = 'VerificationEmail';
  
        try {
          await sendVerificationEmail(user.email, user.name, verificationSubject, verificationText, verificationTemplate, verificationId)
        } catch (error) {
          console.error('Error sending verification email: ', error);
          throw new GraphQLError(error.message);
        }      
  
        if(!user){
          throw AuthenticationError;
        }
        return { message, createdAt};
      }
    },
    login: async (parent, { email, password }) => {
    const user = await User.findOne({ email });

    if (!user) {
        throw AuthenticationError;
    }

    const correctPw = await user.isCorrectPassword(password);

    if (!correctPw) {
        throw AuthenticationError;
    }

    const token = signToken(user);

    return { token, user };
    },
    addPost: async (parent, { title, content }, context) => {

        console.log(context);
        
        if (context.user) {
          const post = await Post.create({
            title,
            content,
            author: context.user._id
          });
  
          await User.findOneAndUpdate(
            { _id: context.user._id },
            { $addToSet: { posts: post._id } }
          );
            
          return post;
        }
        throw AuthenticationError;
        
    },
    removePost: async (parent, { postId }, context) => {
    if (context.user) {
        const post = await Post.findOneAndDelete({
        _id: postId,
        author: context.user._id,
        });

        await User.findOneAndUpdate(
        { _id: context.user._id },
        { $pull: { posts: post._id } }
        );

        return post;
    }
    throw AuthenticationError;
    },
    addComment: async (parent, { postId, content }, context) => {

        if (context.user) {

          const user = await User.findById(context.user._id);

          if(!user || !user.verified) {
            throw new GraphQLError('Only verified users can leave comments.');
            return
          }

            const comment = await Comment.create({
                content: content, 
                author: context.user._id});

          await Post.findOneAndUpdate(
            { _id: postId },
            {
              $addToSet: {comments: comment._id},
            },
            {
              new: true,
              runValidators: true,
            }
          );

          return comment;
        }
        throw AuthenticationError;
    },
    removeComment: async (parent, { postId, commentId }, context) => {
        if (context.user) {

            const comment = await Comment.findOneAndDelete({
                _id: commentId,
                author: context.user._id,
                });

          await Post.findOneAndUpdate(
            { _id: postId },
            {
              $pull: {
                comments: {
                  _id: commentId,
                  author: context.user._id,
                },
              },
            },
            { new: true }
          );

          return comment;
        }
        throw AuthenticationError;
    }, 
    addReply: async (parent, { COMMENT_Id, content }, context) => {
    if (context.user) {

      const user = await User.findById(context.user._id);

      if(!user || !user.verified) {
        throw new GraphQLError('Only verified users can leave comments.');
        return
      }

        const comment = await Comment.create({
            content: content, 
            author: context.user._id});

        await Comment.findOneAndUpdate(
        { _id: COMMENT_Id },
        {
            $addToSet: {comments: comment._id},
        },
        {
            new: true,
            runValidators: true,
        }
        );

        return comment;
    }
    throw AuthenticationError;
    },
    removeReply: async (parent, { COMMENT_Id, commentId }, context) => {
        if (context.user) {

            const comment = await Comment.findOneAndDelete({
                _id: commentId,
                author: context.user._id,
                });

          await Comment.findOneAndUpdate(
            { _id: COMMENT_Id },
            {
              $pull: {
                comments: {
                  _id: commentId,
                  author: context.user._id,
                },
              },
            },
            { new: true }
          );

          return comment;
        }
        throw AuthenticationError;
    }
}
};



module.exports = resolvers;
