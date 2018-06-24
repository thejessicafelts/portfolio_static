var fs            = require('fs')                         // file system, used to load the text content
var gulp          = require('gulp')
var connect       = require('gulp-connect')
var modRewrite    = require('connect-modrewrite')         // allow rewrites that mirror htaccess
var sass          = require('gulp-sass')                  // Calling the gulp-sass plugin
var useref        = require('gulp-useref')                // Allows concatenation to a single place (Useful for Distribution folder)
var imagemin      = require('gulp-imagemin')              // Used to optimized our images
var autoprefixer  = require('gulp-autoprefixer')          // applies CSS vendor prefixesvar cache
var cache         = require('gulp-cache')                 // Being used in conjunction to imagemin
var del           = require('del')                        // Used to clean up files
var runSequence   = require('run-sequence')               // Allows you to run task in a certain sequence
var plumber       = require('gulp-plumber')               // keeps pipes working even when error happens
var notify        = require('gulp-notify')                // system notification when error happens
var rename        = require('gulp-rename')                // renames files
var concat        = require('gulp-concat')                // concatenate scripts
var jshint        = require('gulp-jshint')                // catches errors in javascript
var stylish       = require('jshint-stylish')             // makes lint errors look nicer
var handlebars    = require('gulp-compile-handlebars')    // compile handlebars templates
var cheerio       = require('cheerio')                    // allows us to transform SVGS (server side jquery)
var sftp          = require('gulp-sftp')
var gutil         = require('gulp-util')

var paths = {
    // styles:   ['./src/scss/**/*'],
    // scripts:  ['./src/js/**/*'],
    // pages:    ['./src/html/pages/**/*'],
    partials:    './app/partials/**/*',
    // helpers:  './app/helpers/**/*',
    // images:   ['./src/img/**/*.+(png|jpg|jpeg|gif|svg)'],
    //content:   './app/content-prod.json',
    content:     './app/content.json',
    brand:       './app/data/brand.json',
    // svgs:     './app/svgs.json',
    dist:        './dist'
}

/*

███████╗████████╗██╗   ██╗██╗     ███████╗███████╗
██╔════╝╚══██╔══╝╚██╗ ██╔╝██║     ██╔════╝██╔════╝
███████╗   ██║    ╚████╔╝ ██║     █████╗  ███████╗
╚════██║   ██║     ╚██╔╝  ██║     ██╔══╝  ╚════██║
███████║   ██║      ██║   ███████╗███████╗███████║
╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚══════╝╚══════╝

*****************************************************/

gulp.task('sass', function(){

    var sassError = function(err){
        notify.onError({
            title:    err.relativePath,
            subtitle: 'Line '+err.line,
            message:  '<%= error.messageOriginal %>'
        })(err)
        this.emit('end')
    }

    gulp.src('./app/assets/css/main.scss')
        .pipe(plumber({
                errorHandler: sassError
        }))
        .pipe(sass({outputStyle: 'compressed'}))
        .pipe(autoprefixer({
            browsers: ['last 10 versions'],
            cascade: false
        }))
        .pipe(rename('main.css'))
        .pipe(gulp.dest(paths.dist))
        .pipe(connect.reload())
})
/*

██╗  ██╗████████╗███╗   ███╗██╗
██║  ██║╚══██╔══╝████╗ ████║██║
███████║   ██║   ██╔████╔██║██║
██╔══██║   ██║   ██║╚██╔╝██║██║
██║  ██║   ██║   ██║ ╚═╝ ██║███████╗
╚═╝  ╚═╝   ╚═╝   ╚═╝     ╚═╝╚══════╝

*************************************/

// check content  object for JSON errors
gulp.task('lint-content',function(){
    return gulp.src(paths.content)
        .pipe(plumber())
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'))
        .pipe(notify(function (file) {  // Use gulp-notify as jshint reporter
            if (file.jshint.success) {
                return false // Don't show something if success
            }
            var errors = file.jshint.results.map(function (data) {
                if (data.error) {
                    return "(" + data.error.line + ':' + data.error.character + ') ' + data.error.reason
                }
            }).join("\n")
            return file.relative + " (" + file.jshint.results.length + " errors)\n" + errors
        }))
})

gulp.task('html',['lint-content','images'], function () {
    console.log('paths.content', paths.content);
    var content = JSON.parse(fs.readFileSync(paths.content,'utf8'));

    // COMPILE SVGS:

    // this will be an object of just SVGS for spanish or english
    var svgs = {}

    // first read in alt text document
    var svgs_alt_tags = JSON.parse(fs.readFileSync('./app/assets/svgs/svgs-alt-tags.json','utf8'))

    // for each alt tag read in the SVG file
    for( var filename in svgs_alt_tags ){
        svg = fs.readFileSync('./app/assets/svgs/'+filename+'.svg', 'utf8')

        // manipulate SVG HTML to add the alt tag info
      $ = cheerio.load(svg)
        $('svg').attr({
            'role':       'img',
            'aria-label': svgs_alt_tags[filename]
        })
        $('<title>'+svgs_alt_tags[filename]+'</title>').prependTo('svg')

        // save modified SVG to the object
        svgs[filename] = $.html()
    }

    // add the svgs into the content object
    content.svgs = svgs

    var handlebarsError = function(err){
        notify.onError({
            title:    'Handlebars Error',
            message:  '<%= error.message %>'
        })(err)
        console.log(err)
        this.emit('end')
    }

    // handlebars compile options
    var options = {
        batch : ['./app/partials'], // batch is the path to the partials
        knownHelpers : true,
        helpers : {
          list: function(context, options) {
            var ret = "<ul>";
            for(var i=0, j=context.length; i<j; i++) {
              ret = ret + "<li>" + options.fn(context[i]) + "</li>";
            }
            return ret + "</ul>";
          }
        }
    }

    return gulp.src('./app/**/*.html')
        .pipe(plumber({errorHandler: handlebarsError}))
        .pipe(handlebars(content, options))
        .pipe(gulp.dest(paths.dist))
        .pipe(connect.reload())
})

gulp.task('copy', function() {
    gulp.src('./app/.htaccess')
        .pipe(gulp.dest(paths.dist))
    });

gulp.task('scripts', ['lint'], function(){
    return gulp.src([
            './app/js/lib/jquery-1.10.1.min.js',
            './app/assets/js/lib/*.js',
            './app/assets/js/*.js'
        ])
        .pipe(concat('main.js'))
        .pipe(gulp.dest(paths.dist))
        .pipe(connect.reload())
})

gulp.task('thoughts', function(){
    return gulp.src('./app/thoughts/**')
        .pipe(gulp.dest(paths.dist+'/thoughts'))
        .pipe(connect.reload())
})

gulp.task('lint',function(){
    return gulp.src('./app/assets/js/*.js')
        .pipe(plumber())
        .pipe(jshint({
            'asi':true // allows missing semicolons
        }))
        .pipe(jshint.reporter('jshint-stylish'))
        .pipe(notify(function (file) {  // Use gulp-notify as jshint reporter
            if (file.jshint.success) {
                return false // Don't show something if success
            }
            var errors = file.jshint.results.map(function (data) {
                if (data.error) {
                    return "(" + data.error.line + ':' + data.error.character + ') ' + data.error.reason
                }
            }).join("\n")
            return file.relative + " (" + file.jshint.results.length + " errors)\n" + errors
        }))
})

/*

██╗ ███╗   ███╗  █████╗   ██████╗  ███████╗ ███████╗
██║ ████╗ ████║ ██╔══██╗ ██╔════╝  ██╔════╝ ██╔════╝
██║ ██╔████╔██║ ███████║ ██║  ███╗ █████╗   ███████╗
██║ ██║╚██╔╝██║ ██╔══██║ ██║   ██║ ██╔══╝   ╚════██║
██║ ██║ ╚═╝ ██║ ██║  ██║ ╚██████╔╝ ███████╗ ███████║
╚═╝ ╚═╝     ╚═╝ ╚═╝  ╚═╝  ╚═════╝  ╚══════╝ ╚══════╝

****************************************************/

gulp.task('images', function(){ // task to help optimize images
    return gulp.src('app/assets/images/**/*.+(png|PNG|jpg|jpeg|gif|svg)')
    // Caching images that ran through imagemin
    .pipe(cache(imagemin({
            interlaced: true
        })))
    .pipe(gulp.dest(paths.dist+'/assets/images'))
})

/*

██╗   ██╗██╗██████╗ ███████╗ ██████╗ ███████╗
██║   ██║██║██╔══██╗██╔════╝██╔═══██╗██╔════╝
██║   ██║██║██║  ██║█████╗  ██║   ██║███████╗
╚██╗ ██╔╝██║██║  ██║██╔══╝  ██║   ██║╚════██║
 ╚████╔╝ ██║██████╔╝███████╗╚██████╔╝███████║
  ╚═══╝  ╚═╝╚═════╝ ╚══════╝ ╚═════╝ ╚══════╝


****************************************************/

gulp.task('videos', function(){ // task to help optimize images
    return gulp.src('app/assets/videos/**/*')
    .pipe(gulp.dest(paths.dist+'/assets/videos'))
})

/*

███████╗███████╗██████╗ ██╗   ██╗███████╗██████╗
██╔════╝██╔════╝██╔══██╗██║   ██║██╔════╝██╔══██╗
███████╗█████╗  ██████╔╝██║   ██║█████╗  ██████╔╝
╚════██║██╔══╝  ██╔══██╗╚██╗ ██╔╝██╔══╝  ██╔══██╗
███████║███████╗██║  ██║ ╚████╔╝ ███████╗██║  ██║
╚══════╝╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝

****************************************************/

var cors = function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'headers_you_want_to_accept');
  next();
};

// rewrite requests to the corresponding HTML files
var rewrite = modRewrite([
    '^/thoughts/(.*)$ /thoughts/$1.html'
])

gulp.task('connectDist', function () {
    connect.server({
        root: paths.dist,
        port: 8008,
        livereload: true,
        middleware: function () {
            return [cors];
        }
    })
})

/*

██╗    ██╗ █████╗ ████████╗ ██████╗██╗  ██╗
██║    ██║██╔══██╗╚══██╔══╝██╔════╝██║  ██║
██║ █╗ ██║███████║   ██║   ██║     ███████║
██║███╗██║██╔══██║   ██║   ██║     ██╔══██║
╚███╔███╔╝██║  ██║   ██║   ╚██████╗██║  ██║
 ╚══╝╚══╝ ╚═╝  ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝

**********************************************/

gulp.task('watch', ['sass','html','scripts','images','videos', 'thoughts','copy'], function (){
    gulp.watch('app/assets/css/**', ['sass', 'images'])
    // gulp.watch('app/*.html', ['html'])
    gulp.watch('app/**/*.html', ['html'])
    gulp.watch('app/*.json', ['html'])
    gulp.watch('app/assets/js/**/*.js',['scripts'])
    gulp.watch('app/partials/**/*.hbs',['sass','html','scripts','images','videos'])
    gulp.watch('app/data/**', ['data'])
    gulp.watch('app/thoughts/**', ['thoughts'])
})

/*

██████╗  ██╗   ██╗ ██╗ ██╗      ██████╗
██╔══██╗ ██║   ██║ ██║ ██║      ██╔══██╗
██████╔╝ ██║   ██║ ██║ ██║      ██║  ██║
██╔══██╗ ██║   ██║ ██║ ██║      ██║  ██║
██████╔╝ ╚██████╔╝ ██║ ███████╗ ██████╔╝
╚═════╝   ╚═════╝  ╚═╝ ╚══════╝ ╚═════╝

**************************************/

gulp.task('build', function (callback) {
    runSequence('clean',['sass', 'scripts', 'html', 'thoughts', 'images', 'videos'])
})

gulp.task('clean', function() {
    return del.sync(paths.dist)
})

gulp.task('default', function (callback) {
    runSequence(['connectDist','watch','copy'],
        callback
    )
})
