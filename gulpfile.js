var DEBUG = true;
var PORT = 3000;
var APP_DIR = "public";

var addStream     = require('add-stream');
var gulp          = require('gulp');
var nodemon       = require('gulp-nodemon');
var inject        = require('gulp-inject');
var concat        = require('gulp-concat');
var concatCss     = require('gulp-concat-css');
var cssNano       = require('gulp-cssnano');
var ghPages       = require('gulp-gh-pages');
var rename        = require('gulp-rename');
var sourceMaps    = require('gulp-sourcemaps');
var templateCache = require('gulp-angular-templatecache');
var ts            = require('gulp-typescript');
var tslint        = require('gulp-tslint');
var uglify        = require('gulp-uglify');
var sass          = require('gulp-sass');
var path          = require('path');
//var wiredep       = require('wiredep').stream;
var bowerFiles    = require('main-bower-files');
var _             = require('underscore');
var history       = require('connect-history-api-fallback');
var browserSync   = require('browser-sync').create();
var reload        = browserSync.reload;
var bump          = require('gulp-bump');
var args          = require('./args');


// bump the version in the public/version.json file
gulp.task('_bump-version.json', function() {
    return gulp.src('./public/version.json')
    .pipe(bump({type:args.versionBumpType})) //major|minor|patch|prerelease
    .pipe(gulp.dest('./public/'));
});

// bump the version in the package.json and public/version.json files
gulp.task('_bump-packages', function() {
    return gulp.src(['./package.json', './bower.json'])
    .pipe(bump({type:args.versionBumpType})) //major|minor|patch|prerelease
    .pipe(gulp.dest('./'));
});

// bump version on all files
gulp.task('bump-version', ['_bump-packages', '_bump-version.json'])

// use this task to build and push dist/ to a
// deployment branch for inclusion in other projects
gulp.task('deploy', ['bump-version', 'build'], function() {
    var options = {
        branch: 'deploy', // deploy branch is named deploy
        force: true,      // dist files are ignored, force to push them too
    }
    // everything in public/ should be deployed
    return gulp.src(['./public/**', '!**/src/**'])
        .pipe(ghPages(options));
});

// Lint to keep us in line
gulp.task('lint', function() {
	return gulp.src('public/src/**/*.ts')
		.pipe(tslint())
		.pipe(tslint.report('default'));
});

// Concatenate & minify JS
gulp.task('scripts', function() {
	return gulp.src('public/src/**/*.ts')
		.pipe(addStream.obj(prepareTemplates()))
		.pipe(sourceMaps.init())
		.pipe(ts({
			noImplicitAny: true,
			suppressImplicitAnyIndexErrors: true,
			out: 'app.js'
		}))
		.pipe(gulp.dest('public/dist'))
		.pipe(rename('app.min.js'))
		.pipe(uglify())
		.pipe(sourceMaps.write('.'))
		.pipe(gulp.dest('public/dist'))
        .pipe(browserSync.stream());
});

// Compile, concat & minify sass
gulp.task('sass', function () {
	return gulp.src('public/src/**/*.scss')
		.pipe(sass().on('error', sass.logError))
		.pipe(gulp.dest('public/dist/css'));
});

gulp.task('concatCss', ['sass'], function () {
	return gulp.src('public/dist/css/**/*.css')
		.pipe(concatCss("app.css"))
		.pipe(gulp.dest('public/dist'))
});

gulp.task('cssNano', ['sass', 'concatCss'], function() {
	return gulp.src('public/dist/app.css')
		.pipe(cssNano())
		.pipe(rename({suffix: '.min'}))
		.pipe(gulp.dest('public/dist'))
        .pipe(browserSync.stream());
});

// Inject dist + bower lib files
gulp.task('inject', ['scripts', 'cssNano'], function(){
	// inject our dist files
	var injectLocal = gulp.src([
		'./public/dist/app.css',
		'./public/dist/app.js',
	], { read: false });

	var injectLocalOptions = {
		ignorePath: '/public'
	};

	var injectBower = gulp.src(bowerFiles(), { read: false });
	
    var injectBowerOptions = {
		//ignorePath: '/public'
        name: 'bower',
		ignorePath: '/public'
        //relative: true
	};

	return gulp.src('./public/*.html')
		.pipe(inject(injectLocal, injectLocalOptions))
		.pipe(inject(injectBower, injectBowerOptions))
		.pipe(gulp.dest('./public'));
});

//// Inject dist + bower lib files
//gulp.task('inject', ['scripts', 'cssNano'], function(){
//	// inject our dist files
//	var injectSrc = gulp.src([
//		'./public/dist/app.css',
//		'./public/dist/app.js'
//	], { read: false });
//
//	var injectOptions = {
//		ignorePath: '/public'
//	};
//
//	// inject bower deps
//	var options = {
//		bowerJson: require('./bower.json'),
//		directory: './public/lib',
//		ignorePath: '../../public/',
//	};
//
//	return gulp.src('./public/*.html')
//		.pipe(wiredep(options))
//		.pipe(inject(injectSrc, injectOptions))
//		.pipe(gulp.dest('./public'));
//
//});

gulp.task('browser-sync', function() {
  browserSync.init({
    server: {
            baseDir: APP_DIR,
            target: 'localhost:' + PORT,
            middleware: [
                // we use the history middleware to rewrite angular urls to index.html
                // see http://stackoverflow.com/a/30711626
                history({
                    verbose: DEBUG,
                }),
            ]
        },
  });
});

gulp.task('serve', ['browser-sync', 'scripts', 'cssNano', 'inject'], function(){
    gulp.watch('public/src/**/*.scss', ['cssNano']);
    gulp.watch('public/src/**/*(*.ts|*.js|*.html)', ['scripts']);
});

// build task to compile all files in dist
gulp.task('build', ['lint', 'scripts', 'sass', 'concatCss', 'cssNano', 'inject']);

// Default Task
gulp.task('default', ['build', 'serve']);

function prepareTemplates() {
	// we get a conflict with the < % = var % > syntax for $templateCache
	// template header, so we'll just encode values to keep yo happy
	var encodedHeader = "angular.module(&quot;&lt;%= module %&gt;&quot;&lt;%= standalone %&gt;).run([&quot;$templateCache&quot;, function($templateCache:any) {";
	return gulp.src('public/src/**/*.html')
		.pipe(templateCache('templates.ts', {
			root: "app-templates",
			module: "app.templates",
			standalone : true,
			templateHeader: _.unescape(encodedHeader)
		}));
}
