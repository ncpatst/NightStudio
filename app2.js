const express = require('express')
const app = express()
const port = 1853
const path = require('path') 
const bodyParser = require('body-parser')
const MongoClient = require('mongodb').MongoClien
const assert = require('assert')
const url = 'mongodb://localhost:27017'
const fs = require("fs");
const dbName = 'Night_Studio_Signup'
const CronJob = require('cron').CronJob;
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(express.static(__dirname + '/public'))
app.set('view engine', 'ejs')



var operationPassword = fs.readFileSync("operationpassword.txt", "utf8") // the teacher password should be stored in operationpassword.txt in the root directory
var maxPeople = 30 // This value should at least be 1 (>=1)


// Legacy
var beginSignupHour = 8 // This value should be between 0 and 23, |endSignupHour - beginSignupHour| should at least be 1 (>=1)
var endSignupHour = 18 // This value should be between 0 and 24, |endSignupHour - beginSignupHour| should at least be 1 (>=1)
endSignupHour-- // Do NOT change this
// /Legacy

// New time system 2020
const openHour = 08 //the hour when signup opens; 0 <= openHour <= 23
const openMin = 00 //the minute when signup opens; 0 <= openMin <= 59
const closeHour = 18 //the hour when signup closes; 0 <= closeHour <= 23
const closeMin = 30 //the minute when signup closes; 0 <= closeMin <= 59

// replacing all inTimeInterval() with checkOpenStatus()

function checkOpenStatus() {
  var date = new Date();
	var hour = date.getHours();
	hour = (hour < 10 ? "0" : "") + hour;
	var min  = date.getMinutes();
	min = (min < 10 ? "0" : "") + min;
  var sec  = date.getSeconds();
  sec = (sec < 10 ? "0" : "") + sec;
  console.log(("[Time-check] Check open time: " + hour + ":" + min + ":" + sec).grey)

  if ((hour > openHour || hour == openHour && min >= openMin) && (hour < closeHour || hour == closeHour && min < closeMin)) {
    return true
  }
  else {
    return false
  }
}

// Clear database midnight
const job = new CronJob('00 00 00 * * *', function() {
  dbDeleteAllStudentRecords();
	const d = new Date();
	console.log('Database cleared at:', d);
});
job.start();




// / New time system 2020

function capitalizeFirstLetter(string) {
		return string.charAt(0).toUpperCase() + string.slice(1)
}
function dbInsert(nameCombined, classs, grade, timePeriod, cancelCode, purpose) {
	var firstPeriod = ""
	var secondPeriod = ""
	if (timePeriod == "7-8") {
		firstPeriod = "occupied"
	} else if (timePeriod == "8-9") {
		secondPeriod = "occupied"
	} else {
		firstPeriod = "occupied"
		secondPeriod = "occupied"
	}
	MongoClient.connect(url, function(err, db) {
		if (err) throw err
		var dbo = db.db(dbName)
		var myobj = {Name: nameCombined, Class: classs, Grade: grade, Seven_to_Eight: firstPeriod, Eight_to_Nine: secondPeriod, Verification_Code: cancelCode, Purpose: purpose}
		dbo.collection("studentRecords").insertOne(myobj, function(err, res) {
			if (err) throw err
			db.close()
		})
	})
	return
}
var findOne = function (db, query, callback) {
	db.collection('studentRecords').findOne(query, function (err, doc) {
		db.close();
		if(err) {
			callback(err);
		}
		else {
			callback(null, doc);
		}
	});
}
function isCodeExist(cancelCode, callback) {
	MongoClient.connect(url, function(err, db) {
		if (err) throw err
		var dbo = db.db(dbName)
		dbo.collection("studentRecords").find({Verification_Code: cancelCode}).toArray(function(err, result) {
			if (err) throw err
				callback((result.length > 0)? true : false)
			db.close()
		})
	})
}
function dbDelete(query) { // Accepts query, ex. {Verification_Code: cancelCode}
	MongoClient.connect(url, function(err, db) {
		if (err) throw err
		var dbo = db.db(dbName)
		dbo.collection("studentRecords").deleteOne(query, function(err, obj) {
			if (err) throw err
			// console.log("1 signup record deleted")
			db.close()
		})
	})
}
function dbDeleteAllStudentRecords() { // Accepts query, ex. {Verification_Code: cancelCode}
	MongoClient.connect(url, function(err, db) {
		if (err) throw err
		var dbo = db.db(dbName)
		dbo.collection("studentRecords").deleteMany({}, function(err, obj) {
			if (err) throw err
			// console.log("1 signup record deleted")
			db.close()
		})
	})
}
function getRandomInt(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min
}
function getDateTime() {
	var date = new Date();
	var hour = date.getHours();
	hour = (hour < 10 ? "0" : "") + hour;
	var min  = date.getMinutes();
	min = (min < 10 ? "0" : "") + min;
	var sec  = date.getSeconds();
	sec = (sec < 10 ? "0" : "") + sec;
	var year = date.getFullYear();
	var month = date.getMonth() + 1;
	month = (month < 10 ? "0" : "") + month;
	var day  = date.getDate();
	day = (day < 10 ? "0" : "") + day;
	var milisec = date.getMilliseconds();
	milisec = ((milisec < 100) ? ((milisec < 10) ? "00" : "0") : "") + milisec;
	// return year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec;
	return hour+min+sec+milisec
}
function inTimeInterval(beginHr, endHr) {
	var date = new Date();
	var hour = date.getHours();
	hour = (hour < 10 ? "0" : "") + hour;
	if (beginHr <= endHr) { // from beginHr:00 to endHr:59
		if (hour >= beginHr && hour <= endHr) {
			return true
		} else {
			return false
		}
	} else { // from beginHr:00 to next day's endHr:59
		if ((hour >= beginHr && hour <= 23) || (hour >= 0 && hour <= endHr)) {
			return true
		} else {
			return false
		}
	}
}
String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};



app.get('/', function(req, res) {
	res.render('index.ejs')
})

app.get('/signup', function(req, res) {
	if (!checkOpenStatus()) {
		res.render('error.ejs', {message: "please try again between " + (openHour < 10 ? "0" : "") + openHour + ":" + (openMin < 10 ? "0" : "") + openMin + " and " + (closeHour < 10 ? "0" : "") + closeHour + ":" + (closeMin < 10 ? "0" : "") + closeMin + "."})
		return
	}
	var firstPeriodCount = 0
	var secondPeriodCount = 0
	MongoClient.connect(url, function(err, db) {
		if (err) throw err
		var dbo = db.db(dbName)
		dbo.collection("studentRecords").find({}).toArray(function(err, result) {
			if (err) throw err
			for (var i = 0; i < result.length; i++) {
				if (result[i].Seven_to_Eight == "occupied") {firstPeriodCount++}
				if (result[i].Eight_to_Nine == "occupied") {secondPeriodCount++}
			}
			db.close()
			res.render('signup.ejs', {firstPeriodCount: firstPeriodCount, secondPeriodCount: secondPeriodCount, fullTimeCount: (firstPeriodCount >= secondPeriodCount ? firstPeriodCount : secondPeriodCount)})
		})
	})
})

app.get('/submit', function(req, res) {
	// Check time
	if (!checkOpenStatus()) {
		res.render('error.ejs', {message: "please try again between " + (openHour < 10 ? "0" : "") + openHour + ":" + (openMin < 10 ? "0" : "") + openMin + " and " + (closeHour < 10 ? "0" : "") + closeHour + ":" + (closeMin < 10 ? "0" : "") + closeMin + "."})
		return
	}
	// Get vars
	var firstName = capitalizeFirstLetter(req.query.firstName.trim().toLowerCase())
	var lastName = capitalizeFirstLetter(req.query.lastName.trim().toLowerCase())
	var classs = req.query.classs.trim().toUpperCase()
	var grade = req.query.grade
	var timePeriod = req.query.timePeriod
	var purpose = req.query.purpose.trim().toLowerCase()
	// Check blank
	if (firstName == "" || lastName == "" || classs == "" || grade == "Select your grade..." || timePeriod == "Select your desired time periods..." || purpose == "") {
		res.render('error.ejs', {message: "please enter all required information and try again."})
		return
	}
	// Check availability and insert if conditions are met
	MongoClient.connect(url, function(err, db) {
		if (err) throw err
		var dbo = db.db(dbName)
		dbo.collection("studentRecords").find({}).toArray(function(err, result) {
			if (err) throw err
			var firstPeriodCount = 0
			var secondPeriodCount = 0
			for (var i = 0; i < result.length; i++) {
				if (result[i].Seven_to_Eight == "occupied") {firstPeriodCount++}
				if (result[i].Eight_to_Nine == "occupied") {secondPeriodCount++}
			}
			db.close()
			if (timePeriod == "7-8") {cancelCode
				if (firstPeriodCount >= maxPeople) {
					res.render('error.ejs', {message: "this time period is full. (Maximum " + maxPeople + " people)"})
					return
				}
			} else if (timePeriod == "8-9") {
				if (secondPeriodCount >= maxPeople) {
					res.render('error.ejs', {message: "this time period is full. (Maximum " + maxPeople + " people)"})
					return
				}
			} else {
				if (firstPeriodCount >= maxPeople || secondPeriodCount >= maxPeople) {
					res.render('error.ejs', {message: "this time period is full. (Maximum " + maxPeople + " people)"})
					return
				}
			}
			// Get cancelCode and insert record
				var cancelCode = getRandomInt(100, 999).toString() + getDateTime() + getRandomInt(100, 999).toString()
				// Uncomment to add a check duplication function (lower performance)
				isCodeExist(cancelCode, function(callbackResult) {
					if (callbackResult == true) {
						cancelCode = getRandomInt(100, 999).toString() + getDateTime() + getRandomInt(100, 999).toString()
						console.log("Changed, to: " + cancelCode)
						dbInsert(firstName + " " + lastName, classs, grade, timePeriod, cancelCode)
						res.render('submit.ejs', {firstName: firstName, lastName: lastName, classs: classs, grade: grade, timePeriod: timePeriod, cancelCode: cancelCode})
					} else {
				dbInsert(firstName + " " + lastName, classs, grade, timePeriod, cancelCode, purpose)
				res.render('submit.ejs', {firstName: firstName, lastName: lastName, classs: classs, grade: grade, timePeriod: timePeriod, cancelCode: cancelCode, purpose: purpose})
					}
				})
		})
	})
})

app.get('/cancel', function(req, res) {
	if (!checkOpenStatus()) {
		res.render('error.ejs', {message: "please try again between " + (openHour < 10 ? "0" : "") + openHour + ":" + (openMin < 10 ? "0" : "") + openMin + " and " + (closeHour < 10 ? "0" : "") + closeHour + ":" + (closeMin < 10 ? "0" : "") + closeMin + "."})
		return
	}
	res.render('cancel.ejs')
})

app.get('/cancelSubmit', function(req, res) {
	if (!checkOpenStatus()) {
		res.render('error.ejs', {message: "please try again between " + (openHour < 10 ? "0" : "") + openHour + ":" + (openMin < 10 ? "0" : "") + openMin + " and " + (closeHour < 10 ? "0" : "") + closeHour + ":" + (closeMin < 10 ? "0" : "") + closeMin + "."})
		return
	}
	var firstName = capitalizeFirstLetter(req.query.firstName.trim().toLowerCase())
	var lastName = capitalizeFirstLetter(req.query.lastName.trim().toLowerCase())
	var grade = req.query.grade
	var cancelCode = req.query.cancelCode
	if (firstName == "" || lastName == "" || cancelCode == "" || grade == "Select your grade...") {
		res.render('error.ejs', {message: "please enter all required information and try again."})
		return
	}
	MongoClient.connect(url, function(err, db) {
		if (err) throw err
		var dbo = db.db(dbName)
		dbo.collection("studentRecords").find({Verification_Code: cancelCode}).toArray(function(err, result) {
			if (err) throw err
			if (result.length > 0) {
				if (result[0].Name == firstName + " " + lastName && result[0].Grade == grade) {
					dbDelete({Verification_Code: cancelCode})
					res.render('infoPanel.ejs', {message: "Your Night Studio session has been cancelled."})// res.render('cancelSubmit.ejs', {})
				} else {
					res.render('error.ejs', {message: "please correct your name and/or grade and try again."})
				}
			} else {
				res.render('error.ejs', {message: "please correct your Verification Code and try again."})
			}
			db.close()
		})
	})
	return // DEBUG
})

app.get('/dataPanel', function(req, res) {
	MongoClient.connect(url, function(err, db) {
		if (err) throw err
		var dbo = db.db(dbName)
		dbo.collection("studentRecords").find({}).toArray(function(err, result) {
			var result2 = result
			for (var i = 0; i < result2.length; i++) {
				delete result2[i]._id
				delete result2[i].Verification_Code
			}
			res.render('dataPanel.ejs', {jsonData: JSON.stringify(result2)})
		})
	})
})

app.get('/clearAllData', function(req, res) {
	res.render('clearAllData.ejs')
})

app.post('/clearAllDataSubmit', function(req, res) {
	var opCode = req.body.opCode
	if (opCode == operationPassword) {
		dbDeleteAllStudentRecords()
		res.render('infoPanel.ejs', {message: "All sign-up data entries are deleted."})
	} else {
		res.render('error.ejs', {message: "please correct your Operation Password and try again."})
		return
	}
})

app.get('/viewVerificationCode', function(req, res) {
	res.render('viewVerificationCode.ejs')
})

app.post('/viewVerificationCodeSubmit', function(req, res) {
	var opCode = req.body.opCode
	if (opCode == operationPassword) {
		MongoClient.connect(url, function(err, db) {
			if (err) throw err
			var dbo = db.db(dbName)
			dbo.collection("studentRecords").find({}).toArray(function(err, result) {
				var result2 = result
				for (var i = 0; i < result2.length; i++) {
					delete result2[i]._id
				}
				res.render('dataPanel2.ejs', {jsonData: JSON.stringify(result2)})
			})
		})
	} else {
		res.render('error.ejs', {message: "please correct your Operation Password and try again."})
		return
	}
})

app.listen(port)


// student@192.168.123.27

// fin5)SDK