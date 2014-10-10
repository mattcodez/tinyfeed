$(document).ready(function() {
	$('#videoFeed').css('max-height', ($(window).height() - 42) + 'px');

	$(window).on('resize', function() {
		$('#videoFeed').css('max-height', ($(window).height() - 42) + 'px');
	});

	init();
});

function init(){
	var videoForm = $('#addVideo FORM');
	var fileInput = $('#addVideo INPUT[type=file]');

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
			success: function(data){}
		});
	});
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
