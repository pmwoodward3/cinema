var _				= require('underscore');
var $				= require('jquery');
var videojs			= require('video.js');
var io 				= require('socket.io-client');
var ss 				= require('socket.io-stream');
var VideoStream 	= require('webtorrent/lib/video-stream.js');
var parseTorrent	= require('parse-torrent');

// Expose jQuery to the global scope so that bootstrap.min.js can see it.
window.jQuery = $;

$().ready(function() {
	videojs('#video', {}, function() {});

	var socket = io.connect('http://localhost:8000');

	socket.on('play', function(data) {
		var video = document.querySelector('#video_html5_api');

		// Formats that are currently supported
		var types = {
			webm: 'video/webm; codecs="vorbis,vp8"',
			mp4: 'video/mp4; codecs="avc1.42c01e,mp4a.40.2"',
		};

		var type = types[data.extension];

		if (!type) return;

		var stream = ss.createStream();
		ss(socket).emit('movie', stream);
		stream.pipe(new VideoStream(video, { type: type }));

		console.log('Streaming video');

		videojs('#video').ready(function() {
			$('#video').toggleClass('hide');
			this.play();
		});
	});

	socket.on('error message', function(data) {
		console.error(data.message);
		
		setTimeout(function() {

			sweetAlert({
				title: "An error occured",
				text: data.message,
				type: 'error',
			}, function() {
				$('#torrent-id').val('');
				$('#torrent-id').removeClass('animated zoomOutDown');
				$('#torrent-id').addClass('animated zoomInUp');
			});

		}, 500);
	});

	$('#torrent-id').on('input', function() {
		var torrentId = $(this).val();
		var info = parseTorrent(torrentId);

		if (!info) {
			sweetAlert({
				title: "Invalid link",
				text: "The link you provided was not valid, try another one.",
				type: 'error',
			});
			$(this).val('');
			return;
		}

		console.log(info);

		socket.emit('torrent', { torrentId: torrentId });

		$(this).addClass('animated zoomOutDown');
	});

});