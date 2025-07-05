#!/usr/bin/env node

/**
 * Simple build script for Monopoly Russia game
 * Handles minification and optimization for production
 */

const fs = require('fs');
const path = require('path');

// Simple CSS minifier
function minifyCSS(css) {
    return css
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/;\s*}/g, '}') // Remove semicolon before closing brace
        .replace(/\s*{\s*/g, '{') // Remove spaces around opening brace
        .replace(/\s*}\s*/g, '}') // Remove spaces around closing brace
        .replace(/\s*,\s*/g, ',') // Remove spaces around commas
        .replace(/\s*:\s*/g, ':') // Remove spaces around colons
        .replace(/\s*;\s*/g, ';') // Remove spaces around semicolons
        .trim();
}

// Simple JavaScript minifier (basic)
function minifyJS(js) {
    return js
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
        .replace(/\/\/.*$/gm, '') // Remove line comments
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/\s*([{}();,])\s*/g, '$1') // Remove spaces around punctuation
        .trim();
}

// Build process
function build() {
    const srcDir = path.join(__dirname, 'src');
    const distDir = path.join(__dirname, 'dist');
    
    // Create dist directory if it doesn't exist
    if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
    }
    
    console.log('🚀 Starting build process...');
    
    try {
        // Minify CSS
        const cssContent = fs.readFileSync(path.join(srcDir, 'style.css'), 'utf8');
        const minifiedCSS = minifyCSS(cssContent);
        fs.writeFileSync(path.join(distDir, 'style.min.css'), minifiedCSS);
        console.log('✅ CSS minified successfully');
        
        // Minify JavaScript
        const jsContent = fs.readFileSync(path.join(srcDir, 'game.js'), 'utf8');
        const minifiedJS = minifyJS(jsContent);
        fs.writeFileSync(path.join(distDir, 'game.min.js'), minifiedJS);
        console.log('✅ JavaScript minified successfully');
        
        // Copy and optimize HTML
        const htmlContent = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
        const optimizedHTML = htmlContent
            .replace('style.css', 'style.min.css')
            .replace('game.js', 'game.min.js')
            .replace(/\s+/g, ' ') // Basic HTML minification
            .trim();
        fs.writeFileSync(path.join(distDir, 'index.html'), optimizedHTML);
        console.log('✅ HTML optimized successfully');
        
        // Generate build info
        const buildInfo = {
            timestamp: new Date().toISOString(),
            files: {
                'style.min.css': `${minifiedCSS.length} bytes`,
                'game.min.js': `${minifiedJS.length} bytes`,
                'index.html': `${optimizedHTML.length} bytes`
            },
            totalSize: minifiedCSS.length + minifiedJS.length + optimizedHTML.length
        };
        
        fs.writeFileSync(path.join(distDir, 'build-info.json'), JSON.stringify(buildInfo, null, 2));
        console.log('✅ Build info generated');
        
        console.log(`🎉 Build completed successfully! Total size: ${buildInfo.totalSize} bytes`);
        console.log(`📁 Output directory: ${distDir}`);
        
    } catch (error) {
        console.error('❌ Build failed:', error.message);
        process.exit(1);
    }
}

// Run build if called directly
if (require.main === module) {
    build();
}

module.exports = { build, minifyCSS, minifyJS };