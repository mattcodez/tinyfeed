var socket;
$(document).ready(function() {
	$('#videoFeed').css('max-height', ($(window).height() - $('#header').height()) + 'px');

	$(window).on('resize', function() {
		$('#videoFeed').css('max-height', ($(window).height() - $('#header').height()) + 'px');
	});

	init();
	initSocket();
});

var currentVid = null;
function initSocket(){
	socket = io.connect();

	socket.on('nextVid', function(data){
		//The same vid name is constantly coming through, don't add duplicates
		if (vidQueue.indexOf(data) == -1){
			vidQueue.push(data);
		}
	});
}

function init(){
	var videoForm = $('#addVideo FORM');
	var fileInput = $('#addVideo INPUT[type=file]');

	startVideos($('#videoFeed'));

	//Trigger file selection from separate button
	$('#addVideo BUTTON').on('click', function(){
		if (window.localStorage && window.localStorage.distNoticeConfirmed == "true"){
			fileInput.click();
			return;
		}

		swal({
			title: "Notice",
			text: "Uploading your video permits TinyFeed.me to distribute your \
				work (the video). You still retain all copyrights to your work. \
				You also agree not to upload content that you do not own copyright on \
				nor anything sexually explicit.",
			type: "info",
			showCancelButton: true,
			confirmButtonColor: "#DD6B55",
			confirmButtonText: "Continue",
			closeOnConfirm: true },
			function(){
				window.localStorage && (window.localStorage.distNoticeConfirmed = "true");
				fileInput.click();
			}
		);
	});

	$('#aboutInfo').on('click', function(){
		swal({
			title: "About",
			text: "At TinyFeed.me, the spotlight is on you! \
				When you upload a video to TinyFeed.me, we add it to our playlist. \
				Once the videos ahead of yours have played, yours will play. \
				For 10 seconds, your creation will be the only thing everyone \
				sees on our site! So get imaginative, stand-out and make your \
				voice heard!"
		});
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

function startVideos(videoDOM){
	nextVid(videoDOM);

	videoDOM[0].onended = function(){
		nextVid(videoDOM);
		vidQueue.shift(); //Don't remove from list until done playing
	};

	videoDOM[0].onerror = function(){
		//If we couldn't get the current video,
		//wait a few secs to see if queue gets data again
		setTimeout(function(){
			nextVid(videoDOM);
		}, 6 * 1000);
	};
}

function nextVid(videoDOM){
	videoDOM.attr('src', 'video/' + vidQueue[0]);
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
