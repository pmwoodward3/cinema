var _               = require('underscore');
var $               = require('jquery');
var videojs         = require('video.js');
var io              = require('socket.io-client');
var parseTorrent    = require('parse-torrent');

// Expose jQuery to the global scope so that bootstrap.min.js can see it.
window.jQuery = $;

// Returns true if Internet Explorer (Any version).
$.isIE = function() {
    return navigator.userAgent.indexOf('MSIE ') > -1 || navigator.userAgent.indexOf('Trident/') > -1;
};

$().ready(function() {
    videojs('#video', { /* techOrder: ['html5'] */ }, _.noop);

    var socket = io.connect(location.protocol + '//' + location.host);

    socket.on('play', function(data) {
        videojs('#video').ready(function() {
            var player = this;

            player.src({
                src: data.videoLink,
                type: 'video/mp4'
            });

            setTimeout(function() {
                $('#loader').toggleClass('hide');
                $('#video').toggleClass('hide');

                player.play();

                console.log("The movie has started playing.");
            }, 1500);

            player.on('ended', function() {
                console.log("The movie has ended.");
            });
        });

        $('#torrent-id').val('');
    });

    socket.on('error message', function(data) {
        console.error(data.message);

        setTimeout(function() {
            sweetAlert({
                title: "An error occured",
                text: data.message,
                type: 'error',
            }, function() {
                $('#loader').toggleClass('hide');
                $('#torrent-id').val('');
                $('#torrent-id').removeClass('animated zoomOutDown');
                $('#torrent-id').addClass('animated zoomInUp');
            });
        }, 500);
    });

    socket.on('statistics', function(data) {
        if ($('#statistics').hasClass('hide')) {
            $('#statistics').removeClass('hide');
        }

        $('#statistics-streamers').html(data.streamers);
        $('#statistics-torrents').html(data.torrents);
    });

    // For some reason Internet Explorer will fire the on('input')
    // event when an input element is focused. This behavior is
    // peculiar to IE. Using the on('blur') instead of the
    // on('input') event will not lead to the desired behavior,
    // but it at least it will make the site usable.
    var eventName = $.isIE() ? 'blur' : 'input';

    $('#torrent-id').on(eventName, function() {
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
        $('#loader').toggleClass('hide');
    });

});