var gulp = require('gulp'),
    eslint = require('gulp-eslint'),
    coveralls = require('gulp-coveralls');

gulp.task('lint', function() {
  return gulp.src(['**/*.js', '!node_modules/**', '!coverage/**', '!site/**'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('coverall', function() {
  gulp.src('coverage/lcov.info')
    .pipe(coveralls());
});

gulp.task('default', ['lint', 'coverall']);
