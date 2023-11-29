module.exports = function(grunt) {
  const target = grunt.option('target');
  grunt.initConfig({
        clean: ['src/manifest-*.json'],
        compress: {
          main: {
            options: {
              archive: `foxyproxy-${target}.zip`
            },
            files: [
              {expand: true, cwd: 'src/', src: ['**/*', '!.DS_Store', '!manifest-*', '!*.zip', '!screenshots/**'], dest: '/', filter: 'isFile'}
            ]
          }
        }
  });

  if (!target) {
    grunt.fail.fatal('--target command-line arg expected to be one of: chrome-standard, chrome-basic, firefox-standard, firefox-basic. Example: grunt --target=chrome-standard');
  }
  let manifestSuffix;
  if (target === 'chrome-standard') {
    manifestSuffix = 'chrome';
  }
  else if (target === 'firefox-standard') {
    manifestSuffix = 'firefox';
  }
  grunt.file.copy(`src/manifest-${manifestSuffix}.json`, 'src/manifest.json');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.registerTask('default', ['clean','compress']);
};
      