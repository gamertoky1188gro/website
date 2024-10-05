const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const app = express();

// Set the static folder for serving public files (e.g., HTML, CSS, etc.)
app.use(express.static('public'));

// YouTube playlist URL and settings
const playlistUrl = 'https://www.youtube.com/watch?v=WyH9XqNvJ_o&list=PLGcc2ezTrRYw9XPQ9SSMyX9ujLnTloEia';
const totalVideosInPlaylist = 10; // Manually set, or use the YouTube API to get this dynamically
let currentVideoIndex = 1; // Start at the first video (YouTube index starts at 1)

// Function to stream the current video
function streamCurrentVideo(req, res) {
  console.log(`Streaming video ${currentVideoIndex} from playlist`);

  // Path to yt-dlp binary (ensure that it's executable)
  const ytDlpPath = path.resolve('./bin/yt-dlp');
  const cookiesFilePath = path.resolve('./cookies.txt'); // Path to your cookies file

  // Spawn yt-dlp process to fetch the current video from the playlist
  const process = spawn(ytDlpPath, [
    '--cookies', cookiesFilePath,
    '--playlist-start', currentVideoIndex.toString(),
    '--playlist-end', currentVideoIndex.toString(),
    '-o', '-',  // Output the video directly to stdout
    '--no-playlist',  // Fetch only one video, not the entire playlist
    '--no-part',  // Don't download in parts, stream directly
    playlistUrl
  ]);

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
    console.error(`yt-dlp stderr: ${data}`);
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
    console.error('Error spawning yt-dlp process:', error);
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

// Root route for basic message
app.get('/', (req, res) => {
  res.send('Welcome to the streaming service!');
});

// Start the server on port 3000
app.listen(3000, () => {
  console.log('Server running on port 3000');
});
