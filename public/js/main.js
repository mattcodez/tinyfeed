$(document).ready(function() {
	$(window).on('resize', function() {
		$('#videoFeed').css('max-height', $(window).height() + 'px');
	});
});