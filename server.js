const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const app = express();
const { createProxyMiddleware } = require('http-proxy-middleware');

// Set the static folder for serving public files (e.g., HTML, CSS, etc.)
app.use(express.static('./'));
app.use('/proxy', createProxyMiddleware({ target: 'https://website-eov9.onrender.com', changeOrigin: true }));

// YouTube playlist URL and settings
const playlistUrl = 'https://www.youtube.com/watch?v=WyH9XqNvJ_o&list=PLGcc2ezTrRYw9XPQ9SSMyX9ujLnTloEia';
const totalVideosInPlaylist = 10; // Manually set, or use the YouTube API to get this dynamically
let currentVideoIndex = 1; // Start at the first video (YouTube index starts at 1)

// Path to yt-dlp binary (ensure that it's executable)
const ytDlpPath = path.resolve('./bin/yt-dlp');
// Path to your cookies file (if necessary)
const cookiesFilePath = path.resolve('./cookies.txt');

app.get('/stream', (req, res) => {
  console.log("Received request for video stream");
  streamCurrentVideo(req, res);
});


// Ensure yt-dlp binary exists and has the correct permissions
if (!fs.existsSync(ytDlpPath)) {
  console.error(`yt-dlp binary not found at path: ${ytDlpPath}`);
} else {
  fs.chmodSync(ytDlpPath, '755'); // Ensure it's executable
}

// Function to stream the current video
function streamCurrentVideo(req, res) {
  console.log(`Streaming video ${currentVideoIndex} from playlist`);

  // Spawn yt-dlp process to fetch the current video from the playlist
  const ytDlpArgs = [
    '--playlist-start', currentVideoIndex.toString(),
    '--playlist-end', currentVideoIndex.toString(),
    '-o', '-',  // Output the video directly to stdout
    '--no-part',  // Don't download in parts, stream directly
    playlistUrl
  ];

  // Optional: Add cookies file if available
  if (fs.existsSync(cookiesFilePath)) {
    ytDlpArgs.unshift('--cookies', cookiesFilePath);
  }

  const process = spawn(ytDlpPath, ytDlpArgs);

  let headersSent = false;

  // Set response headers when the first chunk of video data is sent
  process.stdout.on('data', (data) => {
    if (!headersSent) {
      res.setHeader('Content-Type', 'video/mp4');
      headersSent = true;
    }
    res.write(data);  // Stream video data to the client
  });

  // Log errors from the yt-dlp process (stderr)
  process.stderr.on('data', (data) => {
    console.error(`yt-dlp stderr: ${data.toString()}`);
  });

  // Handle yt-dlp process close event
  process.on('close', (code) => {
    console.log(`yt-dlp process closed with code ${code}`);
    if (code === 0) {
      console.log(`Successfully streamed video ${currentVideoIndex}`);
      currentVideoIndex++;  // Move to the next video

      // If we have streamed all the videos, loop back to the first one
      if (currentVideoIndex > totalVideosInPlaylist) {
        currentVideoIndex = 1;  // Reset to the first video
      }
    } else {
      console.error('Error: yt-dlp exited with non-zero code');
      if (!headersSent) {
        res.status(500).send('Error streaming video');
      }
    }
    res.end();  // End the response after the process has completed
  });

  // Handle process error event
  process.on('error', (error) => {
    console.error('Error spawning yt-dlp process:', error.message, error.stack);
    if (!headersSent) {
      res.status(500).send('Error starting yt-dlp process');
    }
  });

  // Handle client disconnect (if the client disconnects before the stream finishes)
  req.on('close', () => {
    if (process && !process.killed) {
      console.log('Client disconnected, killing yt-dlp process.');
      process.kill();
    }
  });
}

// Route to handle video streaming
app.get('/stream', (req, res) => {
  streamCurrentVideo(req, res);
});

app.get('/', (req, res) => {
  fs.readFile("./index.html", 'utf8', (error, data) => {
    if (error) {
      console.error('Error reading index.html:', error);
      res.status(500).send('Server Error: Unable to load the page');
    } else {
      res.send(data);
    }
  });
});

// Allow iframe embedding from all sources
app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "ALLOWALL");
  next();
});



// Start the server on port 3000
app.listen(3000, () => {
  console.log('Server running on port 3000');

  // Check if yt-dlp is executable
  if (fs.existsSync(ytDlpPath)) {
    console.log('yt-dlp binary found and is executable.');
  } else {
    console.error('yt-dlp binary not found. Please ensure it is downloaded and located at:', ytDlpPath);
  }
});
