var _				= require('underscore');
var $				= require('jquery');
var videojs			= require('video.js');
var io 				= require('socket.io-client');
var ss 				= require('socket.io-stream');
var VideoStream 	= require('webtorrent/lib/video-stream.js');
var Transcoder		= require('stream-transcoder');

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

	socket.on('error', function(data) {
		console.error(data.message);
	});

	$('#torrent-id').on('input', function() {
		socket.emit('torrent', {
			torrentId: $('#torrent-id').val(),
		});
		$(this).addClass('animated zoomOutDown');
	});

});