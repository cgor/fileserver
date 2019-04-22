var http = require('http');
var url = require('url');
//var querystring = require('querystring');
var formidable = require('formidable');
var diskspace = require('diskspace');
var fs = require('fs');
    path = require("path");

var p = "/fileserver/serverfiles/"
var bytesTotal, bytesUsed, bytesFree;
var maxBytes = 0;
var byteHeadroom = 2000000000;

function checkSpace() {
	maxBytes = 0;
	diskspace.check('/', function (err, result)
	{
		bytesTotal = result.total;
		bytesUsed = result.used;
		bytesFree = result.free;
		maxBytes = bytesFree - byteHeadroom;
		console.log('Total:' + bytesTotal);
		console.log('Used:' + bytesUsed);
		console.log('Free:' + bytesFree);
		console.log('Max Upload:' + maxBytes);
		createHTML(maxBytes);
		console.log('Done!');
		return true;
	});
}

function createHTML(freeSpace) {

	//checkSpace(function(err, result) {
	//if (maxBytes !== 'undefined' && maxBytes != 0) {
		fs.writeFileSync('fileserver_v2.html', '<html><head><link rel="shortcut icon" href="/favicon.ico" type="image/x-icon"><link rel="icon" href="/favicon.ico" type="image/x-icon"></head>');
		console.log('HTML Created!');
		fs.appendFileSync('fileserver_v2.html', '<body>');
		fs.appendFileSync('fileserver_v2.html', '<h1>Files</h1><p>');
		fs.appendFileSync('fileserver_v2.html', '<form action="fileupload" method="post" enctype="multipart/form-data">');
		fs.appendFileSync('fileserver_v2.html', '<input type="file" name="filetoupload"><br>');
		fs.appendFileSync('fileserver_v2.html', '<input type="submit"></form>');
		fs.appendFileSync('fileserver_v2.html', '<br>Free Space:' + freeSpace/1000000 + ' MB');
		fs.appendFileSync('fileserver_v2.html', '<br>Uploaded:<br></p>');
		fs.readdir(p, function (err, files) {
			if (err) {
				throw err;
			}


				
			files.filter(function (file) {
				return fs.statSync(path.join(p, file)).isFile();
			}).forEach(function (file) {
				//console.log(file);
				fs.appendFileSync('fileserver_v2.html', '<a href="' + file + '">' + file + '</a>  <a href="?delfile=' + file + '" style="text-decoration:none; color:red">&times</a><br>', function (err) {
					if (err) throw err;
					//console.log('File list Updated!');
				});
				console.log('File list Updated!');
			});
			fs.appendFileSync('fileserver_v2.html', '</body></html>');
			console.log('HTML Closed!');

		});
	//}

	//});
}
checkSpace();
//createHTML();


http.createServer(function (req, res) {
	var q = url.parse(req.url, true).query;
	console.log('delfile query: ' + q.delfile);
	//var maxBytes = 16000000;
	var fileBytes;
	if (req.url == '/fileupload' && req.method.toLowerCase() == 'post') {
		var form = new formidable.IncomingForm();
		form.on('progress', function(bytesReceived, bytesExpected) {
			//console.log('Bytes Received: ' + bytesReceived);
			console.log('Bytes Expected: ' + bytesExpected);
			fileBytes = bytesExpected;
		});

		console.log('About to parseeeeeeee!');
		console.log(fileBytes + ' < ' + maxBytes);
		form.parse(req, function (err, fields, files) {
			if (err) {
				console.log('Error uploading file! Redirecting!');
				res.writeHead(302, {'Location': '/'});
				res.end();			
			}
			else if (fileBytes > maxBytes) {
					console.log('Max file size exceeded, redirecting!');
					console.log(fileBytes + ' less than ' + maxBytes);
					console.log('Temp file:' + files.filetoupload.path);
					fs.unlink(files.filetoupload.path, function(err) {
						if (err) {
							//throw err;
							console.log('Error deleting temp file, redirecting!');
							res.writeHead(302, {'Location': '/'});
							res.end();			  
						} else {
							console.log('Temp file Deleted!');
							res.writeHead(302, {'Location': '/'});
							res.end();
						}
					});
					//return false; //exit the program
					//createHTML();
					//res.writeHead(302, {'Location': '/'});
					//res.end();
			} else {
				var oldpath = files.filetoupload.path;
				var newpath = '/fileserver/serverfiles/' + files.filetoupload.name;
				if (newpath != '/fileserver/serverfiles/') {
					fs.rename(oldpath, newpath, function (err) {
						if (err) throw err;
						//console.log('File Uploaded!');
						fs.unlink(oldpath, function(err) {
							if (err) {
								//throw err;
								console.log('Temp file:' + oldpath);
								console.log('Error deleting temp file after successful upload, redirecting!');
								checkSpace();
								//createHTML();
								res.writeHead(302, {'Location': '/'});
								res.end();			  
							} else {
								console.log('File Uploaded and Temp file Deleted!');
								checkSpace();
								//createHTML();
								res.writeHead(302, {'Location': '/'});
								res.end();
							}
						});
						//createHTML();
						//res.writeHead(302, {'Location': '/'});
						//res.end();
					});
				} else {
					console.log('No file selected, redirecting!');
					//createHTML();
					res.writeHead(302, {'Location': '/'});
					res.end();
				}
			}
		});
		
		console.log(fileBytes + ' << ' + maxBytes);

	} else if (typeof q.delfile !== 'undefined' && q.delfile !== null) {
		console.log('Deleting File!: ' + q.delfile);
		var delfilePath = path.join(__dirname, '/serverfiles/' + q.delfile);
		fs.unlink(delfilePath, function(err) {
			if (err) {
				//throw err;
				console.log('Error attempting to delete file, redirecting!');
				res.writeHead(302, {'Location': '/'});
				res.end();			  
			} else {
				console.log('File Deleted!');
				checkSpace();
				//createHTML();
				res.writeHead(302, {'Location': '/'});
				res.end();
			}
			});
	  
	} else if (req.url == '/favicon.ico') {
		console.log('Serving favicon!');
		fs.readFile('favicon.ico', function(err, data) {
		res.writeHead(200, {'Content-Type': 'text/html'});
		res.write(data);
		res.end();
		});
	}
	else if (req.url != '/') {
		var reqstring = req.url;
		reqstring = decodeURIComponent(reqstring);
		var filestring = path.join(__dirname, '/serverfiles' + reqstring);
		var filename = reqstring.substr(1);
		var validfile = 1;
		console.log('Converted string:' + reqstring);
		console.log('filestring: ' + filestring);
		console.log('filename: ' + filename);
		/*var stats = fs.lstatSync(filestring).isFile();
		/* https://stackoverflow.com/questions/15630770/node-js-check-if-path-is-file-or-directory */
		
		try {
			fs.lstatSync(filestring).isFile()
		}catch(e){
			if (e.code == 'ENOENT') {
				console.log('No file at this location, redirecting!');
				validfile = 0;
				res.writeHead(302, {'Location': '/'});
			//	res.writeHead(302, {'Location': '/404.html'});
				res.end();				
			} 
		} 
		if (validfile == 1) {
			console.log('Is filestring a file: ' + fs.lstatSync(filestring).isFile());
			if (fs.lstatSync(filestring).isFile()) {
				fs.readFile(filestring, function(err, data) {
					console.log('Reading File!');
					res.setHeader('Content-disposition', 'attachment; filename=' + filename);
					res.writeHead(200, {'Content-Type': 'text/html'});
					res.write(data);
					res.end();	
				});
			} else {
				console.log('Path is not a file, redirecting!');
				validfile = 0;
				res.writeHead(302, {'Location': '/'});
			//	res.writeHead(302, {'Location': '/404.html'});
				res.end();
			}
		}
	}
	else {
		console.log('Reading HTML!');
		console.log('URL: ' + req.url);
		//createHTML();
		var filePath = path.join(__dirname, 'fileserver_v2.html');
		//console.log('Fulle file path: ' + filePath);
		fs.readFile(filePath, function(err, data) {
		res.writeHead(200, {'Content-Type': 'text/html'});
		res.write(data);
		res.end();
		});
	}
}).listen(8080);
