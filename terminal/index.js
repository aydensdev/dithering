const sharp = require('sharp');
const fs = require('fs');

//terminal colors for my os- add your own if needed?
const colorPalatte = [
    {r: 33, g:33, b:33, c:30},
    {r: 204, g:0, b:0, c:31},
    {r: 78, g:154, b:6, c:32},
    {r: 196, g:160, b:0, c:33},
    {r: 52, g:101, b:164, c:34},
    {r: 117, g:80, b:123, c:35},
    {r: 6, g:152, b:154, c:36},
    {r: 211, g:215, b:207, c:37},

    {r: 136, g:128, b:124, c:90},
    {r: 241, g:93, b:34, c:91},
    {r: 115, g:196, b:143, c:92},
    {r: 255, g:206, b:81, c:93},
    {r: 72, g:185, b:199, c:94},
    {r: 173, g:127, b:168, c:95},
    {r: 52, g:226, b:226, c:96},
    {r: 238, g:238, b:236, c:97}
];

//grayscale terminal colors
const grayscalePalette = [
    {r: 33, g:33, b:33, c:30},
    {r: 211, g:215, b:207, c:37},
    {r: 136, g:128, b:124, c:90},
    {r: 238, g:238, b:236, c:97}
];
const execCommand = 'node index.js';

//arguments
var options = process.argv.slice(2)[1];
if(options){
    options = options.split('');
}else{
    options = [];
}

var fileName = process.argv.slice(2)[0];
if(fileName){
    let wd = process.cwd().split('/');
    chars = fileName.split('')
    if(chars[0] == '.' && chars[1] == '.'){
        chars = chars.slice(2);
        wd.splice(-1);
        fileName = wd.join('/') + chars.join('');
    }else if(chars[0] == '.'){
        chars = chars.slice(1);
        fileName = wd.join('/') + chars.join('');
    }else{
        fileName = chars.join('');
    }
}

async function init(image, callback){
    if ((options[0] != "-" && options.length > 0) || options[0] == "-" && options.length == 1){
        logError("Error: Invalid options recieved.");
        return;
    }
    if(options.includes("h")){
        helpMenu();
        return;
    }
    if(image == undefined){
        logError("Error: No file given.")
        return;
    }
    let supported = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
    var ext = image.split('.').pop();
    if(!supported.includes(ext)){
        logError("Error: Unsupported file format receieved.");
        return;
    };
    let valid = fs.existsSync(image);
    if(!valid){
        logError("Error: File not found.")
        return;
    }
    var resizeOptions = {};
    if(options.includes("w")){
        resizeOptions = {width:process.stdout.columns, fit:'contain'};
    }else{
        resizeOptions = {width:process.stdout.columns, height: process.stdout.rows*2, fit:'inside'};
    };
    var palette = [];
    if(options.includes("g")){
        palette = grayscalePalette;
    }else{
        palette = colorPalatte;
    }; 
    let {data, info} = await sharp(image)
        .resize(resizeOptions)
        .toBuffer({resolveWithObject: true}); 
    let { width, height} = info;
    callback(image, width, Math.round(height/2), palette);
}
async function createBuffer(image, imgWidth, imgHeight, palette){
    let { data, info } = await sharp(image)
        .raw()
        .removeAlpha()
        .resize({width:imgWidth, height:imgHeight, fit:'fill'})
        .toBuffer({ resolveWithObject: true });

    let { width, height, channels } = info;
    let pixelArray = new Uint8ClampedArray(data.buffer);
    renderImage(pixelArray, width, height, palette);
}

function renderImage(pixelArray, width, height, palette){
    var row = '';
    var disableDither = options.includes("d");

    //renders the buffer
    for (var i = 0; i < pixelArray.length; i += 3) {
        let pixel = Math.floor(i/3);

        //rgb calculations
        let oldColor = {
            r:pixelArray[i], 
            g:pixelArray[i+1],
            b:pixelArray[i+2]
        };
        let newColor = getClosestColor(oldColor);
        let errorVal = {
            r: oldColor.r - newColor.r,
            g: oldColor.g - newColor.g,
            b: oldColor.b - newColor.b
        }

        if(pixel % width == 0 && pixel > 0){
            console.log(row);
            row = '';
        }
        row += `\x1b[${newColor.c}m█\x1b[0m`;

        //error diffusion
        if(!disableDither){
            addError(7 / 16.0, coord(pixel, 1, 0, width), errorVal);
            addError(3 / 16.0, coord(pixel, -1, 1, width), errorVal);
            addError(5 / 16.0, coord(pixel, 0, 1, width), errorVal);
            addError(1 / 16.0, coord(pixel, 1, 1, width), errorVal);
        };
    }

    //write info at the end
    colors = [];
    for(let x = 0; x<palette.length; x++){
        colors.push(`\x1b[${palette[x].c}m█\x1b[0m`);
    }
    console.log(`\n\nProcessed ${width}x${height} Image. Color Palatte: (${colors.join('')})`);

    //functions used
    function getClosestColor(color){
        var match = {diff: 9999, index: 0};
        palette.forEach((val, i, arr) => {
            diff = Math.abs(color.r-val.r)+Math.abs(color.g-val.g)+Math.abs(color.b-val.b);
            if (diff < match.diff){
                match.diff = diff;
                match.index = i;
            }
        })
        return palette[match.index];
    };
    function addError(factor, index, error){
        pixelArray[index + 0] += (error.r * factor);
        pixelArray[index + 1] += (error.g * factor);
        pixelArray[index + 2] += (error.b * factor);
    }

    function coord(index, addX, addY, width){
        let y = Math.floor(index / width);
        return indexOf((index - (y * width)) + addX, y + addY, width);
        function indexOf(x, y, w){
            return (x * 3) + (y * w * 3);
        }
    }
}

function helpMenu(){
    helpMenu = 
`Usage: ${execCommand} PATH_TO_FILE -[options]

Options:
    -d: Disable Dithering. Disables error diffusion dithering.
        May improve result in lower resolutions.
    -g: Grayscale. Outputs image using a grayscale palatte.
    -h: Help Menu. Displays a menu that explains the usage of 
        this command.
    -w: Width Restraint. Outputs image at maximum with possible. 
        Default image is height restrained.
    
Example Usage: ${execCommand} image.png -gd`;

    helpMenu.split('\n').forEach((val, i, arr) => {
        console.log(val);
    })
}

function logError(err){
    console.log(err + " Use the following command for help:");
    console.log(`   ${execCommand} run -h`)
}

init(fileName, createBuffer);
