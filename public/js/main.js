var socket, videoDOM;
$(document).ready(function() {
	$('#videoFeed').css('max-height', ($(window).height() - $('.navbar').height()) + 'px');

	$(window).on('resize', function() {
		$('#videoFeed').css('max-height', ($(window).height() - $('.navbar').height()) + 'px');
	});

	init();
	initSocket();
	videoDOM = $('#videoFeed');
});

var currentVid = null;
var vidQueue = [];

function initSocket(){
	socket = io.connect();

	socket.on('nextVid', function(data){
		addVidToList(data[0]);
		addVidToList(data[1]);
	});
}

function addVidToList(vid){
	if (!vid) return;

	//The same vid name is constantly coming through, don't add duplicates
	if (vidQueue.indexOf(vid) == -1 && vid != currentVid){
		var queueWasEmpty = (vidQueue.length === 0);
		vidQueue.push(vid);

		var noVidSet = (videoDOM.attr('src') === undefined || videoDOM.attr('src') === false);
		if (queueWasEmpty && noVidSet) {
			//The queue was empty before we got here, try playing videos again
			nextVid(videoDOM);
		}
	}
}

function init(){
	var modalShim = $('#modalShim');
	var loginForm = $('#loginForm');
	$('a.login').on('click', function(e){
		modalShim.show();
		loginForm.slideDown(800);

		loginForm
			.find('.passConfirm').hide()
				.find('INPUT').prop('disabled', true);
	});

	$('a.signup').on('click', function(e){
		modalShim.show();
		loginForm.slideDown(800);

		loginForm
			.find('.passConfirm').show()
				.find('INPUT').prop('disabled', false);

		loginForm
			.find('BUTTON[type=submit]').on('click', function(e){
				e.preventDefault();
				var msgBox = loginForm.find('.msg');
				msgBox.text('').hide();

				//...add handlers for a close button for dialog

				if($('#userPassword').val() !== $('#userPasswordConfirm').val()){
					msgBox
						.text('Passwords do not match')
						.show();
				}
				else {
					$.ajax('api/user',{
						contentType : 'application/json',
						type: 'POST',
						data: JSON.stringify(
								{
									user:{
										email: $('#userLoginName').val(),
										password:  $('#userPassword').val()
									}
								}
							),
						success: function(data){
							if (data.errMsg){
								//Use for application level messages like passwords don't match
								msgBox
									.text(data.errMsg)
									.slideDown();
							}
							else { //Success!
								$('#navbar .username').text(data.user.email)
								loginForm.slideUp();
								modalShim.hide();
							}
						}
					});
				}

				return false;
			});
	});

	var videoForm = $('#addSpotlight form');
	var fileInput = $('#addSpotlight input[type=file]');

	startVideos($('#videoFeed'));

	//Trigger file selection from separate button
	$('.spotlight').click(function(e) {
		e.preventDefault();

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
			function() {
				window.localStorage && (window.localStorage.distNoticeConfirmed = "true");
				fileInput.click();
			}
		);
	});

	$('.about-swal').click(function() {
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
	};

	videoDOM[0].onerror = function(){
		//nothing
	};
}

function nextVid(videoDOM){
	currentVid = vidQueue[0];
	vidQueue.shift();
	if (currentVid){
		videoDOM.attr('src', 'video/' + currentVid);
	}
	else {
		videoDOM.removeAttr('src');
	}
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
