const settings = {                 // OPTIONS:
	image: "cube.jpg",         // check ../media
	type: "diffusion",         // diffusion, ordererd
	palette: "grayscale3",     // terminal, grayscale3, gameboy, bwrgbcmy
	matrixSize: 4,             // 2, 3, 4
	resolution: 1/1,           // 1/2, 1/4 etc.
}

window.onload = () => {
    //inititilizing code and variables
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    const matrix = [
		[], [], //0 and 1 is not a valid matrix size
		[[102, 153],         [204, 51]], 
		[[28, 196, 112],     [168, 140, 224],     [84, 252, 56]], 
		[[16, 208, 64, 254], [144, 80, 192, 128], [48, 240, 32, 224], [160, 112, 176, 96]]
	][settings.matrixSize];
	
	const palette = {
		terminal: [
			{r: 33, g:33, b:33},
			{r: 204, g:0, b:0},
			{r: 78, g:154, b:6},
			{r: 196, g:160, b:0},
			{r: 52, g:101, b:164},
			{r: 117, g:80, b:123},
			{r: 6, g:152, b:154},
			{r: 211, g:215, b:207},
			{r: 136, g:128, b:124},
			{r: 241, g:93, b:34},
			{r: 115, g:196, b:143},
			{r: 255, g:206, b:81},
			{r: 72, g:185, b:199},
			{r: 173, g:127, b:168},
			{r: 52, g:226, b:226},
			{r: 238, g:238, b:236}
		],
		grayscale3: [
			{r: 255, g:255, b:255},
			{r: 128, g:128, b:128},
			{r: 0, g:0, b:0}
		],
		gameboy: [
			{r: 255, g:255, b:255},
			{r: 255, g:85, b:255},
			{r: 85, g:255, b:255},
			{r: 0, g:0, b:0},
		],
		bwrgbcmy: [
			{r: 0, g:0, b:0},
			{r: 255, g:255, b:255},

			{r: 255, g:0, b:0},
			{r: 0, g:255, b:0},
			{r: 0, g:0, b:255},

			{r: 0, g:255, b:255},
			{r: 255, g:0, b:255},
			{r: 255, g:255, b:0},
		]
	}[settings.palette];

    const img = new Image();
    img.src = '../media/' + settings.image;

    img.onload = () => {

        let imgWidth = img.width * settings.resolution;
        let imgHeight = img.height * settings.resolution;

        canvas.width = imgWidth;
        canvas.height = imgHeight;

		//draws two images
		ctx.drawImage(img, 0, 0, imgWidth, imgHeight);

		//process one image
        const imageData = ctx.getImageData(0, 0, imgWidth, imgHeight);

		if(settings.type == "ordered"){
			imageData.data = orderedDither(imgWidth, imageData.data);
		}else if (settings.type == "diffusion"){
			imageData.data = diffusionDither(imgWidth, imageData.data);
		}

		//draw processed image
        ctx.putImageData(imageData, 0, 0);
	}

	function orderedDither(imgWidth, data){
        for (var i = 0; i < data.length; i += 4) {
            let pixelNum = Math.floor(i/4);
            let comparision = matrix[Math.floor(pixelNum / imgWidth) % matrix.length][(Math.round(pixelNum % imgWidth) % matrix[0].length)];

			//gets pixel color
			let newColor = {
				r: [255, 0][1-(data[i] > comparision)],
				g: [255, 0][1-(data[i+1] > comparision)],
				b: [255, 0][1-(data[i+2] > comparision)]
			}

            //sets pixel
            data[i]     = newColor.r;
            data[i + 1] = newColor.g;
            data[i + 2] = newColor.b;
            data[i + 3] = 255;
        }

		//return processed image
		return data;
	};

	function diffusionDither(imgWidth, data) {
        for (var i = 0; i < data.length; i += 4) {
			//get old pixel
            let pixel = Math.floor(i/4);
            let oldColor = {
                r:data[i], 
                g:data[i+1],
                b:data[i+2]
            };

			//calc pixel and error
            let newColor = getClosestColor(oldColor);
            let errorVal = {
                r: oldColor.r - newColor.r,
                g: oldColor.g - newColor.g,
                b: oldColor.b - newColor.b
            }

			//diffuse error
            addError(7 / 16.0, coord(pixel, 1, 0, imgWidth), errorVal);
            addError(3 / 16.0, coord(pixel, -1, 1, imgWidth), errorVal);
            addError(5 / 16.0, coord(pixel, 0, 1, imgWidth), errorVal);
            addError(1 / 16.0, coord(pixel, 1, 1, imgWidth), errorVal);

			//set pixel
            data[i]     = newColor.r;
            data[i + 1] = newColor.g;
            data[i + 2] = newColor.b;
            data[i + 3] = 255;
        }

		//utility functions
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
            data[index + 0] = data[index + 0] + (error.r * factor);
            data[index + 1] = data[index + 1] + (error.g * factor);
            data[index + 2] = data[index + 2] + (error.b * factor);
        }

        function coord(index, addX, addY, width){
            let y = Math.floor(index / width);
            return indexOf((index - (y * imgWidth)) + addX, y + addY, width);
            function indexOf(x, y, w){
                return (x * 4) + (y * w * 4);
            }
        }

        //returns processed image
		return data;
    };
}
