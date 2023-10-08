var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport({
    service: "Outlook365",
    host: 'smtp.office365.com',
    secureConnection: false, // TLS requires secureConnection to be false
    port: 587, // port for secure SMTP
    tls: {
       ciphers:'SSLv3'
    },
    auth: {
        user: '2250027@ncpachina.org',
        pass: 'Pml.20070704'
    }
});


var mailOptions = {
	from: '2250027@ncpachina.org',
	to: '2240400@ncpachina.org',
	subject: 'Sending Email using Node.js',
	text: 'Teston using nodejs sending email!'
  };
  


transporter.sendMail(mailOptions, function(error, info){
	if (error) {
	  console.log(error);
	} else {
	  console.log('Email sent: ' + info.response);
	}
  });