var _				= require('underscore');
var WebTorrent		= require('webtorrent');
var fs 				= require('fs');
var path 			= require('path');
var parseTorrent	= require('parse-torrent');
var sha256 			= require('sha256');
var Router 			= require('node-simple-router');

var router = new Router({
	static_route: path.join(__dirname, '../public'),
});

var app 			= require('http').createServer(router);
var io 				= require('socket.io')(app);

app.listen(8000);

var connectedCount = 0;
var webTorrent = new WebTorrent();

function getFirstMovieFile(torrentFiles) {
	return _.first(_.filter(torrentFiles, function(file) {
		return /^.+\.(mp4|webm|ogg|avi|mov|mkv)$/.test(file.name);
	}));
}

router.get('/stream/:infoHash', function(req, res) {
	var torrent = _.first(_.filter(webTorrent.torrents, function(torrent) {
		return torrent.infoHash == req.params.infoHash;
	}));

	var movieFile = getFirstMovieFile(torrent.files);

	var contentType = 'video/mp4';

	if (!movieFile) {
		res.writeHead(404, {
			'Content-Type': contentType,
		});
		res.end("File not found");
		return;
	}

	// https://gist.github.com/paolorossi/1993068

	var range = res.getHeader('Range');

	var length = movieFile.length;

	if (range) {
		var regex = /^bytes (\d+)-(?:(\d+)(?:\/(\d+|\*))?)?$/;
		var groups = _.compact(regex.exec(range));

		var start = 0;
		var end = length - 1;
		var chunkSize = (end - start) + 1;

		if (group.length >= 3) {
			start = groups[1];
			end = groups[2];
		}

		res.writeHead(206, {
			'Content-Type': contentType,
			'Accept-Ranges': 'bytes',
			'Content-Range': 'bytes ' + start + '-' + end + '/' + length,
			'Content-Length': chunkSize,
			'Cache-Control': 'no-cache, no-store, must-revalidate',
			'Pragma': 'no-cache',
			'Expires': 0,
		});
		movieFile.createReadStream({ start: start, end: end }).pipe(res);

		console.log('HTTP 206');
	} else {
		res.writeHead(200, {
			'Content-Type': contentType,
			'Content-Length': length,
			'Cache-Control': 'no-cache, no-store, must-revalidate',
			'Pragma': 'no-cache',
			'Expires': 0,
		});
		movieFile.createReadStream().pipe(res);

		console.log('HTTP 200');
	}
});

/*
Divergent
magnet:?xt=urn:btih:2d58067bee4d36f294d0485f2506815c32a89900&dn=Divergent+%282014%29+1080p+BrRip+x264+-+YIFY&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.publicbt.com%3A80&tr=udp%3A%2F%2Ftracker.istole.it%3A6969&tr=udp%3A%2F%2Fopen.demonii.com%3A1337

Lucy
magnet:?xt=urn:btih:d8cef4a7a18ddc09e5607ea09075507675ef6f1c&dn=Lucy.2014.1080p.WEB-DL.x264.anoXmous&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.publicbt.com%3A80&tr=udp%3A%2F%2Ftracker.istole.it%3A6969&tr=udp%3A%2F%2Fopen.demonii.com%3A1337

http://1stdev.com/tremendum-transcoder/articles/seeking-videos-beyond-the-buffer-line/
*/

io.on('connection', function(socket) {

	connectedCount++;

	console.log('Client with id ' + socket.id + ' connected.');

	function emitStatistics() {
		io.sockets.emit('statistics', {
			streamers: connectedCount,
			torrents: webTorrent.torrents.length,
		});
	}

	emitStatistics();

	socket.on('disconnect', function() {
		connectedCount--;

		emitStatistics();

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
			var movieFile = getFirstMovieFile(torrent.files);

			if (!movieFile) {
				console.error('No suitable movie file found.');
				socket.emit('error message', {
					message: "No suitable movie file was found in the torrent.",
				});
				webTorrent.remove(data.torrentId);
				return;
			}

			var movieFileExt = getFileExtension(movieFile.name);

			if (!_.contains(['mp4'], movieFileExt)) {
				console.error('Unsupported format "' + movieFileExt + '".');
				socket.emit('error message', {
					message: movieFileExt.toUpperCase() + " video files are currently not supported. Please pick a torrent with an MP4 video file instead."
				});
				webTorrent.remove(data.torrentId);
				return;
			}

			socket.emit('play', {
				videoLink: '/stream/' + torrent.infoHash,
			});

			emitStatistics();
		}

		function getFileExtension(fileName) {
			return /^.+\.([a-z0-9]+)$/.exec(fileName)[1];
		}
	});

});