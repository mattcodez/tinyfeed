'use strict';

var gulp = require('gulp'),
  nodemon = require('gulp-nodemon'),
  mocha = require('gulp-mocha'),
  watch = require('gulp-watch'),
  concat = require('gulp-concat'),
  autoprefixer = require('gulp-autoprefixer'),
  minifycss = require('gulp-minify-css'),
  uglify = require('gulp-uglify'),
  rename = require('gulp-rename'),
  notify = require('gulp-notify'),
  cache = require('gulp-cache'),
  ejs = require('gulp-ejs'),
  del = require('del'),
  runSequence = require('gulp-run-sequence');

var assets = require('./config/assets.js');

gulp.task('clean', function(cb){
  del('dist/*', cb);
});

gulp.task('prodHTML', function(){
  return gulp.src('views/main.html')
    .pipe(ejs({
      siteName:'TinyFeed.ME',
      css:['css/build.min.css'],
      js:['js/build.min.js']}))
    .pipe(gulp.dest('dist/views'));
});

gulp.task('copyDist', function(){
  return gulp.src([
      'config/*',
      'models/*',
      'public/img/*',
      'public/terms.html',
      'routes/*',
      'app.js',
      'package.json'], {base: '.'})
    .pipe(gulp.dest('dist'));
});

gulp.task('styles', function() {
  return gulp.src([
      'public/css/vendor/bootstrap.cyborg.min.css',
      'public/bower_components/sweetalert/lib/sweet-alert.css',
      'public/css/main.css'])
    .pipe(autoprefixer('last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1', 'ios 6', 'android 4'))
    .pipe(concat('build.css'))
    .pipe(rename({suffix: '.min'}))
    .pipe(minifycss())
    .pipe(gulp.dest('dist/public/css'));
});

gulp.task('js', function() {
  return gulp.src([
      'public/js/vendor/jquery-1.11.1.min.js',
      'public/bower_components/bootstrap/dist/js/bootstrap.min.js',
      'public/bower_components/sweetalert/lib/sweet-alert.min.js',
      'public/js/main.js'])
		.pipe(concat('build.js'))
		.pipe(uglify())
    .pipe(rename({suffix: '.min'}))
		.pipe(gulp.dest('dist/public/js'));
});

gulp.task('build', function(cb){
  runSequence('clean', ['prodHTML', 'copyDist', 'styles', 'js'], cb);
});

// Copy all static images
gulp.task('test', function () {
  gulp.src('./test/*.js')
    .pipe(mocha({
      ignoreLeaks: false,
      reporter: 'nyan'
    }));
});

gulp.task('nodemon', function () {
  nodemon({ script: 'app.js', env: { 'NODE_ENV': 'development' }, nodeArgs: ['--debug=9999']})
    .on('restart')
});

// Rerun the task when a file changes

gulp.task('watch', function() {
    gulp.src(['*.js','routes/*.js', 'models/*.js', 'config/*.js'], { read: true })
        .pipe(watch({ emit: 'all' }));
});

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['test', 'nodemon', 'watch']);
