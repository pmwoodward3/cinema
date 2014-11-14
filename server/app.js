var _				= require('underscore');
var WebTorrent		= require('webtorrent');
var nstatic 		= require('node-static');
var app 			= require('http').createServer(handler);
var io 				= require('socket.io')(app);
var ss 				= require('socket.io-stream');
var parseTorrent	= require('parse-torrent');

app.listen(8000);

function handler(req, res) {
	req.addListener('end', function() {
		new nstatic.Server('public').serve(req, res);
	}).resume();
}

// Socket.IO clients
var webTorrent = new WebTorrent();

io.on('connection', function(socket) {

	console.log('Client with id ' + socket.id + ' connected.');

	socket.on('disconnect', function() {
		console.log('Client with id ' + socket.id + ' disconnected.');
	});

	socket.on('torrent', function(data) {
		if (!parseTorrent(data.torrentId)) {
			return;
		}

		var torrent = webTorrent.get(data.torrentId);

		if (torrent) {
			console.log('Torrent with info hash "' + torrent.infoHash + '" found.');
			streamMovie(torrent);
			return;
		}

		webTorrent.add(data.torrentId, function(torrent) {
			console.log('Torrent with info hash "' + torrent.infoHash + '" added.');
			streamMovie(torrent);
		});

		function streamMovie(torrent) {
			var movieFile = _.first(_.filter(torrent.files, function(file) {
				return /^.+\.(mp4|webm|ogg|avi|mov|mkv)$/.test(file.name);
			}));

			if (!movieFile) {
				console.error('No suitable movie file found.');
				socket.emit('error message', {
					message: "No suitable movie file was found in the torrent.",
				});
				webTorrent.remove(data.torrentId);
				return;
			}

			var movieFileExt = getFileExtension(movieFile.name);

			if (!_.contains(['mp4', 'webm'], movieFileExt)) {
				console.error('Unsupported format "' + movieFileExt + '".');
				socket.emit('error message', {
					message: movieFileExt.toUpperCase() + " video files are currently not supported. Please pick a torrent with an MP4 video file instead."
				});
				webTorrent.remove(data.torrentId);
				return;
			}

			console.log('Streaming movie:', movieFile.name);

			// pipe movie stream to the client through socket.io
			ss(socket).on('movie', function(stream) {
				movieFile.createReadStream().pipe(stream);
			});

			socket.emit('play', {
				extension: movieFileExt,
			});
		}

		function getFileExtension(fileName) {
			var groups =  /^.+\.([a-z0-9]+)$/.exec(fileName);
			if (groups) {
				return groups[1];
			} else {
				return null;
			}
		}
	});

});