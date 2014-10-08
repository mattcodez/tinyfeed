$(document).ready(function() {
	$('#videoFeed').css('max-height', ($(window).height() - 42) + 'px');

	$(window).on('resize', function() {
		$('#videoFeed').css('max-height', ($(window).height() - 42) + 'px');
	});
});