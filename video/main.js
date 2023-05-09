window.onload = () => {
    //inititilizing code and variables
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

	const video = document.getElementById('video');
	const recordingBool = false;
	const capturing = false;

	const res = 1;

    // const palette = [
    //     {r: 255, g:255, b:255},
    //     {r: 128, g:128, b:128},
    //     {r: 0, g:0, b:0}
    // ];

    const palette = [
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
    ];

	// const palette = [
    //     {r: 0, g:0, b:0},
    //     {r: 255, g:255, b:255},
    //     {r: 255, g:0, b:0},
    //     {r: 0, g:255, b:0},
    //     {r: 0, g:0, b:255},
    // ];

    // const palette = [
    //     {r: 0, g:0, b:0},
    //     {r: 255, g:255, b:255},
    //     {r: 255, g:85, b:255},
    //     {r: 85, g:255, b:255}
    // ];

	if(res > 2){
		canvas.style.imageRendering = 'pixelated'
	}

	video.videoWidth = window.innerWidth;

	video.addEventListener('loadedmetadata', function() {
		canvas.width = (recordingBool ? video.videoWidth : video.videoWidth * 2) / res;
		canvas.height = video.videoHeight / res;
		canvas.clientHeight = video.videoHeight / res;
	});

	//download dithered video after 30s?
	if(capturing){
		const recording = record(canvas, 30000);
		var link = document.getElementById('link');
		recording.then(url => {
			link.href = url;
			link.click()
		})
	}

	video.addEventListener('play', function() {
		var $this = this;
		function renderCanvas() {
			ctx.drawImage($this, 0, 0, recordingBool ? canvas.width: canvas.width/2, canvas.height);
			ditherCanvas(video.videoWidth, video.videoHeight, res);
			if (!$this.ended) {
				window.requestAnimationFrame(renderCanvas);
			};
		};
		window.requestAnimationFrame(renderCanvas);
	}, 0);

	function ditherCanvas(imgWidth, imgHeight, res) {
        //prepares to process image
        const imageData = ctx.getImageData(0, 0, imgWidth, imgHeight);
        const data = imageData.data;

        //processes image
        for (var i = 0; i < data.length; i += 4) {
            //whether to display as white 
            let pixel = Math.floor(i/4);
            let oldColor = {
                r:data[i], 
                g:data[i+1],
                b:data[i+2]
            };
            let newColor = getClosestColor(oldColor);

            let errorVal = {
                r: oldColor.r - newColor.r,
                g: oldColor.g - newColor.g,
                b: oldColor.b - newColor.b
            }

            addError(7 / 16.0, coord(pixel, 1, 0, imgWidth), errorVal);
            addError(3 / 16.0, coord(pixel, -1, 1, imgWidth), errorVal);
            addError(5 / 16.0, coord(pixel, 0, 1, imgWidth), errorVal);
            addError(1 / 16.0, coord(pixel, 1, 1, imgWidth), errorVal);

            //sets to white or black
            data[i]     = newColor.r;
            data[i + 1] = newColor.g;
            data[i + 2] = newColor.b;
            data[i + 3] = 255;
        }

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
        //draws processed image
        ctx.putImageData(imageData, recordingBool ? 0 : imgWidth / res, 0);
    };

	function record(canvas, time) {
		var recordedChunks = [];
		return new Promise(function (res, rej) {
			var stream = canvas.captureStream(30/*fps*/);
			mediaRecorder = new MediaRecorder(stream, {
				videoBitsPerSecond: 1000000,
				mimeType: "video/webm; codecs=vp9"
			});
			
			mediaRecorder.start(time);
	
			mediaRecorder.ondataavailable = function (event) {
				recordedChunks.push(event.data);
				if (mediaRecorder.state === 'recording') {
					mediaRecorder.stop();
				}
	
			}
	
			mediaRecorder.onstop = function (event) {
				var blob = new Blob(recordedChunks, {type: "video/webm" });
				var url = URL.createObjectURL(blob);
				res(url);
			}
		})
	}
}

function requestLock(){
    canvas.requestPointerLock();
    canvas.requestFullscreen();
};
