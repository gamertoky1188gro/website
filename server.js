const express = require('express');
const { spawn } = require('child_process');
const app = express();
app.use(express.static('public'));

const playlistUrl = 'https://www.youtube.com/watch?v=WyH9XqNvJ_o&list=PLGcc2ezTrRYw9XPQ9SSMyX9ujLnTloEia';
const totalVideosInPlaylist = 10; // Manually set or use YouTube API to get dynamically
let currentVideoIndex = 1; // Start at the first video (YouTube index starts at 1)

function streamCurrentVideo(req, res) {
  console.log(`Streaming video ${currentVideoIndex} from playlist`);

  // Spawn yt-dlp process to fetch the current video
  const process = spawn('yt-dlp', [
    '--playlist-start', currentVideoIndex.toString(),
    '--playlist-end', currentVideoIndex.toString(),
    '-o', '-',        // Output video to stdout (for streaming)
    '--no-playlist',  // Ensure we download only the current video
    '--no-part',      // Turn off fragment files
    playlistUrl
  ]);

  let headersSent = false;

  app.get('/', (req, res) => {
    res.send('Welcome to the streaming service!');
  });  

  // Set response headers when the first chunk of video data is sent
  process.stdout.on('data', (data) => {
    if (!headersSent) {
      res.setHeader('Content-Type', 'video/mp4');
      headersSent = true;
    }
    res.write(data);  // Stream video data to client
  });

  // Log stderr from yt-dlp process (for errors/debugging)
  process.stderr.on('data', (data) => {
    console.error(`yt-dlp stderr: ${data}`);
  });

  // Handle process close event
  process.on('close', (code) => {
    console.log(`yt-dlp process closed with code ${code}`);
    if (code === 0) {
      console.log(`Successfully streamed video ${currentVideoIndex}`);
      currentVideoIndex++;

      // Reset to the first video if we've reached the end of the playlist
      if (currentVideoIndex > totalVideosInPlaylist) {
        currentVideoIndex = 1;  // Loop back to the first video
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

  // Handle client disconnect (in case the client stops before the process finishes)
  req.on('close', () => {
    if (process && !process.killed) {
      console.log('Client disconnected, killing yt-dlp process.');
      process.kill();
    }
  });
}

app.get('/stream', (req, res) => {
  streamCurrentVideo(req, res);
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
