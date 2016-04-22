var gulp = require('gulp');
var handlebars = require('gulp-handlebars');
var minifyCss = require('gulp-minify-css');
var concat = require('gulp-concat');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var wrap = require('gulp-wrap');
var declare = require('gulp-declare');
var del = require('del');


var jslibs = [
    'node_modules/jquery/dist/jquery.js',
    'node_modules/handlebars/dist/handlebars.js',
    'node_modules/underscore/underscore.js',
    'node_modules/backbone/backbone.js',
    'node_modules/bootstrap/dist/js/bootstrap.js',
    'node_modules/bootbox/bootbox.js',
    'node_modules/backbone-special-k/dist/backbone-specialk.min.js'
];

var css = [
    'node_modules/bootswatch/slate/bootstrap.css',
    'app/assets/css/style.css'
];

var jst = "app/modules/**/*.hbs";

var jsapp = [
    '.tmp/compiled-handlebars.js',
    'app/main.js',
    'app/modules/**/*-script.js',
    'app/modules/**/model.js',
    'app/modules/**/collection/*.js',
    'app/modules/**/*-view.js',
    'app/modules/**/router.js'
];

var uglifyOptions = {
    mangle: false,
    compress: {
        sequences: true,
        dead_code: true,
        conditionals: true,
        booleans: true,
        unused: true,
        if_return: true,
        join_vars: true,
        drop_console: true,
        warnings: false
    },
};

// --
gulp.task('hbs', function() {
    return gulp.src(jst)
        .pipe(handlebars({
            handlebars: require('handlebars')
        }))
        .pipe(wrap('Handlebars.template(<%= contents %>)'))
        .pipe(declare({
            namespace: 'JST',
            noRedeclare: true,
            processName: function() {
                console.log(arguments);
            }
        }))
        .pipe(concat('compiled-handlebars.js'))
        .pipe(gulp.dest('.tmp'));
});

// --
gulp.task('css', function() {
    return gulp.src(css)
        .pipe(sourcemaps.init())
        .pipe(minifyCss())
        .pipe(sourcemaps.write())
        .pipe(concat('styles.css'))
        .pipe(gulp.dest('./public/css'));
});

// --
gulp.task('jslibs', function() {
    return gulp.src(jslibs)
        .pipe(sourcemaps.init())
        .pipe(concat('libs.js'))
        .pipe(uglify())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./public/js'));
});

gulp.task('jsapp', ['hbs'], function() {
    return gulp.src(jsapp)
        .pipe(sourcemaps.init())
        .pipe(concat('app.js'))
        .pipe(uglify())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./public/js'));
});

gulp.task('fonts', function() {
    return gulp.src('node_modules/bootstrap/dist/fonts/**/*')
        .pipe(gulp.dest('public/fonts'));
});

gulp.task('clean', function() {
    del.sync(['public/**/*']);
});


gulp.task('watch', function() {
    gulp.watch(jslibs, ['jslibs']);
    gulp.watch(jsapp, ['jsapp']);
    gulp.watch(css, ['css']);
    gulp.watch(jst, ['hbs']);
});

// --
gulp.task('default', [
    'fonts',
    'css',
    'jsapp'
]);

gulp.task('production', ['clean', 'default', 'jslibs'])

gulp.task('dev', function() {
    gulp.start('default', function() {
        console.log('END!');
    });
    gulp.start('watch');
});
