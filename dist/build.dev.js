#!/usr/bin/env node

/**
 * Simple build script for Monopoly Russia game
 * Handles minification and optimization for production
 */
"use strict";

var fs = require('fs');

var path = require('path'); // Simple CSS minifier


function minifyCSS(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
  .replace(/\s+/g, ' ') // Replace multiple spaces with single space
  .replace(/;\s*}/g, '}') // Remove semicolon before closing brace
  .replace(/\s*{\s*/g, '{') // Remove spaces around opening brace
  .replace(/\s*}\s*/g, '}') // Remove spaces around closing brace
  .replace(/\s*,\s*/g, ',') // Remove spaces around commas
  .replace(/\s*:\s*/g, ':') // Remove spaces around colons
  .replace(/\s*;\s*/g, ';') // Remove spaces around semicolons
  .trim();
} // Simple JavaScript minifier (basic)


function minifyJS(js) {
  return js.replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
  .replace(/\/\/.*$/gm, '') // Remove line comments
  .replace(/\s+/g, ' ') // Replace multiple spaces with single space
  .replace(/\s*([{}();,])\s*/g, '$1') // Remove spaces around punctuation
  .trim();
} // Build process


function build() {
  var srcDir = path.join(__dirname, 'src');
  var distDir = path.join(__dirname, 'dist'); // Create dist directory if it doesn't exist

  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, {
      recursive: true
    });
  }

  console.log('🚀 Starting build process...');

  try {
    // Minify CSS
    var cssContent = fs.readFileSync(path.join(srcDir, 'style.css'), 'utf8');
    var minifiedCSS = minifyCSS(cssContent);
    fs.writeFileSync(path.join(distDir, 'style.min.css'), minifiedCSS);
    console.log('✅ CSS minified successfully'); // Minify JavaScript

    var jsContent = fs.readFileSync(path.join(srcDir, 'game.js'), 'utf8');
    var minifiedJS = minifyJS(jsContent);
    fs.writeFileSync(path.join(distDir, 'game.min.js'), minifiedJS);
    console.log('✅ JavaScript minified successfully'); // Copy and optimize HTML

    var htmlContent = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
    var optimizedHTML = htmlContent.replace('style.css', 'style.min.css').replace('game.js', 'game.min.js').replace(/\s+/g, ' ') // Basic HTML minification
    .trim();
    fs.writeFileSync(path.join(distDir, 'index.html'), optimizedHTML);
    console.log('✅ HTML optimized successfully'); // Generate build info

    var buildInfo = {
      timestamp: new Date().toISOString(),
      files: {
        'style.min.css': "".concat(minifiedCSS.length, " bytes"),
        'game.min.js': "".concat(minifiedJS.length, " bytes"),
        'index.html': "".concat(optimizedHTML.length, " bytes")
      },
      totalSize: minifiedCSS.length + minifiedJS.length + optimizedHTML.length
    };
    fs.writeFileSync(path.join(distDir, 'build-info.json'), JSON.stringify(buildInfo, null, 2));
    console.log('✅ Build info generated');
    console.log("\uD83C\uDF89 Build completed successfully! Total size: ".concat(buildInfo.totalSize, " bytes"));
    console.log("\uD83D\uDCC1 Output directory: ".concat(distDir));
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
} // Run build if called directly


if (require.main === module) {
  build();
}

module.exports = {
  build: build,
  minifyCSS: minifyCSS,
  minifyJS: minifyJS
};