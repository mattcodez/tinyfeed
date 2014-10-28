var socket;
$(document).ready(function() {
	$('#videoFeed').css('max-height', ($(window).height() - 42) + 'px');

	$(window).on('resize', function() {
		$('#videoFeed').css('max-height', ($(window).height() - 42) + 'px');
	});

	init();
	initSocket();
});

function initSocket(){
	socket = io.connect();

	socket.on('nextVid', function(data){
		//data.nextVid
	});
}

function init(){
	var videoForm = $('#addVideo FORM');
	var fileInput = $('#addVideo INPUT[type=file]');

	startVideos($('#videoFeed'));

	//Trigger file selection from separate button
	$('#addVideo BUTTON').on('click', function(){
		fileInput.click();
	});

	//Submit form when file is selected
	fileInput.on('change', function(){
		videoForm.submit();
	});

	//Upload new video
	videoForm.submit(function(e){
		e.preventDefault();
		var form = $(this);

		var formData = getVideoFormData(form.find('input[type=file]')[0].files);

		$.ajax({
			url: '/upload',
			data: formData,
			processData: false,
			contentType: false,
			type: 'POST',
			success: function(data){},
			xhr: function() {  // Custom XMLHttpRequest
          var myXhr = $.ajaxSettings.xhr();
          if(myXhr.upload){ // Check if upload property exists
              myXhr.upload.addEventListener('progress',progressHandlingFunction, false); // For handling the progress of the upload
          }
          return myXhr;
      }
		});
	});
}

function startVideos(video){
	nextVid(video);

	video[0].onended = function(){
		nextVid(video);
	};

	video[0].onerror = function(){
		//If we couldn't get the current video, start the counter over, but wait a few secs
		setTimeout(function(){
			vidIndex = 0;
			nextVid(video);
		}, 6 * 1000);
	};
}

function nextVid(video){
	//video.attr('src', 'video/' + vidIndex++ + '.mp4');
}

function getVideoFormData(files){
	var formData = new FormData();
	for (var i = 0; i < files.length; i++) {
		var file = files[i];

		if (!file.type.match('video.*')) {
			continue;
		}

		formData.append('videos', file, file.name);
	}

	return formData;
}

var progressBarContainer = $('#uploadProgress');
var progressBar = progressBarContainer.find('.progress-bar');
function progressHandlingFunction(e){
	if (!progressBarContainer.is(":visible")){
		progressBarContainer.slideDown();
	}

	var percent = Math.round((e.loaded/e.total) * 100);
	progressBar.css('width', percent + '%');

	if (percent === 100){
		progressBarContainer.slideUp();
	}
}
