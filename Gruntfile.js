module.exports = function(grunt) {

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		browserify: {
			'public/js/bundle.js': ['client/**/*.js'],
		},
		jshint: {
			all: ['Gruntfile.js', 'client/**/*.js'],
		},
		uglify: {
			options: {
				banner: '/* <%= pkg.name %> – <%= pkg.version %> – <%= grunt.template.today() %> */',
				mangle: true,
			},
			build: {
				src: 'public/js/bundle.js',
				dest: 'public/js/bundle.js',
			}
		},
		watch: {
			scripts: {
				files: 'client/**/*.js',
				tasks: ['jshint', 'browserify'],
			}
		}
	});

	grunt.loadNpmTasks('grunt-browserify');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-uglify');

	grunt.registerTask('default', [
		'jshint',
		'browserify',
		'uglify',
	]);

};