$(document).ready(function() {
	$('#videoFeed').css('max-height', $(window).height() + 'px');
	
	$(window).on('resize', function() {
		$('#videoFeed').css('max-height', $(window).height() + 'px');
	});
});