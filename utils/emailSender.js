// console.log on mailjet key and secret show the correct values

const Mailjet = require('node-mailjet');

async function sendVerificationEmail(userEmail, userName, customSubject, customText, customTemplate, customId) {
  try {
    const mailjet = await new Mailjet({
      apiKey: process.env.MAILJET_KEY,
      apiSecret: process.env.MAILJET_SECRET,
    });

    const request = mailjet
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [
          {
            From: {
              Email: 'pseudocoders.contact@gmail.com',
              Name: 'Pseudocoders',
            },
            To: [
              {
                Email: userEmail,
                Name: userName,
              },
            ],
            Subject: customSubject,
            TextPart: customText,
            HTMLPart: customTemplate,
            CustomID: customId,
          },
        ],
      });

    const result = await request;
    console.log('Email sent:', result.body);
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Email sending failed');
  }
}

module.exports =  sendVerificationEmail ;



// sendVerificationEmail('pseudocoders.contact@gmail.com', 'Leopoldo', 'test email', 'testing 123', '<p>testing</p>', 'testing')
