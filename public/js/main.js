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
	var loginModal = $('#loginSignup');
	var loginSubmit = loginModal.find('[type="submit"]');
	var loginMsg = loginModal.find('.msg');

	$('a.login').on('click', function(e){
		loginModal
			.find('.password-confirm').hide()
			.find('input').prop('disabled', true);

		loginMsg.text('').hide();

		loginSubmit
			.text('Login')
			.off()
			.on('click', function(e){
				e.preventDefault();

				var data = {
					username: $('#email').val(),
					password: $('#password').val()
				};

				$.post('/login', data, function(data){
					if (data.errMsg){
						loginMsg
							.text(data.errMsg)
							.show();
					}
					else {
						$('#navbar .username').text(data.user.displayName);
						loginModal.modal('hide');
					}
				});

				return false;
			});
	});

	$('a.signup').on('click', function(e){
		loginModal
			.find('.password-confirm').show()
			.find('input').prop('disabled', false);

		loginSubmit
			.text('Signup')
			.off()
			.on('click', function(e){
				e.preventDefault();
				var msgBox = loginModal.find('.msg');
				msgBox.text('').hide();

				if($('#password').val() !== $('#passwordConfirm').val()){
					msgBox
						.text('Password does not match')
						.slideDown();
				} else {
					$.ajax('api/user',{
						contentType : 'application/json',
						type: 'POST',
						data: JSON.stringify(
								{
									user:{
										email: $('#email').val(),
										password: $('#password').val()
									}
								}
							)
					}).done(function (data){
						//Success!
						$('#navbar .username').text(data.user.displayName);
						loginModal.modal('hide');
					}).fail(function(xhr){
						var data = JSON.parse(xhr.responseText);
						if (data.errMsg){
							msgBox
								.text(data.errMsg)
								.slideDown();
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
		} else {
			$('#notice').modal('show');
		}
	});
	$('#notice .agree').click(function() {
		$('#notice').modal('hide');
		window.localStorage && (window.localStorage.distNoticeConfirmed = "true");
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
