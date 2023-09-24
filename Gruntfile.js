module.exports = function(grunt) {

    grunt.initConfig({
          compress: {
            main: {
              options: {
                archive: 'target.zip'
              },
              files: [
                {expand: true, cwd: 'src/', src: ['**/*', '!.DS_Store', '!manifest-*', '!*.zip', '!screenshots/**'], dest: '/', filter: 'isFile'}
              ]
            }
          }
    });
  
      grunt.loadNpmTasks('grunt-contrib-compress');
      grunt.registerTask('default', ['compress']);
  };