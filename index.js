var express = require('express');
var app = express();
var fs = require('fs');
var md5 = require('md5');
var sessionPath = 'sessions/';

app.enable('etag');
app.set('views', __dirname + '/public');
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.disable('view cache');

function getEtag(req){		
	var etag = req.headers['if-none-match'];

	if(etag === undefined){
		etag = md5(new Date());
	}		
	return etag;
}

function saveSession(session, etag){
	fs.writeFileSync(sessionPath + etag, JSON.stringify(session), 'utf8');				
}

function clearSession(etag){
	try{
		fs.unlinkSync(sessionPath + etag);
	}catch(e){}	
}

function loadSession(etag){
	var result;
	try{
		var data = fs.readFileSync(sessionPath + etag, 'utf8');
		result = JSON.parse(data);	
	}catch(e){
		// not important at the moment
		// console.error(e.name + ': ' + e.message);
	}
	return result;
}

function initSession(){
	return {
		visits: 0,
		lastVisit: new Date()
	};
}

function updateSession(session){
	session.visits++;
	session.lastVisit = new Date();	
}

function handleSession(etag, req){
	var session;
	
	if(req.headers['if-none-match'] === undefined){
		clearSession(etag);
		session = initSession();
	}else{
		session = loadSession(etag)  || initSession();
		updateSession(session);		
	}	
	
	saveSession(session, etag);
}

// the interesting part

app.get('/track.jpg', function (req, res) {
	
	var etag = getEtag(req);
	var isAjaxRequest = req.headers['x-requested-with'] !== undefined;
	
	console.log("etag:" , etag)

	if(!isAjaxRequest){
		handleSession(etag, req);		  	
	}
	
	res.set('cache-control', 'private, must-revalidate, proxy-revalidate');
  	res.set('etag' , etag);
	
	var file = __dirname + '/public/rucsok.jpg';
	var filestream = fs.createReadStream(file);
	filestream.pipe(res);	

});

app.get('/', function (req, res) {
	res.render('index');
});

// this is just to show the "tracking" details to the user

app.get('/details', function (req, res) {
	res.render('details');
});

app.get('/tracking_details/:id', function (req, res) {
	var etag = req.params.id;
	res.send(loadSession(etag));
	res.end();
});

app.listen(3000, function () {
  console.log('App listening on port 3000!');
});
