const express = require('express')
const app = express()
const path = require('path') 
const bodyParser = require('body-parser')
var port = 1853;
const CronJob = require('cron').CronJob;
const fs = require("fs");
const { randomInt } = require("crypto")
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const dom = new JSDOM(`<!DOCTYPE html><p>Hello world</p>`);

window = dom.window;
document = window.document;
XMLHttpRequest = window.XMLHttpRequest;


app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(express.static(__dirname + '/public'))
app.set('view engine', 'ejs')


const mysql = require("mysql");
const connection= mysql.createConnection({
	host:'127.0.0.1',
	user:'root',
	password:'20070704millie',
	database:'nightstudio',
	multipleStatements: true // runing multiply mysql at same time

});



var operationPassword = fs.readFileSync("operationpassword.txt", "utf8") // the teacher password should be stored in operationpassword.txt in the root directory
var maxPeople = 30 // This value should at least be 1 (>=1)


// Legacy
var beginSignupHour = 8 // This value should be between 0 and 23, |endSignupHour - beginSignupHour| should at least be 1 (>=1)
var endSignupHour = 17 // This value should be between 0 and 24, |endSignupHour - beginSignupHour| should at least be 1 (>=1)
endSignupHour-- // Do NOT change this
// /Legacy

// New time system 2020
const openHour = 8 //the hour when signup opens; 0 <= openHour <= 23
const openMin = 0 //the minute when signup opens; 0 <= openMin <= 59
const closeHour = 18 //the hour when signup closes; 0 <= closeHour <= 23
const closeMin = 30 //the minute when signup closes; 0 <= closeMin <= 59

function checkOpenStatus() {
	var date = new Date();
	var hour = date.getHours();
	hour = (hour < 10 ? "0" : "") + hour;
	var min  = date.getMinutes();
	min = (min < 10 ? "0" : "") + min;
	var sec  = date.getSeconds();
	sec = (sec < 10 ? "0" : "") + sec;
	// console.log(("[Time-check] Check open time: " + hour + ":" + min + ":" + sec).grey)
  
	if ((hour > openHour || hour == openHour && min >= openMin) && (hour < closeHour || hour == closeHour && min < closeMin)) {
	 	 return true;
	}
	else {
	  	return false;
	}
}

function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1)
}

function dbDeleteAllStudentRecords() { // Accepts query, ex. {Verification_Code: cancelCode}
	const total ="DELETE FROM studentrecord;"; 
	connection.query(total,(err,results)=>{
		if(err) {
			console.log(err.message);
		}
		else{
			console.log(results);
		}
	})
}


//verifition code
function getcode() {
	var totalpass = "1234567890abcdefghijklmnopqrstuvwxyz"
	var pass=""
	for(let i = 0;i<3;i++){
	  pass+=totalpass[randomInt(0,totalpass.length)];
	}
	return pass;
}


// create table totaldata(date VARCHAR(32),name VARCHAR(32),studentID VARCHAR(32),classes VARCHAR(32),grade VARCHAR(32),purpose VARCHAR(32),timeperiod VARCHAR(32));

function storedata(){
	const finddata ="select * from studentrecord"; 
    connection.query(finddata,(err,results)=>{
        if(err){
            console.log(err);
        }
        else{
            var getnumber = (JSON.parse(JSON.stringify(results)))
            var timeperiod;
            for(let i = 0;i<getnumber.length;i++){
                console.log(getnumber[i].name,getnumber[i].studentID,getnumber[i].classes,getnumber[i].grade,getnumber[i].purpose);
                if(getnumber[i].Seven_to_Eight == "true" && getnumber[i].Eight_to_Nine == "true"){
                    timeperiod = "7-9 P.M"
                }
                else if(getnumber[i].Seven_to_Eight == "true"){
                    timeperiod = "7-8 P.M"
                }
                else if(getnumber[i].Eight_to_Nine == "true"){
                    timeperiod = "8-9 P.M"
                }
                var date = new Date();
                var year = date.getFullYear();
                var month = date.getMonth();
                month = (month+1 < 10 ? "0" : "") + (month+1);
                var day  = date.getDay();
                day = (day < 10 ? "0" : "") + day;
                var finalday = year+"-"+month+"-"+day;
                const insert = "insert into totaldata (date,name,studentID,classes,grade,purpose,timeperiod)values(?,?,?,?,?,?,?)"
                connection.query(insert,[finalday,getnumber[i].name,getnumber[i].studentID,getnumber[i].classes,getnumber[i].grade,getnumber[i].purpose,timeperiod],(err,result)=>{
                    if(err){
                        console.log(err);
                    }
                    else{
                        console.log(result);
                    }
                })
            }
        }
    })

}
const store = new CronJob('30 00 23 * * *', function() {
	storedata();
	const d = new Date();
	console.log('store data at:', d);
});
store.start();


// UPDATE blacklist SET remaindate = remaindate-1;
const decreasedate = new CronJob('30 00 23 * * *', function() {
	const update = 'UPDATE blacklist SET remaindate = remaindate-1';
	connection.query(update,(err,result)=>{
		if(err){
			console.log(err);
		}
		else{
			console.log(result);
		}
	});
	const d = new Date();
	console.log('store data at:', d);
});
decreasedate.start();

const deleteblacklist = new CronJob('30 00 23 * * *', function() {
	const update = 'delete from blacklist where remaindate=0';
	connection.query(update,(err,result)=>{
		if(err){
			console.log(err);
		}
		else{
			console.log(result);
		}

	});
	const d = new Date();
	console.log('store data at:', d);
});
deleteblacklist.start();

const job = new CronJob('00 00 00 * * *', function() {
	dbDeleteAllStudentRecords();
	const d = new Date();
	 console.log('Database cleared at:', d);
});
job.start();

app.use(express.urlencoded({extended: true}));
app.use(express.json());

app.get('/', function(req, res) {
	res.render('index.ejs')
})

app.get('/signup', function(req, res) {
	if (!checkOpenStatus()) {
		res.render('error.ejs', {message: "please try again between " + (openHour < 10 ? "0" : "") + openHour + ":" + (openMin < 10 ? "0" : "") + openMin + " and " + (closeHour < 10 ? "0" : "") + closeHour + ":" + (closeMin < 10 ? "0" : "") + closeMin + "."})
		return
	}
	const firstcount ="select count(1) from studentrecord where Seven_to_Eight='true'"; 
	const secondcount ="select count(1) from studentrecord where Eight_to_Nine='true'"; 
	connection.query(firstcount+";"+secondcount,(err,results)=>{
    	if(err) {throw err;}
 		else {
			var getnumber = (JSON.parse(JSON.stringify(results)))
			var firstPeriodcount =  getnumber[0][0]['count(1)'];
			var secondPeriodcount =  getnumber[1][0]['count(1)'];
			// console.log(firstPeriodcount)
			res.render('signup.ejs', {firstPeriodCount: firstPeriodcount, secondPeriodCount: secondPeriodcount})
        }
    });
})
	// })
// })


app.get('/submit',function(req,res){
	if (!checkOpenStatus()) {
		res.render('error.ejs', {message: "please try again between " + (openHour < 10 ? "0" : "") + openHour + ":" + (openMin < 10 ? "0" : "") + openMin + " and " + (closeHour < 10 ? "0" : "") + closeHour + ":" + (closeMin < 10 ? "0" : "") + closeMin + "."})
		return;
	}
	var Firstname =  capitalizeFirstLetter(req.query.firstName.trim().toLowerCase());
	var Lastname = capitalizeFirstLetter(req.query.lastName.trim().toLowerCase());
	var studentID = req.query.studentID.trim(),classes = req.query.studentclass, grade = req.query.grade, purpose = req.query.purpose, Seven_to_Eight = req.query.seventoeight, Eight_to_Nine = req.query.eighttonine;
	var timeperiod;
	var fullname=Firstname+" "+Lastname;
	var gettot;
	const findblacklist ="select count(3) from blacklist where name=? && grade=?"; 
	const checkdouble = "select count(4) from studentrecord where name=? && grade=? && studentID=?"
	connection.query(findblacklist,[fullname,grade],(err,resultq)=>{
		if(err) {throw err;}
		else{
			var testn = (JSON.parse(JSON.stringify(resultq)))
			var whetherinblacklist =  testn[0]['count(3)'];
			console.log(whetherinblacklist);
			if(whetherinblacklist>0){
				res.render("infoPanel.ejs",{message:"You are in the BLACKLIST"});
				return;
			}
			else{
				const firstcount ="select count(1) from studentrecord where Seven_to_Eight='true'"; 
				const secondcount ="select count(2) from studentrecord where Eight_to_Nine='true'"; 
				// disable
				connection.query(firstcount+";"+secondcount,fullname,(err,re)=>{
   			 	if(err) {throw err;}
 				else {
					const findone ="select count(3) from studentrecord where name=? and grade=? and studentID=?"; 
					connection.query(findone,[fullname,grade,studentID],(err,results)=>{
						if(err) {console.log(err);}
						else {
							var avoid = (JSON.parse(JSON.stringify(results)))
							var avoidrepeat =  avoid[0]['count(3)'];
							if(avoidrepeat>=1){
								res.render("error.ejs",{message:"You have aleardy signup the night studio"});
								return
							}
							else{
								var getnumber = (JSON.parse(JSON.stringify(re)))
								var firstPeriodcount =  getnumber[0][0]['count(1)'];
								var secondPeriodcount =  getnumber[1][0]['count(2)'];
								// console.log(getnumber[1][0]['count(2)']);
								if(firstPeriodcount >= maxPeople && Seven_to_Eight=="true"){
									res.render('error.ejs',{message:"This First period is FULL"+"(MAX: "+maxPeople+" people)"})
									return
								}
								else if(secondPeriodcount >=maxPeople && Eight_to_Nine=="true"){
									res.render('error.ejs',{message:"This Second Period is FULL"+"(MAX: "+secondPeriodcount+" people)"})
									return
								}
								else if(firstPeriodcount >= maxPeople && secondPeriodcount >=maxPeople){
									res.render('error.ejs',{message:"Both period are FULL"+"(MAX: "+maxPeople+" people)"})
									return
								}
								else{
									var verification = getcode();
									const insert = 'insert into studentrecord(name,studentID,classes,grade,purpose,Seven_to_Eight, Eight_to_Nine,verification)values(?,?,?,?,?,?,?,?)';
									connection.query(insert,[(Firstname+" "+Lastname),studentID,classes,grade,purpose,Seven_to_Eight,Eight_to_Nine,verification],(err,result)=>{
										if(err) {console.log(err.message)}
										else {
											if(Seven_to_Eight == "true" && Eight_to_Nine == "true"){
												timeperiod = "7-9";
											}
											else if(Seven_to_Eight == "true"){
												timeperiod = "7-8";
											}
											else if(Eight_to_Nine == "true"){
												timeperiod = "8-9";
											}
											const verifi ='select * from studentrecord where studentID=? and name=? and grade=?';
											connection.query(verifi,[studentID,fullname,grade],(err,resu)=>{
												if(err) {console.log(err.message)}
												else{
													gettot = (JSON.parse(JSON.stringify(resu)));
													console.log(gettot[0].verification);
													res.render('submit.ejs', {firstName: Firstname, lastName: Lastname, classs: classes, grade: grade, timePeriod: timeperiod,verification:gettot[0].verification})
												}
											});
										}
									});
								}
							}
						}
					});
				}
			})
		}
		}
	})
	// console.log(timeperiod)
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
	var studentid = req.query.Student_id;
	var grade = req.query.grade;
	var verification = req.query.Verification;
	var fullname = firstName+" "+lastName;
	if (firstName == "" || lastName == "" || studentid == "" || grade == "Select your grade...") {
		res.render('error.ejs', {message: "please enter all required information and try again."})
		return
	}

	const findstudentid ="select* from studentrecord where studentID=? and name=? and grade=?"; 
	connection.query(findstudentid,[studentid,fullname,grade],(err,results)=>{
		if(err) {console.log(err.message)}
		else{
			if(results == ""){
				res.render('error.ejs',{message:"please enter the correct name/ student id/ Grade"});
			}
			// if()
			else{
				const delate = "delete from studentrecord where name=? and studentID=?";
				connection.query(delate,[fullname,studentid],(err,result)=>{
					if(err) {
						console.log(err.message);
						res.render('error.ejs',{message:"please enter the correct name/ student id/ Grade"});
					}
					else{
						console.log(result);
						res.render('infoPanel.ejs',{message:"Your Night Studio session has been cancelled."});
					}
				})
			}
		}
		return;
	})
});



app.get('/dataPanel', function(req, res) {
	const total ="select* from studentrecord"; 
	connection.query(total,(err,results)=>{
		if(err) {
			console.log(err.message);
		}
		else{
			var gettot = (JSON.parse(JSON.stringify(results)))
			for(let i = 0;i<gettot.length;i++){
				delete gettot[i].studentID;
				var timeperiod;
				if(gettot[i].Seven_to_Eight == "true" && gettot[i].Eight_to_Nine == "true"){
					timeperiod = "7-9 PM";
				}
				else if(gettot[i].Seven_to_Eight == "true"){
					timeperiod = "7-8 PM";
				}
				else if(gettot[i].Eight_to_Nine == "true"){
					timeperiod = "8-9 PM"
				}
				delete gettot[i].Eight_to_Nine;
				delete gettot[i].Seven_to_Eight;
				delete gettot[i].verification;
				gettot[i].timeperiod = timeperiod;
				// console.log(gettot[i]);
			}
			res.render('dataPanel.ejs', {jsonData: JSON.stringify(gettot)})
		}
	})
})

app.get('/blacklist',function(req,res){
	res.render('blacklist.ejs')
})

app.get('/blacklistsubmit',function(req,res){
	const insert = "insert into blacklist(name,grade,remaindate)values(?,?,?)";
	var name = capitalizeFirstLetter(req.query.firstName.trim().toLowerCase())+" "+capitalizeFirstLetter(req.query.lastName.trim().toLowerCase());
	var grade = req.query.grade;
	console.log(name,grade);
	connection.query(insert,[name,grade,7],(err,result)=>{
		if(err) {
			console.log(err.message);
		}
		else{
			res.render("infoPanel.ejs",{message:"Successed add "+name+" from G"+grade+" into the BlackList."});
		}
	})
})

app.get('/viewblacklist',function(req, res) {
	const total ="select* from blacklist"; 
	connection.query(total,(err,results)=>{
		if(err) {
			console.log(err.message);
		}
		else{
			var gettot = (JSON.parse(JSON.stringify(results)));
			res.render('blacklistPanel.ejs', {jsonData: JSON.stringify(gettot)})
			console.log(gettot);
		}
	})
	// res.render('blacklistPanel.ejs');
})

// create table blacklist(name VARCHAR(32),grade VARCHAR(32),remaindate INT)

app.get('/clearAllData', function(req, res) {
	res.render('clearAllData.ejs')
})

app.post('/clearAllDataSubmit', function(req, res) {
	var opCode = req.body.opCode
	console.log(opCode == operationPassword);
	if (opCode == operationPassword) {
		dbDeleteAllStudentRecords();
		res.render('infoPanel.ejs',{message:"All sign-up data entries are deleted."})
	} 
	else {
		res.render('error.ejs', {message: "please correct your Operation Password and try again."})
		return;
	}
})


app.get('/viewvertify',function(req,res){
	res.render('viewVerificationCode.ejs');
})

app.post('/viewVerificationCodeSubmit', function(req, res) {
	var opCode = req.body.opCode
	console.log(opCode == operationPassword);
	if (opCode == operationPassword) {
		const total ="select* from studentrecord"; 
		connection.query(total,(err,results)=>{
			if(err) {
				console.log(err.message);
			}
			else{
				var gettot = (JSON.parse(JSON.stringify(results)))
				for(let i = 0;i<gettot.length;i++){
					var timeperiod;
					if(gettot[i].Seven_to_Eight == "true" && gettot[i].Eight_to_Nine == "true"){
						timeperiod = "7-9 PM";
					}
					else if(gettot[i].Seven_to_Eight == "true"){
						timeperiod = "7-8 PM";
					}
					else if(gettot[i].Eight_to_Nine == "true"){
						timeperiod = "8-9 PM"
					}
					delete gettot[i].Eight_to_Nine;
					delete gettot[i].Seven_to_Eight;
					gettot[i].timeperiod = timeperiod;
					// console.log(gettot[i]);
				}
				res.render('dataPanel2withverti.ejs', {jsonData: JSON.stringify(gettot)})
			}
		})
	}
	else {
		res.render('error.ejs', {message: "please correct your Operation Password and try again."})
		return;
	}
})



var server = app.listen(8081, function () {
    var host = "localhost"
    var port = server.address().port
    console.log("应用实例，访问地址为 http://%s:%s", host, port)
   
  })
  
app.listen(port);


// 
// create table studentrecord(name VARCHAR(32),studentID VARCHAR(32),classes VARCHAR(32),grade VARCHAR(32),purpose VARCHAR(32),Seven_to_Eight VARCHAR(32),Eight_to_Nine VARCHAR(32),verification VARCHAR(10));
// 